import { useApp } from '../AppContext';
import { useAuth } from '../AuthContext';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
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
} from 'lucide-react';
import Weather from '../components/Weather';
import { GoogleGenAI } from '@google/genai';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

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
  const { userProfile, loading } = useAuth();
  const navigate = useNavigate();

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
        <section className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-2xl font-headline font-bold text-on-surface">
              {t('myFields')}
            </h3>

            <button className="text-primary font-bold text-sm flex items-center gap-1">
              {t('seeAll')} <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div className="bg-surface-container-low rounded-[1.5rem] p-5 space-y-4 border border-outline-variant/20">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-bold text-lg">Field A</h4>
                  <p className="text-primary font-medium text-sm">
                    Rice (BR-28)
                  </p>
                </div>

                <span className="px-2 py-1 bg-primary-container text-on-primary rounded-md text-[10px] font-bold">
                  HEALTHY
                </span>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px] font-bold text-on-surface-variant uppercase">
                  <span>Growth Stage</span>
                  <span>65%</span>
                </div>

                <div className="h-2 w-full bg-outline-variant/30 rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full w-[65%]" />
                </div>
              </div>
            </div>

            <div className="bg-surface-container-low rounded-[1.5rem] p-5 space-y-4 border border-outline-variant/20">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-bold text-lg">Field B</h4>
                  <p className="text-secondary font-medium text-sm">
                    Potato (Diamond)
                  </p>
                </div>

                <span className="px-2 py-1 bg-red-100 text-red-700 rounded-md text-[10px] font-bold uppercase">
                  Needs Water
                </span>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px] font-bold text-on-surface-variant uppercase">
                  <span>Growth Stage</span>
                  <span>40%</span>
                </div>

                <div className="h-2 w-full bg-outline-variant/30 rounded-full overflow-hidden">
                  <div className="h-full bg-secondary rounded-full w-[40%]" />
                </div>

              </div>
              <div className="flex items-center gap-2 text-xs text-red-600 font-bold">
                <AlertCircle className="w-4 h-4" />
                <span>Low soil moisture</span>
              </div>
            </div>
          </div>
        </section>

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
                desc: 'AI Recommendations',
                color: 'text-primary',
                path: '/tools/crops',
              },
              {
                icon: ScanLine,
                label: t('diseaseDetection'),
                desc: 'Scan Crop',
                color: 'text-red-500',
                path: '/tools/scan',
              },
              {
                icon: MapIcon,
                label: t('fieldMapping'),
                desc: 'Satellite Analysis',
                color: 'text-secondary',
                path: '/fields',
              },
              {
                icon: Lightbulb,
                label: t('farmingTips'),
                desc: 'Best Practices',
                color: 'text-tertiary',
                path: '/tools',
              },
              {
                icon: CloudSun,
                label: language === 'bn' ? 'আবহাওয়া পূর্বাভাস' : 'Weather Forecast',
                desc: '7-Day Farming Outlook',
                color: 'text-sky-500',
                path: '/weather',
              },
              {
                icon: Mic,
                label: language === 'bn' ? 'ভয়েস সহকারী' : 'Voice Assistant',
                desc: language === 'bn' ? 'বাংলা ও ইংরেজি' : 'Bangla & English AI',
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
