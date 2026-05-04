import { motion, AnimatePresence } from 'motion/react';
import { X, User, MapPin, Check, Loader2 } from 'lucide-react';
import { useApp } from '../AppContext';
import { useAuth } from '../AuthContext';
import { useState } from 'react';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function EditProfileModal({ isOpen, onClose }: EditProfileModalProps) {
  const { t } = useApp();
  const { userProfile, updateUserProfile } = useAuth();
  const [name, setName] = useState(userProfile?.name || '');
  const [district, setDistrict] = useState(userProfile?.region?.district || '');
  const [loading, setLoading] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateUserProfile({
        name,
        region: {
          ...userProfile?.region,
          district,
          lat: userProfile?.region?.lat || 0,
          lng: userProfile?.region?.lng || 0
        }
      });
      onClose();
    } catch (error) {
      console.error('Failed to update profile:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="relative w-full max-w-md bg-surface rounded-[2rem] overflow-hidden shadow-2xl border border-white/20"
          >
            <div className="p-8">
              <div className="flex items-center justify-between mb-8">
                <h3 className="font-headline font-black text-2xl tracking-tight text-primary">Edit Profile</h3>
                <button 
                  onClick={onClose}
                  className="w-10 h-10 rounded-full hover:bg-surface-container transition-colors flex items-center justify-center"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant ml-4">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary/40" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-surface-container-low border border-outline-variant rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-primary focus:border-transparent outline-none font-bold"
                      placeholder="Your Name"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant ml-4">District</label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary/40" />
                    <input
                      type="text"
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                      className="w-full bg-surface-container-low border border-outline-variant rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-primary focus:border-transparent outline-none font-bold"
                      placeholder="District"
                      required
                    />
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-primary text-white py-4 rounded-2xl font-headline font-bold text-lg flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-transform disabled:opacity-50 disabled:scale-100"
                  >
                    {loading ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      <>
                        <Check className="w-6 h-6" />
                        Save Changes
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
