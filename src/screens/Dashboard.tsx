import { useApp } from '../AppContext';
import { useAuth } from '../AuthContext';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { getUserFields, subscribeToUserFields } from '../lib/db';
import type { Field } from '../types';
import {
  CloudRain,
  Wind,
  Droplets,
  ChevronRight,
  Sprout,
  AlertCircle,
  ScanLine,
  Map as MapIcon,
  Lightbulb,
  Plus,
  ArrowRight,
  Calendar,
  Mic,
  CloudSun,
  TrendingUp,
  RefreshCw,
} from 'lucide-react';
import Weather from '../components/Weather';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  serverTimestamp,
  orderBy,
  limit 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import Anthropic from '@anthropic-ai/sdk';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

// --- Farm Stats Card ---
function FarmStats({ fields }: { fields: Field[] }) {
  const { t } = useApp();
  const navigate = useNavigate();
  const total = fields.length;
  const active = fields.filter(f => f.active_crop).length;
  const alerts = fields.filter(f => f.health_status === 'critical' || f.health_status === 'attention_needed').length;
  if (total === 0) return null;
  return (
    <section className="grid grid-cols-3 gap-3">
      {[
        { label: t('totalFields'), value: total, icon: MapIcon, color: 'text-secondary bg-secondary/10', path: '/fields' },
        { label: t('activeCrops'), value: active, icon: Sprout, color: 'text-primary bg-primary/10', path: '/my-crops' },
        { label: t('healthAlerts'), value: alerts, icon: AlertCircle, color: alerts > 0 ? 'text-red-500 bg-red-100' : 'text-green-600 bg-green-100' },
      ].map(stat => (
        <div
          key={stat.label}
          onClick={() => stat.path && navigate(stat.path)}
          className={cn(
            "bg-surface-container-lowest rounded-2xl p-4 border border-outline-variant/10 flex flex-col items-center gap-2 shadow-sm transition-all duration-200",
            stat.path && "cursor-pointer hover:border-primary/30 hover:shadow-md active:scale-95"
          )}
        >
          <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', stat.color)}>
            <stat.icon className="w-4 h-4" />
          </div>
          <span className="font-data text-2xl font-black text-on-surface">{stat.value}</span>
          <span className="text-[9px] font-bold text-on-surface-variant uppercase tracking-wider text-center">{stat.label}</span>
        </div>
      ))}
    </section>
  );
}

// --- Recent Activity Component ---
function RecentActivity() {
  const { t } = useApp();
  const { userProfile } = useAuth();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userProfile?.uid) return;

    const q = query(
      collection(db, 'history'),
      where('userId', '==', userProfile.uid),
      orderBy('timestamp', 'desc'),
      limit(5)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setHistory(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (err) => {
      console.error("Firestore RecentActivity error:", err);
      setError("Failed to load activity history.");
      setLoading(false);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [userProfile?.uid]);

  if (loading) return null;
  if (history.length === 0) return null;

  return (
    <section className="space-y-4">
      <h3 className="text-2xl font-headline font-bold text-on-surface flex items-center gap-2">
        {t('recentActivity') || 'Recent AI Activity'}
      </h3>
      
      <div className="space-y-3">
        {history.map((item) => (
          <div key={item.id} className="bg-surface-container-low p-4 rounded-2xl flex items-center gap-4 border border-outline-variant/10">
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center",
              item.type === 'disease_detection' ? "bg-red-100 text-red-600" : "bg-primary/10 text-primary"
            )}>
              {item.type === 'disease_detection' ? <AlertCircle className="w-5 h-5" /> : <TrendingUp className="w-5 h-5" />}
            </div>
            <div className="flex-1">
              <p className="font-bold text-sm text-on-surface">{item.title}</p>
              <p className="text-[10px] text-on-surface-variant font-medium">
                {item.timestamp?.toDate().toLocaleDateString()} • {item.type === 'disease_detection' ? 'Diagnosis' : 'Recommendation'}
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-on-surface-variant/30" />
          </div>
        ))}
      </div>
    </section>
  );
}

// --- My Fields Component ---
function MyFields() {
  const { t } = useApp();
  const { userProfile } = useAuth();
  const [fields, setFields] = useState<Field[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!userProfile?.uid) return;

    const unsubscribe = subscribeToUserFields(userProfile.uid, (fieldsData) => {
      setFields(fieldsData);
      setLoading(false);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [userProfile?.uid]);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-32 bg-outline-variant/20 rounded-lg" />
        <div className="grid grid-cols-1 gap-4">
          <div className="h-40 bg-surface-container-low rounded-[1.5rem]" />
        </div>
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-2xl font-headline font-bold text-on-surface">
          {t('myFields')}
        </h3>

        <button 
          onClick={() => navigate('/fields')}
          className="text-primary font-bold text-sm flex items-center gap-1 bg-primary/10 px-3 py-1.5 rounded-full hover:bg-primary/20 transition-colors"
        >
          <Plus className="w-4 h-4" />
          {t('addField') || 'Add Field'}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <AnimatePresence mode="popLayout">
          {fields.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-surface-container-low rounded-[1.5rem] p-10 border border-dashed border-outline-variant/50 flex flex-col items-center justify-center text-center space-y-4"
            >
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <Sprout className="w-8 h-8 text-primary" />
              </div>
              <div>
                <p className="font-bold text-on-surface">{t('noFieldsMapped')}</p>
                <p className="text-sm text-on-surface-variant">{t('addFirstField')}</p>
              </div>
            </motion.div>
          ) : (
            fields.map((field, idx) => (
              <motion.div 
                key={field.field_id}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                onClick={() => navigate('/fields')}
                className="bg-surface-container-low rounded-[1.5rem] p-5 space-y-4 border border-outline-variant/20 editorial-shadow-sm cursor-pointer hover:border-primary/30 transition-all"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-lg text-on-surface">{field.field_name}</h4>
                    <p className="text-primary font-bold text-sm">
                      {field.active_crop || (field.area_size ? `${field.area_size} ${field.area_unit}` : 'No crop')}
                    </p>
                  </div>

                  <span className={cn(
                    "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider",
                    field.health_status === 'healthy' ? "bg-primary/10 text-primary" 
                    : field.health_status === 'attention_needed' ? "bg-amber-100 text-amber-800"
                    : field.health_status === 'critical' ? "bg-red-100 text-red-700"
                    : "bg-surface-container text-on-surface-variant"
                  )}>
                    {field.health_status || 'UNKNOWN'}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px] font-black text-on-surface-variant uppercase tracking-widest">
                    <span>Field Area</span>
                    <span>{field.area_size} {field.area_unit}</span>
                  </div>

                  <div className="h-2.5 w-full bg-outline-variant/20 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `100%` }}
                      transition={{ duration: 1, delay: 0.5 }}
                      className={cn(
                        "h-full rounded-full",
                        field.health_status === 'healthy' ? "bg-primary" : "bg-error"
                      )}
                    />
                  </div>
                </div>

                {field.health_status !== 'healthy' && field.health_status !== 'unknown' && (
                  <div className="flex items-center gap-2 text-xs text-error font-bold bg-error/5 p-2 rounded-xl">
                    <AlertCircle className="w-4 h-4" />
                    <span>{field.health_status === 'critical' ? 'Critical condition' : 'Attention needed'}</span>
                  </div>
                )}
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}


// --- Daily Guide Component ---
const FARMING_TOPICS = [
  'AWD irrigation technique for Boro rice (বোরো ধান)',
  'Jute retting and fiber quality improvement (পাটের আঁশ)',
  'Organic composting for Aman paddy (আমন ধান)',
  'Kalbaishakhi storm protection for standing crops',
  'Urea fertilizer scheduling for BRRI Dhan-29',
  'Bio-pesticide use for Aus rice (আউশ ধান)',
  'Integrated soil management for vegetable farms',
  'Post-harvest drying and storage of rice',
  'Managing waterlogging in Aman season',
  'Green manuring with Dhaincha (ধৈঞ্চা)',
  'Pheromone trap installation for stem borer',
  'Flood-tolerant BRRI rice variety selection',
  'Salinity management in coastal Bangladesh',
  'Winter vegetable (rabi crops) planning',
  'Drought management for Aus season',
];

function DailyGuide() {
  const { t, language } = useApp();
  const navigate = useNavigate();
  const [tip, setTip] = useState<{ title: string; desc: string; category: string; image: string; steps?: any[]; proTip?: string; season?: string; focus?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [topicIdx, setTopicIdx] = useState(() => Math.floor(Math.random() * FARMING_TOPICS.length));

  const IMAGES = [
    'https://images.unsplash.com/photo-1500382017468-9049fee78a6c?auto=format&fit=crop&q=80&w=1000',
    'https://images.unsplash.com/photo-1523348837708-15d4a09cfac2?auto=format&fit=crop&q=80&w=1000',
    'https://images.unsplash.com/photo-1595113316349-9fa4eb24f884?auto=format&fit=crop&q=80&w=1000',
    'https://images.unsplash.com/photo-1464226184884-fa280b87c399?auto=format&fit=crop&q=80&w=1000',
    'https://images.unsplash.com/photo-1530507629858-e4977d30e9e0?auto=format&fit=crop&q=80&w=1000',
    'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&q=80&w=1000',
  ];

  const fetchTip = async (idx: number) => {
    setLoading(true);
    const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
    const topic = FARMING_TOPICS[idx];

    if (!apiKey) {
      setTip({
        title: language === 'bn' ? 'বোরো ধান সংগ্রহ' : 'Boro Rice Harvesting',
        desc: language === 'bn' ? 'ধান কাটার পর দ্রুত মাড়াই করে রোদে শুকিয়ে নিন। আর্দ্রতা ১২-১৪% এর নিচে রাখা জরুরি।' : 'Thresh and dry quickly. Keep moisture below 12-14%.',
        category: language === 'bn' ? 'ফসল সংগ্রহ' : 'Harvesting',
        image: IMAGES[0],
        season: 'Boro', focus: 'Harvesting',
      });
      setLoading(false);
      return;
    }

    try {
      const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
      const lang = language === 'bn' ? 'Bengali' : 'English';
      const prompt = `You are a senior Bangladeshi agronomist with 20 years of field experience.
Today's topic: "${topic}"
Generate a unique, practical farming guide for Bangladeshi farmers in ${lang}.
Today's date: ${new Date().toLocaleDateString('en-BD')}. Make it highly specific and different from generic advice.

Return ONLY valid JSON (no markdown, no code block):
{
  "title": "Specific professional title about the topic",
  "category": "One word category (e.g. Irrigation, Pest, Soil, Harvest)",
  "season": "Relevant season (e.g. Kharif-1, Rabi, Boro, Aman)",
  "focus": "One word focus area (e.g. Optimization, Protection, Planning)",
  "desc": "2 engaging sentences summarizing the guide with a specific fact or statistic",
  "steps": [
    {"title": "Step title", "detail": "Specific actionable detail with quantities/timings"},
    {"title": "Step title", "detail": "Specific actionable detail"},
    {"title": "Step title", "detail": "Specific actionable detail"},
    {"title": "Step title", "detail": "Specific actionable detail"}
  ],
  "proTip": "One expert insight specific to Bangladesh conditions with a measurable outcome",
  "relatedQuestion": "A realistic question a Bangladeshi farmer would ask about this topic"
}`;

      const response = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      });
      const text = response.content[0].type === 'text' ? response.content[0].text : '';
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('Bad response');
      const data = JSON.parse(match[0]);
      setTip({ ...data, image: IMAGES[idx % IMAGES.length] });
    } catch (err) {
      console.error('AI Tip Error:', err);
      setTip({
        title: language === 'bn' ? 'মাটির স্বাস্থ্য ব্যবস্থাপনা' : 'Soil Health Management',
        desc: language === 'bn' ? 'সুষম সার ব্যবহার করুন এবং জৈব সারের পরিমাণ বাড়ান।' : 'Use balanced fertilizers and increase organic manure for better yield.',
        category: language === 'bn' ? 'মাটি ব্যবস্থাপনা' : 'Soil Management',
        image: IMAGES[2],
        season: 'All Seasons', focus: 'Optimization',
        proTip: 'Compost application before transplanting increases yield by 15-20% in Bangladesh conditions.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTip(topicIdx); }, [topicIdx, language]);

  const handleRefresh = () => {
    const next = (topicIdx + 1 + Math.floor(Math.random() * (FARMING_TOPICS.length - 1))) % FARMING_TOPICS.length;
    setTopicIdx(next);
  };

  if (loading) {
    return (
      <div className="bg-surface-container-high/50 rounded-[2.5rem] p-8 h-72 flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
          <Sprout className="w-6 h-6 text-primary animate-bounce" />
        </div>
        <p className="text-xs font-bold text-primary uppercase tracking-widest animate-pulse">{t('generatingGuide')}</p>
      </div>
    );
  }

  if (!tip) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-surface-container-high/50 rounded-[2.5rem] overflow-hidden p-4 group editorial-shadow-sm hover:editorial-shadow-md transition-all duration-500"
    >
      <div className="relative h-56 rounded-[2rem] overflow-hidden mb-5">
        <img src={tip.image} alt={tip.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="absolute top-4 left-4 bg-primary/20 backdrop-blur-xl px-4 py-2 rounded-2xl border border-white/20 flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
          <span className="text-[10px] font-headline font-black text-white uppercase tracking-widest">{t('dailyAiInsight')}</span>
        </div>
        <button
          onClick={handleRefresh}
          className="absolute top-4 right-4 w-9 h-9 bg-black/40 backdrop-blur-md rounded-xl border border-white/20 flex items-center justify-center text-white hover:bg-black/60 transition-colors"
          title="Get new tip"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="px-4 pb-4 space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-headline font-black text-primary uppercase tracking-[0.2em] bg-primary/10 px-2.5 py-1 rounded-lg">
            {tip.category}
          </span>
          {tip.season && (
            <span className="text-[10px] font-bold text-secondary bg-secondary/10 px-2.5 py-1 rounded-lg uppercase">
              {tip.season}
            </span>
          )}
          <span className="h-[1px] flex-grow bg-primary/20" />
        </div>

        <h3 className="text-xl font-headline font-bold text-on-surface leading-tight tracking-tight">{tip.title}</h3>
        <p className="text-sm text-on-surface-variant leading-relaxed font-medium">{tip.desc}</p>

        <div className="flex gap-3">
          <button
            onClick={() => navigate('/guide', { state: { tip } })}
            className="flex-1 flex items-center justify-center gap-2 bg-primary text-white py-3 rounded-2xl font-bold text-sm active:scale-95 transition-transform"
          >
            {t('readGuide')} <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={handleRefresh}
            className="w-12 h-12 flex items-center justify-center bg-surface-container-low rounded-2xl border border-outline-variant/20 hover:bg-surface-container transition-colors"
          >
            <RefreshCw className="w-4 h-4 text-on-surface-variant" />
          </button>
        </div>
      </div>
    </motion.section>
  );
}

export default function Dashboard() {
  const { t, language } = useApp();
  const { userProfile, currentUser, loading } = useAuth();
  const navigate = useNavigate();
  const [fields, setFields] = useState<Field[]>([]);
  const [fieldsLoading, setFieldsLoading] = useState(false);

  useEffect(() => {
    if (!currentUser?.uid) return;
    setFieldsLoading(true);
    getUserFields(currentUser.uid)
      .then(setFields)
      .catch(console.error)
      .finally(() => setFieldsLoading(false));
  }, [currentUser?.uid]);

  useEffect(() => {
    if (!loading && !userProfile) {
      navigate('/login');
      return;
    }
  }, [loading, userProfile, navigate]);

  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  // For showing weather summary in dashboard header
  const handleWeatherCardClick = () => navigate('/weather');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!userProfile) return null;

  return (
    <Layout>
      <div className="px-4 sm:px-6 space-y-6 sm:space-y-8">
        {/* Greeting & Weather */}
        <section className="space-y-4 sm:space-y-6">
          <div className="space-y-1">
            <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-on-surface-variant/70">
              {currentDate}
            </p>

            <h2 className="text-3xl sm:text-4xl font-headline font-bold tracking-tight text-on-surface leading-tight">
              {t('welcome')}{' '}
              <span className="text-primary block sm:inline">
                {userProfile?.name || 'Farmer'}
              </span>
            </h2>
          </div>

          {/* Weather Card — clickable */}
          <div onClick={handleWeatherCardClick} className="cursor-pointer">
            <Weather />
          </div>
        </section>

        {/* My Fields */}
        <MyFields />

        {/* Farm Stats */}
        <FarmStats fields={fields} />

        {/* Recent Activity */}
        <RecentActivity />


        {/* Expert Tools */}
        <section className="space-y-6">
          <h3 className="text-2xl font-headline font-bold text-on-surface flex items-center gap-2">
            {t('expertTools')}
            <span className="h-[1px] flex-grow bg-outline-variant/30 ml-4" />
          </h3>

          <div className="grid grid-cols-3 gap-3">
            {[
              {
                icon: Sprout,
                label: t('cropSelection'),
                desc: t('aiRecommendations'),
                color: 'text-primary',
                bg: 'bg-primary/10',
                path: '/tools/crops',
              },
              {
                icon: ScanLine,
                label: t('diseaseDetection'),
                desc: t('scanCropDesc'),
                color: 'text-red-500',
                bg: 'bg-red-100',
                path: '/tools/scan',
              },
              {
                icon: MapIcon,
                label: t('fieldMapping'),
                desc: t('satelliteAnalysis'),
                color: 'text-secondary',
                bg: 'bg-secondary/10',
                path: '/fields',
              },
              {
                icon: Lightbulb,
                label: t('farmingTips'),
                desc: t('bestPracticesDesc'),
                color: 'text-tertiary',
                bg: 'bg-tertiary/10',
                path: '/tools',
              },
              {
                icon: CloudSun,
                label: t('weatherForecast'),
                desc: t('sevenDayOutlook'),
                color: 'text-sky-500',
                bg: 'bg-sky-100',
                path: '/weather',
              },
              {
                icon: Droplets,
                label: 'Smart Irrigation',
                desc: 'Land moisture & watering schedule',
                color: 'text-blue-500',
                bg: 'bg-blue-100',
                path: '/irrigation',
              },
              {
                icon: Mic,
                label: t('voiceAssistant'),
                desc: t('banglaEnglishAI'),
                color: 'text-purple-500',
                bg: 'bg-purple-100',
                path: '/voice',
              },
            ].map((tool, i) => (
              <button
                key={i}
                onClick={() => navigate(tool.path)}
                className="bg-surface-container-low hover:bg-surface-container active:scale-95 transition-all duration-200 rounded-2xl p-4 flex flex-col items-center gap-3 border border-outline-variant/10 group"
              >
                <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform', tool.bg, tool.color)}>
                  <tool.icon className="w-5 h-5" />
                </div>
                <p className="text-on-surface font-semibold text-[11px] leading-tight text-center">{tool.label}</p>
              </button>
            ))}
          </div>
        </section>

        {/* Featured Tip / Daily Guide */}
        <DailyGuide />
      </div>

      <div className="fixed bottom-24 right-6 z-40">
        <button
          onClick={() => navigate('/fields')}
          className="bg-primary text-on-primary w-14 h-14 rounded-[1.25rem] shadow-xl flex items-center justify-center active:scale-95 transition-transform"
          title="Add Field"
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>
    </Layout>
  );
}
