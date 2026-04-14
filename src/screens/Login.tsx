import { useApp } from '../AppContext';
import { useNavigate } from 'react-router-dom';
import { User, Lock, ArrowRight, Eye } from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../lib/firebase';

export default function Login() {
  const { t } = useApp();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to login');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-surface px-4 pt-12 pb-10">
      <div className="w-full max-w-md mx-auto">
        {/* Hero Element */}
        <div className="relative h-48 mb-8 rounded-[2rem] overflow-hidden shadow-sm">
          <img 
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuCZJ15s6TOELk0P9OwWaLv4lzI06VXnX3DJZFqweY9jR-ZXCXJHr9R8cUFF1t6Y9-yqiOhHKo45Wrt3Z_-spJ2D046bupOA-C9FJ4ApGOH77_tTEfw40s-ErnkN_4MMgY_vp_0ltT4aZB6DRgCOev9A48XXkk0AFp_rm8Vf-qpWwFPRDJhjTGZeGtRdWIXtAESywuI81GzQnJK8YiKY0_6IW4X0tIWWwhYxfljoNlEHwIsEgiVZJoDWTIh5TOZeYsn_7wDeRQEqasbY" 
            alt="Field"
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-primary/60 to-transparent" />
          <div className="absolute bottom-6 left-6 text-white">
            <h1 className="font-headline font-bold text-2xl leading-tight">{t('welcome')}</h1>
            <p className="font-sans text-sm opacity-90">{t('manageCrops')}</p>
          </div>
        </div>

        {/* Form Section */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-surface-container-lowest p-8 rounded-[2rem] editorial-shadow"
        >
          <div className="mb-8">
            <h2 className="font-headline font-bold text-on-surface text-xl">{t('login')}</h2>
            <p className="text-on-surface-variant text-sm mt-1">{t('loginDesc')}</p>
          </div>

          <form className="space-y-6" onSubmit={handleLogin}>
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                <p className="text-red-500 text-sm text-center">{error}</p>
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-on-surface-variant font-sans text-[0.75rem] font-bold uppercase tracking-wider ml-1">
                {t('phoneOrEmail')}
              </label>
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-outline group-focus-within:text-primary transition-colors" />
                <input 
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-12 pr-4 py-4 bg-surface-container-high rounded-xl border-none focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-lowest transition-all text-on-surface placeholder:text-outline-variant"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center px-1">
                <label className="text-on-surface-variant font-sans text-[0.75rem] font-bold uppercase tracking-wider">
                  {t('password')}
                </label>
                <button type="button" className="text-primary text-[0.75rem] font-bold hover:underline">
                  {t('forgotPassword')}
                </button>
              </div>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-outline group-focus-within:text-primary transition-colors" />
                <input 
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-12 pr-12 py-4 bg-surface-container-high rounded-xl border-none focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-lowest transition-all text-on-surface placeholder:text-outline-variant"
                  required
                />
                <button type="button" className="absolute right-4 top-1/2 -translate-y-1/2 text-outline-variant hover:text-outline">
                  <Eye className="w-5 h-5" />
                </button>
              </div>
            </div>

            <button 
              type="submit"
              disabled={isLoading}
              className="w-full py-4 bg-gradient-to-br from-primary to-primary-container text-on-primary font-bold rounded-xl shadow-lg shadow-primary/20 transform active:scale-[0.98] transition-all duration-200 mt-4 flex justify-center items-center gap-2 disabled:opacity-70 disabled:active:scale-100"
            >
              <span>{isLoading ? 'Processing...' : t('loginBtn')}</span>
              {!isLoading && <ArrowRight className="w-5 h-5" />}
            </button>
          </form>

          <div className="my-8 flex items-center gap-4">
            <div className="h-[1px] flex-grow bg-outline-variant/30" />
            <span className="text-outline-variant text-[0.65rem] font-bold uppercase tracking-widest">{t('orContinue')}</span>
            <div className="h-[1px] flex-grow bg-outline-variant/30" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button className="flex items-center justify-center gap-2 py-3 px-4 bg-surface-container-low rounded-xl text-on-surface-variant text-sm font-medium hover:bg-surface-container-high transition-colors">
              <span className="font-bold">G</span>
              <span>{t('google')}</span>
            </button>
            <button className="flex items-center justify-center gap-2 py-3 px-4 bg-surface-container-low rounded-xl text-on-surface-variant text-sm font-medium hover:bg-surface-container-high transition-colors">
              <span className="font-bold">#</span>
              <span>{t('otp')}</span>
            </button>
          </div>

          <div className="mt-10 text-center">
            <p className="text-on-surface-variant text-sm">
              {t('noAccount')}
              <button 
                onClick={() => navigate('/signup')}
                className="text-primary font-bold ml-1 hover:underline"
              >
                {t('signupFree')}
              </button>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
