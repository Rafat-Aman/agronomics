import { ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../AppContext';
import { 
  Home, 
  Map as MapIcon, 
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
  hideLangToggle?: boolean;
}

export default function Layout({ children, showBack, title, hideNav, hideLangToggle }: LayoutProps) {
  const { language, setLanguage, t } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { icon: Home, label: t('home'), path: '/dashboard' },
    { icon: MapIcon, label: t('fields'), path: '/fields' },
    { icon: Sprout, label: 'ফসল', path: '/my-crops' },
    { icon: User, label: t('profile'), path: '/profile' },
  ];

  return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto bg-surface relative overflow-x-hidden">
      {/* Top Bar — Agri-OS app bar */}
      <header className="fixed top-0 w-full max-w-md z-50 bg-surface/92 backdrop-blur-md border-b border-outline-variant/15 px-3 py-2.5 flex items-center gap-2">
        {showBack ? (
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-surface-container transition-colors shrink-0"
          >
            <ChevronLeft className="w-5 h-5 text-on-surface" />
          </button>
        ) : (
          <div className="w-9 h-9 flex items-center justify-center rounded-full bg-primary/10 shrink-0">
            <Sprout className="w-5 h-5 text-primary" />
          </div>
        )}

        <h1 className="flex-1 font-sans font-semibold text-on-surface text-[17px] tracking-[-0.005em] ml-1">
          {title || t('appName')}
        </h1>

        {!hideLangToggle && (
          <button
            onClick={() => setLanguage(language === 'en' ? 'bn' : 'en')}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-surface-container transition-colors shrink-0"
          >
            <span className="font-data text-[11px] font-semibold text-on-surface-variant/70 tracking-wide">
              {language === 'en' ? 'বাং' : 'EN'}
            </span>
          </button>
        )}
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

      {/* Bottom Nav — Material You M3 style */}
      {!hideNav && (
        <nav className="fixed bottom-0 w-full max-w-md z-50 bg-surface/92 backdrop-blur-md border-t border-outline-variant/20 flex justify-around items-center pb-6 pt-2 px-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;

            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className="flex flex-col items-center gap-1 min-w-[60px] transition-all duration-200 active:scale-95"
              >
                {/* Pill indicator around icon */}
                <div className={cn(
                  "flex items-center justify-center px-4 py-1.5 rounded-full transition-all duration-200",
                  isActive ? "bg-primary/15" : "bg-transparent"
                )}>
                  <Icon className={cn(
                    "w-[22px] h-[22px] transition-colors duration-200",
                    isActive ? "text-primary" : "text-on-surface-variant/50"
                  )} />
                </div>
                <span className={cn(
                  "text-[11px] transition-colors duration-200",
                  isActive ? "font-semibold text-primary" : "font-medium text-on-surface-variant/50"
                )}>
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
