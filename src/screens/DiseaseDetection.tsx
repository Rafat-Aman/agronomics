import { useApp } from '../AppContext';
import Layout from '../components/Layout';
import { 
  Camera, 
  Upload, 
  Lightbulb, 
  BrainCircuit, 
  ShieldCheck, 
  Share2,
  Droplets,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

export default function DiseaseDetection() {
  const { t } = useApp();

  return (
    <Layout title={t('diseaseDetection')} showBack>
      <div className="px-6 space-y-10">
        {/* Hero */}
        <section>
          <h2 className="font-headline font-bold text-[1.75rem] leading-tight text-on-surface max-w-xs mb-2">
            {t('scanCrops')}
          </h2>
          <p className="text-on-surface-variant text-sm max-w-md">
            {t('scanDesc')}
          </p>
        </section>

        {/* Upload/Capture Bento */}
        <div className="grid grid-cols-1 gap-6">
          <div className="bg-surface-container-lowest rounded-[2rem] p-8 editorial-shadow border border-outline-variant/10 relative overflow-hidden group">
            <div className="relative z-10">
              <div className="w-16 h-16 bg-primary-container rounded-2xl flex items-center justify-center mb-6 text-on-primary group-hover:scale-110 transition-transform duration-300">
                <Camera className="w-8 h-8" />
              </div>
              <h3 className="font-headline font-bold text-xl mb-3">{t('uploadCapture')}</h3>
              <p className="text-on-surface-variant text-sm mb-8 leading-relaxed">
                {t('uploadDesc')}
              </p>
              <div className="flex flex-col gap-4">
                <button className="w-full bg-primary text-on-primary py-4 rounded-xl font-bold flex items-center justify-center gap-2 text-lg active:scale-95 transition-transform">
                  <Camera className="w-6 h-6" />
                  {t('openCamera')}
                </button>
                <button className="w-full bg-surface-container-high text-on-surface py-4 rounded-xl font-bold flex items-center justify-center gap-2 text-lg hover:bg-surface-container-highest transition-colors">
                  <Upload className="w-6 h-6" />
                  {t('selectGallery')}
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <div className="bg-surface-container-low rounded-[2rem] p-6 border border-outline-variant/5">
              <h4 className="font-headline font-bold text-on-surface-variant mb-4 flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-primary" />
                {t('expertAdvice')}
              </h4>
              <p className="text-on-surface-variant text-sm italic leading-snug">
                "Look for yellowing or small brown spots on leaf edges. These are early signs of fungal issues in rice crops."
              </p>
            </div>

            <div className="bg-primary-container/10 rounded-[2rem] p-8 flex flex-col items-center justify-center text-center border border-primary/10">
              <div className="relative w-24 h-24 mb-4">
                <div className="absolute inset-0 rounded-full border-4 border-primary-container border-t-primary animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <BrainCircuit className="w-8 h-8 text-primary" />
                </div>
              </div>
              <span className="text-primary font-bold">{t('waitingImage')}</span>
              <p className="text-[10px] uppercase tracking-widest text-on-surface-variant mt-2">AI READY</p>
            </div>
          </div>
        </div>

        {/* Result Area (Simulated) */}
        <section className="bg-surface-container-low rounded-[2.5rem] p-8 border border-outline-variant/20">
          <div className="flex flex-col gap-8">
            <div className="w-full aspect-square rounded-3xl overflow-hidden bg-surface-container-high relative border border-outline-variant/30">
              <img 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCuGdJw_MzOkXGnNhecpIpRY0yyfn0lTvxnk7B8gQk66YUVBgMqH5R39z3QIWWuRJNqxmDX523JH4Cin9-Sp12gz6V8ZbaaHSRrtDXjkUM9GfYZkY6quo2jSqf63rJk_ZR1j5_F_LbSR6nTtfS_D_WfNvclBsBsfU9aIZhbRibRSMFXXqFH400rXv5Y9W0OupCEGhxporAtadtlblRcLOx3U3DSzBr1gccZrjN_nQ2xRQIQ3yH8KNA6K-JfTLEW4bZI9YNGWYUg0TKj" 
                alt="Analyzed Leaf"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute top-4 left-4 bg-red-600 text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                {t('identified')}
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-primary font-bold text-xs uppercase tracking-widest">Disease Detected</span>
                  <h2 className="font-headline font-bold text-3xl text-on-surface mt-1">{t('riceBlast')}</h2>
                </div>
                <div className="text-right">
                  <span className="text-5xl font-black text-primary leading-none">94%</span>
                  <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{t('accuracy')}</p>
                </div>
              </div>

              <div className="space-y-6">
                <h4 className="font-sans font-bold text-sm text-on-surface-variant uppercase tracking-widest flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" />
                  {t('recommendedActions')}
                </h4>
                
                <div className="space-y-3">
                  <div className="bg-surface-container-lowest p-4 rounded-2xl flex gap-4 items-center">
                    <div className="w-10 h-10 bg-tertiary/10 rounded-xl flex items-center justify-center text-tertiary">
                      <Droplets className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <h5 className="font-bold text-sm">{t('irrigationControl')}</h5>
                      <p className="text-xs text-on-surface-variant">Maintain 2-3cm water level to reduce moisture.</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-on-surface-variant" />
                  </div>

                  <div className="bg-surface-container-lowest p-4 rounded-2xl flex gap-4 items-center">
                    <div className="w-10 h-10 bg-secondary/10 rounded-xl flex items-center justify-center text-secondary">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <h5 className="font-bold text-sm">{t('fungicideApp')}</h5>
                      <p className="text-xs text-on-surface-variant">Spray Tricyclazole at 0.6g/L dosage.</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-on-surface-variant" />
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button className="flex-1 bg-primary text-on-primary py-4 rounded-xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform">
                    <ShieldCheck className="w-5 h-5" />
                    {t('buyRemedy')}
                  </button>
                  <button className="px-6 py-4 rounded-xl bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest transition-colors">
                    <Share2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
}
