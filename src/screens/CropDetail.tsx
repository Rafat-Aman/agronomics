import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import Layout from '../components/Layout';
import { GoogleGenAI } from '@google/genai';
import {
  Sprout, Trash2, Loader2, CalendarDays, MapPin, Sparkles,
  ChevronDown, CheckCircle2, XCircle, Bot, Pencil, Save,
  X, AlertCircle, Clock, MessageSquare, Leaf
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  getPlantedCrops, updatePlantedCrop, deletePlantedCrop,
  getCropAdviceHistory, saveCropAdvice, deleteCropAdvice,
  getUserFields,
  type PlantedCrop, type CropAdvice,
} from '../lib/db';
import type { Field } from '../types';

// ── Helpers ────────────────────────────────────────────────────────────────

const STATUS_META = {
  growing:   { label: 'চাষাবাদ চলছে', bg: 'bg-emerald-100', text: 'text-emerald-700', icon: Sprout },
  harvested: { label: 'ফসল তোলা হয়েছে', bg: 'bg-blue-100', text: 'text-blue-700', icon: CheckCircle2 },
  failed:    { label: 'ব্যর্থ', bg: 'bg-red-100', text: 'text-red-700', icon: XCircle },
} as const;

function daysSince(d: string) {
  return Math.max(0, Math.floor((Date.now() - new Date(d).getTime()) / 86_400_000));
}
function daysUntil(d: string) {
  return Math.max(0, Math.floor((new Date(d).getTime() - Date.now()) / 86_400_000));
}
function fmtDate(ts: any): string {
  if (!ts) return '';
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('bn-BD', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function renderMarkdown(text: string): React.ReactNode[] {
  const parseBold = (s: string): React.ReactNode[] =>
    s.split(/(\*\*[^*]+\*\*)/).map((p, j) =>
      p.startsWith('**') && p.endsWith('**')
        ? <strong key={j} className="font-bold text-on-surface">{p.slice(2, -2)}</strong>
        : p
    );
  return text.split('\n').map((line, i) => {
    const t = line.trim();
    if (!t) return <div key={i} className="h-1.5" />;
    const num = t.match(/^(\d+)\.\s+(.*)/);
    if (num) return <div key={i} className="flex gap-2 py-0.5"><span className="font-bold text-primary shrink-0">{num[1]}.</span><span>{parseBold(num[2])}</span></div>;
    const bul = t.match(/^[*\-]\s+(.*)/);
    if (bul) return <div key={i} className="flex gap-2 py-0.5 pl-3"><span className="text-primary shrink-0">•</span><span>{parseBold(bul[1])}</span></div>;
    if (t.startsWith('##')) return <p key={i} className="font-black text-on-surface mt-3 mb-1">{parseBold(t.replace(/^#+\s*/, ''))}</p>;
    return <p key={i} className="py-0.5 leading-relaxed">{parseBold(t)}</p>;
  });
}

const inputCls = 'w-full bg-surface-container-low rounded-xl px-3 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30 border border-outline-variant/20 text-on-surface placeholder:text-on-surface-variant/40';

// ── Component ──────────────────────────────────────────────────────────────

export default function CropDetail() {
  const { cropId } = useParams<{ cropId: string }>();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const uid = currentUser?.uid ?? '';

  const [crop, setCrop] = useState<PlantedCrop | null>(null);
  const [fields, setFields] = useState<Field[]>([]);
  const [advice, setAdvice] = useState<CropAdvice[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit form
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editLocal, setEditLocal] = useState('');
  const [editFieldId, setEditFieldId] = useState('');
  const [editPlanted, setEditPlanted] = useState('');
  const [editHarvest, setEditHarvest] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editStatus, setEditStatus] = useState<PlantedCrop['status']>('growing');
  const [editFieldOpen, setEditFieldOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // AI
  const [userNote, setUserNote] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const load = useCallback(async (userId: string, cId: string) => {
    setLoading(true);
    try {
      const [allCrops, allFields, adviceList] = await Promise.all([
        getPlantedCrops(userId),
        getUserFields(userId),
        getCropAdviceHistory(userId, cId).catch(() => []),
      ]);
      const found = allCrops.find(c => c.id === cId) ?? null;
      setCrop(found);
      setFields(allFields);
      setAdvice(adviceList);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (uid && cropId) load(uid, cropId);
  }, [uid, cropId, load]);

  const openEdit = () => {
    if (!crop) return;
    setEditName(crop.cropName);
    setEditLocal(crop.localName ?? '');
    setEditFieldId(crop.fieldId ?? '');
    setEditPlanted(crop.plantedDate);
    setEditHarvest(crop.expectedHarvestDate ?? '');
    setEditNotes(crop.notes ?? '');
    setEditStatus(crop.status);
    setEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!crop?.id || !editName.trim() || !editPlanted) return;
    setSaving(true);
    const sel = fields.find(f => f.field_id === editFieldId);
    await updatePlantedCrop(uid, crop.id, {
      cropName: editName.trim(),
      localName: editLocal.trim() || undefined,
      fieldId: editFieldId,
      fieldName: sel?.field_name ?? crop.fieldName,
      fieldArea: sel ? `${sel.area_size} ${sel.area_unit}` : crop.fieldArea,
      plantedDate: editPlanted,
      expectedHarvestDate: editHarvest || undefined,
      notes: editNotes.trim() || undefined,
      status: editStatus,
    });
    setSaving(false);
    setEditing(false);
    if (uid && cropId) load(uid, cropId);
  };

  const handleDelete = async () => {
    if (!crop?.id || !window.confirm(`"${crop.cropName}" মুছে ফেলবেন?`)) return;
    await deletePlantedCrop(uid, crop.id);
    navigate('/my-crops');
  };

  const handleDeleteAdvice = async (a: CropAdvice) => {
    if (!cropId || !a.id || !window.confirm('এই পরামর্শটি মুছবেন?')) return;
    await deleteCropAdvice(uid, cropId, a.id);
    setAdvice(prev => prev.filter(x => x.id !== a.id));
  };

  const handleGetAdvice = async () => {
    if (!crop || !cropId) return;
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) { setAiError('Gemini API key নেই।'); return; }
    setAiLoading(true); setAiError(null);
    const now = new Date();
    const dateStr = now.toLocaleDateString('bn-BD', { year: 'numeric', month: 'long', day: 'numeric' });
    const days = daysSince(crop.plantedDate);
    const harvestInfo = crop.expectedHarvestDate ? `আনুমানিক ${daysUntil(crop.expectedHarvestDate)} দিন পরে ফসল তোলার সময়` : 'ফসল তোলার তারিখ নির্ধারিত নয়';
    const prompt = `আপনি বাংলাদেশের কৃষকদের জন্য একজন বিশেষজ্ঞ কৃষিবিদ।

আজকের তারিখ: ${dateStr}

ফসলের তথ্য:
- ফসলের নাম: ${crop.cropName}${crop.localName ? ` (${crop.localName})` : ''}
- জমির নাম: ${crop.fieldName}${crop.fieldArea ? ` (${crop.fieldArea})` : ''}
- বপনের দিন থেকে: ${days} দিন আগে (${crop.plantedDate} তারিখে বোনা হয়েছে)
- ${harvestInfo}
${crop.notes ? `- কৃষকের নোট: ${crop.notes}` : ''}
${userNote.trim() ? `\nকৃষক আজ জানাচ্ছেন: "${userNote.trim()}"` : ''}

উপরের তথ্যের ভিত্তিতে এই ফসলের জন্য বিস্তারিত পরামর্শ দিন:
১. বর্তমান বৃদ্ধির পর্যায়
২. এই সপ্তাহের যত্নের পরামর্শ (সেচ, সার, আগাছা দমন)
৩. পোকামাকড় বা রোগের ঝুঁকি
৪. ফসল তোলার প্রস্তুতির মূল্যায়ন

সম্পূর্ণ উত্তর বাংলায় লিখুন। বুলেট পয়েন্ট ব্যবহার করুন।`;
    try {
      const ai = new GoogleGenAI({ apiKey });
      const result = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
      const content = result.text ?? '';
      const savedId = await saveCropAdvice(uid, cropId, { userNote: userNote.trim() || undefined, content });
      setAdvice(prev => [{ id: savedId, userNote: userNote.trim() || undefined, content, generated_at: new Date() }, ...prev]);
      setUserNote('');
    } catch (err: any) {
      setAiError(err.message || 'AI অনুরোধ ব্যর্থ হয়েছে।');
    } finally {
      setAiLoading(false);
    }
  };

  if (loading) return (
    <Layout showBack title="ফসলের বিবরণ">
      <div className="flex justify-center pt-24"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
    </Layout>
  );

  if (!crop) return (
    <Layout showBack title="ফসলের বিবরণ">
      <div className="text-center pt-24 text-on-surface-variant">ফসলটি পাওয়া যায়নি।</div>
    </Layout>
  );

  const meta = STATUS_META[crop.status];
  const StatusIcon = meta.icon;
  const days = daysSince(crop.plantedDate);
  const editSelField = fields.find(f => f.field_id === editFieldId);

  return (
    <Layout showBack title={crop.cropName}>
      <div className="px-4 sm:px-5 pb-28 space-y-5">

        {/* ── Crop Info Card ── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          className="bg-surface-container-lowest rounded-[1.75rem] p-5 border border-outline-variant/10 shadow-sm">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h2 className="font-black text-2xl text-on-surface">{crop.cropName}</h2>
              {crop.localName && <p className="text-sm text-on-surface-variant/60">{crop.localName}</p>}
            </div>
            <div className="flex gap-1.5">
              <button onClick={openEdit} className="p-2 rounded-xl hover:bg-surface-container-high transition-colors">
                <Pencil className="w-4 h-4 text-on-surface-variant/60" />
              </button>
              <button onClick={handleDelete} className="p-2 rounded-xl hover:bg-red-50 transition-colors">
                <Trash2 className="w-4 h-4 text-red-400" />
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-3">
            {crop.fieldName !== 'No field' && (
              <span className="flex items-center gap-1 text-[10px] font-bold bg-surface-container-high px-2.5 py-1 rounded-full text-on-surface-variant">
                <MapPin className="w-3 h-3" /> {crop.fieldName}{crop.fieldArea ? ` · ${crop.fieldArea}` : ''}
              </span>
            )}
            <span className="flex items-center gap-1 text-[10px] font-bold bg-surface-container-high px-2.5 py-1 rounded-full text-on-surface-variant">
              <CalendarDays className="w-3 h-3" /> {days} দিন আগে বোনা হয়েছে
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

          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold ${meta.bg} ${meta.text}`}>
            <StatusIcon className="w-3 h-3" /> {meta.label}
          </span>
        </motion.div>

        {/* ── AI Advice Generator ── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-surface-container-lowest rounded-[1.75rem] p-5 border border-outline-variant/10 shadow-sm space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Bot className="w-4 h-4 text-primary" />
            <h3 className="font-black text-sm uppercase tracking-wide text-on-surface">AI পরামর্শ নিন</h3>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase text-on-surface-variant tracking-wider">
              আজ আপনার ফসলের অবস্থা জানান (ঐচ্ছিক)
            </label>
            <textarea
              rows={3} className={inputCls}
              placeholder="যেমন: পাতা হলুদ হয়ে যাচ্ছে, অনেক বৃষ্টি হয়েছে, ফুল আসতে শুরু করেছে…"
              value={userNote} onChange={e => setUserNote(e.target.value)}
            />
          </div>
          {aiError && (
            <div className="flex items-start gap-2 bg-red-50 text-red-700 p-3 rounded-xl border border-red-100">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <p className="text-xs font-semibold">{aiError}</p>
            </div>
          )}
          <button
            onClick={handleGetAdvice}
            disabled={aiLoading}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-primary to-primary/80 text-white font-bold shadow active:scale-[0.98] transition-all disabled:opacity-60"
          >
            {aiLoading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> বিশ্লেষণ করা হচ্ছে…</>
              : <><Sparkles className="w-4 h-4" /> পরামর্শ তৈরি করুন ও সংরক্ষণ করুন</>
            }
          </button>
        </motion.div>

        {/* ── Advice Timeline ── */}
        <div>
          <div className="flex items-center gap-2 mb-3 px-1">
            <Clock className="w-4 h-4 text-on-surface-variant/50" />
            <h3 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/50">পরামর্শের ইতিহাস</h3>
            <span className="ml-auto text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full">{advice.length}টি</span>
          </div>

          {advice.length === 0 ? (
            <div className="text-center py-10 space-y-2">
              <MessageSquare className="w-10 h-10 mx-auto text-on-surface-variant/20" />
              <p className="text-sm text-on-surface-variant/60 font-medium">এখনো কোনো পরামর্শ নেই</p>
              <p className="text-xs text-on-surface-variant/40">উপরের বাটনে চাপুন পরামর্শ পেতে</p>
            </div>
          ) : (
            <div className="relative space-y-4">
              {/* Timeline line */}
              <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-outline-variant/20 rounded-full" />
              {advice.map((a, idx) => (
                <motion.div
                  key={a.id}
                  initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="relative pl-10"
                >
                  {/* Timeline dot */}
                  <div className="absolute left-2.5 top-4 w-3 h-3 rounded-full bg-primary border-2 border-surface" />

                  <div className="bg-surface-container-lowest rounded-2xl p-4 border border-outline-variant/10 shadow-sm">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-primary" />
                        <span className="text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-wider">
                          {fmtDate(a.generated_at)}
                        </span>
                      </div>
                      <button
                        onClick={() => handleDeleteAdvice(a)}
                        className="p-1 rounded-lg hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-300" />
                      </button>
                    </div>

                    {a.userNote && (
                      <div className="flex items-start gap-2 bg-surface-container-high rounded-xl px-3 py-2 mb-3">
                        <MessageSquare className="w-3 h-3 text-primary/60 shrink-0 mt-0.5" />
                        <p className="text-xs text-on-surface-variant italic">"{a.userNote}"</p>
                      </div>
                    )}

                    <div className="text-sm text-on-surface-variant space-y-0.5">
                      {renderMarkdown(a.content)}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Edit Bottom Sheet ── */}
      <AnimatePresence>
        {editing && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-30 backdrop-blur-sm" onClick={() => setEditing(false)} />
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 260 }}
              className="fixed bottom-0 left-0 right-0 z-40 bg-surface rounded-t-[2rem] shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="px-5 pt-3 pb-10">
                <div className="w-10 h-1 bg-outline-variant/40 rounded-full mx-auto mb-5" />
                <div className="flex items-center justify-between mb-5">
                  <h2 className="font-black text-xl text-on-surface">ফসলের তথ্য আপডেট করুন</h2>
                  <button onClick={() => setEditing(false)} className="p-2 rounded-xl hover:bg-surface-container-high">
                    <X className="w-5 h-5 text-on-surface-variant" />
                  </button>
                </div>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase text-on-surface-variant tracking-wider">ফসলের নাম *</label>
                    <input className={inputCls} value={editName} onChange={e => setEditName(e.target.value)} placeholder="যেমন: পাট, ধান" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase text-on-surface-variant tracking-wider">স্থানীয় / বাংলা নাম</label>
                    <input className={inputCls} value={editLocal} onChange={e => setEditLocal(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase text-on-surface-variant tracking-wider">জমি</label>
                    <div className="relative">
                      <button type="button" onClick={() => setEditFieldOpen(o => !o)}
                        className={`${inputCls} flex items-center justify-between`}>
                        <span className={editSelField ? 'text-on-surface' : 'text-on-surface-variant/40'}>
                          {editSelField ? `${editSelField.field_name} · ${editSelField.area_size} ${editSelField.area_unit}` : 'জমি নির্বাচন করুন'}
                        </span>
                        <ChevronDown className={`w-4 h-4 transition-transform ${editFieldOpen ? 'rotate-180' : ''}`} />
                      </button>
                      {editFieldOpen && (
                        <div className="absolute z-50 mt-1 w-full bg-surface-container-lowest rounded-2xl shadow-xl border border-outline-variant/20 overflow-hidden">
                          <button onClick={() => { setEditFieldId(''); setEditFieldOpen(false); }}
                            className="w-full px-4 py-3 text-sm text-left text-on-surface-variant hover:bg-surface-container-low">
                            কোনো নির্দিষ্ট জমি নেই
                          </button>
                          {fields.map(f => (
                            <button key={f.field_id} onClick={() => { setEditFieldId(f.field_id); setEditFieldOpen(false); }}
                              className="w-full px-4 py-3 text-sm text-left hover:bg-surface-container-low border-t border-outline-variant/10">
                              <p className="font-bold">{f.field_name}</p>
                              <p className="text-xs text-on-surface-variant">{f.area_size} {f.area_unit}</p>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase text-on-surface-variant tracking-wider">বপনের তারিখ *</label>
                      <input type="date" className={inputCls} value={editPlanted} onChange={e => setEditPlanted(e.target.value)} max={new Date().toISOString().split('T')[0]} />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase text-on-surface-variant tracking-wider">ফসল তোলার তারিখ</label>
                      <input type="date" className={inputCls} value={editHarvest} onChange={e => setEditHarvest(e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase text-on-surface-variant tracking-wider">অবস্থা</label>
                    <div className="flex gap-2">
                      {(Object.entries(STATUS_META) as [PlantedCrop['status'], typeof STATUS_META[keyof typeof STATUS_META]][]).map(([key, m]) => {
                        const Icon = m.icon;
                        return (
                          <button key={key} type="button" onClick={() => setEditStatus(key)}
                            className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-xl text-[10px] font-bold border-2 transition-all ${editStatus === key ? `${m.bg} ${m.text} border-current` : 'bg-surface-container-low text-on-surface-variant/60 border-transparent'}`}>
                            <Icon className="w-3 h-3" /> {m.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase text-on-surface-variant tracking-wider">নোট</label>
                    <textarea rows={3} className={inputCls} value={editNotes} onChange={e => setEditNotes(e.target.value)} placeholder="বীজের জাত, সেচ পদ্ধতি…" />
                  </div>
                  <button onClick={handleSaveEdit} disabled={saving || !editName.trim() || !editPlanted}
                    className="w-full flex items-center justify-center gap-2 bg-primary text-white py-4 rounded-xl font-bold disabled:opacity-50">
                    {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    পরিবর্তন সংরক্ষণ করুন
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
