import { useState } from 'react';
import { useApp } from '../AppContext';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { GoogleGenAI } from '@google/genai';
import {
  BookOpen, Sprout, Bug, Microscope, ArrowRight, Clock,
  Droplets, Sun, Wind, FlaskConical, Leaf, Loader2,
  AlertCircle, SendHorizonal, ChevronDown, ChevronUp,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

// Seasonal pest calendar for Bangladesh
const PEST_CALENDAR = [
  { month: 'Jan–Feb', season: 'Rabi', pests: ['Aphids on mustard', 'Powdery mildew on wheat'], crops: ['Wheat', 'Mustard', 'Potato'], color: 'bg-blue-50 border-blue-200 text-blue-800' },
  { month: 'Mar–Apr', season: 'Pre-Kharif', pests: ['Brown plant hopper', 'Leaf blast on rice', 'Kalbaishakhi storm risk'], crops: ['Boro Rice', 'Jute (sowing)'], color: 'bg-amber-50 border-amber-200 text-amber-800' },
  { month: 'May–Jun', season: 'Kharif-1', pests: ['Stem borer', 'Sheath blight', 'White fly'], crops: ['Aus Rice', 'Jute', 'Okra'], color: 'bg-green-50 border-green-200 text-green-800' },
  { month: 'Jul–Sep', season: 'Kharif-2', pests: ['Neck blast', 'Yellow stem borer', 'Bacterial blight'], crops: ['Aman Rice', 'Vegetables'], color: 'bg-emerald-50 border-emerald-200 text-emerald-800' },
  { month: 'Oct–Dec', season: 'Late Kharif', pests: ['Rodents', 'Grain weevil', 'Post-harvest fungus'], crops: ['Aman harvest', 'Wheat (sowing)', 'Winter veg'], color: 'bg-orange-50 border-orange-200 text-orange-800' },
];

// Farming practices quick guides
const QUICK_GUIDES = [
  { icon: Droplets, title: 'Irrigation Schedule', desc: 'Alternate wetting & drying (AWD) saves 30% water. Irrigate when soil cracks 1cm deep.', color: 'bg-sky-500', tag: 'Water' },
  { icon: FlaskConical, title: 'Soil pH Management', desc: 'Apply lime if pH < 5.5. Use gypsum for saline soils. Test every season for best yield.', color: 'bg-amber-500', tag: 'Soil' },
  { icon: Sun, title: 'Sunlight Optimization', desc: 'Ensure 6–8 hrs direct sun. Thin overcrowded plants. North-south row orientation maximizes light.', color: 'bg-yellow-500', tag: 'Growth' },
  { icon: Wind, title: 'Storm Protection', desc: 'Use windbreaks/bamboo stakes. Harvest before cyclone warnings. Cover seedlings with nets.', color: 'bg-slate-500', tag: 'Safety' },
  { icon: Leaf, title: 'Organic Composting', desc: 'Apply 5–10 t/ha compost before transplanting. Speeds up nutrient cycling by 40%.', color: 'bg-green-600', tag: 'Organic' },
  { icon: Microscope, title: 'Integrated Pest Mgmt', desc: 'Use pheromone traps, sticky traps, and neem oil first. Chemical sprays as last resort only.', color: 'bg-purple-500', tag: 'IPM' },
];

// AI Farming Q&A
function FarmingQA() {
  const { t } = useApp();
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const SAMPLE_QUESTIONS = [
    'ধান চাষে সেচের সঠিক সময় কখন?',
    'How to control stem borer in rice?',
    'পাটের সোনালি আঁশ রক্ষার উপায় কী?',
    'Best fertilizer schedule for tomatoes in Bangladesh?',
  ];

  const askAI = async (q?: string) => {
    const query = q || question.trim();
    if (!query) return;
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) { setError('API key missing.'); return; }
    setLoading(true); setError(null); setAnswer(null);
    if (q) setQuestion(q);
    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `You are a senior Bangladeshi agronomist with 20 years of field experience.
Answer this farming question in the same language as the question (Bengali or English).
Be practical, specific, and mention exact product names, quantities, and timings where relevant.
Keep the answer under 150 words and use simple language a farmer can understand.

Question: ${query}

Answer:`;
      const result = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
      setAnswer(result.text.trim());
    } catch { setError('Could not get answer. Please try again.'); }
    finally { setLoading(false); }
  };

  return (
    <section className="space-y-4">
      <div>
        <h3 className="text-xl font-black text-on-surface">{t('askAiTitle')}</h3>
        <p className="text-xs text-on-surface-variant mt-1">{t('askAiDesc')}</p>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
        {SAMPLE_QUESTIONS.map((q, i) => (
          <button key={i} onClick={() => askAI(q)}
            className="shrink-0 bg-surface-container-low text-on-surface text-xs font-medium px-3 py-2 rounded-full border border-outline-variant/20 hover:border-primary/40 hover:text-primary transition-all whitespace-nowrap">
            {q}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <input value={question} onChange={e => setQuestion(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && askAI()}
          placeholder={t('typeQuestion')}
          className="flex-1 bg-surface-container-low rounded-xl px-4 py-3 text-sm font-medium border border-outline-variant/20 focus:outline-none focus:ring-2 focus:ring-primary/20" />
        <button onClick={() => askAI()} disabled={loading || !question.trim()}
          className="bg-primary text-white p-3 rounded-xl disabled:opacity-40 active:scale-95 transition-transform">
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <SendHorizonal className="w-5 h-5" />}
        </button>
      </div>
      <AnimatePresence>
        {error && (<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2 text-red-700 bg-red-50 p-4 rounded-2xl text-sm border border-red-200"><AlertCircle className="w-5 h-5 shrink-0" /> {error}</motion.div>)}
        {answer && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-primary/5 border border-primary/20 rounded-2xl p-5 space-y-2">
            <div className="flex items-center gap-2 text-primary font-black text-xs uppercase tracking-wider"><Sprout className="w-4 h-4" /> {t('aiAnswerLabel')}</div>
            <p className="text-sm font-medium text-on-surface leading-relaxed">{answer}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

// Collapsible pest season card
function PestCard({ item }: { item: typeof PEST_CALENDAR[0] }) {
  const [open, setOpen] = useState(false);
  const now = new Date().getMonth();
  const months: Record<string, number[]> = {
    'Jan–Feb': [0, 1], 'Mar–Apr': [2, 3], 'May–Jun': [4, 5],
    'Jul–Sep': [6, 7, 8], 'Oct–Dec': [9, 10, 11],
  };
  const isCurrent = months[item.month]?.includes(now);

  return (
    <motion.div
      layout
      className={cn('rounded-2xl border p-4 cursor-pointer', item.color, isCurrent && 'ring-2 ring-primary')}
      onClick={() => setOpen(o => !o)}
    >
      <div className="flex justify-between items-center">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-black text-base">{item.month}</span>
            {isCurrent && <span className="text-[9px] font-black uppercase bg-primary text-white px-2 py-0.5 rounded-full">Current</span>}
          </div>
          <span className="text-xs font-bold opacity-70">{item.season} Season</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 opacity-60" /> : <ChevronDown className="w-4 h-4 opacity-60" />}
      </div>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="mt-3 pt-3 border-t border-current/20 space-y-2">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider opacity-60 mb-1">⚠️ Watch for Pests</p>
                <ul className="space-y-1">
                  {item.pests.map((p, i) => <li key={i} className="text-xs font-medium">• {p}</li>)}
                </ul>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider opacity-60 mb-1">🌾 Active Crops</p>
                <div className="flex gap-1.5 flex-wrap">
                  {item.crops.map((c, i) => <span key={i} className="text-[10px] font-bold bg-white/50 px-2 py-0.5 rounded-full">{c}</span>)}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function KnowledgeCenter() {
  const { t } = useApp();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'qa' | 'pests' | 'guides'>('qa');

  const tabs = [
    { id: 'qa' as const, label: t('askAiTab'), icon: Sprout },
    { id: 'pests' as const, label: t('pestCalendarTab'), icon: Bug },
    { id: 'guides' as const, label: t('quickGuidesTab'), icon: BookOpen },
  ];

  return (
    <Layout title={t('knowledgeCenter')} showBack>
      <div className="px-5 pb-28 space-y-6">

        {/* Hero */}
        <section className="space-y-1">
          <span className="text-tertiary font-bold tracking-widest text-[10px] uppercase block">{t('infoHub')}</span>
          <h2 className="font-headline font-bold text-[2.5rem] leading-[1.1] text-on-surface tracking-tighter">
            {t('expertKnowledge').split(' ')[0]} <span className="italic font-normal text-primary">{t('expertKnowledge').split(' ').slice(1).join(' ')}</span>
          </h2>
          <p className="text-on-surface-variant text-sm">{t('expertKnowledgeDesc')}</p>
        </section>

        {/* Featured tip card */}
        <div
          onClick={() => navigate('/tools/crops')}
          className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-primary to-primary/80 text-white p-6 cursor-pointer active:scale-[0.98] transition-transform"
        >
          <div className="absolute right-0 top-0 w-32 h-32 bg-white/10 rounded-full -translate-y-8 translate-x-8" />
          <div className="relative z-10 space-y-3">
            <span className="text-[10px] font-black uppercase tracking-widest opacity-80">{t('aiPowered')}</span>
            <h3 className="text-2xl font-black leading-tight">{t('getCropRecBtn')}</h3>
            <p className="text-sm opacity-80">{t('fieldAwareDesc')}</p>
            <div className="flex items-center gap-2 font-bold text-sm mt-2">
              {t('tryNow')} <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex bg-surface-container-low rounded-2xl p-1 gap-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn('flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all',
                activeTab === tab.id ? 'bg-primary text-white shadow-sm' : 'text-on-surface-variant')}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {activeTab === 'qa' && (
            <motion.div key="qa" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <FarmingQA />
            </motion.div>
          )}

          {activeTab === 'pests' && (
            <motion.div key="pests" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
              <div>
                <h3 className="text-xl font-black text-on-surface">{t('pestCalendarTitle')}</h3>
                <p className="text-xs text-on-surface-variant mt-1">{t('pestCalendarDesc')}</p>
              </div>
              {PEST_CALENDAR.map((item, i) => <PestCard key={i} item={item} />)}
            </motion.div>
          )}

          {activeTab === 'guides' && (
            <motion.div key="guides" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
              <div>
                <h3 className="text-xl font-black text-on-surface">{t('quickGuidesTitle')}</h3>
                <p className="text-xs text-on-surface-variant mt-1">{t('quickGuidesDesc')}</p>
              </div>
              <div className="grid grid-cols-1 gap-4">
                {QUICK_GUIDES.map((guide, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.07 }}
                    className="bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/10 flex gap-4 items-start shadow-sm"
                  >
                    <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center shrink-0', guide.color)}>
                      <guide.icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-black text-on-surface text-sm">{guide.title}</h4>
                        <span className="text-[9px] font-black uppercase bg-surface-container text-on-surface-variant px-2 py-0.5 rounded-full">{guide.tag}</span>
                      </div>
                      <p className="text-xs text-on-surface-variant leading-relaxed">{guide.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Link to guides */}
              <button onClick={() => navigate('/guide')} className="w-full flex items-center justify-between bg-surface-container-low rounded-2xl px-5 py-4 border border-outline-variant/20 hover:border-primary/30 transition-all">
                <div className="flex items-center gap-3">
                  <BookOpen className="w-5 h-5 text-primary" />
                  <div className="text-left">
                    <p className="font-bold text-sm text-on-surface">{t('fullLibrary')}</p>
                    <p className="text-xs text-on-surface-variant flex items-center gap-1"><Clock className="w-3 h-3" /> {t('readTime')}</p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-on-surface-variant/40" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Layout>
  );
}
