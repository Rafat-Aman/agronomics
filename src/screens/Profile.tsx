import { useApp } from '../AppContext';
import { useAuth } from '../AuthContext';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { getUserFields } from '../lib/db';
import type { Field } from '../types';
import { 
  User, 
  MapPin, 
  Award, 
  Settings, 
  LogOut, 
  ChevronRight,
  Sprout,
  Map as MapIcon,
  Languages
} from 'lucide-react';
import { cn } from '../lib/utils';

export default function Profile() {
  const { t, language, setLanguage } = useApp();
  const { userProfile, currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [fields, setFields] = useState<Field[]>([]);

  useEffect(() => {
    if (!currentUser?.uid) return;
    getUserFields(currentUser.uid).then(setFields).catch(console.error);
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
      <div className="px-6 space-y-12">
        {/* Hero Profile */}
        <section className="flex flex-col items-center text-center gap-6">
          <div className="relative group">
            <div className="w-32 h-32 rounded-3xl overflow-hidden editorial-shadow bg-surface-container-high rotate-3 group-hover:rotate-0 transition-transform duration-500">
              <img 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCobFqo0CRVA3brzqEmsF1E0QITvR0daAIlnQMlO2gUoHbtlpdry4pZNrQA5r4A6KKOfAyaojSKezc2Egv4qFyOYWEdSFl2_6-daV2OOpw9HDjH5k0m3zK4Ytg__vAPUpfg05vmUZ7f8mkDI6r0OJmudrSzAnaSJlNsEXzOtBRa3wWbWKBXVJ3MQKAWKLXapcfur2VUMt-b8x6yEy2dVXW6LR5QExgvLP9FZ45ipKGxuZLao9a_BtkpcI7IHmuqfhok3EtZwsp9TLa4" 
                alt="Profile"
                className="w-full h-full object-cover grayscale-[20%]"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="absolute -bottom-2 -right-2 bg-primary text-white p-2 rounded-xl shadow-lg">
              <Award className="w-4 h-4 fill-current" />
            </div>
          </div>
          
          <div className="space-y-2">
            <h1 className="font-headline font-black text-4xl tracking-tight text-primary">
              {userProfile?.name || 'Farmer'}
            </h1>
            <div className="flex items-center justify-center gap-2 text-on-surface-variant font-medium">
              <MapPin className="w-4 h-4" />
              <span className="text-[10px] uppercase tracking-widest">{userProfile?.region?.district || 'Bangladesh'}</span>
            </div>
          </div>
        </section>

        {/* Stats Bento */}
        <section className="grid grid-cols-2 gap-4">
          <div className="bg-surface-container-lowest p-6 rounded-3xl editorial-shadow border-t-4 border-primary">
            <p className="text-[10px] font-black uppercase tracking-tighter text-on-surface-variant/40 mb-4">{t('totalArea')}</p>
            <div className="space-y-1">
              <span className="font-headline font-black text-4xl text-on-surface tracking-tighter">
                {totalHa > 0 ? totalHa.toFixed(1) : '—'}
              </span>
              <span className="font-sans font-bold text-primary block text-xs">{t('area')}</span>
            </div>
          </div>
          <div className="bg-surface-container-low p-6 rounded-3xl">
            <p className="text-[10px] font-black uppercase tracking-tighter text-on-surface-variant/40 mb-4">{t('myFields')}</p>
            <div className="space-y-1">
              <span className="font-headline font-black text-4xl text-on-surface tracking-tighter">
                {String(fields.length).padStart(2, '0')}
              </span>
              <span className="font-sans font-bold text-tertiary block text-xs">{t('activeFieldsLabel')}</span>
            </div>
          </div>
        </section>

        {/* Menu */}
        <section className="space-y-4">
          <h2 className="font-headline font-bold text-xl mb-6 flex items-center gap-3">
            {t('accountManagement')}
            <span className="h-[2px] flex-1 bg-surface-container-high" />
          </h2>
          
          <div className="space-y-3">
            {[
              { icon: MapIcon, label: t('myLand'), desc: t('manageLandBoundaries') },
              { icon: Sprout, label: t('myCrops'), desc: t('yieldTracking') },
            ].map((item, i) => (
              <button key={i} className="w-full group flex items-center justify-between p-5 rounded-2xl bg-surface-container-low hover:bg-surface-container transition-all">
                <div className="flex items-center gap-4 text-left">
                  <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                    <item.icon className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="block font-bold text-on-surface">{item.label}</span>
                    <span className="text-xs text-on-surface-variant">{item.desc}</span>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-on-surface-variant opacity-40" />
              </button>
            ))}

            <button 
              onClick={() => setLanguage(language === 'en' ? 'bn' : 'en')}
              className="w-full group flex items-center justify-between p-5 rounded-2xl bg-surface-container-low hover:bg-surface-container transition-all"
            >
              <div className="flex items-center gap-4 text-left">
                <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-on-surface-variant group-hover:scale-110 transition-transform">
                  <Languages className="w-6 h-6" />
                </div>
                <div>
                  <span className="block font-bold text-on-surface">{t('languageSettings')}</span>
                  <span className="text-xs text-on-surface-variant">{t('switchLanguage')}</span>
                </div>
              </div>
              <span className="font-black text-[10px] bg-outline-variant/30 px-2 py-1 rounded uppercase">
                {language}
              </span>
            </button>

            <button className="w-full group flex items-center justify-between p-5 rounded-2xl bg-surface-container-low hover:bg-surface-container transition-all">
              <div className="flex items-center gap-4 text-left">
                <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-on-surface-variant group-hover:scale-110 transition-transform">
                  <Settings className="w-6 h-6" />
                </div>
                <div>
                  <span className="block font-bold text-on-surface">{t('appSettings')}</span>
                  <span className="text-xs text-on-surface-variant">{t('notificationsPrivacy')}</span>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-on-surface-variant opacity-40" />
            </button>
          </div>
        </section>

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-8 py-4 rounded-full font-bold text-red-600 bg-red-50 hover:bg-red-100 transition-colors mt-8"
        >
          <LogOut className="w-5 h-5" />
          {t('logout')}
        </button>
      </div>
    </Layout>
  );
}
