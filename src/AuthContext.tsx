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
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  userProfile: null,
  loading: true,
  logout: async () => {},
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

  return (
    // Always render children — loading state is handled per-screen
    <AuthContext.Provider value={{ currentUser, userProfile, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
