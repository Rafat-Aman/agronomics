import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, BookOpen, Calendar, CheckCircle2, Clock,
  Info, Sprout, Lightbulb, Share2, Bookmark, RefreshCw,
  ChevronRight, MessageCircle, Loader2, AlertCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Layout from '../components/Layout';
import { useApp } from '../AppContext';
import { GoogleGenAI } from '@google/genai';
import { cn } from '../lib/utils';

// Season badge colors
const SEASON_COLORS: Record<string, string> = {
  'Kharif-1': 'bg-green-100 text-green-800',
  'Kharif-2': 'bg-emerald-100 text-emerald-800',
  'Rabi':     'bg-blue-100 text-blue-800',
  'Boro':     'bg-cyan-100 text-cyan-800',
  'Aman':     'bg-teal-100 text-teal-800',
  'Aus':      'bg-lime-100 text-lime-800',
};

export default function GuideDetail() {
  const { t, language } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [tip, setTip] = useState<any>(location.state?.tip ?? null);
  const [saved, setSaved] = useState(false);
  const [shared, setShared] = useState(false);
  const [qaQuestion, setQaQuestion] = useState('');
  const [qaAnswer, setQaAnswer] = useState<string | null>(null);
  const [qaLoading, setQaLoading] = useState(false);
  const [qaError, setQaError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // ── If no tip passed, show empty state ─────────────────────────────────────
  if (!tip) {
    return (
      <Layout showBack title="Guide Detail">
        <div className="flex flex-col items-center justify-center pt-20 px-6 text-center space-y-4">
          <Info className="w-12 h-12 text-on-surface-variant/30" />
          <p className="text-on-surface-variant/60 font-medium">{t('noGuideSelected')}</p>
          <button onClick={() => navigate('/dashboard')} className="bg-primary text-on-primary px-6 py-3 rounded-2xl font-bold">
            {t('returnDashboard')}
          </button>
        </div>
      </Layout>
    );
  }

  // ── Refresh: generate a fresh guide on the SAME topic ──────────────────────
  const handleRefresh = async () => {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) return;
    setRefreshing(true);
    setQaAnswer(null);
    try {
      const ai = new GoogleGenAI({ apiKey });
      const lang = language === 'bn' ? 'Bengali' : 'English';
      const prompt = `You are a senior Bangladeshi agronomist.
Generate a COMPLETELY DIFFERENT and unique farming guide about: "${tip.title}" in ${lang}.
Use different examples, different statistics, and different approach than before.
Today: ${new Date().toLocaleDateString('en-BD')}.

Return ONLY valid JSON:
{
  "title": "New unique title about the same topic",
  "category": "${tip.category}",
  "season": "${tip.season || 'All Seasons'}",
  "focus": "One word",
  "desc": "2 different sentences with a new specific fact",
  "steps": [
    {"title": "Step", "detail": "Specific detail with quantity/timing"},
    {"title": "Step", "detail": "Specific detail"},
    {"title": "Step", "detail": "Specific detail"},
    {"title": "Step", "detail": "Specific detail"}
  ],
  "proTip": "A different expert insight with measurable outcome",
  "relatedQuestion": "A different realistic farmer question"
}`;
      const result = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
      const match = result.text.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('Bad response');
      const data = JSON.parse(match[0]);
      setTip((prev: any) => ({ ...prev, ...data }));
    } catch (err) {
      console.error('Refresh error', err);
    } finally {
      setRefreshing(false);
    }
  };

  // ── Ask a question about this guide ────────────────────────────────────────
  const handleAsk = async (q?: string) => {
    const query = q ?? qaQuestion.trim();
    if (!query) return;
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) { setQaError('API key missing'); return; }
    setQaLoading(true);
    setQaError(null);
    setQaAnswer(null);
    if (q) setQaQuestion(q);
    try {
      const ai = new GoogleGenAI({ apiKey });
      const lang = language === 'bn' ? 'Bengali' : 'English';
      const prompt = `You are a senior Bangladeshi agronomist. Context: "${tip.title}".
Answer this farmer's question in ${lang} in under 120 words. Be specific, practical, and mention exact quantities or timings.
Question: ${query}
Answer:`;
      const result = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
      setQaAnswer(result.text.trim());
    } catch {
      setQaError('Could not get answer. Please try again.');
    } finally {
      setQaLoading(false);
    }
  };

  // ── Save / Share ────────────────────────────────────────────────────────────
  const handleSave = () => {
    try {
      const saved = JSON.parse(localStorage.getItem('saved_guides') || '[]');
      const exists = saved.find((g: any) => g.title === tip.title);
      if (!exists) {
        saved.unshift({ ...tip, savedAt: Date.now() });
        localStorage.setItem('saved_guides', JSON.stringify(saved.slice(0, 20)));
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch { /* ignore */ }
  };

  const handleShare = async () => {
    const text = `${tip.title}\n\n${tip.desc}\n\nSource: Agronomics AI`;
    try {
      if (navigator.share) {
        await navigator.share({ title: tip.title, text });
      } else {
        await navigator.clipboard.writeText(text);
      }
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    } catch { /* ignore */ }
  };

  const seasonColor = SEASON_COLORS[tip.season] || 'bg-surface-container text-on-surface-variant';
  const steps = tip.steps || [];
  const relatedQ = tip.relatedQuestion || `How do I improve results for ${tip.title}?`;

  return (
    <Layout showBack title={tip.category || 'Guide'}>
      <div className="px-4 sm:px-6 pb-24 space-y-6">

        {/* Hero Image */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative h-60 rounded-[2.5rem] overflow-hidden shadow-2xl"
        >
          <img src={tip.image} alt={tip.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <div className="absolute bottom-5 left-5 right-5 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-primary px-3 py-1 rounded-full text-[10px] font-bold text-white uppercase tracking-widest">
                {tip.category}
              </span>
              {tip.season && (
                <span className={cn('px-3 py-1 rounded-full text-[10px] font-bold uppercase', seasonColor)}>
                  {tip.season}
                </span>
              )}
              <div className="flex items-center gap-1 text-white/60 text-xs font-medium">
                <Clock className="w-3 h-3" />
                <span>5 min read</span>
              </div>
            </div>
            <h1 className="text-2xl font-headline font-black text-white leading-tight">{tip.title}</h1>
          </div>

          {/* Refresh overlay button */}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="absolute top-4 right-4 w-9 h-9 bg-black/40 backdrop-blur-md rounded-xl border border-white/20 flex items-center justify-center text-white hover:bg-black/60 transition-colors disabled:opacity-60"
            title={t('generateFresh')}
          >
            <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} />
          </button>
        </motion.div>

        {/* Quick Info Card */}
        <section className="bg-surface-container-low rounded-[2rem] p-6 border border-outline-variant/10 space-y-4 shadow-sm">
          <div className="flex items-center gap-3 text-primary mb-1">
            <Lightbulb className="w-5 h-5" />
            <h2 className="text-base font-bold">Today's Essential Goal</h2>
          </div>
          <p className="text-on-surface-variant leading-relaxed font-medium text-sm">{tip.desc}</p>

          <div className="pt-3 grid grid-cols-2 gap-4 border-t border-outline-variant/10">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                <Calendar className="w-4 h-4 text-emerald-700" />
              </div>
              <div>
                <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">{t('seasonLabel2')}</p>
                <p className="text-sm font-bold text-on-surface">{tip.season || t('allMethods')}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                <Sprout className="w-4 h-4 text-blue-700" />
              </div>
              <div>
                <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">{t('focusLabel')}</p>
                <p className="text-sm font-bold text-on-surface">{tip.focus || t('aiEngine')}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Step-by-Step Guide */}
        {steps.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-headline font-bold text-on-surface px-1">{t('detailedSteps')}</h2>
            <div className="space-y-2">
              {steps.map((item: any, idx: number) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + idx * 0.08 }}
                  className="flex gap-4"
                >
                  <div className="flex flex-col items-center">
                    <div className="w-10 h-10 rounded-2xl bg-primary text-white flex items-center justify-center font-black text-sm shrink-0">
                      {idx + 1}
                    </div>
                    {idx < steps.length - 1 && (
                      <div className="w-[2px] flex-grow bg-primary/20 my-2" />
                    )}
                  </div>
                  <div className="pb-5 flex-1">
                    <h3 className="font-bold text-on-surface mb-1">{item.title || item.step}</h3>
                    <p className="text-sm text-on-surface-variant leading-relaxed font-medium">{item.detail}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Pro Tip */}
        {tip.proTip && (
          <section className="bg-primary/5 rounded-[2rem] p-6 border border-primary/10 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-primary/10 rounded-bl-[3rem]" />
            <div className="relative flex items-start gap-4">
              <div className="bg-primary text-white p-2.5 rounded-xl shadow-lg shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="space-y-1.5">
                <h3 className="font-bold text-primary">{t('proTipTitle')}</h3>
                <p className="text-sm text-on-surface-variant font-medium leading-relaxed">
                  "{tip.proTip}"
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleSave}
            className={cn('flex-1 font-bold py-4 rounded-2xl border flex items-center justify-center gap-2 transition-all',
              saved ? 'bg-primary text-white border-primary' : 'bg-surface-container-high text-on-surface border-outline-variant/20 hover:bg-surface-container')}
          >
            <Bookmark className="w-5 h-5" />
            {saved ? t('savedConfirm') : t('saveGuide')}
          </button>
          <button onClick={handleShare}
            className={cn('flex-1 font-bold py-4 rounded-2xl border flex items-center justify-center gap-2 transition-all',
              shared ? 'bg-green-600 text-white border-green-600' : 'bg-surface-container-high text-on-surface border-outline-variant/20 hover:bg-surface-container')}
          >
            <Share2 className="w-5 h-5" />
            {shared ? t('copiedConfirm') : t('share')}
          </button>
          <button onClick={handleRefresh} disabled={refreshing}
            className="w-14 h-14 bg-surface-container-high rounded-2xl border border-outline-variant/20 flex items-center justify-center hover:bg-surface-container transition-all disabled:opacity-60">
            <RefreshCw className={cn('w-5 h-5 text-primary', refreshing && 'animate-spin')} />
          </button>
        </div>

        {/* Ask a Question */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-on-surface">{t('askAgronomist')}</h3>
          </div>

          {/* Quick-tap related question */}
          <button
            onClick={() => handleAsk(relatedQ)}
            className="w-full text-left bg-surface-container-lowest border border-outline-variant/10 rounded-2xl p-4 flex items-center gap-3 hover:border-primary/30 transition-all"
          >
            <BookOpen className="w-4 h-4 text-on-surface-variant shrink-0" />
            <p className="text-xs text-on-surface-variant italic flex-1">"{relatedQ}"</p>
            <ChevronRight className="w-4 h-4 text-on-surface-variant/40 shrink-0" />
          </button>

          {/* Manual input */}
          <div className="flex gap-2">
            <input
              value={qaQuestion}
              onChange={e => setQaQuestion(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAsk()}
              placeholder={t('typeQuestion')}
              className="flex-1 bg-surface-container-low rounded-xl px-4 py-3 text-sm font-medium border border-outline-variant/20 focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <button
              onClick={() => handleAsk()}
              disabled={qaLoading || !qaQuestion.trim()}
              className="bg-primary text-white px-4 rounded-xl font-bold disabled:opacity-40 active:scale-95 transition-transform"
            >
              {qaLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ChevronRight className="w-5 h-5" />}
            </button>
          </div>

          {/* Answer */}
          <AnimatePresence>
            {qaError && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2 text-red-700 bg-red-50 p-4 rounded-2xl text-sm border border-red-200">
                <AlertCircle className="w-5 h-5 shrink-0" /> {qaError}
              </motion.div>
            )}
            {qaAnswer && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-primary/5 border border-primary/20 rounded-2xl p-5 space-y-2"
              >
                <div className="flex items-center gap-2 text-primary font-black text-[10px] uppercase tracking-wider">
                  <Sprout className="w-4 h-4" /> {t('aiAnswerLabel')}
                </div>
                <p className="text-sm font-medium text-on-surface leading-relaxed">{qaAnswer}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Navigation */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex-1 bg-surface-container-low text-on-surface font-bold py-3.5 rounded-2xl border border-outline-variant/20 flex items-center justify-center gap-2 hover:bg-surface-container transition-all text-sm">
            <ArrowLeft className="w-4 h-4" /> {t('backToDashboard')}
          </button>
          <button onClick={() => navigate('/tools')}
            className="flex-1 bg-primary text-white font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 text-sm active:scale-95 transition-transform">
            {t('knowledgeCenterBtn')} <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </Layout>
  );
}
