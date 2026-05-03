import { useApp } from '../AppContext';
import { useAuth } from '../AuthContext';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { getUserFields } from '../lib/db';
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
import { GoogleGenAI } from '@google/genai';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

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
function DailyGuide() {
  const { t, language } = useApp();
  const navigate = useNavigate();
  const [tip, setTip] = useState<{ title: string; desc: string; category: string; image: string, steps?: any[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDailyTip = async () => {
      setLoading(true);
      
      // If not saved, call AI
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        // Fallback static tip if API key is missing
        const fallback = {
          title: language === 'bn' ? 'বোরো ধান সংগ্রহ' : 'Boro Rice Harvesting',
          desc: language === 'bn' 
            ? 'ধান কাটার পর দ্রুত মাড়াই করে রোদে শুকিয়ে নিন। আর্দ্রতা ১২-১৪% এর নিচে রাখা জরুরি।' 
            : 'After harvesting Boro rice, thresh and dry it quickly. Keep moisture below 12-14%.',
          category: language === 'bn' ? 'ফসল সংগ্রহ' : 'Harvesting',
          image: 'https://images.unsplash.com/photo-1530507629858-e4977d30e9e0?auto=format&fit=crop&q=80&w=1000'
        };
        setTip(fallback);
        setLoading(false);
        return;
      }

      try {
        const ai = new GoogleGenAI({ apiKey });
        const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });
        
        const result = await model.generateContent(`
          You are a senior Bangladeshi Agronomist. 
          Provide a highly professional, localized farming guide for today (${new Date().toLocaleDateString()}) in ${language === 'bn' ? 'Bengali' : 'English'}.
          Focus on current Bangladeshi context: April is Kharif-1 season. Focus on crops like BRRI Dhan, Jute (Tossa/Deshi), or summer vegetables (Okra, Bitter Gourd).
          Consider specific Bangladeshi conditions: High humidity, heat waves, or early Nor'wester (Kalbaishakhi) risks.
          
          Format the response strictly as a JSON object with:
          - title: Professional title (e.g., "Advanced Pest Management for Jute")
          - desc: 2 sentence professional overview.
          - category: One word (e.g., "Irrigation", "Protection")
          - steps: Array of 3 objects with {title, detail}
          
          Strictly JSON, no markdown.
        `);

        const response = await result.response;
        const text = response.text();
        
        // Basic cleanup in case AI adds markdown
        const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const data = JSON.parse(cleanJson);
        
        const finalTip = {
          ...data,
          image: [
            'https://images.unsplash.com/photo-1500382017468-9049fee78a6c?auto=format&fit=crop&q=80&w=1000',
            'https://images.unsplash.com/photo-1523348837708-15d4a09cfac2?auto=format&fit=crop&q=80&w=1000',
            'https://images.unsplash.com/photo-1595113316349-9fa4eb24f884?auto=format&fit=crop&q=80&w=1000',
            'https://images.unsplash.com/photo-1464226184884-fa280b87c399?auto=format&fit=crop&q=80&w=1000'
          ][Math.floor(Math.random() * 4)]
        };

        setTip(finalTip);
      } catch (err) {
        console.error('AI Tip Error:', err);
        // Fallback on error
        setTip({
          title: language === 'bn' ? 'মাটির স্বাস্থ্য' : 'Soil Health',
          desc: language === 'bn' ? 'সুষম সার ব্যবহার করুন এবং জৈব সারের পরিমাণ বাড়ান।' : 'Use balanced fertilizers and increase organic manure usage.',
          category: language === 'bn' ? 'মাটি ব্যবস্থাপনা' : 'Soil Management',
          image: 'https://images.unsplash.com/photo-1464226184884-fa280b87c399?auto=format&fit=crop&q=80&w=1000'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchDailyTip();
  }, [language]);

  if (loading) {
    return (
      <div className="bg-surface-container-high/50 rounded-[2.5rem] p-8 h-80 flex flex-col items-center justify-center space-y-4 animate-pulse">
        <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
          <Sprout className="w-6 h-6 text-primary animate-bounce" />
        </div>
        <p className="text-xs font-bold text-primary uppercase tracking-widest animate-pulse">Generating Daily Guide...</p>
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
      <div className="relative h-64 rounded-[2rem] overflow-hidden mb-6">
        <img
          src={tip.image}
          alt={tip.title}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="absolute top-4 left-4 bg-primary/20 backdrop-blur-xl px-4 py-2 rounded-2xl border border-white/20 flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
          <span className="text-[10px] font-headline font-black text-white uppercase tracking-widest">Daily AI Insight</span>
        </div>
      </div>

      <div className="px-4 pb-4 space-y-4">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-headline font-black text-primary uppercase tracking-[0.2em] bg-primary/10 px-2.5 py-1 rounded-lg">
            {tip.category}
          </span>
          <span className="h-[1px] flex-grow bg-primary/20" />
        </div>

        <h3 className="text-2xl font-headline font-bold text-on-surface leading-tight tracking-tight">
          {tip.title}
        </h3>

        <p className="text-sm text-on-surface-variant leading-relaxed font-medium">
          {tip.desc}
        </p>

        <button 
          onClick={() => navigate('/guide', { state: { tip } })}
          className="flex items-center gap-3 text-primary font-headline font-black group/btn pt-2"
        >
          {t('readGuide')}
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center group-hover/btn:bg-primary group-hover/btn:text-white transition-all">
            <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-0.5 transition-transform" />
          </div>
        </button>
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

        {/* Recent Activity */}
        <RecentActivity />


        {/* Expert Tools */}
        <section className="space-y-6">
          <h3 className="text-2xl font-headline font-bold text-on-surface flex items-center gap-2">
            {t('expertTools')}
            <span className="h-[1px] flex-grow bg-outline-variant/30 ml-4" />
          </h3>

          <div className="grid grid-cols-2 gap-4">
            {[
              {
                icon: Sprout,
                label: t('cropSelection'),
                desc: t('aiRecommendations'),
                color: 'text-primary',
                path: '/tools/crops',
              },
              {
                icon: ScanLine,
                label: t('diseaseDetection'),
                desc: t('scanCropDesc'),
                color: 'text-red-500',
                path: '/tools/scan',
              },
              {
                icon: MapIcon,
                label: t('fieldMapping'),
                desc: t('satelliteAnalysis'),
                color: 'text-secondary',
                path: '/fields',
              },
              {
                icon: Lightbulb,
                label: t('farmingTips'),
                desc: t('bestPracticesDesc'),
                color: 'text-tertiary',
                path: '/tools',
              },
              {
                icon: CloudSun,
                label: t('weatherForecast'),
                desc: t('sevenDayOutlook'),
                color: 'text-sky-500',
                path: '/weather',
              },
              {
                icon: Mic,
                label: t('voiceAssistant'),
                desc: t('banglaEnglishAI'),
                color: 'text-purple-500',
                path: '/voice',
              },
            ].map((tool, i) => (
              <div
                key={i}
                onClick={() => navigate(tool.path)}
                className="bg-surface-container-low hover:bg-surface-container transition-colors rounded-[2rem] p-6 flex flex-col gap-8 group cursor-pointer border border-outline-variant/10"
              >
                <div
                  className={cn(
                    'w-12 h-12 bg-white rounded-2xl flex items-center justify-center editorial-shadow group-hover:scale-110 transition-transform',
                    tool.color
                  )}
                >
                  <tool.icon className="w-6 h-6" />
                </div>

                <div>
                  <p className="text-on-surface font-bold text-lg leading-tight">
                    {tool.label}
                  </p>
                  <p className="text-on-surface-variant text-xs mt-1">
                    {tool.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Featured Tip / Daily Guide */}
        <DailyGuide />
      </div>

      <div className="fixed bottom-24 right-6 z-40">
        <button className="bg-primary text-on-primary w-14 h-14 rounded-[1.25rem] shadow-xl flex items-center justify-center active:scale-95 transition-transform">
          <Plus className="w-6 h-6" />
        </button>
      </div>
    </Layout>
  );
}
