import { db } from './firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp, doc, updateDoc, deleteDoc } from 'firebase/firestore';

// Types
export interface Land {
  id?: string;
  farmerId: string;
  name: string;
  areaSize: number;
  soilType: string;
  createdAt?: any;
}

export interface Crop {
  id?: string;
  landId: string;
  farmerId: string;
  cropType: string;
  status: string; // 'growing', 'harvested', 'attention_needed'
  plantedDate?: any;
}

// -------------------------
// LANDS API
// -------------------------

export async function getFarmerLands(farmerId: string): Promise<Land[]> {
  const landsRef = collection(db, 'lands');
  const q = query(landsRef, where("farmerId", "==", farmerId));
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Land[];
}

export async function addLand(land: Omit<Land, 'id' | 'createdAt'>) {
  const landsRef = collection(db, 'lands');
  return addDoc(landsRef, {
    ...land,
    createdAt: serverTimestamp()
  });
}

// -------------------------
// CROPS API
// -------------------------

export async function getFarmerCrops(farmerId: string): Promise<Crop[]> {
  const cropsRef = collection(db, 'crops');
  // Can filter by farmer directly since we added farmerId to crops for flat querying
  const q = query(cropsRef, where("farmerId", "==", farmerId));
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Crop[];
}

export async function addCrop(crop: Omit<Crop, 'id' | 'plantedDate'>) {
  const cropsRef = collection(db, 'crops');
  return addDoc(cropsRef, {
    ...crop,
    plantedDate: serverTimestamp()
  });
}

export async function updateCrop(cropId: string, updates: Partial<Omit<Crop, 'id'>>) {
  const cropRef = doc(db, 'crops', cropId);
  return updateDoc(cropRef, updates);
}

export async function deleteCrop(cropId: string) {
  const cropRef = doc(db, 'crops', cropId);
  return deleteDoc(cropRef);
}

// -------------------------
// LANDS UPDATE / DELETE
// -------------------------

export async function updateLand(landId: string, updates: Partial<Omit<Land, 'id'>>) {
  const landRef = doc(db, 'lands', landId);
  return updateDoc(landRef, updates);
}

export async function deleteLand(landId: string) {
  const landRef = doc(db, 'lands', landId);
  return deleteDoc(landRef);
}
