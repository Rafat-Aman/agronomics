import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import Layout from '../components/Layout';
import {
  Sprout, Plus, Trash2, Loader2, Leaf, CalendarDays,
  MapPin, ChevronDown, CheckCircle2,
  XCircle, X, Pencil, Bot
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  getPlantedCrops, addPlantedCrop, updatePlantedCrop, deletePlantedCrop,
  getUserFields,
  type PlantedCrop,
} from '../lib/db';
import type { Field } from '../types';

// ─── Helpers ────────────────────────────────────────────────────────────────

const STATUS_META = {
  growing:   { label: 'Growing',   bg: 'bg-emerald-100', text: 'text-emerald-700', icon: Sprout },
  harvested: { label: 'Harvested', bg: 'bg-blue-100',    text: 'text-blue-700',    icon: CheckCircle2 },
  failed:    { label: 'Failed',    bg: 'bg-red-100',      text: 'text-red-700',     icon: XCircle },
} as const;

function daysSince(dateStr: string): number {
  const d = new Date(dateStr);
  const now = new Date();
  return Math.max(0, Math.floor((now.getTime() - d.getTime()) / 86_400_000));
}

function daysUntil(dateStr: string): number {
  const d = new Date(dateStr);
  const now = new Date();
  return Math.max(0, Math.floor((d.getTime() - now.getTime()) / 86_400_000));
}

const inputCls =
  'w-full bg-surface-container-low rounded-xl px-3 py-2.5 text-sm font-semibold ' +
  'focus:outline-none focus:ring-2 focus:ring-primary/30 border border-outline-variant/20 ' +
  'text-on-surface placeholder:text-on-surface-variant/40';

/** Converts simple markdown (bold, bullets, numbered lists) into JSX */
function renderMarkdown(text: string): React.ReactNode[] {
  return text.split('\n').map((line, i) => {
    const trimmed = line.trim();
    if (!trimmed) return <div key={i} className="h-2" />;

    // Convert **text** → <strong>
    const parseBold = (s: string): React.ReactNode[] => {
      const parts = s.split(/(\*\*[^*]+\*\*)/);
      return parts.map((part, j) =>
        part.startsWith('**') && part.endsWith('**')
          ? <strong key={j} className="font-bold text-on-surface">{part.slice(2, -2)}</strong>
          : part
      );
    };

    // Numbered list  "1. ..."
    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
    if (numMatch) {
      return (
        <div key={i} className="flex gap-2 py-0.5">
          <span className="font-bold text-primary shrink-0 min-w-[1.2rem]">{numMatch[1]}.</span>
          <span>{parseBold(numMatch[2])}</span>
        </div>
      );
    }

    // Bullet  "* ..." or "- ..."
    const bulletMatch = trimmed.match(/^[*\-]\s+(.*)/);
    if (bulletMatch) {
      return (
        <div key={i} className="flex gap-2 py-0.5 pl-4">
          <span className="text-primary shrink-0 mt-0.5">•</span>
          <span>{parseBold(bulletMatch[1])}</span>
        </div>
      );
    }

    // Heading-style line (all bold / starts with ##)
    if (trimmed.startsWith('##')) {
      return <p key={i} className="font-black text-on-surface mt-3 mb-1">{parseBold(trimmed.replace(/^#+\s*/, ''))}</p>;
    }

    // Plain line
    return <p key={i} className="py-0.5 leading-relaxed">{parseBold(trimmed)}</p>;
  });
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function MyCrops() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const uid = currentUser?.uid ?? '';

  // Data
  const [crops, setCrops] = useState<PlantedCrop[]>([]);
  const [fields, setFields] = useState<Field[]>([]);
  const [loading, setLoading] = useState(true);

  // Add / Edit form
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formCropName, setFormCropName] = useState('');
  const [formLocalName, setFormLocalName] = useState('');
  const [formFieldId, setFormFieldId] = useState('');
  const [formPlantedDate, setFormPlantedDate] = useState('');
  const [formHarvestDate, setFormHarvestDate] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formStatus, setFormStatus] = useState<PlantedCrop['status']>('growing');
  const [formLoading, setFormLoading] = useState(false);
  const [fieldOpen, setFieldOpen] = useState(false);

  // Status update dropdown per card
  const [statusOpenFor, setStatusOpenFor] = useState<string | null>(null);

  // Load data — watch uid directly so it re-fires once Firebase auth resolves
  const reload = useCallback((userId: string) => {
    setLoading(true);
    // Use allSettled so a permissions error on planted_crops
    // doesn't block the getUserFields result from loading
    Promise.allSettled([getPlantedCrops(userId), getUserFields(userId)])
      .then(([cropsResult, fieldsResult]) => {
        if (cropsResult.status === 'fulfilled') setCrops(cropsResult.value);
        else console.warn('[MyCrops] planted_crops fetch failed:', cropsResult.reason);
        if (fieldsResult.status === 'fulfilled') setFields(fieldsResult.value);
        else console.warn('[MyCrops] getUserFields fetch failed:', fieldsResult.reason);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!currentUser?.uid) return;
    reload(currentUser.uid);
  }, [currentUser?.uid, reload]);

  // ─── Form helpers ────────────────────────────────────────────────────────

  const resetForm = () => {
    setFormCropName(''); setFormLocalName(''); setFormFieldId('');
    setFormPlantedDate(''); setFormHarvestDate(''); setFormNotes('');
    setFormStatus('growing'); setEditingId(null);
  };

  const openAddForm = () => { resetForm(); setShowForm(true); };

  const openEditForm = (crop: PlantedCrop) => {
    setFormCropName(crop.cropName);
    setFormLocalName(crop.localName ?? '');
    setFormFieldId(crop.fieldId);
    setFormPlantedDate(crop.plantedDate);
    setFormHarvestDate(crop.expectedHarvestDate ?? '');
    setFormNotes(crop.notes ?? '');
    setFormStatus(crop.status);
    setEditingId(crop.id!);
    setShowForm(true);
  };

  const selectedField = fields.find(f => f.field_id === formFieldId) ?? null;

  const handleSave = async () => {
    if (!formCropName.trim() || !formPlantedDate) return;
    setFormLoading(true);
    try {
      const payload: Omit<PlantedCrop, 'id' | 'created_at'> = {
        cropName: formCropName.trim(),
        localName: formLocalName.trim() || undefined,
        fieldId: formFieldId,
        fieldName: selectedField?.field_name ?? 'No field',
        fieldArea: selectedField ? `${selectedField.area_size} ${selectedField.area_unit}` : undefined,
        plantedDate: formPlantedDate,
        expectedHarvestDate: formHarvestDate || undefined,
        notes: formNotes.trim() || undefined,
        status: formStatus,
      };
      if (editingId) {
        await updatePlantedCrop(uid, editingId, payload);
      } else {
        await addPlantedCrop(uid, payload);
      }
      setShowForm(false);
      resetForm();
      if (uid) reload(uid);
    } catch (err) {
      console.error(err);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Remove this crop record?')) return;
    await deletePlantedCrop(uid, id);
    setCrops(c => c.filter(x => x.id !== id));
  };

  const handleStatusChange = async (crop: PlantedCrop, status: PlantedCrop['status']) => {
    await updatePlantedCrop(uid, crop.id!, { status });
    setCrops(c => c.map(x => x.id === crop.id ? { ...x, status } : x));
    setStatusOpenFor(null);
  };


  // ─── Render helpers ───────────────────────────────────────────────────────

  const growingCount = crops.filter(c => c.status === 'growing').length;

  // ─── JSX ─────────────────────────────────────────────────────────────────

  return (
    <Layout showBack title="আমার ফসল / My Crops">
      <div className="px-4 sm:px-5 pb-28 space-y-5">

        {/* Header stat row */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total', value: crops.length, color: 'text-on-surface' },
            { label: 'Growing', value: growingCount, color: 'text-emerald-600' },
            { label: 'Harvested', value: crops.filter(c => c.status === 'harvested').length, color: 'text-blue-600' },
          ].map(s => (
            <div key={s.label} className="bg-surface-container-low rounded-2xl p-4 text-center">
              <p className={`font-black text-3xl ${s.color}`}>{s.value}</p>
              <p className="text-on-surface-variant/60 text-[10px] font-bold uppercase tracking-wider mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Crop list */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : crops.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="text-center py-16 space-y-4"
          >
            <Leaf className="w-14 h-14 mx-auto text-on-surface-variant/20" />
            <p className="font-bold text-on-surface-variant">No crops logged yet</p>
            <p className="text-sm text-on-surface-variant/60">Tap the + button below to add your first crop</p>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {crops.map((crop, idx) => {
              const meta = STATUS_META[crop.status];
              const StatusIcon = meta.icon;
              const days = daysSince(crop.plantedDate);
              return (
                <motion.div
                  key={crop.id}
                  initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => navigate('/my-crops/' + crop.id)}
                  className="bg-surface-container-lowest rounded-[1.75rem] p-5 border border-outline-variant/10 shadow-sm relative overflow-visible cursor-pointer active:scale-[0.98] transition-transform"
                >
                  {/* Top row */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-black text-lg text-on-surface leading-tight">{crop.cropName}</h3>
                      {crop.localName && (
                        <p className="text-xs text-on-surface-variant/60 font-medium">{crop.localName}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={e => { e.stopPropagation(); navigate('/my-crops/' + crop.id); }}
                        className="p-2 rounded-xl bg-primary/10 hover:bg-primary/20 transition-colors"
                        title="AI পরামর্শ"
                      >
                        <Bot className="w-3.5 h-3.5 text-primary" />
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); openEditForm(crop); }}
                        className="p-2 rounded-xl hover:bg-surface-container-high transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5 text-on-surface-variant/50" />
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); handleDelete(crop.id!); }}
                        className="p-2 rounded-xl hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-400" />
                      </button>
                    </div>
                  </div>

                  {/* Info row */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    {crop.fieldName !== 'No field' && (
                      <span className="flex items-center gap-1 text-[10px] font-bold bg-surface-container-high px-2.5 py-1 rounded-full text-on-surface-variant">
                        <MapPin className="w-3 h-3" /> {crop.fieldName}{crop.fieldArea ? ` · ${crop.fieldArea}` : ''}
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-[10px] font-bold bg-surface-container-high px-2.5 py-1 rounded-full text-on-surface-variant">
                      <CalendarDays className="w-3 h-3" /> {days} দিন আগে বোনা
                    </span>
                    {crop.expectedHarvestDate && (
                      <span className="flex items-center gap-1 text-[10px] font-bold bg-amber-50 px-2.5 py-1 rounded-full text-amber-700">
                        🌾 {daysUntil(crop.expectedHarvestDate)} দিনে ফসল তোলা
                      </span>
                    )}
                  </div>

                  {crop.notes && (
                    <p className="text-xs text-on-surface-variant/70 italic mb-3 border-l-2 border-primary/30 pl-3">{crop.notes}</p>
                  )}

                  {/* Bottom row: status + tap hint */}
                  <div className="flex items-center justify-between">
                    <div className="relative inline-block" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => setStatusOpenFor(statusOpenFor === crop.id ? null : crop.id!)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold ${meta.bg} ${meta.text} transition-opacity active:opacity-70`}
                      >
                        <StatusIcon className="w-3 h-3" />
                        {meta.label}
                        <ChevronDown className={`w-3 h-3 transition-transform ${statusOpenFor === crop.id ? 'rotate-180' : ''}`} />
                      </button>
                      <AnimatePresence>
                        {statusOpenFor === crop.id && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.92, y: -4 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.92, y: -4 }}
                            className="absolute bottom-full mb-1 left-0 z-30 bg-surface-container-lowest rounded-2xl shadow-xl border border-outline-variant/20 overflow-hidden"
                          >
                            {(Object.entries(STATUS_META) as [PlantedCrop['status'], typeof STATUS_META[keyof typeof STATUS_META]][]).map(([key, m]) => {
                              const Icon = m.icon;
                              return (
                                <button
                                  key={key}
                                  onClick={() => handleStatusChange(crop, key)}
                                  className={`flex items-center gap-2 w-full px-4 py-2.5 text-xs font-bold hover:bg-surface-container-low transition-colors ${m.text}`}
                                >
                                  <Icon className="w-3.5 h-3.5" /> {m.label}
                                </button>
                              );
                            })}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    <span className="text-[9px] text-on-surface-variant/30 font-medium">বিস্তারিত দেখতে চাপুন →</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating Add Button */}
      <motion.button
        id="add-crop-fab"
        whileTap={{ scale: 0.9 }}
        onClick={openAddForm}
        className="fixed bottom-24 right-5 w-14 h-14 bg-primary text-white rounded-2xl shadow-2xl flex items-center justify-center z-20"
      >
        <Plus className="w-7 h-7" />
      </motion.button>

      {/* Add / Edit Bottom Sheet */}
      <AnimatePresence>
        {showForm && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-30 backdrop-blur-sm"
              onClick={() => setShowForm(false)}
            />

            {/* Sheet */}
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 260 }}
              className="fixed bottom-0 left-0 right-0 z-40 bg-surface rounded-t-[2rem] shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="px-5 pt-3 pb-safe-area-inset-bottom">
                {/* Handle */}
                <div className="w-10 h-1 bg-outline-variant/40 rounded-full mx-auto mb-5" />

                {/* Title */}
                <div className="flex items-center justify-between mb-5">
                  <h2 className="font-black text-xl text-on-surface">
                    {editingId ? 'Edit Crop' : 'Add Planted Crop'}
                  </h2>
                  <button onClick={() => { setShowForm(false); resetForm(); }}
                    className="p-2 rounded-xl hover:bg-surface-container-high"
                  >
                    <X className="w-5 h-5 text-on-surface-variant" />
                  </button>
                </div>

                <div className="space-y-4 pb-8">
                  {/* Crop name */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase text-on-surface-variant tracking-wider">Crop Name *</label>
                    <input
                      className={inputCls} placeholder="e.g. Tomato, Jute, Aman Rice"
                      value={formCropName} onChange={e => setFormCropName(e.target.value)}
                    />
                  </div>

                  {/* Local name */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase text-on-surface-variant tracking-wider">Local / Bangla Name</label>
                    <input
                      className={inputCls} placeholder="যেমন: টমেটো, পাট, আমন ধান"
                      value={formLocalName} onChange={e => setFormLocalName(e.target.value)}
                    />
                  </div>

                  {/* Field selector */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase text-on-surface-variant tracking-wider">Field / Land</label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setFieldOpen(o => !o)}
                        className={`${inputCls} flex items-center justify-between`}
                      >
                        <span className={selectedField ? 'text-on-surface' : 'text-on-surface-variant/40'}>
                          {selectedField
                            ? `${selectedField.field_name} · ${selectedField.area_size} ${selectedField.area_unit}`
                            : 'Select a saved field (optional)'}
                        </span>
                        <ChevronDown className={`w-4 h-4 text-on-surface-variant/50 transition-transform ${fieldOpen ? 'rotate-180' : ''}`} />
                      </button>
                      {fieldOpen && (
                        <div className="absolute z-50 mt-1 w-full bg-surface-container-lowest rounded-2xl shadow-xl border border-outline-variant/20 overflow-hidden">
                          <button
                            onClick={() => { setFormFieldId(''); setFieldOpen(false); }}
                            className="w-full px-4 py-3 text-sm text-left text-on-surface-variant hover:bg-surface-container-low transition-colors"
                          >
                            No specific field
                          </button>
                          {fields.map(f => (
                            <button key={f.field_id}
                              onClick={() => { setFormFieldId(f.field_id); setFieldOpen(false); }}
                              className="w-full px-4 py-3 text-sm text-left hover:bg-surface-container-low transition-colors border-t border-outline-variant/10"
                            >
                              <p className="font-bold">{f.field_name}</p>
                              <p className="text-xs text-on-surface-variant">{f.area_size} {f.area_unit}</p>
                            </button>
                          ))}
                          {fields.length === 0 && (
                            <div className="px-4 py-3 text-sm text-on-surface-variant">
                              No saved fields.{' '}
                              <button onClick={() => navigate('/fields')} className="text-primary font-bold underline">Add one</button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Dates */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase text-on-surface-variant tracking-wider">Planting Date *</label>
                      <input
                        type="date" className={inputCls}
                        value={formPlantedDate} onChange={e => setFormPlantedDate(e.target.value)}
                        max={new Date().toISOString().split('T')[0]}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase text-on-surface-variant tracking-wider">Expected Harvest</label>
                      <input
                        type="date" className={inputCls}
                        value={formHarvestDate} onChange={e => setFormHarvestDate(e.target.value)}
                        min={formPlantedDate || undefined}
                      />
                    </div>
                  </div>

                  {/* Status */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase text-on-surface-variant tracking-wider">Status</label>
                    <div className="flex gap-2">
                      {(Object.entries(STATUS_META) as [PlantedCrop['status'], typeof STATUS_META[keyof typeof STATUS_META]][]).map(([key, m]) => {
                        const Icon = m.icon;
                        return (
                          <button
                            key={key} type="button"
                            onClick={() => setFormStatus(key)}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold border-2 transition-all ${
                              formStatus === key
                                ? `${m.bg} ${m.text} border-current`
                                : 'bg-surface-container-low text-on-surface-variant/60 border-transparent'
                            }`}
                          >
                            <Icon className="w-3.5 h-3.5" /> {m.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase text-on-surface-variant tracking-wider">Notes</label>
                    <textarea
                      rows={3} className={inputCls} placeholder="Variety, soil treatment, irrigation method…"
                      value={formNotes} onChange={e => setFormNotes(e.target.value)}
                    />
                  </div>

                  {/* Save */}
                  <button
                    onClick={handleSave}
                    disabled={formLoading || !formCropName.trim() || !formPlantedDate}
                    className="w-full flex items-center justify-center gap-2 bg-primary text-white py-4 rounded-xl font-bold disabled:opacity-50 active:scale-[0.98] transition-all"
                  >
                    {formLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sprout className="w-5 h-5" />}
                    {editingId ? 'Save Changes' : 'Add Crop'}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </Layout>
  );
}
