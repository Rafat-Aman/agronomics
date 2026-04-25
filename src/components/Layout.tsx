import { ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../AppContext';
import { 
  Home, 
  Map as MapIcon, 
  BrainCircuit, 
  User, 
  ChevronLeft,
  Sprout
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

interface LayoutProps {
  children: ReactNode;
  showBack?: boolean;
  title?: string;
  hideNav?: boolean;
}

export default function Layout({ children, showBack, title, hideNav }: LayoutProps) {
  const { language, setLanguage, t } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { icon: Home, label: t('home'), path: '/dashboard' },
    { icon: MapIcon, label: t('fields'), path: '/fields' },
    { icon: BrainCircuit, label: t('aiTools'), path: '/tools' },
    { icon: User, label: t('profile'), path: '/profile' },
  ];

  return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto bg-surface relative overflow-x-hidden">
      {/* Top Bar */}
      <header className="fixed top-0 w-full max-w-md z-50 bg-surface/80 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {showBack && (
            <button 
              onClick={() => navigate(-1)}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-surface-container-high/50 hover:bg-surface-container-high transition-colors"
            >
              <ChevronLeft className="w-6 h-6 text-primary" />
            </button>
          )}
          <div className="flex items-center gap-2">
            <Sprout className="w-6 h-6 text-primary" />
            <h1 className="font-headline font-black text-primary tracking-tight text-lg">
              {title || t('appName')}
            </h1>
          </div>
        </div>
        
        <button 
          onClick={() => setLanguage(language === 'en' ? 'bn' : 'en')}
          className="bg-primary/10 px-4 py-1.5 rounded-full font-headline font-bold text-sm text-primary hover:bg-primary/20 transition-all"
        >
          {language === 'en' ? 'BN' : 'EN'}
        </button>
      </header>

      <main className={cn("flex-grow pt-20", !hideNav && "pb-32")}>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
        >
          {children}
        </motion.div>
      </main>

      {/* Bottom Nav */}
      {!hideNav && (
        <nav className="fixed bottom-0 w-full max-w-md z-50 bg-surface/80 backdrop-blur-md rounded-t-2xl shadow-[0_-4px_32px_rgba(23,29,20,0.06)] flex justify-around items-end pb-6 pt-2 px-4">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={cn(
                  "flex flex-col items-center justify-center transition-all duration-300",
                  isActive 
                    ? "bg-gradient-to-br from-primary to-primary-container text-white rounded-2xl px-5 py-2.5 -translate-y-2 shadow-lg"
                    : "text-on-surface/50 px-4 py-2 hover:text-primary scale-90 active:scale-110"
                )}
              >
                <Icon className={cn("w-6 h-6", isActive && "fill-current")} />
                <span className="font-sans font-medium text-[10px] uppercase tracking-wider mt-1">
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>
      )}
    </div>
  );
}
