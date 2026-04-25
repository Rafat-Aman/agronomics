import React, { useState } from 'react';
import { useApp } from '../AppContext';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, User, Mail, Lock, Phone, MapPin } from 'lucide-react';
import { motion } from 'motion/react';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { createUserProfile } from '../lib/db';

const DISTRICTS = [
  'Barisal', 'Chittagong', 'Comilla', 'Dhaka', 'Faridpur',
  'Jessore', 'Khulna', 'Mymensingh', 'Rajshahi', 'Rangpur',
  'Sylhet', 'Tangail'
];

export default function Signup() {
  const { t } = useApp();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [district, setDistrict] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!agreed) {
      setError('You must agree to the terms to continue.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setIsLoading(true);
    try {
      // 1. Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 2. Update display name in Auth
      await updateProfile(user, { displayName: fullName });

      // 3. Save farmer profile in Firestore (best-effort)
      try {
        await createUserProfile(user.uid, {
          name: fullName,
          email,
          phone: '+880' + phone,
          role: 'farmer',
          region: {
            district,
            lat: 0,
            lng: 0
          }
        });
      } catch (firestoreErr) {
        // Firestore write may fail intermittently on first connection.
        // AuthContext will create/fetch the profile when the dashboard loads.
        console.warn('[Signup] Firestore write failed, AuthContext will retry:', firestoreErr);
      }

      // 4. Navigate to login first, then sign out to avoid race condition
      navigate('/login', { replace: true });
      await auth.signOut();

    } catch (err: any) {
      const msg: Record<string, string> = {
        'auth/email-already-in-use': 'This email is already registered.',
        'auth/invalid-email': 'Please enter a valid email address.',
        'auth/weak-password': 'Password is too weak. Use at least 6 characters.',
        'auth/network-request-failed': 'Network error. Check your internet connection.',
        'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
      };
      setError(msg[err.code] || err.message || 'Signup failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-surface">
      <header className="fixed top-0 w-full max-w-md z-50 flex justify-between items-center px-6 py-4 bg-surface/80 backdrop-blur-xl">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-surface-container-low transition-colors active:scale-95"
        >
          <ArrowLeft className="w-6 h-6 text-primary" />
        </button>
      </header>

      <main className="pt-24 pb-12 px-6 max-w-md mx-auto w-full">
        <section className="mb-10">
          <div className="mb-6 overflow-hidden rounded-[2rem] shadow-sm">
            <img
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuD1t6CS4AvcoBGXaYkUAO1BMhdbHzMIKXrnqehHQVv7PsS0QP3bQjNxFkDi2tJsEVOAmkRVpein1ctyzGlFLnxgi86fTiFRnIXKuAJM8C9LRoujbrLiy6L5NZMUZx8agnUThqlDfOIH6imoe8PnzkWGpfC4vAV66lwlEm1ruZHnM2gyv83suuBeiD9viScqVrLwfjWDWskCpPmXpF_LA3dwYBLfogjQe_xgiyJTvMAxgkaonYsnzvuGXN6Q6dHOBEmm1GsRt01s8u60"
              alt="Sprouts"
              className="w-full h-48 object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <h1 className="font-headline text-[1.75rem] font-bold text-on-surface mb-2">{t('signup')}</h1>
          <p className="text-on-surface-variant font-sans leading-relaxed">{t('signupDesc')}</p>
        </section>

        <motion.form
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          onSubmit={handleSignup}
          className="space-y-5"
        >
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
              <p className="text-red-500 text-sm text-center">{error}</p>
            </div>
          )}

          {/* Full Name */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-primary px-1">{t('name')}</label>
            <div className="relative group">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-outline group-focus-within:text-primary transition-colors" />
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your full name"
                className="w-full bg-surface-container-high border-none rounded-xl pl-12 pr-5 py-4 focus:ring-2 focus:ring-primary focus:bg-surface-container-lowest transition-all placeholder:text-outline/60"
                required
              />
            </div>
          </div>

          {/* Email */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-primary px-1">Email</label>
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-outline group-focus-within:text-primary transition-colors" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full bg-surface-container-high border-none rounded-xl pl-12 pr-5 py-4 focus:ring-2 focus:ring-primary focus:bg-surface-container-lowest transition-all placeholder:text-outline/60"
                required
              />
            </div>
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-primary px-1">{t('phone')}</label>
            <div className="relative flex items-center">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-outline z-10" />
              <span className="absolute left-11 text-on-surface-variant font-medium text-sm">+880</span>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="01XXXXXXXXX"
                className="w-full bg-surface-container-high border-none rounded-xl pl-24 pr-5 py-4 focus:ring-2 focus:ring-primary focus:bg-surface-container-lowest transition-all placeholder:text-outline/60"
              />
            </div>
          </div>

          {/* District */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-primary px-1">{t('district')}</label>
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-outline pointer-events-none" />
              <select
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="w-full bg-surface-container-high border-none rounded-xl pl-12 pr-5 py-4 focus:ring-2 focus:ring-primary focus:bg-surface-container-lowest appearance-none transition-all text-on-surface"
                required
              >
                <option value="" disabled>{t('selectDistrict')}</option>
                {DISTRICTS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Password */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-primary px-1">{t('password')}</label>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-outline group-focus-within:text-primary transition-colors" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 6 characters"
                className="w-full bg-surface-container-high border-none rounded-xl pl-12 pr-5 py-4 focus:ring-2 focus:ring-primary focus:bg-surface-container-lowest transition-all placeholder:text-outline/60"
                required
              />
            </div>
          </div>

          {/* Confirm Password */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-primary px-1">Confirm Password</label>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-outline group-focus-within:text-primary transition-colors" />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                className="w-full bg-surface-container-high border-none rounded-xl pl-12 pr-5 py-4 focus:ring-2 focus:ring-primary focus:bg-surface-container-lowest transition-all placeholder:text-outline/60"
                required
              />
            </div>
          </div>

          {/* Terms */}
          <div className="flex items-start gap-3 py-2">
            <input
              type="checkbox"
              id="terms"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="w-5 h-5 mt-1 rounded border-outline-variant text-primary focus:ring-primary bg-surface-container-low transition-all"
            />
            <label htmlFor="terms" className="text-sm text-on-surface-variant leading-relaxed">
              {t('agreeTerms')}
            </label>
          </div>

          {/* Submit */}
          <div className="pt-2 space-y-4">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary text-on-primary py-4 rounded-xl font-bold text-lg shadow-[0_4px_32px_rgba(13,99,27,0.15)] active:scale-[0.98] transition-all flex justify-center items-center gap-2 disabled:opacity-70 disabled:active:scale-100"
            >
              {isLoading ? 'Creating Account...' : t('createAccount')}
              {!isLoading && <ArrowRight className="w-5 h-5" />}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="text-sm font-medium text-on-surface-variant hover:text-primary transition-colors"
              >
                {t('alreadyAccount')} <span className="text-primary font-bold">Login</span>
              </button>
            </div>
          </div>
        </motion.form>
      </main>
    </div>
  );
}
