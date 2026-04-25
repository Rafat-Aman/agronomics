import { useApp } from '../AppContext';
import Layout from '../components/Layout';
import { 
  Map as MapIcon, 
  Navigation, 
  Layers, 
  Grip, 
  MoreVertical,
  Sprout,
  Trees,
  TrendingUp,
  ArrowRight
} from 'lucide-react';
import { cn } from '../lib/utils';

export default function FieldMapper() {
  const { t } = useApp();

  return (
    <Layout title={t('fieldMapper')}>
      <div className="px-6 space-y-10">
        {/* Editorial Header */}
        <section>
          <h2 className="text-[1.75rem] font-headline font-bold text-on-surface leading-tight">
            {t('myLand')}
          </h2>
          <p className="text-on-surface-variant mt-1">{t('manageLand')}</p>
        </section>

        {/* Map & Stats Bento */}
        <section className="grid grid-cols-1 gap-4">
          {/* Map Card */}
          <div className="relative h-[320px] rounded-[2rem] overflow-hidden shadow-sm group">
            <div className="absolute inset-0 bg-surface-container-high">
              <img 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCi7pdVyVGShvnw-gXdQVCAY2FOVFL_1sdwGGQi6x6unMd1IPoFjxBRQXe8sN8X5NRQCouC5mxmPBqjuZkcwpz9zOT_WnUjJqOOyAiAbzvUQ1sAWAYj-WpXkKYbNf-uGbormt7CzZk4AXVfpDq76U_VNBGmfgdz-bmwxhN3YXrhzYazawlzUPtdM51T2lwDIEskggWJ45856mOmKG_5wY6VSqr38MJcol7Ed1YKRuwVmuxcvB-dqK2H-kFCrsp1xEkDJmxO7qn43NaQ" 
                alt="Map"
                className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-700"
                referrerPolicy="no-referrer"
              />
            </div>
            
            <div className="absolute top-4 right-4 flex flex-col gap-2">
              <button className="bg-surface-container-lowest/90 backdrop-blur-md p-3 rounded-xl shadow-lg text-primary hover:bg-primary hover:text-white transition-all">
                <Navigation className="w-5 h-5" />
              </button>
              <button className="bg-surface-container-lowest/90 backdrop-blur-md p-3 rounded-xl shadow-lg text-primary hover:bg-primary hover:text-white transition-all">
                <Layers className="w-5 h-5" />
              </button>
            </div>

            <div className="absolute bottom-6 left-6 flex gap-3">
              <button className="bg-primary text-white px-5 py-3 rounded-xl flex items-center gap-2 shadow-lg active:scale-95 transition-all text-sm font-bold">
                <Grip className="w-4 h-4" />
                <span>GPS Connect</span>
              </button>
              <button className="bg-surface-container-lowest/95 backdrop-blur-md text-primary px-5 py-3 rounded-xl flex items-center gap-2 shadow-lg active:scale-95 transition-all text-sm font-bold">
                <MapIcon className="w-4 h-4" />
                <span>Mark Area</span>
              </button>
            </div>
          </div>

          {/* Stats Card */}
          <div className="bg-primary-container text-on-primary p-8 rounded-[2rem] flex flex-col justify-between">
            <div>
              <Sprout className="w-10 h-10 mb-4 fill-current opacity-20" />
              <h3 className="text-xl font-bold">3 {t('activeFields')}</h3>
              <p className="text-sm opacity-80 mt-1">Total 5.8 Acres Area</p>
            </div>
            <div className="mt-8">
              <div className="text-4xl font-bold mb-2">82%</div>
              <p className="text-xs opacity-80">{t('avgMoisture')}</p>
              <div className="mt-4 h-2 bg-white/20 rounded-full overflow-hidden">
                <div className="h-full bg-white w-[82%] rounded-full" />
              </div>
            </div>
          </div>
        </section>

        {/* Saved Plots */}
        <section>
          <div className="flex justify-between items-end mb-6">
            <div>
              <h3 className="text-xl font-bold text-on-surface">{t('savedPlots')}</h3>
              <p className="text-sm text-on-surface-variant">All your data is secured here</p>
            </div>
            <button className="text-primary font-bold hover:underline flex items-center gap-1 text-sm">
              {t('seeAll')} <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-6">
            {[
              { name: 'North Rice Field', loc: 'Satkhira, Block B', area: '2.4 Acres', soil: 'Loamy', growth: 75, icon: Sprout, color: 'text-primary' },
              { name: 'East Garden', loc: 'Jessore, Sector 4', area: '1.2 Acres', soil: 'Sandy', growth: 40, icon: Trees, color: 'text-secondary' },
            ].map((plot, i) => (
              <div key={i} className="bg-surface-container-lowest rounded-[2rem] p-6 editorial-shadow border border-outline-variant/10">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex gap-4">
                    <div className={cn("w-16 h-16 rounded-2xl bg-surface-container-low flex items-center justify-center", plot.color)}>
                      <plot.icon className="w-8 h-8" />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-on-surface">{plot.name}</h4>
                      <p className="text-sm text-on-surface-variant">{plot.loc}</p>
                    </div>
                  </div>
                  <button className="text-outline hover:text-primary transition-colors">
                    <MoreVertical className="w-6 h-6" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-surface-container-low p-4 rounded-2xl">
                    <p className="text-[10px] uppercase text-on-surface-variant tracking-wider">{t('area')}</p>
                    <p className={cn("font-bold", plot.color)}>{plot.area}</p>
                  </div>
                  <div className="bg-surface-container-low p-4 rounded-2xl">
                    <p className="text-[10px] uppercase text-on-surface-variant tracking-wider">{t('soilType')}</p>
                    <p className={cn("font-bold", plot.color)}>{plot.soil}</p>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">{t('growth')}</span>
                    <span className={cn("text-sm font-bold", plot.color)}>{plot.growth}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-surface-container-high rounded-full overflow-hidden">
                    <div 
                      className={cn("h-full rounded-full transition-all duration-1000", i === 0 ? "bg-primary" : "bg-secondary")} 
                      style={{ width: `${plot.growth}%` }} 
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </Layout>
  );
}
