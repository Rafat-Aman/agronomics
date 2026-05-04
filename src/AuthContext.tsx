import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, db } from './lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import type { UserProfile } from './types';

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  logout: () => Promise<void>;
  updateUserProfile: (updates: Partial<UserProfile>) => Promise<void>;
  updateUserSettings: (updates: Partial<UserSettings>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  userProfile: null,
  loading: true,
  logout: async () => {},
  updateUserProfile: async () => {},
  updateUserSettings: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);

      if (user) {
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const docSnap = await getDoc(userDocRef);

          if (docSnap.exists()) {
            setUserProfile(docSnap.data() as UserProfile);
          } else {
            // Auto-create basic profile for OAuth/social sign-ins
            const initialProfile: UserProfile = {
              uid: user.uid,
              name: user.displayName || user.email?.split('@')[0] || 'Farmer',
              email: user.email || '',
              phone: user.phoneNumber || '',
              role: 'farmer',
              region: {
                district: '',
                lat: 0,
                lng: 0,
              },
              created_at: serverTimestamp(),
              last_active: serverTimestamp(),
            };
            await setDoc(userDocRef, initialProfile);
            const freshSnap = await getDoc(userDocRef);
            setUserProfile(
              freshSnap.exists()
                ? (freshSnap.data() as UserProfile)
                : initialProfile
            );
          }
        } catch (err) {
          console.error('[AuthContext] Error fetching user profile:', err);
          // Still set a basic profile from the Auth user so the app doesn't get stuck
          setUserProfile({
            uid: user.uid,
            name: user.displayName || user.email?.split('@')[0] || 'Farmer',
            email: user.email || '',
            phone: '',
            role: 'farmer',
            region: {
              district: '',
              lat: 0,
              lng: 0,
            },
            created_at: null,
            last_active: null,
          });
        }
      } else {
        setUserProfile(null);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const logout = () => signOut(auth);

  const updateUserProfile = async (updates: Partial<UserProfile>) => {
    if (!currentUser) return;
    const userDocRef = doc(db, 'users', currentUser.uid);
    await updateDoc(userDocRef, updates);
    setUserProfile(prev => prev ? { ...prev, ...updates } : null);
  };

  const updateUserSettings = async (updates: Partial<UserSettings>) => {
    if (!currentUser) return;
    const settingsDocRef = doc(db, `users/${currentUser.uid}/settings/profile`);
    await setDoc(settingsDocRef, updates, { merge: true });
  };

  return (
    // Always render children — loading state is handled per-screen
    <AuthContext.Provider value={{ 
      currentUser, 
      userProfile, 
      loading, 
      logout,
      updateUserProfile,
      updateUserSettings
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
