import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../AppContext';
import { useAuth } from '../AuthContext';
import Layout from '../components/Layout';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Plus, Trash2, Edit2, CheckCircle, XCircle, Navigation, Undo2, Save,
  AlertCircle, TrendingUp, ScanLine, Leaf, ChevronRight, Clock, Droplets,
  FlaskConical, CheckSquare, Square, RefreshCw, Map as MapIcon, Activity,
} from 'lucide-react';
import { cn } from '../lib/utils';
import {
  smoothGpsPoint, calculatePolygonArea, computeCentroid, scalePolygon,
  getTileGrid, latLngToPixel, generateGeoHash, formatArea,
  saveDraft, loadDraft, clearDraft, haversineMeters,
  type LatLng, type MapBounds,
} from '../lib/fieldUtils';
import { saveFieldWithPolygon, updateField, deleteField, getUserFields } from '../lib/db';
import { GoogleGenAI } from '@google/genai';
import type { Field } from '../types';

type Mode = 'list' | 'add-choose' | 'polygon-walk' | 'polygon-review' | 'simple' | 'detail';

interface RoadmapPhase {
  phaseName: string;
  duration: string;
  tasks: string[];
  tips: string;
}

// ── Field Detail Panel (full professional view) ──────────────────────────────
function FieldDetailPanel({
  selected, uid, editName, setEditName, handleSaveEdit, handleDelete, navigate, onClose, onFieldUpdate
}: {
  selected: Field;
  uid: string;
  editName: string;
  setEditName: (v: string) => void;
  handleSaveEdit: () => void;
  handleDelete: (f: Field) => void;
  navigate: (path: string) => void;
  onClose: () => void;
  onFieldUpdate: (updates: Partial<Field>) => void;
}) {
  const { t } = useApp();
  const inputCls = "w-full bg-surface-container-low rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 border border-outline-variant/20";

  // Roadmap state
  const [roadmap, setRoadmap] = useState<RoadmapPhase[] | null>(null);
  const [roadmapLoading, setRoadmapLoading] = useState(false);
  const [roadmapError, setRoadmapError] = useState<string | null>(null);
  const [completedPhases, setCompletedPhases] = useState<Set<number>>(new Set());
  const [showRoadmap, setShowRoadmap] = useState(false);

  // Health status update
  const [healthStatus, setHealthStatus] = useState(selected.health_status || 'unknown');
  const [updatingHealth, setUpdatingHealth] = useState(false);

  const healthColors: Record<string, string> = {
    healthy: 'bg-green-100 text-green-800 border-green-300',
    attention_needed: 'bg-amber-100 text-amber-800 border-amber-300',
    critical: 'bg-red-100 text-red-700 border-red-300',
    unknown: 'bg-surface-container text-on-surface-variant border-outline-variant/30',
  };

  const handleHealthUpdate = async (status: string) => {
    setHealthStatus(status);
    setUpdatingHealth(true);
    try {
      await updateField(uid, selected.field_id!, { health_status: status as Field['health_status'] });
      onFieldUpdate({ health_status: status as Field['health_status'] });
    } catch (e) {
      console.error('Health update failed', e);
    } finally {
      setUpdatingHealth(false);
    }
  };

  const fetchRoadmap = async () => {
    if (!selected.active_crop) return;
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) { setRoadmapError('API key missing'); return; }
    setRoadmapLoading(true);
    setRoadmapError(null);
    setShowRoadmap(true);
    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `Generate a concise cultivation roadmap for "${selected.active_crop}" in Bangladesh.
Return ONLY valid JSON (no markdown):
{"phases": [{"phaseName": "Phase name", "duration": "e.g. Days 1-15", "tasks": ["Task 1", "Task 2"], "tips": "One expert tip"}]}
Provide exactly 5 chronological phases. Keep tasks brief.`;
      const result = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
      const match = result.text.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('Invalid response');
      const data = JSON.parse(match[0]);
      setRoadmap(data.phases || []);
    } catch {
      setRoadmapError('Could not generate roadmap. Try again.');
    } finally {
      setRoadmapLoading(false);
    }
  };

  const togglePhase = (idx: number) => {
    setCompletedPhases(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  };

  const progress = roadmap ? Math.round((completedPhases.size / roadmap.length) * 100) : 0;

  return (
    <motion.div key="detail" initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-12}}
      className="space-y-4">

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-black text-on-surface">{selected.field_name}</h3>
          <p className="text-xs text-on-surface-variant mt-0.5">
            {selected.input_mode === 'polygon' ? '📍 GPS Mapped' : '📍 Simple Mode'}
            {selected.center_point.lat !== 0 && ` · ${selected.center_point.lat.toFixed(4)}°N, ${selected.center_point.lng.toFixed(4)}°E`}
          </p>
        </div>
        <button onClick={onClose}>
          <XCircle className="w-6 h-6 text-outline hover:text-primary transition-colors" />
        </button>
      </div>

      {/* Active Crop Hero */}
      {selected.active_crop ? (
        <div className="bg-gradient-to-br from-primary/90 to-primary rounded-[2rem] p-5 text-white relative overflow-hidden">
          <div className="absolute right-0 top-0 w-24 h-24 bg-white/10 rounded-full -translate-y-6 translate-x-6" />
          <div className="relative z-10">
          <p className="text-[10px] font-black uppercase tracking-widest opacity-80">{t('activeCropLabel')}</p>
            <h4 className="text-2xl font-black mt-1 leading-tight">{selected.active_crop}</h4>
            <div className="flex items-center gap-2 mt-3">
              <span className={cn('px-2.5 py-1 rounded-full text-[10px] font-black uppercase border',
                healthColors[healthStatus].replace('bg-', 'bg-white/20 ').replace('text-', 'text-white ').replace('border-', 'border-white/30 '))}>
                {healthStatus}
              </span>
              <button
                onClick={() => { setShowRoadmap(s => !s); if (!roadmap && !roadmapLoading) fetchRoadmap(); }}
                className="flex items-center gap-1 bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full text-[10px] font-black uppercase transition-colors"
              >
                <Activity className="w-3 h-3" />
                {showRoadmap ? t('hideRoadmap') : t('viewRoadmap')}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-surface-container-low border-2 border-dashed border-outline-variant/30 rounded-[2rem] p-5 text-center space-y-2">
          <Leaf className="w-8 h-8 mx-auto text-on-surface-variant/30" />
          <p className="font-bold text-on-surface-variant text-sm">{t('noActiveCrop')}</p>
          <button onClick={() => navigate(`/tools/crops?fieldId=${selected.field_id}`)}
            className="text-primary font-black text-xs flex items-center gap-1 mx-auto">
            {t('getAiCropRec')} <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Inline Roadmap */}
      <AnimatePresence>
        {showRoadmap && (
          <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:'auto'}} exit={{opacity:0,height:0}}
            className="overflow-hidden">
            <div className="bg-surface-container-lowest rounded-[2rem] p-5 border border-outline-variant/10 space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="font-black text-base">{t('cultivationRoadmap')}</h4>
                <button onClick={fetchRoadmap} disabled={roadmapLoading} className="text-primary">
                  <RefreshCw className={cn('w-4 h-4', roadmapLoading && 'animate-spin')} />
                </button>
              </div>

              {roadmapLoading && (
                <div className="flex items-center gap-2 text-on-surface-variant text-sm py-4 justify-center">
                  <RefreshCw className="w-4 h-4 animate-spin text-primary" />
                  {t('generatingRoadmap')}
                </div>
              )}

              {roadmapError && (
                <div className="flex gap-2 text-red-700 bg-red-50 p-3 rounded-xl text-xs font-bold">
                  <AlertCircle className="w-4 h-4 shrink-0" />{t('roadmapError')}
                </div>
              )}


              {roadmap && (
                <>
                  {/* Progress bar */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-on-surface-variant">{t('roadmapProgress')}</span>
                      <span className="text-primary">{completedPhases.size}/{roadmap.length} {t('phases')} · {progress}%</span>
                    </div>
                    <div className="h-2.5 w-full bg-outline-variant/20 rounded-full overflow-hidden">
                      <motion.div
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.5 }}
                        className="h-full bg-primary rounded-full"
                      />
                    </div>
                  </div>

                  {/* Phase list */}
                  <div className="space-y-2">
                    {roadmap.map((phase, idx) => (
                      <motion.div
                        key={idx}
                        layout
                        onClick={() => togglePhase(idx)}
                        className={cn(
                          'flex gap-3 items-start p-3.5 rounded-2xl border cursor-pointer transition-all',
                          completedPhases.has(idx)
                            ? 'bg-primary/10 border-primary/30'
                            : 'bg-surface-container-low border-outline-variant/10'
                        )}
                      >
                        <div className="shrink-0 mt-0.5">
                          {completedPhases.has(idx)
                            ? <CheckSquare className="w-5 h-5 text-primary" />
                            : <Square className="w-5 h-5 text-on-surface-variant/40" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start gap-2">
                            <p className={cn('font-bold text-sm', completedPhases.has(idx) && 'line-through text-on-surface-variant')}>
                              {phase.phaseName}
                            </p>
                            <span className="shrink-0 text-[9px] font-black text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-full">
                              {phase.duration}
                            </span>
                          </div>
                          {!completedPhases.has(idx) && (
                            <ul className="mt-1.5 space-y-0.5">
                              {phase.tasks.slice(0, 2).map((task, ti) => (
                                <li key={ti} className="text-xs text-on-surface-variant">• {task}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  <button
                    onClick={() => navigate(`/tools/crops/roadmap?crop=${encodeURIComponent(selected.active_crop!)}&fieldId=${selected.field_id}`)}
                    className="w-full flex items-center justify-center gap-2 text-primary text-xs font-black py-2.5 bg-primary/5 rounded-xl border border-primary/20 hover:bg-primary/10 transition-colors"
                  >
                    <MapIcon className="w-4 h-4" /> {t('viewFullRoadmap')}
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Field Metrics */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: t('area'), value: formatArea(selected.area_size, selected.area_unit), icon: MapIcon },
          { label: t('soilTypeLabel2'), value: selected.soil_summary?.type || 'Unknown', icon: FlaskConical },
          { label: t('soilPh'), value: selected.soil_summary?.ph ? `pH ${selected.soil_summary.ph}` : 'N/A', icon: Droplets },
          { label: t('gpsPoints'), value: selected.input_mode === 'polygon' ? `${selected.polygon?.points.length ?? 0} pts` : 'N/A', icon: MapPin },
        ].map(item => (
          <div key={item.label} className="bg-surface-container-low p-3.5 rounded-2xl flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <item.icon className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-[9px] text-on-surface-variant uppercase font-bold">{item.label}</p>
              <p className="font-black text-sm capitalize">{item.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Health Status Updater */}
      <div className="bg-surface-container-lowest rounded-2xl p-4 border border-outline-variant/10 space-y-2">
        <p className="text-xs font-black uppercase text-on-surface-variant">{t('updateFieldHealth')}</p>
        <div className="grid grid-cols-2 gap-2">
          {(['healthy', 'attention_needed', 'critical', 'unknown'] as const).map(s => (
            <button
              key={s}
              onClick={() => handleHealthUpdate(s)}
              disabled={updatingHealth}
              className={cn(
                'py-2 px-3 rounded-xl text-[10px] font-black uppercase border transition-all',
                healthStatus === s ? healthColors[s] : 'bg-surface-container text-on-surface-variant/60 border-transparent hover:border-outline-variant/30'
              )}
            >
              {s === 'healthy' ? t('healthHealthy') : s === 'attention_needed' ? t('healthAttention') : s === 'critical' ? t('healthCritical') : t('healthUnknown')}
            </button>
          ))}
        </div>
      </div>

      {/* Rename */}
      <div className="space-y-2">
        <p className="text-xs font-bold uppercase text-on-surface-variant">{t('renameField')}</p>
        <div className="flex gap-2">
          <input value={editName} onChange={e => setEditName(e.target.value)} className={`flex-1 ${inputCls.replace('w-full ','')}`} />
          <button onClick={handleSaveEdit} className="bg-primary text-white px-4 rounded-xl font-bold flex items-center gap-1">
            <Edit2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => navigate(`/tools/crops?fieldId=${selected.field_id}`)}
          className="bg-primary/10 text-primary py-3.5 rounded-2xl font-bold text-xs flex flex-col items-center gap-1.5 hover:bg-primary/20 transition-colors"
        >
          <TrendingUp className="w-5 h-5" />
          {t('cropRecommendation')}
        </button>
        <button
          onClick={() => navigate('/tools/scan')}
          className="bg-red-50 text-red-600 py-3.5 rounded-2xl font-bold text-xs flex flex-col items-center gap-1.5 hover:bg-red-100 transition-colors"
        >
          <ScanLine className="w-5 h-5" />
          {t('scanDisease')}
        </button>
        {selected.active_crop && (
          <button
            onClick={() => { setShowRoadmap(true); if (!roadmap && !roadmapLoading) fetchRoadmap(); }}
            className="col-span-2 bg-surface-container-low text-on-surface py-3.5 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-surface-container transition-colors border border-outline-variant/20"
          >
            <Activity className="w-4 h-4 text-primary" />
            {t('loadAiRoadmap')}
          </button>
        )}
      </div>

      {/* Delete */}
      <button onClick={() => handleDelete(selected)}
        className="w-full border-2 border-red-200 text-red-600 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-red-50 transition-colors active:scale-95">
        <Trash2 className="w-4 h-4" /> {t('deleteField')}
      </button>
    </motion.div>
  );
}

// Tile sources
const TILE_SOURCES = {
  streets: (z: number, x: number, y: number) =>
    `https://a.basemaps.cartocdn.com/rastertiles/voyager/${z}/${x}/${y}.png`,
  topo: (z: number, x: number, y: number) =>
    `https://tile.opentopomap.org/${z}/${x}/${y}.png`,
  satellite: (z: number, x: number, y: number) =>
    `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`,
};

type MapStyle = keyof typeof TILE_SOURCES;

const HEALTH_COLORS: Record<string, { fill: string; stroke: string }> = {
  healthy:          { fill: '#16a34a', stroke: '#14532d' },
  attention_needed: { fill: '#d97706', stroke: '#92400e' },
  critical:         { fill: '#dc2626', stroke: '#7f1d1d' },
  unknown:          { fill: '#6b7280', stroke: '#374151' },
};

function MapCanvas({ center, points, fields, selectedId, onSelectField, onRecenter }: {
  center: LatLng; points: LatLng[]; fields: Field[];
  selectedId?: string;
  onSelectField?: (f: Field) => void;
  onRecenter?: () => void;
}) {
  const [zoom, setZoom] = useState(16);
  const [mapStyle, setMapStyle] = useState<MapStyle>('streets');

  // Recompute tile grid whenever zoom or center changes
  const { tiles, bounds, gridSize } = getTileGrid(center.lat, center.lng, zoom);
  const canvas = { width: gridSize, height: gridSize };
  const toXY = (p: LatLng) => latLngToPixel(p, bounds as MapBounds, canvas);

  const polyPath = (pts: LatLng[]) =>
    pts.map((p, i) => { const { x, y } = toXY(p); return `${i === 0 ? 'M' : 'L'}${x} ${y}`; }).join(' ') + ' Z';

  const displayH = 340;
  const scale = displayH / gridSize;
  const tileSource = TILE_SOURCES[mapStyle];

  return (
    <div className="relative rounded-[2rem] overflow-hidden shadow-xl border border-outline-variant/20" style={{ height: displayH }}>

      {/* Map tiles */}
      <div style={{ width: gridSize, height: gridSize, position: 'absolute', top: 0, left: 0, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
        {tiles.map(t => (
          <img
            key={`${t.tx}-${t.ty}-${mapStyle}-${zoom}`}
            src={tileSource(zoom, t.tx, t.ty)}
            width={256} height={256} alt=""
            className="absolute"
            style={{ left: t.offsetX, top: t.offsetY }}
            loading="eager"
          />
        ))}

        {/* SVG Overlay */}
        <svg className="absolute inset-0" width={gridSize} height={gridSize}>
          <defs>
            <filter id="drop-shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.3" />
            </filter>
          </defs>

          {/* Saved fields */}
          {fields.map(f => {
            const sel = f.field_id === selectedId;
            const hc = HEALTH_COLORS[f.health_status || 'unknown'];
            const fillColor = sel ? '#0d631b' : hc.fill;
            const strokeColor = sel ? '#14532d' : hc.stroke;

            if (f.input_mode === 'polygon' && f.polygon?.points?.length) {
              const centPt = computeCentroid(f.polygon.points.map(p => ({ lat: p.lat, lng: p.lng })));
              const { x: cx, y: cy } = toXY(centPt);
              return (
                <g key={f.field_id} className="cursor-pointer" onClick={() => onSelectField?.(f)}>
                  <path
                    d={polyPath(f.polygon.points.map(p => ({ lat: p.lat, lng: p.lng })))}
                    fill={fillColor} fillOpacity={sel ? 0.55 : 0.4}
                    stroke={strokeColor} strokeWidth={sel ? 5 : 3}
                    filter="url(#drop-shadow)"
                  />
                  {/* Field label */}
                  <rect x={cx - 40} y={cy - 12} width={80} height={22} rx={11} fill="white" fillOpacity={0.85} />
                  <text x={cx} y={cy + 4} textAnchor="middle" fontSize={11} fontWeight="700" fill={strokeColor}>
                    {f.field_name.length > 10 ? f.field_name.slice(0, 10) + '…' : f.field_name}
                  </text>
                </g>
              );
            }

            // Simple point marker
            const { x, y } = toXY({ lat: f.center_point.lat, lng: f.center_point.lng });
            return (
              <g key={f.field_id} className="cursor-pointer" onClick={() => onSelectField?.(f)}>
                {sel && <circle cx={x} cy={y} r={28} fill={fillColor} fillOpacity={0.2} />}
                <circle cx={x} cy={y} r={sel ? 18 : 14}
                  fill={fillColor} stroke="white" strokeWidth={sel ? 4 : 3}
                  filter="url(#drop-shadow)" />
                <text x={x} y={y + 5} textAnchor="middle" fontSize={10} fontWeight="800" fill="white">
                  {f.field_name.slice(0, 2).toUpperCase()}
                </text>
                {/* Name label */}
                <rect x={x - 38} y={y + 22} width={76} height={20} rx={10} fill="white" fillOpacity={0.9} />
                <text x={x} y={y + 36} textAnchor="middle" fontSize={10} fontWeight="700" fill={strokeColor}>
                  {f.field_name.length > 10 ? f.field_name.slice(0, 10) + '…' : f.field_name}
                </text>
              </g>
            );
          })}

          {/* GPS walk — in-progress polygon */}
          {points.length > 0 && (
            <>
              <path d={polyPath(points)} fill="#0d631b" fillOpacity={0.18}
                stroke="#16a34a" strokeWidth={3} strokeDasharray="10 6" />
              {points.map((p, i) => {
                const { x, y } = toXY(p);
                return (
                  <g key={i}>
                    <circle cx={x} cy={y} r={11} fill="#16a34a" stroke="white" strokeWidth={3} />
                    <text x={x} y={y + 4} textAnchor="middle" fontSize={9} fontWeight="800" fill="white">{i + 1}</text>
                  </g>
                );
              })}
            </>
          )}

          {/* Current GPS location */}
          {(() => {
            const { x, y } = toXY(center);
            return (
              <g>
                <circle cx={x} cy={y} r={22} fill="#1d4ed8" fillOpacity={0.15} />
                <circle cx={x} cy={y} r={11} fill="#2563eb" stroke="white" strokeWidth={3} filter="url(#drop-shadow)" />
                <circle cx={x} cy={y} r={4} fill="white" />
              </g>
            );
          })()}
        </svg>
      </div>

      {/* ── TOP-LEFT: Map style switcher ── */}
      <div className="absolute top-3 left-3 flex gap-1.5 z-10">
        {(Object.keys(TILE_SOURCES) as MapStyle[]).map(style => (
          <button
            key={style}
            onClick={() => setMapStyle(style)}
            className={cn(
              'px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider backdrop-blur-md border transition-all',
              mapStyle === style
                ? 'bg-white text-on-surface border-white shadow-md'
                : 'bg-black/40 text-white border-white/20 hover:bg-black/60'
            )}
          >
            {style === 'streets' ? '🗺 Street' : style === 'topo' ? '⛰ Topo' : '🛰 Satellite'}
          </button>
        ))}
      </div>

      {/* ── TOP-RIGHT: Zoom controls ── */}
      <div className="absolute top-3 right-3 flex flex-col gap-1 z-10">
        <button
          onClick={() => setZoom(z => Math.min(z + 1, 18))}
          className="w-8 h-8 bg-white/90 backdrop-blur-md rounded-xl shadow-md flex items-center justify-center text-on-surface font-black text-lg hover:bg-white transition-colors border border-white/50"
          title="Zoom in"
        >+</button>
        <div className="w-8 h-5 flex items-center justify-center bg-black/30 backdrop-blur-md rounded-lg text-white text-[9px] font-bold">
          z{zoom}
        </div>
        <button
          onClick={() => setZoom(z => Math.max(z - 1, 14))}
          className="w-8 h-8 bg-white/90 backdrop-blur-md rounded-xl shadow-md flex items-center justify-center text-on-surface font-black text-lg hover:bg-white transition-colors border border-white/50"
          title="Zoom out"
        >−</button>
      </div>

      {/* ── BOTTOM-RIGHT: Re-center button ── */}
      {onRecenter && (
        <button
          onClick={onRecenter}
          className="absolute bottom-10 right-3 z-10 w-9 h-9 bg-white/90 backdrop-blur-md rounded-xl shadow-md flex items-center justify-center hover:bg-white transition-colors border border-white/50"
          title="Re-center on my location"
        >
          <Navigation className="w-4 h-4 text-primary" />
        </button>
      )}

      {/* ── BOTTOM-LEFT: Legend ── */}
      {fields.length > 0 && (
        <div className="absolute bottom-10 left-3 z-10 bg-black/50 backdrop-blur-md rounded-xl px-2.5 py-1.5 space-y-1">
          {Object.entries(HEALTH_COLORS).map(([status, col]) => {
            const count = fields.filter(f => (f.health_status || 'unknown') === status).length;
            if (count === 0) return null;
            return (
              <div key={status} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: col.fill }} />
                <span className="text-white text-[9px] font-bold capitalize">{status.replace('_', ' ')} ({count})</span>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Attribution + field count bar ── */}
      <div className="absolute bottom-0 left-0 right-0 bg-black/50 backdrop-blur-sm px-3 py-1.5 flex items-center justify-between">
        <span className="text-white text-[9px] font-medium opacity-70">© OpenStreetMap contributors</span>
        {fields.length > 0 && (
          <span className="text-white text-[9px] font-bold">
            {fields.length} field{fields.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>
    </div>
  );
}

export default function FieldMapper() {
  const { t } = useApp();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const uid = currentUser?.uid ?? '';

  const [mode, setMode] = useState<Mode>('list');
  const [fields, setFields] = useState<Field[]>([]);
  const [selected, setSelected] = useState<Field | null>(null);
  const [points, setPoints] = useState<LatLng[]>([]);
  const [currentPos, setCurrentPos] = useState<LatLng>({ lat: 23.685, lng: 90.356 });
  const [locating, setLocating] = useState(false);
  const [fieldsLoading, setFieldsLoading] = useState(false);
  const [fieldName, setFieldName] = useState('');
  const [areaUnit, setAreaUnit] = useState<'acres'|'hectares'|'bigha'>('acres');
  const [manualArea, setManualArea] = useState('');
  const [simplePoint, setSimplePoint] = useState<LatLng|null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string|null>(null);
  const [editName, setEditName] = useState('');
  const [draftBanner, setDraftBanner] = useState(false);
  const [pendingDraft, setPendingDraft] = useState<ReturnType<typeof loadDraft>>(null);
  const watchRef = useRef<number|null>(null);

  // Load fields (one-time fetch, no live listener — avoids Firestore watch stream bugs)
  const refreshFields = useCallback(async () => {
    if (!uid) return;
    setFieldsLoading(true);
    try {
      const f = await getUserFields(uid);
      setFields(f);
    } catch (err) {
      console.error('[FieldMapper] getUserFields error:', err);
    } finally {
      setFieldsLoading(false);
    }
  }, [uid]);

  useEffect(() => {
    if (!uid) return;
    refreshFields();
    // Check for draft non-blocking (no window.confirm inside effect)
    const draft = loadDraft(uid);
    if (draft?.points.length) {
      setPendingDraft(draft);
      setDraftBanner(true);
    }
  }, [uid, refreshFields]);

  const getPos = useCallback((cb: (p: LatLng) => void) => {
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      pos => { cb({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setLocating(false); },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  const startWatch = useCallback(() => {
    if (watchRef.current !== null) return;
    watchRef.current = navigator.geolocation.watchPosition(pos => {
      const raw = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setCurrentPos(prev => smoothGpsPoint([prev], raw));
    }, undefined, { enableHighAccuracy: true });
  }, []);

  const stopWatch = useCallback(() => {
    if (watchRef.current !== null) {
      navigator.geolocation.clearWatch(watchRef.current);
      watchRef.current = null;
    }
  }, []);

  const markPoint = () => {
    const last = points[points.length - 1];
    if (last && haversineMeters(last, currentPos) < 0.5) return;
    if (points.length >= 50) return;
    const np = [...points, currentPos];
    setPoints(np);
    saveDraft(uid, { points: np, mode: 'polygon', name: fieldName, areaUnit, savedAt: Date.now() });
  };

  const calcArea = () => calculatePolygonArea(points, areaUnit);

  const applyCorrection = () => {
    const t = parseFloat(manualArea);
    if (!isNaN(t) && t > 0) {
      const c = calcArea();
      if (c > 0) setPoints(scalePolygon(points, c, t));
    }
  };

  const savePolygon = async () => {
    if (!uid) { setSaveError('You must be logged in to save fields.'); return; }
    if (!fieldName.trim() || points.length < 3) return;
    setSaving(true); setSaveError(null);
    try {
      const center = computeCentroid(points);
      const area = parseFloat(manualArea) || calcArea();
      await saveFieldWithPolygon(uid, {
        field_name: fieldName.trim(), area_size: area, area_unit: areaUnit,
        geo_hash: generateGeoHash(center.lat, center.lng),
        center_point: { lat: center.lat, lng: center.lng },
        soil_summary: { type: 'Unknown', ph: 7 }, input_mode: 'polygon',
        polygon: { points, calculated_area: calcArea(), area_unit: areaUnit, correction_applied: !!manualArea },
        health_status: 'unknown',
      });
      clearDraft(uid); setPoints([]); setFieldName(''); setManualArea('');
      await refreshFields();
      setMode('list');
    } catch (err: any) {
      console.error('[savePolygon]', err);
      setSaveError(err?.message ?? 'Failed to save. Check your connection.');
    } finally {
      setSaving(false);
    }
  };

  const saveSimple = async () => {
    if (!uid) { setSaveError('You must be logged in to save fields.'); return; }
    if (!fieldName.trim() || !simplePoint || !manualArea) return;
    setSaving(true); setSaveError(null);
    try {
      await saveFieldWithPolygon(uid, {
        field_name: fieldName.trim(),
        area_size: parseFloat(manualArea),
        area_unit: areaUnit,
        geo_hash: generateGeoHash(simplePoint.lat, simplePoint.lng),
        center_point: { lat: simplePoint.lat, lng: simplePoint.lng },
        soil_summary: { type: 'Unknown', ph: 7 },
        input_mode: 'simple',
        health_status: 'unknown',
      });
      setFieldName(''); setManualArea(''); setSimplePoint(null);
      await refreshFields();
      setMode('list');
    } catch (err: any) {
      console.error('[saveSimple]', err);
      setSaveError(err?.message ?? 'Failed to save. Check your connection.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (f: Field) => {
    if (!f.field_id || !window.confirm(`Delete "${f.field_name}"?`)) return;
    try {
      await deleteField(uid, f.field_id);
      await refreshFields();
    } catch (err: any) {
      setSaveError(err?.message ?? 'Delete failed.');
    }
    setSelected(null); setMode('list');
  };

  const handleSaveEdit = async () => {
    if (!selected?.field_id || !editName.trim()) return;
    try {
      await updateField(uid, selected.field_id, { field_name: editName.trim() });
      await refreshFields();
    } catch (err: any) {
      setSaveError(err?.message ?? 'Update failed.');
    }
    setMode('list'); setSelected(null);
  };

  const cancelAdd = () => { stopWatch(); setPoints([]); setFieldName(''); setManualArea(''); setMode('list'); };
  const mapCenter = selected?.center_point
    ? { lat: selected.center_point.lat, lng: selected.center_point.lng }
    : currentPos;

  const inputCls = "w-full bg-surface-container-low rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 border border-outline-variant/20";
  const btnPrimary = "w-full bg-primary text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-50";

  return (
    <Layout title={t('fieldMapper')}>
      <div className="px-4 pb-6 space-y-5">
        <div>
          <h2 className="text-2xl font-black text-on-surface">{t('myLand')}</h2>
          <p className="text-sm text-on-surface-variant">{t('manageLand')}</p>
        </div>

        <MapCanvas center={mapCenter} points={points} fields={fields}
          selectedId={selected?.field_id}
          onSelectField={f => { setSelected(f); setEditName(f.field_name); setMode('detail'); }}
          onRecenter={() => getPos(setCurrentPos)} />

        {/* GPS status bar */}
        {(mode === 'polygon-walk') && (
          <div className="flex items-center justify-between bg-surface-container-low rounded-2xl px-4 py-3">
            <div className="flex items-center gap-2">
              <div className={cn("w-2 h-2 rounded-full", locating ? "bg-orange-400 animate-pulse" : "bg-green-500")} />
              <span className="text-sm font-bold">{locating ? 'Locating…' : 'GPS Active'}</span>
            </div>
            <span className="text-xs text-primary font-black">{points.length} pts</span>
          </div>
        )}

        {/* Save error banner */}
        {saveError && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 border border-red-200 text-red-700 rounded-2xl px-4 py-3 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold text-sm">Save failed</p>
              <p className="text-xs mt-0.5">{saveError}</p>
            </div>
            <button onClick={() => setSaveError(null)} className="text-red-400 hover:text-red-600">
              <XCircle className="w-5 h-5" />
            </button>
          </motion.div>
        )}

        {draftBanner && pendingDraft && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            className="bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl px-4 py-3">
            <p className="font-bold text-sm">Unsaved draft: {pendingDraft.points.length} GPS points</p>
            <div className="flex gap-2 mt-2">
              <button onClick={() => { setPoints(pendingDraft.points); setFieldName(pendingDraft.name); setAreaUnit(pendingDraft.areaUnit); setMode('polygon-walk'); setDraftBanner(false); }}
                className="bg-amber-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold">Resume</button>
              <button onClick={() => { clearDraft(uid); setDraftBanner(false); setPendingDraft(null); }}
                className="text-amber-700 px-3 py-1.5 rounded-lg text-xs font-bold border border-amber-300">Discard</button>
            </div>
          </motion.div>
        )}
        {fieldsLoading && (
          <div className="flex items-center gap-2 text-on-surface-variant py-2">
            <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <span className="text-sm">Loading fields…</span>
          </div>
        )}
        <AnimatePresence mode="wait">

          {mode === 'list' && (
            <motion.div key="list" initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-12}} className="space-y-4">
              <button onClick={() => setMode('add-choose')} className={btnPrimary}>
                <Plus className="w-5 h-5" /> Add New Field
              </button>
              {fields.length === 0 && (
                <div className="text-center py-12 text-on-surface-variant">
                  <MapPin className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p className="font-bold">No fields yet</p>
                  <p className="text-sm">Add your first field above</p>
                </div>
              )}
              <div className="space-y-3">
                {fields.map(f => (
                  <motion.div key={f.field_id} whileTap={{scale:0.98}}
                    className="bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/10 editorial-shadow cursor-pointer hover:border-primary/30 transition-all"
                    onClick={() => { setSelected(f); setEditName(f.field_name); setMode('detail'); }}>
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-on-surface">{f.field_name}</h4>
                        <p className="text-sm text-on-surface-variant mt-0.5">
                          {formatArea(f.area_size, f.area_unit)} · {f.input_mode === 'polygon' ? 'GPS Mapped' : 'Simple'}
                          {f.input_mode === 'polygon' && f.polygon && ` · ${f.polygon.points.length} pts`}
                        </p>
                      </div>
                      <span className={cn('text-xs font-bold px-2 py-1 rounded-full',
                        f.health_status === 'healthy' ? 'bg-green-100 text-green-800' : 'bg-surface-container text-on-surface-variant')}>
                        {f.health_status || 'unknown'}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {mode === 'add-choose' && (
            <motion.div key="choose" initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-12}} className="space-y-4">
              <h3 className="font-black text-lg">Choose mapping mode</h3>
              <motion.button whileTap={{scale:0.97}}
                onClick={() => { setMode('polygon-walk'); startWatch(); getPos(setCurrentPos); }}
                className="w-full bg-primary text-white p-5 rounded-2xl text-left">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                    <Navigation className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-bold text-lg">GPS Walk Mode</p>
                    <p className="text-sm opacity-80">Walk your field boundary and tap to mark points</p>
                  </div>
                </div>
              </motion.button>
              <motion.button whileTap={{scale:0.97}}
                onClick={() => { getPos(p => setSimplePoint(p)); setMode('simple'); }}
                className="w-full bg-surface-container-low border border-outline-variant/30 p-5 rounded-2xl text-left">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                    <MapPin className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-bold text-lg">Simple Mode</p>
                    <p className="text-sm text-on-surface-variant">One GPS point + enter area manually</p>
                  </div>
                </div>
              </motion.button>
              <button onClick={cancelAdd} className="w-full text-on-surface-variant py-3 text-sm font-medium">Cancel</button>
            </motion.div>
          )}

          {mode === 'polygon-walk' && (
            <motion.div key="walk" initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-12}} className="space-y-4">
              <input value={fieldName} onChange={e => setFieldName(e.target.value)}
                placeholder="Field name (required)" className={inputCls} />
              <div className="flex gap-3">
                <button onClick={markPoint}
                  className="flex-1 bg-primary text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform">
                  <MapPin className="w-5 h-5" /> Mark Point
                </button>
                <button onClick={() => setPoints(p => p.slice(0,-1))} disabled={points.length === 0}
                  className="bg-surface-container-low p-4 rounded-2xl disabled:opacity-40 active:scale-95 transition-transform border border-outline-variant/20">
                  <Undo2 className="w-5 h-5 text-primary" />
                </button>
              </div>
              {points.length >= 3 && (
                <button onClick={() => { stopWatch(); setMode('polygon-review'); }}
                  className="w-full bg-green-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform">
                  <CheckCircle className="w-5 h-5" /> Done — Review Field
                </button>
              )}
              {points.length < 3 && points.length > 0 && (
                <p className="text-center text-sm text-on-surface-variant">{3 - points.length} more point{3-points.length!==1?'s':''} needed to close polygon</p>
              )}
              <button onClick={cancelAdd} className="w-full text-on-surface-variant py-2 text-sm">Cancel</button>
            </motion.div>
          )}

          {mode === 'polygon-review' && (
            <motion.div key="review" initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-12}} className="space-y-4">
              <div className="bg-surface-container-low rounded-2xl p-5 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-on-surface-variant font-medium">Calculated Area</span>
                  <span className="font-black text-xl text-primary">{formatArea(calcArea(), areaUnit)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-on-surface-variant font-medium">GPS Points</span>
                  <span className="font-bold">{points.length}</span>
                </div>
              </div>
              <select value={areaUnit} onChange={e => setAreaUnit(e.target.value as any)} className={inputCls}>
                <option value="acres">Acres</option>
                <option value="hectares">Hectares</option>
                <option value="bigha">Bigha (বিঘা)</option>
              </select>
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase text-on-surface-variant">Area Correction (optional)</p>
                <div className="flex gap-2">
                  <input value={manualArea} onChange={e => setManualArea(e.target.value)}
                    placeholder="Actual measured area" type="number" className={`flex-1 ${inputCls.replace('w-full ','')}`} />
                  <button onClick={applyCorrection} disabled={!manualArea}
                    className="bg-tertiary/10 text-tertiary px-4 rounded-xl font-bold text-sm disabled:opacity-40 whitespace-nowrap">
                    Apply Fix
                  </button>
                </div>
                <p className="text-xs text-on-surface-variant">If the calculated area differs from your records, enter the correct value to rescale the polygon.</p>
              </div>
              <button onClick={savePolygon} disabled={saving || !fieldName.trim()}
                className={btnPrimary}>
                <Save className="w-5 h-5" /> {saving ? 'Saving…' : 'Save Field'}
              </button>
              <button onClick={() => { startWatch(); setMode('polygon-walk'); }}
                className="w-full text-on-surface-variant py-2 text-sm">← Back to marking</button>
            </motion.div>
          )}

          {mode === 'simple' && (
            <motion.div key="simple" initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-12}} className="space-y-4">
              <h3 className="font-black text-lg">Simple Mode</h3>
              <input value={fieldName} onChange={e => setFieldName(e.target.value)}
                placeholder="Field name" className={inputCls} />
              <div className="bg-surface-container-low rounded-2xl p-4 flex items-center justify-between border border-outline-variant/20">
                <div>
                  <p className="text-xs font-bold uppercase text-on-surface-variant">GPS Point</p>
                  {simplePoint
                    ? <p className="font-bold text-sm text-primary">{simplePoint.lat.toFixed(5)}, {simplePoint.lng.toFixed(5)}</p>
                    : <p className="text-sm text-on-surface-variant">{locating ? 'Detecting…' : 'Not detected'}</p>}
                </div>
                <button onClick={() => getPos(p => setSimplePoint(p))}
                  className="bg-primary/10 text-primary px-3 py-2 rounded-xl text-sm font-bold">
                  <Navigation className="w-4 h-4" />
                </button>
              </div>
              <select value={areaUnit} onChange={e => setAreaUnit(e.target.value as any)} className={inputCls}>
                <option value="acres">Acres</option>
                <option value="hectares">Hectares</option>
                <option value="bigha">Bigha (বিঘা)</option>
              </select>
              <input value={manualArea} onChange={e => setManualArea(e.target.value)}
                placeholder={`Field area in ${areaUnit}`} type="number" className={inputCls} />
              <button onClick={saveSimple} disabled={saving || !fieldName.trim() || !simplePoint || !manualArea}
                className={btnPrimary}>
                <Save className="w-5 h-5" /> {saving ? 'Saving…' : 'Save Field'}
              </button>
              <button onClick={cancelAdd} className="w-full text-on-surface-variant py-2 text-sm">Cancel</button>
            </motion.div>
          )}

          {mode === 'detail' && selected && (
            <FieldDetailPanel
              selected={selected}
              uid={uid}
              editName={editName}
              setEditName={setEditName}
              handleSaveEdit={handleSaveEdit}
              handleDelete={handleDelete}
              navigate={navigate}
              onClose={() => { setMode('list'); setSelected(null); }}
              onFieldUpdate={(updates) => setSelected(prev => prev ? { ...prev, ...updates } : prev)}
            />
          )}

        </AnimatePresence>
      </div>
    </Layout>
  );
}
