import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, db } from './lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

interface FarmerProfile {
  uid: string;
  fullName: string;
  phone: string;
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
        // Fetch or create farmer profile in Firestore
        const userDocRef = doc(db, 'farmers', user.uid);
        const docSnap = await getDoc(userDocRef);
        
        if (docSnap.exists()) {
          setFarmerProfile(docSnap.data() as FarmerProfile);
        } else {
          // Auto-create basic profile for social/OAuth sign-ins
          // (Email signup flow writes the full profile itself before this runs)
          const initialProfile = {
            uid: user.uid,
            fullName: user.displayName || user.email?.split('@')[0] || 'Farmer',
            email: user.email || '',
            phone: user.phoneNumber || '',
            district: '',
            createdAt: serverTimestamp(),
          };
          await setDoc(userDocRef, initialProfile);
          // Re-read from Firestore to get the resolved timestamp
          const freshSnap = await getDoc(userDocRef);
          setFarmerProfile(freshSnap.exists() ? (freshSnap.data() as FarmerProfile) : (initialProfile as FarmerProfile));
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
    <AuthContext.Provider value={{ currentUser, farmerProfile, loading, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
