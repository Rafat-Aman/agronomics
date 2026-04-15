import React, { useState } from 'react';
import { useApp } from '../AppContext';
import { useNavigate } from 'react-router-dom';
import { User, Lock, ArrowRight, Eye } from 'lucide-react';
import { motion } from 'motion/react';
import { signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';

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
      const msg: Record<string, string> = {
        'auth/invalid-credential': 'Invalid email or password.',
        'auth/user-not-found': 'No account found with this email.',
        'auth/wrong-password': 'Incorrect password.',
        'auth/invalid-email': 'Please enter a valid email address.',
        'auth/too-many-requests': 'Too many attempts. Please wait a moment.',
        'auth/network-request-failed': 'Network error. Check your internet connection.',
      };
      setError(msg[err.code] || err.message || 'Failed to login');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setIsLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      navigate('/dashboard');
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
        // User dismissed the popup — not an error
        setIsLoading(false);
        return;
      }
      const msg: Record<string, string> = {
        'auth/popup-blocked': 'Popup was blocked. Please allow popups for this site.',
        'auth/account-exists-with-different-credential': 'An account already exists with this email using a different sign-in method.',
        'auth/network-request-failed': 'Network error. Check your internet connection.',
      };
      setError(msg[err.code] || err.message || 'Google sign-in failed. Please try again.');
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
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="flex items-center justify-center gap-2 py-3 px-4 bg-surface-container-low rounded-xl text-on-surface-variant text-sm font-medium hover:bg-surface-container-high transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
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
