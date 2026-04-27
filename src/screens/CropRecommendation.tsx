<<<<<<< HEAD
import { useApp } from '../AppContext';
import Layout from '../components/Layout';
import { 
  TrendingUp, 
  ShieldCheck, 
  CloudLightning, 
  RefreshCcw,
  Leaf,
  Info,
  ArrowRight,
  FileText
} from 'lucide-react';
import { cn } from '../lib/utils';

export default function CropRecommendation() {
  const { t } = useApp();

  return (
    <Layout title={t('cropSelection')} showBack>
      <div className="px-6 space-y-8">
        {/* Hero Section */}
        <section className="space-y-4">
=======
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../AppContext';
import Layout from '../components/Layout';
import { GoogleGenAI } from '@google/genai';
import {
  TrendingUp,
  ShieldCheck,
  CloudLightning,
  Leaf,
  Loader2,
  AlertCircle,
  MapPin,
  Thermometer,
  Droplets
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface CropRecommendation {
  cropName: string;
  suitability: number;
  expectedYield: string;
  estimatedProfit: string;
  riskLevel: string;
  demand: string;
}

interface PredictionResult {
  recommendations: CropRecommendation[];
  weatherImpact: string;
}

interface WeatherData {
  temp: number;
  humidity: number;
  description: string;
  city: string;
}

export default function CropRecommendation() {
  const { t } = useApp();
  const navigate = useNavigate();
  const [n, setN] = useState<string>('');
  const [p, setP] = useState<string>('');
  const [k, setK] = useState<string>('');

  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);

  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWeatherByUrl = async (url: string) => {
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Weather fetch failed');
        const data = await response.json();
        setWeather({
          temp: Math.round(data.main.temp),
          humidity: data.main.humidity,
          description: data.weather[0]?.description || 'Clear',
          city: data.name
        });
      } catch (err) {
        console.error('Weather error:', err);
      } finally {
        setWeatherLoading(false);
      }
    };

    const apiKey = import.meta.env.VITE_WEATHER_API_KEY;
    const fetchWeatherByIpFallback = async () => {
      try {
        const geoRes = await fetch('https://get.geojs.io/v1/ip/geo.json');
        if (!geoRes.ok) throw new Error('IP Geo failed');
        const geoData = await geoRes.json();
        fetchWeatherByUrl(`https://api.openweathermap.org/data/2.5/weather?lat=${geoData.latitude}&lon=${geoData.longitude}&units=metric&appid=${apiKey}`);
      } catch {
        fetchWeatherByUrl(`https://api.openweathermap.org/data/2.5/weather?q=Dhaka,BD&units=metric&appid=${apiKey}`);
      }
    };

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          fetchWeatherByUrl(`https://api.openweathermap.org/data/2.5/weather?lat=${position.coords.latitude}&lon=${position.coords.longitude}&units=metric&appid=${apiKey}`);
        },
        () => fetchWeatherByIpFallback(),
        { timeout: 5000 }
      );
    } else {
      fetchWeatherByIpFallback();
    }
  }, []);

  const getRecommendation = async () => {
    if (!n || !p || !k) {
      setError('Please enter values for Nitrogen, Phosphorus, and Potassium.');
      return;
    }

    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      setError('System Error: API Key is missing.');
      return;
    }

    setLoading(true);
    setError(null);
    setPrediction(null);

    try {
      const ai = new GoogleGenAI({ apiKey });

      const weatherContext = weather
        ? `Location: ${weather.city}. Weather: ${weather.temp}°C, ${weather.humidity}% humidity, ${weather.description}.`
        : 'Location and weather data unavailable. Assume typical seasonal conditions in Bangladesh.';

      const prompt = `Act as an expert agronomist in Bangladesh. 
      ${weatherContext}
      Soil NPK values (mg/kg or exact units provided by user): Nitrogen (N)=${n}, Phosphorus (P)=${p}, Potassium (K)=${k}.

      Based on these precise NPK values and the current weather/location, recommend exactly THREE crops that are highly suitable to be planted right now.
      Return response in STRICT JSON format matching this structure exactly:
      {
        "recommendations": [
          {
            "cropName": "Name of the crop (English & Bengali)",
            "suitability": 98,
            "expectedYield": "e.g., 4.2 MT/ha",
            "estimatedProfit": "e.g., +৳84,200",
            "riskLevel": "Low Risk",
            "demand": "High Demand"
          }
        ],
        "weatherImpact": "Short description of how the current weather and soil profile impact these choices."
      }
      Do not include any markdown formatting, just the JSON string.`;

      const result = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
      });

      const text = result.text;
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('Invalid AI response format');

      const data = JSON.parse(jsonMatch[0]);
      if (!data.recommendations || data.recommendations.length !== 3) {
        throw new Error('AI did not return exactly 3 recommendations.');
      }
      setPrediction(data);
    } catch (err: any) {
      console.error('AI Error:', err);
      setError(`AI Error: ${err.message || 'Check your connection.'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout title={t('cropSelection')} showBack>
      <div className="px-6 pb-24 space-y-8">
        {/* Header & Weather Info */}
        <section className="space-y-6">
>>>>>>> origin/isti
          <div className="flex flex-col gap-4">
            <div className="max-w-2xl">
              <span className="inline-block bg-primary-container text-on-primary px-3 py-1 rounded-full text-[10px] font-bold tracking-wider mb-2 uppercase">
                AI Recommendation Engine
              </span>
              <h1 className="text-4xl font-black text-on-surface tracking-tight leading-tight">
<<<<<<< HEAD
                Optimizing your <span className="text-primary italic">Summer Cycle</span>
              </h1>
              <p className="text-on-surface-variant text-lg mt-2 font-medium">
                Based on current soil moisture, pH 6.8 and predicted rainfall patterns.
              </p>
            </div>
          </div>
        </section>

        {/* Main Recommendation */}
        <section className="bg-surface-container-lowest rounded-[2rem] p-8 editorial-shadow flex flex-col gap-8 relative overflow-hidden group">
          <div className="relative z-10 flex-1">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-primary font-bold text-sm uppercase tracking-widest mb-1">Top Recommendation</h3>
                <h2 className="text-4xl font-black">Aman Rice</h2>
              </div>
              <div className="text-right">
                <span className="text-5xl font-black text-primary leading-none">98%</span>
                <p className="text-[10px] font-bold text-on-surface-variant uppercase mt-1">Suitability</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-surface-container-low p-4 rounded-2xl">
                <p className="text-[10px] font-bold text-on-surface-variant mb-1 uppercase">Expected Yield</p>
                <p className="text-2xl font-black">4.2 <span className="text-sm font-medium">MT/ha</span></p>
              </div>
              <div className="bg-surface-container-low p-4 rounded-2xl">
                <p className="text-[10px] font-bold text-on-surface-variant mb-1 uppercase">Estimated Profit</p>
                <p className="text-2xl font-black text-primary">+৳84,200</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 rounded-full text-xs font-bold">
                <TrendingUp className="w-4 h-4" />
                High Demand
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-surface-container text-on-surface-variant rounded-full text-xs font-bold">
                <ShieldCheck className="w-4 h-4" />
                Low Risk
              </div>
            </div>
          </div>
          
          <div className="flex-1 min-h-[200px] relative rounded-3xl overflow-hidden">
            <img 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAC3BqEqL3l3jreTHIWYY2GwgeIjj1lSDVdqJry7ZA1kxkfDb1V2_jIQR4Obv6qTdKK0G8m1ZH1mNByoF5B5seIkvEnTHZFdTxtsRVLre8ljEQnPASsBkF2Z9yOros0dBoNnK7HQtbfF2fxfZ-Hz3Xjk5my8vfpbGNCA4VDEJaqtZcdFTUy053gfCzQ1cUEcGqROxNJCOjTYWl_03SboE-GFz8ZIt0WwGxnFcrQe-e0_MbgagvnB31_HK-ZmQo-wMqE6Dn98ddTJwIq" 
              alt="Rice"
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              referrerPolicy="no-referrer"
            />
          </div>
        </section>

        {/* Soil Health Diagnosis */}
        <section className="bg-surface-container-low rounded-[2rem] p-8">
          <h2 className="text-2xl font-black mb-6">{t('soilHealth')}</h2>
          <div className="space-y-6">
            {[
              { label: t('nitrogen'), value: t('ideal'), progress: 75, color: 'bg-primary' },
              { label: t('phosphorus'), value: t('medium'), progress: 45, color: 'bg-tertiary' },
              { label: t('potassium'), value: t('high'), progress: 90, color: 'bg-primary' },
            ].map((stat, i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between items-end">
                  <span className="text-[10px] font-bold text-on-surface-variant uppercase">{stat.label}</span>
                  <span className="text-lg font-black">{stat.value}</span>
                </div>
                <div className="h-2 w-full bg-surface-container-high rounded-full overflow-hidden">
                  <div className={cn("h-full rounded-full", stat.color)} style={{ width: `${stat.progress}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Weather Impact */}
        <section className="bg-primary text-on-primary rounded-[2rem] p-6 overflow-hidden relative group">
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div>
              <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                <CloudLightning className="w-5 h-5 fill-current" />
                {t('weatherImpact')}
              </h3>
              <p className="text-on-primary/80 text-sm leading-relaxed mb-4">
                Heavy monsoon rains predicted in week 3. Current soil drainage is high, supporting deep-rooted crops.
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-center">
                <p className="text-[10px] uppercase font-bold opacity-70">Rain Chance</p>
                <p className="text-xl font-black">72%</p>
              </div>
              <div className="h-8 w-[1px] bg-on-primary/20" />
              <div className="text-center">
                <p className="text-[10px] uppercase font-bold opacity-70">Humidity</p>
                <p className="text-xl font-black">88%</p>
              </div>
            </div>
          </div>
          <RefreshCcw className="absolute -bottom-10 -right-10 w-40 h-40 opacity-10 group-hover:scale-125 transition-transform duration-1000" />
        </section>

        <button className="w-full bg-primary text-on-primary py-5 rounded-xl font-bold flex items-center justify-center gap-3 active:scale-[0.98] transition-transform">
          <FileText className="w-5 h-5" />
          <span>Detailed Cultivation Method</span>
        </button>
=======
                Optimize Your <span className="text-primary italic">Harvest</span>
              </h1>
              <p className="text-on-surface-variant text-sm mt-2 font-medium">
                Enter your soil NPK levels. We'll combine this with real-time weather to suggest the best 3 crops.
              </p>
            </div>
          </div>

          {/* Real-time Weather Badge */}
          <div className="bg-surface-container-low p-4 rounded-2xl flex items-center justify-between border border-outline-variant/30">
            {weatherLoading ? (
              <div className="flex items-center gap-2 text-on-surface-variant">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-xs font-bold uppercase tracking-wider">Locating farm...</span>
              </div>
            ) : weather ? (
              <>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" />
                  <span className="font-bold text-sm">{weather.city}</span>
                </div>
                <div className="flex items-center gap-4 text-sm font-bold text-on-surface-variant">
                  <div className="flex items-center gap-1"><Thermometer className="w-4 h-4" /> {weather.temp}°C</div>
                  <div className="flex items-center gap-1"><Droplets className="w-4 h-4" /> {weather.humidity}%</div>
                </div>
              </>
            ) : (
              <span className="text-xs font-bold text-error uppercase">Weather unavailable</span>
            )}
          </div>

          {/* NPK Input Form */}
          <div className="bg-white rounded-[2rem] p-6 shadow-xl border border-white/50 relative space-y-6">
            <div>
              <h3 className="font-black text-lg mb-4 flex items-center gap-2">
                <Leaf className="w-5 h-5 text-primary" />
                Soil NPK Levels
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-on-surface-variant">Nitrogen (N)</label>
                  <input
                    type="number"
                    value={n}
                    onChange={(e) => setN(e.target.value)}
                    placeholder="e.g. 45"
                    className="w-full bg-surface-container-lowest rounded-xl p-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 border border-outline-variant/20"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-on-surface-variant">Phosphorus (P)</label>
                  <input
                    type="number"
                    value={p}
                    onChange={(e) => setP(e.target.value)}
                    placeholder="e.g. 20"
                    className="w-full bg-surface-container-lowest rounded-xl p-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-tertiary/20 border border-outline-variant/20"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-on-surface-variant">Potassium (K)</label>
                  <input
                    type="number"
                    value={k}
                    onChange={(e) => setK(e.target.value)}
                    placeholder="e.g. 30"
                    className="w-full bg-surface-container-lowest rounded-xl p-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 border border-outline-variant/20"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={getRecommendation}
              disabled={loading || !n || !p || !k}
              className="w-full bg-primary text-on-primary py-4 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98] transition-transform"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <TrendingUp className="w-5 h-5" />}
              {loading ? 'Analyzing Data...' : 'Get Top 3 Recommendations'}
            </button>
          </div>
        </section>

        <AnimatePresence mode="wait">
          {error && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="bg-error-container text-on-error-container p-5 rounded-[2rem] flex gap-3 border border-error/10">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p className="text-sm font-bold">{error}</p>
            </motion.div>
          )}

          {prediction && !loading && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Weather Impact Summary */}
              <section className="bg-tertiary text-on-primary rounded-[2rem] p-6 relative overflow-hidden">
                <div className="relative z-10">
                  <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                    <CloudLightning className="w-5 h-5 fill-current" />
                    AI Weather & Soil Insight
                  </h3>
                  <p className="text-on-primary/90 text-sm leading-relaxed">
                    {prediction.weatherImpact}
                  </p>
                </div>
              </section>

              {/* 3 Crop Recommendations */}
              <div className="space-y-4">
                <h3 className="font-black text-xl px-2">Top 3 Matches</h3>
                {prediction.recommendations.map((crop, idx) => (
                  <motion.div
                    key={idx}
                    onClick={() => navigate(`/tools/crops/roadmap?crop=${encodeURIComponent(crop.cropName)}`)}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="bg-surface-container-lowest rounded-[2rem] p-6 shadow-lg border border-outline-variant/10 relative overflow-hidden cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all"
                  >
                    <div className="absolute top-0 right-0 bg-primary text-on-primary px-4 py-2 rounded-bl-3xl font-black text-lg shadow-md">
                      #{idx + 1}
                    </div>

                    <div className="pr-12">
                      <h3 className="text-2xl font-black mb-1">{crop.cropName}</h3>
                      <div className="flex items-center gap-2 mb-4">
                        <div className="h-2 w-24 bg-surface-container-high rounded-full overflow-hidden">
                          <div className="h-full bg-primary" style={{ width: `${crop.suitability}%` }} />
                        </div>
                        <span className="text-xs font-bold text-primary">{crop.suitability}% Match</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="bg-surface-container-low p-3 rounded-2xl">
                        <p className="text-[9px] font-bold text-on-surface-variant mb-1 uppercase">Expected Yield</p>
                        <p className="text-lg font-black">{crop.expectedYield}</p>
                      </div>
                      <div className="bg-surface-container-low p-3 rounded-2xl">
                        <p className="text-[9px] font-bold text-on-surface-variant mb-1 uppercase">Est. Profit</p>
                        <p className="text-lg font-black text-tertiary">{crop.estimatedProfit}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                        crop.demand.toLowerCase().includes('high') ? "bg-green-100 text-green-800" : "bg-orange-100 text-orange-800"
                      )}>
                        {crop.demand}
                      </span>
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1",
                        crop.riskLevel.toLowerCase().includes('low') ? "bg-surface-container text-on-surface" : "bg-red-100 text-red-800"
                      )}>
                        <ShieldCheck className="w-3 h-3" />
                        {crop.riskLevel}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
>>>>>>> origin/isti
      </div>
    </Layout>
  );
}
