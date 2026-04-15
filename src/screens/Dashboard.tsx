import { useApp } from '../AppContext';
import { useAuth } from '../AuthContext';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import Layout from '../components/Layout';
import { 
  CloudRain, 
  Wind, 
  Droplets, 
  ChevronRight, 
  Sprout, 
  AlertCircle, 
  CheckCircle2,
  ScanLine,
  Map as MapIcon,
  Lightbulb,
  Plus,
  ArrowRight
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

export default function Dashboard() {
  const { t } = useApp();
  const { userProfile, loading } = useAuth();
  const navigate = useNavigate();

  // Route protection — must be in an effect, not inline during render
  useEffect(() => {
    if (!loading && !userProfile) {
      navigate('/login');
    }
  }, [loading, userProfile, navigate]);

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
      <div className="px-6 space-y-8">
        {/* Greeting & Weather */}
        <section className="space-y-6">
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/70">
              Friday, 24 May
            </p>
            <h2 className="text-4xl font-headline font-bold tracking-tight text-on-surface">
              {t('welcome')} <span className="text-primary">{userProfile?.name || 'Farmer'}</span>
            </h2>
          </div>

          {/* Weather Card */}
          <div className="bg-surface-container-lowest rounded-[2rem] p-8 editorial-shadow relative overflow-hidden group">
            <div className="absolute -right-8 -top-8 w-64 h-64 bg-tertiary/10 rounded-full blur-3xl group-hover:bg-tertiary/20 transition-colors" />
            <div className="relative z-10">
              <div className="flex justify-between items-start gap-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-tertiary">
                    <CloudRain className="w-5 h-5" />
                    <span className="font-bold tracking-wide uppercase text-[10px]">Ideal time for sowing</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-7xl font-headline font-bold text-on-surface">28°</span>
                    <span className="text-2xl font-headline font-medium text-on-surface-variant">C</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-on-surface">Sylhet, BD</p>
                  <p className="text-sm text-on-surface-variant">Partly Cloudy</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-4 mt-8">
                <div className="flex items-center gap-2">
                  <Droplets className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-[10px] font-bold uppercase text-on-surface-variant/60">Humidity</p>
                    <p className="text-base font-bold">64%</p>
                  </div>
                </div>
                <div className="h-8 w-px bg-outline-variant/30" />
                <div className="flex items-center gap-2">
                  <Wind className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-[10px] font-bold uppercase text-on-surface-variant/60">Wind</p>
                    <p className="text-base font-bold">12 km/h</p>
                  </div>
                </div>
                <div className="h-8 w-px bg-outline-variant/30" />
                <div className="flex items-center gap-2">
                  <CloudRain className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-[10px] font-bold uppercase text-on-surface-variant/60">Rain</p>
                    <p className="text-base font-bold">10%</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* My Fields */}
        <section className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-2xl font-headline font-bold text-on-surface">{t('myFields')}</h3>
            <button className="text-primary font-bold text-sm flex items-center gap-1">
              {t('seeAll')} <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          
          <div className="grid grid-cols-1 gap-4">
            {/* Field Card 1 */}
            <div className="bg-surface-container-low rounded-[1.5rem] p-5 space-y-4 border border-outline-variant/20">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-bold text-lg">Field A</h4>
                  <p className="text-primary font-medium text-sm">Rice (BR-28)</p>
                </div>
                <span className="px-2 py-1 bg-primary-container text-on-primary rounded-md text-[10px] font-bold">HEALTHY</span>
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

            {/* Field Card 2 */}
            <div className="bg-surface-container-low rounded-[1.5rem] p-5 space-y-4 border border-outline-variant/20">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-bold text-lg">Field B</h4>
                  <p className="text-secondary font-medium text-sm">Potato (Diamond)</p>
                </div>
                <span className="px-2 py-1 bg-red-100 text-red-700 rounded-md text-[10px] font-bold uppercase">Needs Water</span>
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
              { icon: Sprout, label: t('cropSelection'), desc: 'AI Recommendations', color: 'text-primary', path: '/tools/crops' },
              { icon: ScanLine, label: t('diseaseDetection'), desc: 'Scan Crop', color: 'text-red-500', path: '/tools/scan' },
              { icon: MapIcon, label: t('fieldMapping'), desc: 'Satellite Analysis', color: 'text-secondary', path: '/fields' },
              { icon: Lightbulb, label: t('farmingTips'), desc: 'Best Practices', color: 'text-tertiary', path: '/tools' },
            ].map((tool, i) => (
              <div 
                key={i} 
                onClick={() => navigate(tool.path)}
                className="bg-surface-container-low hover:bg-surface-container transition-colors rounded-[2rem] p-6 flex flex-col gap-8 group cursor-pointer border border-outline-variant/10"
              >
                <div className={cn("w-12 h-12 bg-white rounded-2xl flex items-center justify-center editorial-shadow group-hover:scale-110 transition-transform", tool.color)}>
                  <tool.icon className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-on-surface font-bold text-lg leading-tight">{tool.label}</p>
                  <p className="text-on-surface-variant text-xs mt-1">{tool.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Featured Tip */}
        <section className="bg-surface-container-high/50 rounded-[2.5rem] overflow-hidden p-4">
          <div className="relative h-64 rounded-[2rem] overflow-hidden mb-6">
            <img 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBpHXcCQu5bofhzLr995Dq8V2XTnpPyHyuZvgQ_WZmpMxZ-gnn-eYTJbuWdWePp1U0vtgjk8NbAmrlYKPrsqu7I3XRuMC2PSJe8EgpKAxKSUysESMIfs1awosvvbdH8rxDvSCbiWvSCTg8vm1-NvZ2PepeuHvBRi5vGDlWriUpp3YS-ftOTR9myeVQRtrnOLxJuS38aoidu2Y5jMoHvV_s6UaUJwFyOFdnsCKo08CnxXUe4ninIVJNgD5UiurQ92DE-Y5MKgUiKDgsX" 
              alt="Rice Paddy"
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          </div>
          <div className="px-4 pb-4 space-y-4">
            <span className="text-[10px] font-bold text-primary uppercase tracking-[0.2em]">{t('weeklyFocus')}</span>
            <h3 className="text-2xl font-headline font-bold text-on-surface leading-tight">{t('waterUsage')}</h3>
            <p className="text-sm text-on-surface-variant leading-relaxed">
              According to recent satellite data, rainfall in your area may decrease by 15%. Learn about drip irrigation.
            </p>
            <button className="flex items-center gap-3 text-primary font-bold group">
              {t('readGuide')}
              <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
            </button>
          </div>
        </section>
      </div>

      {/* FAB */}
      <div className="fixed bottom-24 right-6 z-40">
        <button className="bg-primary text-on-primary w-14 h-14 rounded-[1.25rem] shadow-xl flex items-center justify-center active:scale-95 transition-transform">
          <Plus className="w-6 h-6" />
        </button>
      </div>
    </Layout>
  );
}
