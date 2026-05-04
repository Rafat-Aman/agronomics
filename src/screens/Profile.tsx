import { useApp } from '../AppContext';
import { useAuth } from '../AuthContext';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { getUserFields, getPlantedCrops } from '../lib/db';
import type { Field } from '../types';
import type { PlantedCrop } from '../lib/db';
import { 
  User, 
  MapPin, 
  Award, 
  Settings, 
  LogOut, 
  ChevronRight,
  Sprout,
  Map as MapIcon,
  Languages,
  Edit2,
  Trash2,
  ShieldCheck,
  Smartphone,
  ChevronLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import EditProfileModal from '../components/EditProfileModal';
import SettingsModal from '../components/SettingsModal';

export default function Profile() {
  const { t, language, setLanguage } = useApp();
  const { userProfile, currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [fields, setFields] = useState<Field[]>([]);
  const [plantedCrops, setPlantedCrops] = useState<PlantedCrop[]>([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);

  useEffect(() => {
    if (!currentUser?.uid) return;
    getUserFields(currentUser.uid).then(setFields).catch(console.error);
    getPlantedCrops(currentUser.uid).then(setPlantedCrops).catch(console.error);
  }, [currentUser?.uid]);

  // Compute total area in hectares
  const totalHa = fields.reduce((sum, f) => {
    const size = f.area_size || 0;
    if (f.area_unit === 'hectares') return sum + size;
    if (f.area_unit === 'acres') return sum + size * 0.404686;
    if (f.area_unit === 'bigha') return sum + size * 0.13378;
    return sum + size;
  }, 0);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <Layout title={t('profile')}>
      <div className="px-6 pb-24 space-y-12">
        {/* Hero Profile */}
        <section className="flex flex-col items-center text-center gap-6 pt-4">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative group"
          >
            <div className="w-32 h-32 rounded-[2.5rem] overflow-hidden shadow-2xl bg-surface-container-high rotate-3 group-hover:rotate-0 transition-transform duration-500 border-4 border-white">
              <img 
                src={currentUser?.photoURL || "https://images.unsplash.com/photo-1595152772835-219674b2a8a6?q=80&w=200&auto=format&fit=crop"} 
                alt="Profile"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <button 
              onClick={() => setIsEditModalOpen(true)}
              className="absolute -bottom-2 -right-2 bg-primary text-white p-3 rounded-2xl shadow-xl hover:scale-110 active:scale-95 transition-transform"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <div className="absolute -top-2 -left-2 bg-amber-400 text-amber-950 p-2 rounded-xl shadow-lg -rotate-12">
              <Award className="w-4 h-4 fill-current" />
            </div>
          </motion.div>
          
          <div className="space-y-2">
            <motion.h1 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="font-headline font-black text-4xl tracking-tight text-primary"
            >
              {userProfile?.name || 'Farmer'}
            </motion.h1>
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="flex items-center justify-center gap-2 text-on-surface-variant font-medium"
            >
              <MapPin className="w-4 h-4 text-primary" />
              <span className="text-[10px] uppercase tracking-[0.2em] font-bold">{userProfile?.region?.district || 'Bangladesh'}</span>
            </motion.div>
          </div>
        </section>

        {/* Stats Bento */}
        <section className="grid grid-cols-2 gap-4">
          <motion.div 
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="bg-primary/5 p-6 rounded-[2rem] border border-primary/10 relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-125 transition-transform duration-500">
              <MapIcon className="w-12 h-12" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-tighter text-primary/60 mb-4">{t('totalArea')}</p>
            <div className="space-y-1">
              <span className="font-headline font-black text-4xl text-primary tracking-tighter">
                {totalHa > 0 ? totalHa.toFixed(1) : '—'}
              </span>
              <span className="font-sans font-bold text-primary/40 block text-xs">{t('area')} (Ha)</span>
            </div>
          </motion.div>
          
          <motion.div 
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="bg-secondary/5 p-6 rounded-[2rem] border border-secondary/10 relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-125 transition-transform duration-500">
              <Sprout className="w-12 h-12" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-tighter text-secondary/60 mb-4">{t('myFields')}</p>
            <div className="space-y-1">
              <span className="font-headline font-black text-4xl text-secondary tracking-tighter">
                {String(fields.length).padStart(2, '0')}
              </span>
              <span className="font-sans font-bold text-secondary/40 block text-xs">{t('activeFieldsLabel')}</span>
            </div>
          </motion.div>
        </section>

        {/* Menu Sections */}
        <section className="space-y-8">
          <div>
            <h2 className="font-headline font-bold text-xl mb-6 flex items-center gap-3 px-2">
              {t('accountManagement')}
              <span className="h-[2px] flex-1 bg-surface-container-high rounded-full" />
            </h2>
            
            <div className="grid gap-3">
              {[
                { 
                  icon: MapIcon, 
                  label: t('myLand'), 
                  desc: t('manageLandBoundaries'), 
                  color: 'bg-emerald-50 text-emerald-600',
                  path: '/fields'
                },
                { 
                  icon: Sprout, 
                  label: t('myCrops'), 
                  desc: t('yieldTracking'), 
                  color: 'bg-amber-50 text-amber-600',
                  path: '/tools/crops'
                },
              ].map((item, i) => (
                <motion.button 
                  key={i} 
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate(item.path)}
                  className="w-full group flex items-center justify-between p-5 rounded-3xl bg-surface-container-low hover:bg-surface-container transition-all"
                >
                  <div className="flex items-center gap-4 text-left">
                    <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm", item.color)}>
                      <item.icon className="w-7 h-7" />
                    </div>
                    <div>
                      <span className="block font-bold text-on-surface text-lg">{item.label}</span>
                      <span className="text-xs text-on-surface-variant/70">{item.desc}</span>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-on-surface-variant opacity-20 group-hover:opacity-100 transition-opacity" />
                </motion.button>
              ))}
            </div>
          </div>

          <div>
            <h2 className="font-headline font-bold text-xl mb-6 flex items-center gap-3 px-2">
              {t('appSettings')}
              <span className="h-[2px] flex-1 bg-surface-container-high rounded-full" />
            </h2>
            
            <div className="grid gap-3">
              <motion.button 
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setLanguage(language === 'en' ? 'bn' : 'en')}
                className="w-full group flex items-center justify-between p-5 rounded-3xl bg-surface-container-low hover:bg-surface-container transition-all"
              >
                <div className="flex items-center gap-4 text-left">
                  <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
                    <Languages className="w-7 h-7" />
                  </div>
                  <div>
                    <span className="block font-bold text-on-surface text-lg">{t('languageSettings')}</span>
                    <span className="text-xs text-on-surface-variant/70">{t('switchLanguage')}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-black text-[10px] bg-blue-100 text-blue-700 px-3 py-1.5 rounded-xl uppercase tracking-wider">
                    {language === 'en' ? 'English' : 'বাংলা'}
                  </span>
                </div>
              </motion.button>

              <motion.button 
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setIsSettingsModalOpen(true)}
                className="w-full group flex items-center justify-between p-5 rounded-3xl bg-surface-container-low hover:bg-surface-container transition-all"
              >
                <div className="flex items-center gap-4 text-left">
                  <div className="w-14 h-14 rounded-2xl bg-slate-50 text-slate-600 flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
                    <Settings className="w-7 h-7" />
                  </div>
                  <div>
                    <span className="block font-bold text-on-surface text-lg">{t('appSettings')}</span>
                    <span className="text-xs text-on-surface-variant/70">{t('notificationsPrivacy')}</span>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-on-surface-variant opacity-20 group-hover:opacity-100 transition-opacity" />
              </motion.button>
            </div>
          </div>
          <div className="col-span-2 bg-emerald-50 border border-emerald-100 p-5 rounded-3xl flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-tighter text-emerald-600/60 mb-1">Active Crops</p>
              <span className="font-headline font-black text-4xl text-emerald-700 tracking-tighter">
                {String(plantedCrops.filter(c => c.status === 'growing').length).padStart(2, '0')}
              </span>
              <span className="font-sans font-bold text-emerald-600 block text-xs">Currently Growing</span>
            </div>
            <button
              onClick={() => navigate('/my-crops')}
              className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors"
            >
              View All →
            </button>
          </div>
        </section>

        {/* Footer Support */}
        <section className="bg-surface-container-lowest rounded-[2.5rem] p-8 border border-outline-variant/30 space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <p className="font-bold">Privacy & Security</p>
              <p className="text-xs text-on-surface-variant">Your data is encrypted and secure.</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-secondary/10 flex items-center justify-center text-secondary">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <p className="font-bold">App Version</p>
              <p className="text-xs text-on-surface-variant">v2.4.0 (AI Optimized)</p>
            </div>
          </div>
        </section>

        <button
          onClick={() => setIsLogoutConfirmOpen(true)}
          className="w-full flex items-center justify-center gap-3 px-8 py-5 rounded-[2rem] font-headline font-bold text-red-600 bg-red-50 hover:bg-red-100 active:scale-95 transition-all mt-8 shadow-sm"
        >
          <LogOut className="w-5 h-5" />
          {t('logout')}
        </button>
      </div>

      {/* Modals */}
      <EditProfileModal 
        isOpen={isEditModalOpen} 
        onClose={() => setIsEditModalOpen(false)} 
      />
      
      <SettingsModal 
        isOpen={isSettingsModalOpen} 
        onClose={() => setIsSettingsModalOpen(false)} 
      />

      {/* Logout Confirmation Modal */}
      <AnimatePresence>
        {isLogoutConfirmOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsLogoutConfirmOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-sm bg-surface rounded-[2.5rem] p-8 text-center space-y-6 shadow-2xl"
            >
              <div className="w-20 h-20 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto">
                <LogOut className="w-10 h-10" />
              </div>
              <div className="space-y-2">
                <h3 className="font-headline font-black text-2xl">Wait! Logging Out?</h3>
                <p className="text-on-surface-variant">Are you sure you want to leave your farm dashboard?</p>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2">
                <button
                  onClick={() => setIsLogoutConfirmOpen(false)}
                  className="py-4 rounded-2xl font-bold bg-surface-container-high hover:bg-surface-container-highest transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLogout}
                  className="py-4 rounded-2xl font-bold bg-red-600 text-white hover:bg-red-700 transition-colors shadow-lg shadow-red-200"
                >
                  Yes, Logout
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Layout>
  );
}
