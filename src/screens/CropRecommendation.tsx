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
          <div className="flex flex-col gap-4">
            <div className="max-w-2xl">
              <span className="inline-block bg-primary-container text-on-primary px-3 py-1 rounded-full text-[10px] font-bold tracking-wider mb-2 uppercase">
                AI Recommendation Engine
              </span>
              <h1 className="text-4xl font-black text-on-surface tracking-tight leading-tight">
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
      </div>
    </Layout>
  );
}
