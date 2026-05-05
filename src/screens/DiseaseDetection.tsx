import { useState, useRef, useEffect, ChangeEvent } from 'react';
import Anthropic from '@anthropic-ai/sdk';
import {
  Camera,
  Leaf,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Scan,
  RefreshCw,
  ShieldCheck,
  Sprout,
  FlaskConical,
  ThumbsUp,
  ChevronRight,
  Save,
  MapPin,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Layout from '../components/Layout';
import { cn } from '../lib/utils';
import { useAuth } from '../AuthContext';
import { useNavigate } from 'react-router-dom';
import { getUserFields, updateField, getPlantedCrops } from '../lib/db';
import type { PlantedCrop } from '../lib/db';
import type { Field } from '../types';

interface DiagnosisResult {
  disease: string;
  description: string;
  confidence: string;
  treatmentSteps: string[];
  preventionTips: string[];
  severity: 'low' | 'medium' | 'high';
  affectedCrop: string;
  diagnosisCategory?: string;
}

export default function DiseaseDetection() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const uid = currentUser?.uid ?? '';

  const [image, setImage] = useState<string | null>(null);
  const [prediction, setPrediction] = useState<DiagnosisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Field[]>([]);
  const [selectedFieldId, setSelectedFieldId] = useState<string>('');
  const [plantedCrops, setPlantedCrops] = useState<PlantedCrop[]>([]);
  const [saving, setSaving] = useState(false);
  const [savedOk, setSavedOk] = useState(false);
  const [suspectedDisease, setSuspectedDisease] = useState<string>('');
  const [correctionOpen, setCorrectionOpen] = useState(false);
  const [correctedDisease, setCorrectedDisease] = useState<string>('');
  const [correcting, setCorrecting] = useState(false);
  const [isCorrected, setIsCorrected] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!uid) return;
    getUserFields(uid).then(setFields).catch(() => {});
  }, [uid]);

  useEffect(() => {
    if (!uid || !selectedFieldId) { setPlantedCrops([]); return; }
    getPlantedCrops(uid)
      .then(all => setPlantedCrops(all.filter(c => c.fieldId === selectedFieldId)))
      .catch(() => {});
  }, [uid, selectedFieldId]);

  const buildFieldContext = (field: Field, crops: PlantedCrop[]): string => {
    const lines = [
      'FIELD CONTEXT (use this to improve diagnosis accuracy):',
      `- Field: "${field.field_name}" (${field.area_size} ${field.area_unit})`,
      `- Soil type: ${field.soil_summary.type}, pH: ${field.soil_summary.ph}`,
    ];
    if (field.active_crop) lines.push(`- Active crop on record: ${field.active_crop}`);
    if (field.health_status && field.health_status !== 'unknown')
      lines.push(`- Current field health: ${field.health_status.replace('_', ' ')}`);
    const growing = crops.filter(c => c.status === 'growing');
    if (growing.length > 0) {
      lines.push('- Ongoing crops:');
      growing.forEach(c => {
        const days = Math.floor((Date.now() - new Date(c.plantedDate).getTime()) / 86400000);
        lines.push(
          `  • ${c.cropName}${c.localName ? ` / ${c.localName}` : ''} — planted ${days} days ago` +
          `${c.expectedHarvestDate ? `, harvest expected ${c.expectedHarvestDate}` : ''}` +
          `${c.notes ? `; notes: ${c.notes}` : ''}`
        );
      });
    }
    const past = crops.filter(c => c.status !== 'growing').slice(0, 4);
    if (past.length > 0) {
      lines.push('- Past crops (history):');
      past.forEach(c => lines.push(`  • ${c.cropName} (${c.status}, planted ${c.plantedDate})`));
    }
    return lines.join('\n');
  };

  const handleImageUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
    if (!allowedMimeTypes.has(file.type)) {
      setImage(null);
      setPrediction(null);
      setSavedOk(false);
      setError('Please upload a valid image file (JPG, PNG, or WEBP).');
      event.target.value = '';
      return;
    }

    setImage(URL.createObjectURL(file));
    setPrediction(null);
    setError(null);
    setSavedOk(false);
    setSuspectedDisease('');
    setCorrectionOpen(false);
    setCorrectedDisease('');
    setIsCorrected(false);
  };

  const analyzeImage = async () => {
    if (!image) return;
    const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
    if (!apiKey) { setError('Anthropic API key is missing from .env'); return; }

    setLoading(true);
    setError(null);

    try {
      const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
      const blob = await fetch(image).then(r => r.blob());
      const base64Data = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(blob);
      });

      const selectedField = fields.find((f: Field) => f.field_id === selectedFieldId);
      const fieldContext = selectedField ? buildFieldContext(selectedField, plantedCrops) : '';
      const hintLine = suspectedDisease.trim()
        ? `\nFARMER HINT: The farmer suspects this may be "${suspectedDisease.trim().replace(/"/g, "'")}". Weigh this heavily but rely primarily on the visual evidence from Step 1.\n`
        : '';

      const prompt = `You are an expert plant pathologist and agronomist specializing in Bangladesh crops.
${fieldContext ? `${fieldContext}\n` : ''}${hintLine}
Analyze the leaf image above using this 3-step approach:

STEP 1 — VISUAL CLASSIFICATION (what do you literally see on the leaf?):
  A) Fungal disease — dark sunken spots with concentric rings (Anthracnose), powdery/fluffy coatings, rust pustules, circular lesions with defined margins, spore bodies
  B) Bacterial disease — angular water-soaked lesions bounded by leaf veins, bacterial ooze, wilting without spores
  C) Viral disease — mosaic/mottled colour, distorted leaf shape, yellow vein banding
  D) Insect/pest damage — irregular holes, skeletonization (veins exposed with tissue removed), visible frass, stippling, rolled or webbed leaves
  E) Nutrient deficiency — uniform interveinal chlorosis, tip/margin burn in predictable patterns

STEP 2 — SPECIFIC DIAGNOSIS:
Combine the visual symptoms from Step 1 WITH the field context above (crop type, growth stage, soil, history) to name the most likely specific disease. Field context helps confirm likelihood — e.g. knowing it is jute at 20 days helps distinguish Anthracnose from stem rot — but the visual category from Step 1 must not be overridden by crop-pest stereotypes. If the leaf shows fungal lesions, classify as a fungal disease regardless of what pests the crop typically attracts.

STEP 3 — TREATMENT & PREVENTION:
Use the field context (soil type, crop age, area size, past history) to tailor every treatment step and prevention tip to this specific field.\n
Return ONLY valid JSON in this exact structure:
{
  "diagnosisCategory": "Fungal disease | Bacterial disease | Viral disease | Insect/pest damage | Nutrient deficiency",
  "disease": "Disease name in English and Bengali (e.g. Anthracnose / অ্যানথ্রাকনোজ)",
  "affectedCrop": "Crop name (e.g. Rice, Wheat, Tomato)",
  "description": "2-sentence clinical description referencing the specific visual markers observed in the image",
  "confidence": "88%",
  "severity": "low | medium | high",
  "treatmentSteps": [
    "Step 1: Immediate action with specifics",
    "Step 2: Fungicide/pesticide with specific product name available in Bangladesh",
    "Step 3: Follow-up care tailored to this field",
    "Step 4: Monitoring schedule"
  ],
  "preventionTips": [
    "Prevention measure 1",
    "Prevention measure 2",
    "Prevention measure 3"
  ]
}
If the image is NOT a plant/leaf, return {"error": "Please upload a clear photo of a plant leaf."}`;

      const response = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 2048,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: blob.type as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif',
                data: base64Data,
              },
            },
            { type: 'text', text: prompt },
          ],
        }],
      });

      const text = response.content[0].type === 'text' ? response.content[0].text : '';
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('Invalid AI response format.');
      const data = JSON.parse(match[0]);
      if (data.error) throw new Error(data.error);

      setPrediction(data);
    } catch (err: any) {
      const isBusy = err.message?.includes('503') || err.message?.toLowerCase().includes('overloaded');
      setError(isBusy
        ? 'AI is temporarily busy. Please retry in a moment.'
        : err.message || 'Analysis failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToField = async () => {
    if (!uid || !selectedFieldId || !prediction) return;
    setSaving(true);
    try {
      await updateField(uid, selectedFieldId, {
        health_status: prediction.severity === 'high' ? 'critical' : prediction.severity === 'medium' ? 'attention_needed' : 'healthy',
        active_crop: prediction.affectedCrop || undefined,
      });
      setSavedOk(true);
    } catch {
      setError('Could not save to field. Try again.');
    } finally {
      setSaving(false);
    }
  };

  const regenerateTreatmentPlan = async () => {
    if (!correctedDisease.trim() || !prediction) return;
    const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
    if (!apiKey) return;
    setCorrecting(true);
    setError(null);
    const selectedField = fields.find((f: Field) => f.field_id === selectedFieldId);
    const fieldContext = selectedField ? buildFieldContext(selectedField, plantedCrops) : '';
    const correctionPrompt = `You are an expert plant pathologist and agronomist specializing in Bangladesh crops.
The confirmed disease (corrected by the farmer after reviewing visual symptoms) is: "${correctedDisease.trim().replace(/"/g, "'")}"
Affected crop: "${prediction.affectedCrop}"
${fieldContext ? `\n${fieldContext}\n` : ''}
Generate a complete and accurate treatment plan and prevention tips specifically for ${correctedDisease.trim()} on ${prediction.affectedCrop} in Bangladesh.
Tailor the treatment steps to the field conditions above.

Return ONLY valid JSON:
{
  "description": "2-sentence clinical description of ${correctedDisease.trim()} and its spread pattern",
  "severity": "low | medium | high",
  "treatmentSteps": [
    "Step 1: Immediate action",
    "Step 2: Fungicide/pesticide with specific product name available in Bangladesh",
    "Step 3: Follow-up care",
    "Step 4: Monitoring schedule"
  ],
  "preventionTips": [
    "Prevention measure 1",
    "Prevention measure 2",
    "Prevention measure 3"
  ]
}`;
    try {
      const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
      const response = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 2048,
        messages: [{ role: 'user', content: correctionPrompt }],
      });
      const text = response.content[0].type === 'text' ? response.content[0].text : '';
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('Invalid AI response format.');
      const data = JSON.parse(match[0]);
      setPrediction((prev: DiagnosisResult | null) => prev ? {
        ...prev,
        disease: correctedDisease.trim(),
        description: data.description ?? prev.description,
        severity: data.severity ?? prev.severity,
        treatmentSteps: data.treatmentSteps ?? prev.treatmentSteps,
        preventionTips: data.preventionTips ?? prev.preventionTips,
      } : prev);
      setIsCorrected(true);
      setCorrectionOpen(false);
    } catch (err: any) {
      const isBusy = err.message?.includes('503') || err.message?.toLowerCase().includes('overloaded');
      setError(isBusy
        ? 'AI is temporarily busy. Please retry in a moment.'
        : err.message || 'Could not regenerate plan. Try again.');
    } finally {
      setCorrecting(false);
    }
  };

  const severityColor = {
    low: 'bg-green-500',
    medium: 'bg-amber-500',
    high: 'bg-red-500',
  };
  const severityBg = {
    low: 'bg-green-50 text-green-800 border-green-200',
    medium: 'bg-amber-50 text-amber-800 border-amber-200',
    high: 'bg-red-50 text-red-700 border-red-200',
  };

  return (
    <Layout title="Vision AI Scanner" showBack>
      <div className="min-h-screen bg-surface px-5 py-4 pb-28 space-y-6">

        {/* Header */}
        <section className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-primary/10 rounded-xl text-primary"><Scan className="w-5 h-5" /></span>
            <span className="text-[10px] font-black text-primary uppercase tracking-widest">Next-Gen Vision AI</span>
          </div>
          <h1 className="text-4xl font-black text-on-surface leading-tight">
            Protect Your <span className="text-primary italic">Harvest</span>
          </h1>
          <p className="text-on-surface-variant text-sm font-medium">Upload a leaf photo for instant AI disease diagnosis, treatment steps & prevention tips.</p>
        </section>

        {/* Upload Card */}
        <motion.div layout className="bg-white rounded-[2.5rem] p-5 shadow-xl border border-white/50 relative overflow-hidden">
          {!image ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="aspect-square rounded-[2rem] border-2 border-dashed border-primary/20 bg-primary/5 flex flex-col items-center justify-center gap-4 cursor-pointer hover:bg-primary/10 transition-all active:scale-95"
            >
              <div className="p-6 bg-white rounded-full shadow-lg"><Camera className="w-8 h-8 text-primary" /></div>
              <div className="text-center">
                <p className="font-bold text-on-surface">Upload Leaf Photo</p>
                <p className="text-xs text-on-surface-variant">Focus clearly on the affected area</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative aspect-square rounded-[2rem] overflow-hidden border-4 border-white shadow-2xl">
                <img src={image} className="w-full h-full object-cover" alt="Uploaded leaf" />
                {loading && (
                  <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex flex-col items-center justify-center text-white">
                    <Loader2 className="w-12 h-12 animate-spin mb-3" />
                    <span className="font-black text-xs uppercase tracking-widest">AI Pathologist Analyzing…</span>
                  </div>
                )}
              </div>
              {!loading && !prediction && (
                <div className="flex gap-3">
                  <button onClick={() => { setImage(null); setPrediction(null); }} className="flex-1 py-4 bg-surface-container text-on-surface font-bold rounded-2xl flex justify-center gap-2">
                    <RefreshCw className="w-4 h-4" /> Retake
                  </button>
                  <button onClick={analyzeImage} className="flex-[2] py-4 bg-primary text-on-primary font-bold rounded-2xl flex justify-center gap-2 shadow-lg shadow-primary/30">
                    <CheckCircle2 className="w-4 h-4" /> Scan with AI
                  </button>
                </div>
              )}
              {prediction && (
                <button onClick={() => { setImage(null); setPrediction(null); setSavedOk(false); setSuspectedDisease(''); setCorrectionOpen(false); setCorrectedDisease(''); setIsCorrected(false); }} className="w-full py-3 bg-surface-container text-on-surface font-bold rounded-2xl flex justify-center gap-2">
                  <Camera className="w-4 h-4" /> Scan Another Leaf
                </button>
              )}
            </div>
          )}
          <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
        </motion.div>

        {/* Suspected Disease Hint */}
        {image && !prediction && (
          <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-[2.5rem] p-5 shadow-md border border-outline-variant/10 space-y-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
              Suspected Disease <span className="font-normal normal-case text-on-surface-variant/60">(optional)</span>
            </p>
            <input
              type="text"
              value={suspectedDisease}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setSuspectedDisease(e.target.value)}
              placeholder="e.g. Anthracnose / অ্যানথ্রাকনোজ"
              className="w-full bg-surface-container-low rounded-xl px-4 py-3 text-sm font-medium border border-outline-variant/20 focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-on-surface-variant/40"
            />
            <p className="text-[10px] text-on-surface-variant/60">If you already suspect a disease, type it here to guide the AI.</p>
          </motion.div>
        )}

        {/* Field Context Selector */}
        {uid && fields.length > 0 && !prediction && (
          <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-[2.5rem] p-5 shadow-md border border-outline-variant/10 space-y-3">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-primary/10 rounded-lg text-primary"><MapPin className="w-4 h-4" /></span>
              <span className="text-[10px] font-black uppercase tracking-widest text-primary">Field Context</span>
              <span className="ml-auto text-[10px] text-on-surface-variant font-medium">Optional</span>
            </div>
            <p className="text-xs text-on-surface-variant">Select a field so the AI can use your soil type, planted crops, and history for a more accurate diagnosis.</p>
            <select
              value={selectedFieldId}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => setSelectedFieldId(e.target.value)}
              className="w-full bg-surface-container-low rounded-xl px-4 py-3 text-sm font-bold border border-outline-variant/20 focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">— No field selected —</option>
              {fields.map((f: Field) => (
                <option key={f.field_id} value={f.field_id ?? ''}>{f.field_name}</option>
              ))}
            </select>
            {selectedFieldId && (() => {
              const f = fields.find((x: Field) => x.field_id === selectedFieldId);
              if (!f) return null;
              const growing = plantedCrops.filter((c: PlantedCrop) => c.status === 'growing');
              return (
                <div className="bg-primary/5 rounded-2xl px-4 py-3 space-y-1 text-xs text-on-surface-variant border border-primary/10">
                  <p><span className="font-bold text-on-surface">Soil:</span> {f.soil_summary.type}, pH {f.soil_summary.ph}</p>
                  {f.active_crop && <p><span className="font-bold text-on-surface">Active crop:</span> {f.active_crop}</p>}
                  {growing.length > 0 && (
                    <p><span className="font-bold text-on-surface">Growing:</span> {growing.map((c: PlantedCrop) => `${c.cropName} (${Math.floor((Date.now() - new Date(c.plantedDate).getTime()) / 86400000)}d)`).join(', ')}</p>
                  )}
                  {f.health_status && f.health_status !== 'unknown' && (
                    <p><span className="font-bold text-on-surface">Last health status:</span> {f.health_status.replace('_', ' ')}</p>
                  )}
                </div>
              );
            })()}
          </motion.div>
        )}

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-red-50 text-red-700 p-4 rounded-2xl flex gap-3 border border-red-200">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p className="text-sm font-bold">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results */}
        <AnimatePresence>
          {prediction && (
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="space-y-5 pb-6">

              {/* Diagnosis Card */}
              <div className="bg-white rounded-[2.5rem] p-7 shadow-xl relative overflow-hidden">
                <div className={cn('absolute top-6 right-6 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border', severityBg[prediction.severity])}>
                  {prediction.severity} severity
                </div>

                <div className="space-y-5">
                  {/* Disease name + correction */}
                  <div>
                    <p className="text-primary font-bold text-[10px] uppercase tracking-widest mb-1 flex items-center gap-1">
                      <Leaf className="w-3 h-3" /> Diagnosis
                      {prediction.diagnosisCategory && (
                        <span className="ml-auto bg-surface-container text-on-surface-variant/70 px-2 py-0.5 rounded-full text-[9px] font-bold">{prediction.diagnosisCategory}</span>
                      )}
                    </p>
                    <div className="flex items-start gap-2 flex-wrap">
                      <h2 className="text-3xl font-black text-on-surface leading-tight">{prediction.disease}</h2>
                      {isCorrected && (
                        <span className="mt-2 px-2 py-0.5 bg-amber-100 text-amber-800 text-[9px] font-black uppercase tracking-widest rounded-full border border-amber-200 shrink-0">
                          Farmer corrected
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-on-surface-variant font-medium mt-1">Affected Crop: <span className="font-bold text-on-surface">{prediction.affectedCrop}</span></p>

                    {!isCorrected && (
                      <button
                        onClick={() => { setCorrectedDisease(prediction.disease); setCorrectionOpen((v: boolean) => !v); }}
                        className="mt-2 text-[11px] text-on-surface-variant/50 underline underline-offset-2 hover:text-red-600 transition-colors"
                      >
                        Incorrect diagnosis?
                      </button>
                    )}

                    <AnimatePresence>
                      {correctionOpen && !isCorrected && (
                        <motion.div key="correction-form" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                          <div className="mt-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-3">
                            <p className="text-xs font-bold text-amber-800">Enter the correct disease name:</p>
                            <input
                              type="text"
                              value={correctedDisease}
                              onChange={(e: ChangeEvent<HTMLInputElement>) => setCorrectedDisease(e.target.value)}
                              placeholder="e.g. Anthracnose / অ্যানথ্রাকনোজ"
                              className="w-full bg-white rounded-xl px-3 py-2.5 text-sm font-medium border border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-400/40"
                            />
                            <button
                              onClick={regenerateTreatmentPlan}
                              disabled={correcting || !correctedDisease.trim()}
                              className="w-full py-3 bg-amber-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 disabled:opacity-40 active:scale-[0.98] transition-transform text-sm"
                            >
                              {correcting
                                ? <><Loader2 className="w-4 h-4 animate-spin" /> Regenerating…</>
                                : <><RefreshCw className="w-4 h-4" /> Regenerate Treatment Plan</>}
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Confidence bar */}
                  <div>
                    <div className="flex justify-between text-xs font-bold text-on-surface-variant mb-1">
                      <span>AI Confidence</span>
                      <span className="text-primary">{prediction.confidence}</span>
                    </div>
                    <div className="h-2 w-full bg-surface-container rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: prediction.confidence }}
                        transition={{ duration: 0.8, delay: 0.3 }}
                        className={cn('h-full rounded-full', severityColor[prediction.severity])}
                      />
                    </div>
                  </div>

                  {/* Severity indicator */}
                  <div className="grid grid-cols-3 gap-2">
                    {(['low', 'medium', 'high'] as const).map(s => (
                      <div key={s} className={cn('p-2 rounded-xl text-center text-[10px] font-black uppercase tracking-wider border', prediction.severity === s ? severityBg[s] : 'bg-surface-container text-on-surface-variant/40 border-transparent')}>
                        {s}
                      </div>
                    ))}
                  </div>

                  <p className="text-on-surface-variant font-medium leading-relaxed text-sm">{prediction.description}</p>
                </div>
              </div>

              {/* Treatment Steps */}
              <div className="bg-white rounded-[2.5rem] p-7 shadow-xl space-y-4">
                <h3 className="font-black text-lg flex items-center gap-2 text-primary">
                  <FlaskConical className="w-5 h-5" /> Treatment Plan
                </h3>
                <div className="space-y-3">
                  {prediction.treatmentSteps.map((step, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="flex gap-3 items-start bg-primary/5 rounded-2xl p-4 border border-primary/10"
                    >
                      <span className="w-7 h-7 shrink-0 rounded-full bg-primary text-white text-xs font-black flex items-center justify-center">{i + 1}</span>
                      <p className="text-sm font-medium text-on-surface leading-snug">{step}</p>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Prevention Tips */}
              <div className="bg-green-50 rounded-[2.5rem] p-7 border border-green-200 space-y-4">
                <h3 className="font-black text-lg flex items-center gap-2 text-green-800">
                  <ShieldCheck className="w-5 h-5" /> Prevention Tips
                </h3>
                <ul className="space-y-2">
                  {prediction.preventionTips.map((tip, i) => (
                    <li key={i} className="flex gap-2 items-start text-sm text-green-800 font-medium">
                      <ThumbsUp className="w-4 h-4 shrink-0 mt-0.5 text-green-600" />
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Save to Field */}
              {fields.length > 0 && (
                <div className="bg-white rounded-[2.5rem] p-6 shadow-md border border-outline-variant/10 space-y-3">
                  <h3 className="font-black text-base flex items-center gap-2">
                    <Sprout className="w-5 h-5 text-primary" /> Update Field Health Status
                  </h3>
                  <p className="text-xs text-on-surface-variant">Mark a field as affected to track its health on your dashboard.</p>
                  <select
                    value={selectedFieldId}
                    onChange={e => setSelectedFieldId(e.target.value)}
                    className="w-full bg-surface-container-low rounded-xl px-4 py-3 text-sm font-bold border border-outline-variant/20 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="">— Select a field —</option>
                    {fields.map(f => (
                      <option key={f.field_id} value={f.field_id}>{f.field_name}</option>
                    ))}
                  </select>
                  {savedOk ? (
                    <div className="flex items-center gap-2 text-green-700 font-bold text-sm bg-green-50 p-3 rounded-xl">
                      <CheckCircle2 className="w-5 h-5" /> Field health updated successfully!
                    </div>
                  ) : (
                    <button
                      onClick={handleSaveToField}
                      disabled={!selectedFieldId || saving}
                      className="w-full bg-primary text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-40 active:scale-[0.98] transition-transform"
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      {saving ? 'Saving…' : 'Save Health Report to Field'}
                    </button>
                  )}
                </div>
              )}

              {/* Navigate to crop recommendation */}
              <button
                onClick={() => navigate('/tools/crops')}
                className="w-full flex items-center justify-between bg-surface-container-low rounded-2xl px-5 py-4 border border-outline-variant/20 hover:border-primary/30 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                    <Sprout className="w-5 h-5 text-primary" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-sm text-on-surface">Get Crop Recommendations</p>
                    <p className="text-xs text-on-surface-variant">Find disease-resistant crops for this field</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-on-surface-variant/40" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Layout>
  );
}
