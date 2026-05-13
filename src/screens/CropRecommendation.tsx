import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../AppContext';
import { useAuth } from '../AuthContext';
import Layout from '../components/Layout';
import Anthropic from '@anthropic-ai/sdk';
import { TrendingUp, ShieldCheck, CloudLightning, Leaf, Loader2, AlertCircle, MapPin, Thermometer, Droplets, History, Plus, ChevronDown, Trash2 } from 'lucide-react';

import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { getUserFields, addField, updateField, saveCropRecommendationResult, getCropRecommendationHistory, deleteCropRecommendationResult } from '../lib/db';
import type { CropRecResult, CropRecHistoryEntry } from '../lib/db';
import type { Field } from '../types';

interface WeatherData { temp: number; humidity: number; description: string; city: string; }

const SOIL_TYPES_BN = ['কাদামাটি', 'বালুমাটি', 'দোআঁশ', 'পলিমাটি', 'পিটমাটি', 'চুনাপাথরযুক্ত', 'মিশ্র'];
const SOIL_TYPES_EN = ['Clay', 'Sandy', 'Loamy', 'Silty', 'Peaty', 'Chalky', 'Mixed'];
const FERTILITY_BN = ['কম', 'মাঝারি', 'বেশি'];
const FERTILITY_EN = ['Low', 'Medium', 'High'];
const inputCls = 'w-full bg-surface-container-lowest rounded-xl p-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 border border-outline-variant/20';

function CropCard({ crop, idx, onClick, onSync }: { crop: CropRecResult; idx: number; onClick?: () => void; onSync?: () => void }) {
  return (
    <motion.div onClick={onClick} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
      transition={{ delay: idx * 0.1 }}
      className="bg-surface-container-lowest rounded-[2rem] p-6 shadow-lg border border-outline-variant/10 relative overflow-hidden cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all">
      <div className="absolute top-0 right-0 bg-primary text-on-primary px-4 py-2 rounded-bl-3xl font-black text-lg shadow-md">#{idx + 1}</div>
      <div className="pr-12">
        <h3 className="text-2xl font-black mb-1">{crop.cropName}</h3>
        <div className="flex items-center gap-2 mb-3">
          <div className="h-2 w-24 bg-surface-container-high rounded-full overflow-hidden">
            <div className="h-full bg-primary" style={{ width: `${crop.suitability}%` }} />
          </div>
          <span className="text-xs font-bold text-primary">{crop.suitability}% মিল</span>
        </div>
        {crop.growingSeason && <p className="text-xs text-on-surface-variant mb-3 font-medium">🌱 মৌসুম: {crop.growingSeason}</p>}
      </div>
      {crop.reasons?.length > 0 && (
        <div className="mb-4 space-y-1">
          {crop.reasons.slice(0, 2).map((r, i) => (
            <p key={i} className="text-xs text-on-surface-variant flex items-start gap-1"><span className="text-primary font-bold shrink-0">✓</span>{r}</p>
          ))}
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-surface-container-low p-3 rounded-2xl">
          <p className="text-[9px] font-bold text-on-surface-variant mb-1 uppercase">প্রত্যাশিত ফলন</p>
          <p className="text-lg font-black">{crop.expectedYield}</p>
        </div>
        <div className="bg-surface-container-low p-3 rounded-2xl">
          <p className="text-[9px] font-bold text-on-surface-variant mb-1 uppercase">আনু. মুনাফা</p>
          <p className="text-lg font-black text-tertiary">{crop.estimatedProfit}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <span className={cn('px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider',
          (crop.demand?.toLowerCase().includes('high') || crop.demand?.includes('উচ্চ')) ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800')}>
          {crop.demand}
        </span>
        <span className={cn('px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1',
          (crop.riskLevel?.toLowerCase().includes('low') || crop.riskLevel?.includes('কম')) ? 'bg-surface-container text-on-surface' : 'bg-red-100 text-red-800')}>
          <ShieldCheck className="w-3 h-3" />{crop.riskLevel}
        </span>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onSync && onSync();
        }}
        className="mt-4 w-full bg-primary/10 hover:bg-primary hover:text-white text-primary text-xs font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
      >
        <Plus className="w-4 h-4" />
        আমার মাঠে যোগ করুন
      </button>
    </motion.div>
  );
}

export default function CropRecommendation() {
  const { t } = useApp();
  const { currentUser } = useAuth();

  const navigate = useNavigate();
  const uid = currentUser?.uid ?? '';
  const SOIL_TYPES = SOIL_TYPES_BN;
  const FERTILITY = FERTILITY_BN;

  const [tab, setTab] = useState<'new' | 'history'>('new');
  const [fields, setFields] = useState<Field[]>([]);
  const [selectedField, setSelectedField] = useState<Field | null>(null);
  const [fieldOpen, setFieldOpen] = useState(false);

  // Soil inputs
  const [soilType, setSoilType] = useState('Loamy');
  const [ph, setPh] = useState('');
  const [n, setN] = useState('');
  const [p, setP] = useState('');
  const [k, setK] = useState('');
  const [moisture, setMoisture] = useState('');
  const [fertility, setFertility] = useState('Medium');

  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [prediction, setPrediction] = useState<{ results: CropRecResult[]; summary: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<CropRecHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedHistoryField, setSelectedHistoryField] = useState<string | null>(null);

  // Load user fields
  useEffect(() => {
    if (!uid) return;
    getUserFields(uid).then(setFields).catch(console.error);
  }, [uid]);

  // Load history when switching to history tab
  useEffect(() => {
    if (tab !== 'history' || !uid) return;
    setHistoryLoading(true);
    getCropRecommendationHistory(uid, 50).then(setHistory).catch(console.error).finally(() => setHistoryLoading(false));
  }, [tab, uid]);

  const fetchWeather = useCallback(async (lat: number, lng: number) => {
    const apiKey = import.meta.env.VITE_WEATHER_API_KEY;
    if (!apiKey) return;
    setWeatherLoading(true);
    try {
      const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&units=metric&appid=${apiKey}`);
      if (!res.ok) throw new Error('Weather fetch failed');
      const data = await res.json();
      setWeather({ temp: Math.round(data.main.temp), humidity: data.main.humidity, description: data.weather[0]?.description || 'Clear', city: data.name });
    } catch { /* silently ignore */ } finally { setWeatherLoading(false); }
  }, []);

  // When field selected → fetch weather from field's GPS location
  useEffect(() => {
    if (!selectedField) return;
    const { lat, lng } = selectedField.center_point;
    if (lat && lng) fetchWeather(lat, lng);
  }, [selectedField, fetchWeather]);

  // Fallback: auto-detect location if no field selected
  useEffect(() => {
    if (selectedField) return;
    const apiKey = import.meta.env.VITE_WEATHER_API_KEY;
    if (!apiKey) return;
    if (!('geolocation' in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      pos => fetchWeather(pos.coords.latitude, pos.coords.longitude),
      () => {/* ignore */},
      { timeout: 5000 }
    );
  }, [selectedField, fetchWeather]);

  const getRecommendation = async () => {
    if (!uid) { setError('Please log in first.'); return; }
    if (!n || !p || !k) { setError('Please enter NPK values.'); return; }
    const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
    if (!apiKey) { setError('Anthropic API key missing.'); return; }

    setLoading(true); setError(null); setPrediction(null);
    try {
      const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });

      // Derive current date and Bangladesh agricultural season
      const now = new Date();
      const month = now.getMonth() + 1; // 1-based
      const dateStr = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      const getBangladeshSeason = (m: number) => {
        if (m >= 3 && m <= 5)  return 'Pre-Kharif (March–May): Hot & dry pre-monsoon. Suitable for: Aus rice (early), watermelon, cucumber, bitter gourd, jute (late April onward), sesame, mung bean.';
        if (m >= 6 && m <= 9)  return 'Kharif / Aman (June–September): Monsoon season. Suitable for: Aman rice, jute, maize, ginger, turmeric, taro, sweet potato.';
        if (m >= 10 && m <= 11) return 'Rabi transition (October–November): Post-monsoon cooling. Suitable for: Boro rice seedbeds, potato (planting starts Nov), mustard, lentil, chickpea, onion, garlic.';
        return 'Rabi (December–February): Cool dry winter. Suitable for: Boro rice, wheat, potato (main harvest), mustard, lentil, cauliflower, cabbage, tomato, carrot.';
      };
      const currentSeason = getBangladeshSeason(month);

      const weatherCtx = weather
        ? `Current weather at ${weather.city}: ${weather.temp}°C, humidity ${weather.humidity}%, conditions: ${weather.description}.`
        : 'Weather data unavailable. Assume typical seasonal conditions for Bangladesh.';

      const fieldCtx = selectedField
        ? `Selected field: "${selectedField.field_name}", area: ${selectedField.area_size} ${selectedField.area_unit}, GPS: ${selectedField.center_point.lat.toFixed(4)}, ${selectedField.center_point.lng.toFixed(4)}.`
        : 'No specific field selected.';

      const prompt = `আপনি বাংলাদেশ কৃষিতে বিশেষজ্ঞ একজন কৃষিবিদ।

আজকের তারিখ: ${dateStr}
বর্তমান কৃষি মৌসুম: ${currentSeason}

গুরুত্বপূর্ণ নিয়ম: শুধুমাত্র এই মাসে (${now.toLocaleString('bn-BD', { month: 'long' })}) বপন বা রোপণের উপযুক্ত ফসল সুপারিশ করুন। যেসব ফসলের বপনের সময় শেষ হয়ে গেছে বা এখনও শুরু হয়নি সেগুলো সুপারিশ করবেন না।

মাঠের তথ্য: ${fieldCtx}
আবহাওয়া: ${weatherCtx}
মাটির তথ্য:
- ধরন: ${soilType}
- pH: ${ph || 'অজানা'}
- NPK: নাইট্রোজেন=${n} mg/kg, ফসফরাস=${p} mg/kg, পটাশিয়াম=${k} mg/kg
- আর্দ্রতা: ${moisture || 'উল্লেখ নেই'}
- উর্বরতা স্তর: ${fertility}

উপরের সমস্ত তথ্যের ভিত্তিতে বাংলাদেশে এই মাসে চাষের জন্য সবচেয়ে উপযুক্ত ৩টি ফসল সুপারিশ করুন।

শুধুমাত্র বৈধ JSON ফেরত দিন (কোনো মার্কডাউন নয়), সম্পূর্ণ বাংলায়:
{
  "recommendations": [
    {
      "cropName": "ফসলের নাম (বাংলা ও ইংরেজি)",
      "suitability": 95,
      "reasons": ["মাটি/আবহাওয়ার সাথে সম্পর্কিত কারণ", "আরেকটি নির্দিষ্ট কারণ"],
      "growingSeason": "যেমন: জুন–অক্টোবর (খরিফ)",
      "expectedYield": "যেমন: ৪.২ টন/হেক্টর",
      "estimatedProfit": "যেমন: +৳৮৪,২০০",
      "riskLevel": "কম ঝুঁকি",
      "demand": "উচ্চ চাহিদা"
    }
  ],
  "summary": "বর্তমান আবহাওয়া ও মাটির ভিত্তিতে কেন এই ফসলগুলো সেরা তা নিয়ে ২টি বাক্যে সংক্ষিপ্ত বিশ্লেষণ।"
}`;

      const response = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }],
      });
      const text = response.content[0].type === 'text' ? response.content[0].text : '';
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('Invalid AI response format.');
      const data = JSON.parse(match[0]);
      if (!data.recommendations?.length) throw new Error('No recommendations returned.');
      const pred = { results: data.recommendations as CropRecResult[], summary: data.summary || '' };
      setPrediction(pred);

      // Auto-save to Firebase
      setSaving(true);
      await saveCropRecommendationResult(uid, {
        field_id: selectedField?.field_id || '',
        field_name: selectedField?.field_name || 'No field selected',
        field_area: selectedField ? `${selectedField.area_size} ${selectedField.area_unit}` : '',
        soil: { type: soilType, ph, n, p, k, moisture, fertility },
        weather,
        results: pred.results,
        summary: pred.summary,
      });

    } catch (err: any) {
      console.error('AI Error:', err);
      const isBusy = err.message?.includes('503') || err.message?.toLowerCase().includes('demand') || err.message?.toLowerCase().includes('busy');
      setError(isBusy 
        ? 'The AI system is temporarily overloaded. Please try again in a few seconds.' 
        : `AI Error: ${err.message || 'Check your internet connection and API key.'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAsField = async (crop: CropRecResult) => {
    if (!uid) return;
    try {
      setLoading(true);
      if (selectedField?.field_id) {
        // Update the existing selected field's active crop
        await updateField(uid, selectedField.field_id, {
          active_crop: crop.cropName,
          health_status: 'healthy',
        });
      } else {
        // No field selected — create a new one
        await addField(uid, {
          field_name: `Field (${crop.cropName.split('/')[0].trim()})`,
          area_size: 0,
          area_unit: 'acres',
          geo_hash: '',
          center_point: { lat: 0, lng: 0 },
          soil_summary: { type: soilType, ph: parseFloat(ph) || 7 },
          input_mode: 'simple',
          active_crop: crop.cropName,
          health_status: 'healthy',
        });
      }
      navigate('/fields');
    } catch (err) {
      console.error('Sync field error:', err);
      setError('Failed to sync crop to field. Please try again.');
    } finally {
      setLoading(false); setSaving(false);
    }
  };

  const handleDeleteHistory = async (entry: CropRecHistoryEntry) => {
    if (!entry.id || !window.confirm('Delete this recommendation?')) return;
    await deleteCropRecommendationResult(uid, entry.id);
    setHistory(h => h.filter(x => x.id !== entry.id));
  };

  return (
    <Layout title={t('cropSelection')} showBack>
      <div className="px-6 pb-24 space-y-6">
        {/* Header */}
        <div>
          <span className="inline-block bg-primary-container text-on-primary px-3 py-1 rounded-full text-[10px] font-bold tracking-wider mb-2 uppercase">এআই সুপারিশ ইঞ্জিন</span>
          <h1 className="text-4xl font-black text-on-surface tracking-tight leading-tight">
            আপনার <span className="text-primary italic">ফসল</span> অপ্টিমাইজ করুন
          </h1>
          <p className="text-on-surface-variant text-sm mt-2">আবহাওয়া ও মাটির তথ্য ব্যবহার করে মাঠ-সচেতন এআই ফসল সুপারিশ।</p>
        </div>

        {/* Tabs */}
        <div className="flex bg-surface-container-low rounded-2xl p-1 gap-1">
          {(['new', 'history'] as const).map(t2 => (
            <button key={t2} onClick={() => setTab(t2)}
              className={cn('flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all',
                tab === t2 ? 'bg-primary text-white shadow-sm' : 'text-on-surface-variant')}>
              {t2 === 'new' ? <><Plus className="w-4 h-4" />{t('newRecommendation')}</> : <><History className="w-4 h-4" />{t('historyTab')}</>}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">

          {tab === 'new' && (
            <motion.div key="new" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">

              {/* Field Selector */}
              <div className="bg-surface-container-lowest rounded-[2rem] p-5 border border-outline-variant/10 shadow-sm space-y-3">
                <h3 className="font-black text-base flex items-center gap-2"><MapPin className="w-4 h-4 text-primary" />{t('selectField')}</h3>
                <div className="relative">
                  <button onClick={() => setFieldOpen(o => !o)}
                    className="w-full bg-surface-container-low rounded-xl px-4 py-3 text-sm font-bold text-left flex items-center justify-between border border-outline-variant/20">
                    <span className={selectedField ? 'text-on-surface' : 'text-on-surface-variant'}>
                      {selectedField ? `${selectedField.field_name} · ${selectedField.area_size} ${selectedField.area_unit}` : t('noFieldSelected')}
                    </span>
                    <ChevronDown className={cn('w-4 h-4 transition-transform', fieldOpen && 'rotate-180')} />
                  </button>
                  {fieldOpen && (
                    <div className="absolute z-20 mt-1 w-full bg-surface-container-lowest rounded-2xl shadow-xl border border-outline-variant/20 overflow-hidden">
                      <button onClick={() => { setSelectedField(null); setFieldOpen(false); }}
                        className="w-full px-4 py-3 text-sm text-left text-on-surface-variant hover:bg-surface-container-low transition-colors">
                        {t('noneDeviceLocation')}
                      </button>
                      {fields.length === 0 && <p className="px-4 py-3 text-sm text-on-surface-variant">{t('noSavedFields')}</p>}
                      {fields.map(f => (
                        <button key={f.field_id} onClick={() => { setSelectedField(f); setFieldOpen(false); }}
                          className="w-full px-4 py-3 text-sm text-left hover:bg-surface-container-low transition-colors border-t border-outline-variant/10">
                          <p className="font-bold">{f.field_name}</p>
                          <p className="text-xs text-on-surface-variant">{f.area_size} {f.area_unit} · {f.input_mode === 'polygon' ? 'GPS Mapped' : 'Simple'}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

              </div>

              {/* Weather Badge */}
              <div className="bg-surface-container-low p-4 rounded-2xl flex items-center justify-between border border-outline-variant/30">
                {weatherLoading ? (
                  <div className="flex items-center gap-2 text-on-surface-variant"><Loader2 className="w-4 h-4 animate-spin" /><span className="text-xs font-bold uppercase">{t('fetchingWeather')}</span></div>
                ) : weather ? (
                  <>
                    <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-primary" /><span className="font-bold text-sm">{weather.city}</span></div>
                    <div className="flex items-center gap-4 text-sm font-bold text-on-surface-variant">
                      <div className="flex items-center gap-1"><Thermometer className="w-4 h-4" />{weather.temp}°C</div>
                      <div className="flex items-center gap-1"><Droplets className="w-4 h-4" />{weather.humidity}%</div>
                    </div>
                  </>
                ) : (
                  <span className="text-xs font-bold text-on-surface-variant uppercase">{t('weatherUnavailable')}</span>
                )}
              </div>

              {/* Soil Form */}
              <div className="bg-white rounded-[2rem] p-6 shadow-xl border border-white/50 space-y-5">
                <h3 className="font-black text-lg flex items-center gap-2"><Leaf className="w-5 h-5 text-primary" />{t('soilData')}</h3>

                {/* Soil Type + Fertility */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-on-surface-variant">{t('soilTypeLabel')}</label>
                    <select value={soilType} onChange={e => setSoilType(e.target.value)} className={inputCls}>
                      {SOIL_TYPES.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-on-surface-variant">{t('fertilityLabel')}</label>
                    <select value={fertility} onChange={e => setFertility(e.target.value)} className={inputCls}>
                      {FERTILITY.map(f => <option key={f}>{f}</option>)}
                    </select>
                  </div>
                </div>

                {/* pH + Moisture */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-on-surface-variant">{t('phLevelLabel')}</label>
                    <input type="number" step="0.1" min="0" max="14" value={ph} onChange={e => setPh(e.target.value)} placeholder="যেমন: 6.5" className={inputCls} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-on-surface-variant">{t('moisturePct')}</label>
                    <input type="number" value={moisture} onChange={e => setMoisture(e.target.value)} placeholder="যেমন: 65" className={inputCls} />
                  </div>
                </div>

                {/* NPK */}
                <div>
                  <p className="text-[10px] font-bold uppercase text-on-surface-variant mb-2">{t('npkValues')}</p>
                  <div className="grid grid-cols-3 gap-3">
                    {[['N', n, setN], ['P', p, setP], ['K', k, setK]].map(([label, val, set]) => (
                      <div key={label as string} className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-on-surface-variant">{label as string}</label>
                        <input type="number" value={val as string} onChange={e => (set as any)(e.target.value)} placeholder="যেমন: 45" className={inputCls} />
                      </div>
                    ))}
                  </div>
                </div>

                <button onClick={getRecommendation} disabled={loading || !n || !p || !k}
                  className="w-full bg-primary text-on-primary py-4 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98] transition-transform">
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <TrendingUp className="w-5 h-5" />}
                  {loading ? t('analyzing') : saving ? t('savingLabel') : t('getRecommendations')}
                </button>
              </div>

              {/* Error */}
              {error && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="bg-error-container text-on-error-container p-5 rounded-[2rem] flex gap-3 border border-error/10">
                  <AlertCircle className="w-5 h-5 shrink-0" /><p className="text-sm font-bold">{error}</p>
                </motion.div>
              )}

              {/* Results */}
              {prediction && !loading && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                  <section className="bg-tertiary text-on-primary rounded-[2rem] p-6">
                    <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                      <CloudLightning className="w-5 h-5 fill-current" />{t('aiInsight')}
                    </h3>
                    <p className="text-on-primary/90 text-sm leading-relaxed">{prediction.summary}</p>
                  </section>
                  <div className="space-y-4">
                    <h3 className="font-black text-xl px-2">{t('topRecommendations')}</h3>
                    {(prediction.results as CropRecResult[]).map((crop: CropRecResult, idx: number) => (
                      <div key={idx}>
                        <CropCard crop={crop} idx={idx}
                          onClick={() => {
                            const params = new URLSearchParams({ crop: crop.cropName });
                            if (selectedField?.field_id) params.set('fieldId', selectedField.field_id);
                            navigate(`/tools/crops/roadmap?${params.toString()}`);
                          }}
                          onSync={() => handleAddAsField(crop)} />
                      </div>
                    ))}
                  </div>
                  <p className="text-center text-xs text-on-surface-variant">{t('savedToHistory')}</p>
                </motion.div>
              )}
            </motion.div>
          )}

          {tab === 'history' && (
            <motion.div key="history" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5">
              {historyLoading && <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>}
              {!historyLoading && history.length === 0 && (
                <div className="text-center py-16 text-on-surface-variant">
                  <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p className="font-bold">{t('noRecommendations')}</p>
                  <p className="text-sm mt-1">{t('generateFirst')}</p>
                  <button onClick={() => setTab('new')} className="mt-4 bg-primary text-white px-6 py-2.5 rounded-xl font-bold text-sm">{t('getStartedBtn')}</button>
                </div>
              )}

              {!historyLoading && history.length > 0 && (() => {
                // Derive unique fields from history
                const fieldMap = new Map<string, { name: string; count: number }>();
                history.forEach(e => {
                  const key = e.field_id || e.field_name;
                  const prev = fieldMap.get(key);
                  fieldMap.set(key, { name: e.field_name, count: (prev?.count ?? 0) + 1 });
                });
                const uniqueFields = Array.from(fieldMap.entries()).map(([id, v]) => ({ id, ...v }));
                const filteredHistory = selectedHistoryField
                  ? history.filter(e => (e.field_id || e.field_name) === selectedHistoryField)
                  : history;

                const formatDate = (ts: any) => {
                  if (!ts) return '';
                  const d = ts.toDate ? ts.toDate() : new Date(ts);
                  return d.toLocaleDateString('bn-BD', { day: 'numeric', month: 'long', year: 'numeric' });
                };

                return (
                  <>
                    {/* Field filter chips */}
                    <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                      <button
                        onClick={() => setSelectedHistoryField(null)}
                        className={cn('shrink-0 px-4 py-2 rounded-full text-xs font-bold transition-all',
                          !selectedHistoryField ? 'bg-primary text-white' : 'bg-surface-container text-on-surface-variant')}>
                        সব মাঠ ({history.length})
                      </button>
                      {uniqueFields.map(f => (
                        <button key={f.id}
                          onClick={() => setSelectedHistoryField(f.id)}
                          className={cn('shrink-0 px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap',
                            selectedHistoryField === f.id ? 'bg-primary text-white' : 'bg-surface-container text-on-surface-variant')}>
                          {f.name} ({f.count})
                        </button>
                      ))}
                    </div>

                    {/* History entries */}
                    {filteredHistory.map(entry => (
                      <div key={entry.id} className="bg-surface-container-lowest rounded-[2rem] p-5 border border-outline-variant/10 shadow-sm space-y-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap mb-0.5">
                              <p className="font-black text-lg leading-tight">{entry.field_name}</p>
                              {entry.generated_at && (
                                <span className="text-[10px] font-bold bg-surface-container px-2 py-0.5 rounded-full text-on-surface-variant">
                                  {formatDate(entry.generated_at)}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-on-surface-variant mt-0.5">
                              {entry.field_area && `${entry.field_area} · `}
                              মাটি: {entry.soil.type} · pH {entry.soil.ph || '?'} · N{entry.soil.n}/P{entry.soil.p}/K{entry.soil.k}
                            </p>
                            {entry.weather && (
                              <p className="text-xs text-on-surface-variant mt-0.5">
                                📍 {entry.weather.city} · {entry.weather.temp}°C · আর্দ্রতা {entry.weather.humidity}%
                              </p>
                            )}
                          </div>
                          <button onClick={() => handleDeleteHistory(entry)} className="text-outline hover:text-red-500 transition-colors p-1 shrink-0">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {entry.summary && (
                          <p className="text-xs text-on-surface-variant italic border-l-2 border-primary/30 pl-3 leading-relaxed">{entry.summary}</p>
                        )}

                        <div className="space-y-2">
                          {entry.results.map((crop, i) => (
                            <button
                              key={i}
                              onClick={() => {
                                const params = new URLSearchParams({ crop: crop.cropName });
                                if (entry.field_id) params.set('fieldId', entry.field_id);
                                navigate(`/tools/crops/roadmap?${params.toString()}`);
                              }}
                              className="w-full flex items-center justify-between bg-surface-container-low hover:bg-primary/5 rounded-2xl px-4 py-3 transition-colors text-left">
                              <div className="min-w-0">
                                <p className="font-bold text-sm">#{i + 1} {crop.cropName}</p>
                                {crop.growingSeason && <p className="text-xs text-on-surface-variant mt-0.5">🌱 {crop.growingSeason}</p>}
                                {crop.reasons?.[0] && <p className="text-xs text-on-surface-variant mt-0.5 truncate">{crop.reasons[0]}</p>}
                              </div>
                              <div className="text-right shrink-0 ml-3">
                                <p className="font-black text-primary text-sm">{crop.suitability}%</p>
                                <p className="text-xs text-on-surface-variant">{crop.expectedYield}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </>
                );
              })()}
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </Layout>
  );
}
