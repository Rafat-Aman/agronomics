import { motion, AnimatePresence } from 'motion/react';
import { X, Bell, Eye, Ruler, Shield, Sparkles } from 'lucide-react';
import { useApp } from '../AppContext';
import { useAuth } from '../AuthContext';
import { useState, useEffect } from 'react';
import { getUserSettings } from '../lib/db';
import type { UserSettings } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { t } = useApp();
  const { currentUser, updateUserSettings } = useAuth();
  const [settings, setSettings] = useState<Partial<UserSettings>>({
    notification_level: 'smart',
    ai_assistance_level: 'manual',
    units: 'metric'
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!currentUser?.uid || !isOpen) return;
    getUserSettings(currentUser.uid).then(s => {
      if (s) setSettings(s);
    });
  }, [currentUser?.uid, isOpen]);

  const handleUpdate = async (updates: Partial<UserSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
    if (!currentUser) return;
    
    setSaving(true);
    try {
      await updateUserSettings(updates);
    } catch (error) {
      console.error('Failed to update settings:', error);
    } finally {
      setTimeout(() => setSaving(false), 500); // Small delay for feel
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="relative w-full max-w-lg bg-surface rounded-t-[2.5rem] sm:rounded-[2.5rem] overflow-hidden editorial-shadow"
          >
            {/* Header */}
            <div className="p-6 border-b border-outline-variant flex items-center justify-between bg-surface-container-low">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <Shield className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-headline font-bold text-xl">{t('appSettings')}</h3>
                  <p className="text-xs text-on-surface-variant">{t('notificationsPrivacy')}</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="w-10 h-10 rounded-full hover:bg-surface-container transition-colors flex items-center justify-center"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-8 max-h-[70vh] overflow-y-auto">
              {/* Notifications */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 text-primary">
                  <Bell className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Notifications</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {['minimal', 'smart', 'all'].map((level) => (
                    <button
                      key={level}
                      onClick={() => handleUpdate({ notification_level: level as any })}
                      className={`p-3 rounded-2xl border-2 transition-all text-center ${
                        settings.notification_level === level 
                          ? 'border-primary bg-primary/5 text-primary' 
                          : 'border-outline-variant bg-surface-container-lowest text-on-surface-variant'
                      }`}
                    >
                      <span className="block text-sm font-bold capitalize">{level}</span>
                    </button>
                  ))}
                </div>
              </section>

              {/* AI Assistance */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 text-secondary">
                  <Sparkles className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">AI Assistance</span>
                </div>
                <div className="flex p-1 bg-surface-container-low rounded-2xl">
                  {['manual', 'auto'].map((mode) => (
                    <button
                      key={mode}
                      onClick={() => handleUpdate({ ai_assistance_level: mode as any })}
                      className={`flex-1 py-3 rounded-xl font-bold transition-all ${
                        settings.ai_assistance_level === mode 
                          ? 'bg-white shadow-sm text-primary' 
                          : 'text-on-surface-variant hover:text-on-surface'
                      }`}
                    >
                      {mode.charAt(0).toUpperCase() + mode.slice(1)}
                    </button>
                  ))}
                </div>
              </section>

              {/* Units */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 text-tertiary">
                  <Ruler className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Measurement Units</span>
                </div>
                <div className="flex items-center justify-between p-4 rounded-2xl bg-surface-container-low border border-outline-variant">
                  <span className="font-bold">System Units</span>
                  <select 
                    value={settings.units}
                    onChange={(e) => handleUpdate({ units: e.target.value as any })}
                    className="bg-white border border-outline-variant rounded-xl px-4 py-2 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="metric">Metric (Ha/Kg)</option>
                    <option value="imperial">Imperial (Acre/Lb)</option>
                  </select>
                </div>
              </section>
            </div>

            {/* Footer */}
            <div className="p-6 bg-surface-container-lowest border-t border-outline-variant flex items-center justify-between">
              <div className="flex items-center gap-2">
                {saving && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-2 text-primary"
                  >
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    <span className="text-xs font-bold">Saving...</span>
                  </motion.div>
                )}
              </div>
              <button
                onClick={onClose}
                className="px-8 py-3 rounded-full bg-on-surface text-surface font-headline font-bold"
              >
                Done
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
