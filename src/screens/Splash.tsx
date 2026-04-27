import { useApp } from '../AppContext';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Leaf, ShieldCheck, Cpu } from 'lucide-react';
import { motion } from 'motion/react';
import Layout from '../components/Layout';

export default function Splash() {
  const { t } = useApp();
  const navigate = useNavigate();

  return (
    <Layout hideNav hideLangToggle title="">
      <div className="relative min-h-[calc(100vh-80px)] flex flex-col justify-end bg-surface overflow-hidden -mt-20">
        {/* Full-screen Hero Background */}
        <div className="absolute inset-0 w-full h-full">
          <img 
            src="https://images.unsplash.com/photo-1500382017468-9049fee78a6c?auto=format&fit=crop&q=80&w=2000" 
            alt="Smart Farm Aerial View"
            className="w-full h-full object-cover scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/40 to-transparent" />
        </div>

        {/* Content Container (Glassmorphism) */}
        <motion.div 
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
          className="relative z-10 w-full px-4 sm:px-6 pb-8 sm:pb-12 pt-8"
        >
          <div className="backdrop-blur-2xl bg-white/60 rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-8 border border-white/20 shadow-2xl">
            <div className="text-center space-y-3 sm:space-y-4 mb-8 sm:mb-10">
              <motion.h1 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="font-headline font-black text-4xl sm:text-5xl md:text-6xl tracking-tight text-primary leading-tight"
              >
                {t('smartFarmer')}
              </motion.h1>
              
              <motion.div 
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 0.6, duration: 0.5 }}
                className="h-1.5 w-12 sm:w-16 bg-primary mx-auto rounded-full"
              />
              
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="font-sans text-base sm:text-lg text-on-surface-variant max-w-xs sm:max-w-sm mx-auto font-medium leading-relaxed"
              >
                {t('aiDriven')}
              </motion.p>
            </div>

            {/* Feature Badges */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="grid grid-cols-3 gap-2 sm:gap-4 mb-8 sm:mb-10"
            >
              <div className="flex flex-col items-center bg-white/40 rounded-xl sm:rounded-2xl p-2 sm:p-3 border border-white/40 shadow-sm">
                <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 text-primary mb-1 sm:mb-2" />
                <span className="font-headline font-bold text-primary text-lg sm:text-xl">98%</span>
                <span className="font-sans text-[8px] sm:text-[9px] uppercase tracking-wider text-on-surface-variant/70 text-center font-bold">{t('accuracy')}</span>
              </div>
              <div className="flex flex-col items-center bg-white/40 rounded-xl sm:rounded-2xl p-2 sm:p-3 border border-white/40 shadow-sm">
                <Leaf className="w-5 h-5 sm:w-6 sm:h-6 text-primary mb-1 sm:mb-2" />
                <span className="font-headline font-bold text-primary text-lg sm:text-xl">24/7</span>
                <span className="font-sans text-[8px] sm:text-[9px] uppercase tracking-wider text-on-surface-variant/70 text-center font-bold">{t('advisor')}</span>
              </div>
              <div className="flex flex-col items-center bg-white/40 rounded-xl sm:rounded-2xl p-2 sm:p-3 border border-white/40 shadow-sm">
                <Cpu className="w-5 h-5 sm:w-6 sm:h-6 text-primary mb-1 sm:mb-2" />
                <span className="font-headline font-bold text-primary text-lg sm:text-xl">AI</span>
                <span className="font-sans text-[8px] sm:text-[9px] uppercase tracking-wider text-on-surface-variant/70 text-center font-bold">Powered</span>
              </div>
            </motion.div>

            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1 }}
              onClick={() => navigate('/login')}
              className="w-full bg-primary hover:bg-primary/90 text-on-primary font-headline font-bold text-lg sm:text-xl py-4 sm:py-5 rounded-xl sm:rounded-2xl shadow-lg shadow-primary/30 transition-all flex items-center justify-center gap-3"
            >
              {t('getStarted')}
              <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6" />
            </motion.button>
          </div>

          <motion.footer 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="mt-6 sm:mt-8 text-center px-4"
          >
            <p className="font-sans text-[9px] sm:text-[10px] text-on-surface-variant/50 tracking-widest leading-loose uppercase font-bold">
              Proudly built for the next generation of farming<br />
              © 2024 Digital Agronomist Solutions
            </p>
          </motion.footer>
        </motion.div>
      </div>
    </Layout>
  );
}
