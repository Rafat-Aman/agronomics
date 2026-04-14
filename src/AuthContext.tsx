import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, db } from './lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

interface FarmerProfile {
  uid: string;
  fullName: string;
  email: string;
  phone: string;
  district: string;
  createdAt: any;
}

interface AuthContextType {
  currentUser: User | null;
  farmerProfile: FarmerProfile | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  farmerProfile: null,
  loading: true,
  logout: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [farmerProfile, setFarmerProfile] = useState<FarmerProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);

      if (user) {
        try {
          const userDocRef = doc(db, 'farmers', user.uid);
          const docSnap = await getDoc(userDocRef);

          if (docSnap.exists()) {
            setFarmerProfile(docSnap.data() as FarmerProfile);
          } else {
            // Auto-create basic profile for OAuth/social sign-ins
            const initialProfile: Omit<FarmerProfile, 'createdAt'> & { createdAt: any } = {
              uid: user.uid,
              fullName: user.displayName || user.email?.split('@')[0] || 'Farmer',
              email: user.email || '',
              phone: user.phoneNumber || '',
              district: '',
              createdAt: serverTimestamp(),
            };
            await setDoc(userDocRef, initialProfile);
            const freshSnap = await getDoc(userDocRef);
            setFarmerProfile(
              freshSnap.exists()
                ? (freshSnap.data() as FarmerProfile)
                : (initialProfile as FarmerProfile)
            );
          }
        } catch (err) {
          console.error('[AuthContext] Error fetching farmer profile:', err);
          // Still set a basic profile from the Auth user so the app doesn't get stuck
          setFarmerProfile({
            uid: user.uid,
            fullName: user.displayName || user.email?.split('@')[0] || 'Farmer',
            email: user.email || '',
            phone: '',
            district: '',
            createdAt: null,
          });
        }
      } else {
        setFarmerProfile(null);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const logout = () => signOut(auth);

  return (
    // Always render children — loading state is handled per-screen
    <AuthContext.Provider value={{ currentUser, farmerProfile, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
