import { useApp } from '../AppContext';
import Layout from '../components/Layout';
import { 
  BookOpen, 
  Sprout, 
  CloudRain, 
  Bug, 
  Microscope,
  ArrowRight,
  Clock
} from 'lucide-react';
import { cn } from '../lib/utils';

export default function KnowledgeCenter() {
  const { t } = useApp();

  const categories = [
    { label: t('allMethods'), active: true },
    { label: t('cropTips'), active: false },
    { label: t('seasonal'), active: false },
    { label: t('soilHealth'), active: false },
  ];

  return (
    <Layout title={t('knowledgeCenter')} showBack>
      <div className="px-6 space-y-12">
        {/* Hero */}
        <section>
          <span className="text-tertiary font-bold tracking-widest text-[10px] uppercase mb-2 block">
            Information Hub
          </span>
          <h2 className="font-headline font-bold text-[3rem] leading-[1.1] text-on-surface tracking-tighter">
            {t('expertConsultation')} <br />
            <span className="italic font-normal text-primary">& {t('seasonalInsights')}</span>
          </h2>
        </section>

        {/* Categories */}
        <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar">
          {categories.map((cat, i) => (
            <button 
              key={i}
              className={cn(
                "px-6 py-2.5 rounded-full font-medium text-sm whitespace-nowrap transition-all",
                cat.active 
                  ? "bg-primary text-on-primary shadow-lg" 
                  : "bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest"
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Featured Article */}
        <article className="group">
          <div className="relative overflow-hidden rounded-[2rem] bg-surface-container-lowest editorial-shadow">
            <div className="aspect-[16/9] w-full relative">
              <img 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAZYQei4e_K2QGSOeb2YjqGMwt7FID-fB4TDwDDxBhDMKEpjhCHTg4Kc_VyuwQZq9Q9HRs7IT974Q-NOu2bqZAvpdh23Cr9RTkgqYzXys_FEeVnlKPfpeK87zRzfIdyydrOcFtnCJRDY1BT4p3g-jgFWTdNQ-aInxGCeZpSj4kBt3HamjmaHcahV9gXulZ3o1CiRONQGl3oE00jhHcbBhLJMs2Fh2t9mgIuxf4xKK9ZdeLqvDuFCubjYlWXBTJ78xPy0rS7CjOAbJY9" 
                alt="Seasonal Planting"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              <div className="absolute top-6 left-6">
                <span className="bg-primary-container text-on-primary px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest">
                  Seasonal Advice
                </span>
              </div>
            </div>
            <div className="p-8">
              <h3 className="font-headline font-bold text-[1.75rem] text-on-surface mb-3 leading-tight">
                Monsoon Mastery: Right Time for Rice Planting
              </h3>
              <p className="text-on-surface-variant leading-relaxed text-lg mb-6">
                Learn how to plant rice seedlings with the first heavy rains to maximize root strength and minimize water stress.
              </p>
              <div className="flex items-center gap-4">
                <div className="flex items-center text-primary font-bold gap-2">
                  <BookOpen className="w-5 h-5" />
                  <span className="text-sm">{t('readGuide')}</span>
                </div>
                <div className="flex items-center text-on-surface-variant/40 text-sm italic">
                  <Clock className="w-4 h-4 mr-1" />
                  — 5 min read
                </div>
              </div>
            </div>
          </div>
        </article>

        {/* Bento Grid Tips */}
        <div className="grid grid-cols-1 gap-8">
          <div className="bg-tertiary-container text-on-tertiary rounded-[2rem] p-8 relative overflow-hidden">
            <Microscope className="w-10 h-10 mb-4 opacity-50" />
            <h3 className="text-xl font-bold font-headline mb-3">Soil Testing 101</h3>
            <p className="text-sm opacity-90 leading-relaxed mb-6">
              Testing soil before planting ensures you know exactly what nutrients your land needs. Save 15% on fertilizer costs.
            </p>
            <button className="inline-flex items-center px-4 py-2 bg-on-tertiary-container text-tertiary-container rounded-full text-[10px] font-bold uppercase">
              Start Now
            </button>
          </div>

          <div className="bg-surface-container-high rounded-[2rem] p-8 editorial-shadow">
            <div className="flex gap-4 mb-4">
              <Bug className="w-6 h-6 text-primary" />
              <span className="text-[10px] font-bold text-primary uppercase tracking-widest">{t('pestAlert')}</span>
            </div>
            <h3 className="text-lg font-bold text-on-surface mb-2">{t('leafhopper')}</h3>
            <p className="text-sm text-on-surface-variant">
              Check for these small insects on the underside of leaves after light rains.
            </p>
          </div>
        </div>

        {/* Load More */}
        <div className="mt-16 flex flex-col items-center">
          <button className="px-12 py-4 bg-primary text-on-primary rounded-full font-bold text-lg hover:scale-95 transition-transform editorial-shadow">
            {t('moreAdvice')}
          </button>
          <p className="mt-4 text-on-surface-variant text-sm font-medium">
            {t('pageOf').replace('{current}', '1').replace('{total}', '12')}
          </p>
        </div>
      </div>
    </Layout>
  );
}
