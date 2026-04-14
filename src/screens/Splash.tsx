import { useApp } from '../AppContext';
import { useNavigate } from 'react-router-dom';
import { Sprout, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';

export default function Splash() {
  const { t } = useApp();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col bg-surface overflow-hidden">
      {/* Hero Visual */}
      <div className="relative w-full h-[50vh] editorial-asymmetry overflow-hidden bg-surface-container-low">
        <img 
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuDuXOR7pIR1xlz4MZbGBrwwVnos9d5rYvYwNHkwRoZ3yrWl2bh2rf8UDWLZBIGX1KdoDmqSFMvvT8gbY5up85nU3-Ft4zNDWsh0GpYQLETMc36V7mbG7SPU_CcShdyb9Ht_4uPoW6zSY4SeaE3spiMpTpwXjFelUqj8dreDNI0fFk1TocMwSf_ItIsD2hkVrVMTxWQFb21U8xiO4teOhB6HaT7sGFioDupi1X8wxGYVxGliaqSfCs0uLMP6Toa8J5rTNaI2rQ00Y6ot" 
          alt="Hero"
          className="absolute inset-0 w-full h-full object-cover grayscale-[20%] brightness-90"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-transparent opacity-60" />
      </div>

      {/* Content */}
      <div className="relative flex flex-col items-center justify-start -mt-20 px-8 z-10 pb-12">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0, rotate: -5 }}
          animate={{ scale: 1, opacity: 1, rotate: -2 }}
          className="bg-surface-container-lowest p-6 rounded-[2.5rem] shadow-2xl shadow-on-surface/5 mb-8"
        >
          <Sprout className="w-16 h-16 text-primary" />
        </motion.div>

        <div className="text-center space-y-3 mb-12">
          <h1 className="font-headline font-black text-5xl tracking-tighter text-on-surface">
            {t('smartFarmer')}
          </h1>
          <div className="h-1 w-12 bg-tertiary mx-auto rounded-full opacity-30" />
          <p className="font-sans text-lg text-on-surface-variant max-w-xs font-medium leading-relaxed">
            {t('aiDriven')}
          </p>
        </div>

        <div className="w-full max-w-sm flex flex-col gap-4">
          <button 
            onClick={() => navigate('/login')}
            className="w-full bg-gradient-to-br from-primary to-primary-container text-on-primary font-headline font-bold text-xl py-5 rounded-2xl shadow-lg shadow-primary/20 hover:scale-[0.98] transition-transform flex items-center justify-center gap-3"
          >
            {t('getStarted')}
            <ArrowRight className="w-6 h-6" />
          </button>

          <div className="flex items-center justify-center gap-6 mt-4">
            <div className="flex flex-col items-center">
              <span className="font-headline font-bold text-primary text-2xl">98%</span>
              <span className="font-sans text-[10px] uppercase tracking-widest text-on-surface-variant">{t('accuracy')}</span>
            </div>
            <div className="h-8 w-px bg-outline-variant/30" />
            <div className="flex flex-col items-center">
              <span className="font-headline font-bold text-primary text-2xl">24/7</span>
              <span className="font-sans text-[10px] uppercase tracking-widest text-on-surface-variant">{t('advisor')}</span>
            </div>
            <div className="h-8 w-px bg-outline-variant/30" />
            <div className="flex flex-col items-center">
              <span className="font-headline font-bold text-primary text-2xl">AI</span>
              <span className="font-sans text-[10px] uppercase tracking-widest text-on-surface-variant">Powered</span>
            </div>
          </div>
        </div>
      </div>

      <footer className="mt-auto py-6 px-8 text-center">
        <p className="font-sans text-[10px] text-on-surface-variant/60 tracking-widest leading-loose uppercase">
          Proudly built for the next generation of farming<br />
          © 2024 Digital Agronomist Solutions
        </p>
      </footer>
    </div>
  );
}
