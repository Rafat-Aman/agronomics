/**
 * AGRIGUIDE-AI — Complete Firestore Database Service Layer
 * Production-ready, AI-optimized (v2.0)
 *
 * Layer Map:
 *  ┌─ USERS API              →  users/{uid}
 *  ├─ FIELDS API             →  users/{uid}/fields/{fid}
 *  ├─ GLOBAL FIELDS API      →  fields_global/{fid}/*
 *  │    ├─ boundaries
 *  │    ├─ snapshots
 *  │    └─ crop_cycles
 *  ├─ AI FEATURE STORE       →  ai_feature_store/{feature_id}
 *  ├─ AI PIPELINE            →  ai_requests + ai_results
 *  ├─ USER AI RESULTS        →  users/{uid}/detections + /recommendations
 *  ├─ TRAINING LAYER         →  training_dataset
 *  ├─ FEEDBACK LOOP          →  prediction_feedback
 *  └─ GLOBAL REF DATA        →  farming_tips, market_prices, crops_ref, diseases_ref, weather_cache
 */

import { db } from './firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  type Unsubscribe,
  type QueryConstraint,
} from 'firebase/firestore';

import type {
  UserProfile,
  UserSettings,
  Field,
  FieldBoundary,
  FieldSnapshot,
  CropCycle,
  AiFeatureStore,
  AiRequest,
  AiResult,
  DiseaseDetection,
  CropRecommendation,
  TrainingDataset,
  PredictionFeedback,
  FarmingTip,
  MarketPrice,
  CropReference,
  DiseaseReference,
  WeatherCache,
} from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// USERS API  →  users/{user_id}
// ─────────────────────────────────────────────────────────────────────────────

/** Get a single user profile by UID */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const docRef = doc(db, 'users', userId);
  const snap = await getDoc(docRef);
  return snap.exists() ? (snap.data() as UserProfile) : null;
}

/** Create a new user profile document (on first sign-up) */
export async function createUserProfile(
  userId: string,
  profileData: Omit<UserProfile, 'uid' | 'created_at' | 'last_active'>
): Promise<UserProfile> {
  const docRef = doc(db, 'users', userId);
  const profile: UserProfile = {
    ...profileData,
    uid: userId,
    created_at: serverTimestamp(),
    last_active: serverTimestamp(),
  };
  await setDoc(docRef, profile);
  return profile;
}

/** Update last_active timestamp — call on each login */
export async function touchUserActivity(userId: string): Promise<void> {
  const docRef = doc(db, 'users', userId);
  await updateDoc(docRef, { last_active: serverTimestamp() });
}

// ─────────────────────────────────────────────────────────────────────────────
// USER SETTINGS  →  users/{uid}/settings/profile
// ─────────────────────────────────────────────────────────────────────────────

/** Get user AI personalization settings */
export async function getUserSettings(userId: string): Promise<UserSettings | null> {
  const docRef = doc(db, `users/${userId}/settings/profile`);
  const snap = await getDoc(docRef);
  return snap.exists() ? (snap.data() as UserSettings) : null;
}

/** Upsert user settings (merge) */
export async function updateUserSettings(
  userId: string,
  settings: Partial<UserSettings>
): Promise<void> {
  const docRef = doc(db, `users/${userId}/settings/profile`);
  await setDoc(docRef, settings, { merge: true });
}

// ─────────────────────────────────────────────────────────────────────────────
// FIELDS API  →  users/{uid}/fields/{field_id}
// ─────────────────────────────────────────────────────────────────────────────

/** Get all fields for a user (Dashboard) */
export async function getUserFields(userId: string): Promise<Field[]> {
  const colRef = collection(db, `users/${userId}/fields`);
  const snap = await getDocs(colRef);
  return snap.docs.map(d => ({ field_id: d.id, ...d.data() } as Field));
}

/** Add a new field for a user */
export async function addField(
  userId: string,
  fieldData: Omit<Field, 'field_id' | 'created_at'>
): Promise<string> {
  const colRef = collection(db, `users/${userId}/fields`);
  const docRef = await addDoc(colRef, {
    ...fieldData,
    created_at: serverTimestamp(),
  });
  return docRef.id;
}

/** Update field metadata (e.g. denorm health_status, active_crop) */
export async function updateField(
  userId: string,
  fieldId: string,
  updates: Partial<Omit<Field, 'field_id'>>
): Promise<void> {
  const docRef = doc(db, `users/${userId}/fields/${fieldId}`);
  await updateDoc(docRef, updates as Record<string, any>);
}

/** Delete a field */
export async function deleteField(userId: string, fieldId: string): Promise<void> {
  await deleteDoc(doc(db, `users/${userId}/fields/${fieldId}`));
}

/** Real-time listener for user fields (Dashboard live updates) */
export function subscribeToUserFields(
  userId: string,
  callback: (fields: Field[]) => void
): Unsubscribe {
  const colRef = collection(db, `users/${userId}/fields`);
  return onSnapshot(colRef, snap => {
    callback(snap.docs.map(d => ({ field_id: d.id, ...d.data() } as Field)));
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// GPS BOUNDARIES  →  fields_global/{fid}/boundaries/{point_id}
// ─────────────────────────────────────────────────────────────────────────────

export async function getFieldBoundaries(fieldId: string): Promise<FieldBoundary[]> {
  const colRef = collection(db, `fields_global/${fieldId}/boundaries`);
  const snap = await getDocs(query(colRef, orderBy('seq', 'asc')));
  return snap.docs.map(d => ({ point_id: d.id, ...d.data() } as FieldBoundary));
}

export async function addBoundaryPoint(
  fieldId: string,
  point: Omit<FieldBoundary, 'point_id' | 'recorded_at'>
): Promise<void> {
  const colRef = collection(db, `fields_global/${fieldId}/boundaries`);
  await addDoc(colRef, { ...point, recorded_at: serverTimestamp() });
}

// ─────────────────────────────────────────────────────────────────────────────
// FIELD SNAPSHOTS  →  fields_global/{fid}/snapshots/{snapshot_id}
// Time-series data — critical for ML training
// ─────────────────────────────────────────────────────────────────────────────

/** Get most recent N snapshots (used for feature assembly) */
export async function getLatestSnapshots(
  fieldId: string,
  count: number = 30
): Promise<FieldSnapshot[]> {
  const colRef = collection(db, `fields_global/${fieldId}/snapshots`);
  const q = query(colRef, orderBy('timestamp', 'desc'), limit(count));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ snapshot_id: d.id, ...d.data() } as FieldSnapshot));
}

export async function addFieldSnapshot(
  fieldId: string,
  data: Omit<FieldSnapshot, 'snapshot_id' | 'timestamp'>
): Promise<void> {
  const colRef = collection(db, `fields_global/${fieldId}/snapshots`);
  await addDoc(colRef, { ...data, timestamp: serverTimestamp() });
}

// ─────────────────────────────────────────────────────────────────────────────
// CROP CYCLES  →  fields_global/{fid}/crop_cycles/{cycle_id}
// ─────────────────────────────────────────────────────────────────────────────

export async function getCropCycles(fieldId: string): Promise<CropCycle[]> {
  const colRef = collection(db, `fields_global/${fieldId}/crop_cycles`);
  const q = query(colRef, orderBy('start_date', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ cycle_id: d.id, ...d.data() } as CropCycle));
}

export async function getActiveCropCycle(fieldId: string): Promise<CropCycle | null> {
  const colRef = collection(db, `fields_global/${fieldId}/crop_cycles`);
  const q = query(colRef, where('status', '==', 'growing'), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { cycle_id: d.id, ...d.data() } as CropCycle;
}

export async function addCropCycle(
  fieldId: string,
  data: Omit<CropCycle, 'cycle_id'>
): Promise<string> {
  const colRef = collection(db, `fields_global/${fieldId}/crop_cycles`);
  const docRef = await addDoc(colRef, data);
  return docRef.id;
}

export async function updateCropCycle(
  fieldId: string,
  cycleId: string,
  updates: Partial<Omit<CropCycle, 'cycle_id'>>
): Promise<void> {
  await updateDoc(
    doc(db, `fields_global/${fieldId}/crop_cycles/${cycleId}`),
    updates as Record<string, any>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AI FEATURE STORE  →  ai_feature_store/{feature_id}
// ─────────────────────────────────────────────────────────────────────────────

/** Save an assembled feature document (called from Cloud Function or client) */
export async function saveAiFeature(
  featureData: Omit<AiFeatureStore, 'feature_id' | 'generated_at'>
): Promise<string> {
  const colRef = collection(db, 'ai_feature_store');
  const docRef = await addDoc(colRef, {
    ...featureData,
    generated_at: serverTimestamp(),
  });
  return docRef.id;
}

/** Get latest complete feature for a field (to attach to AI request) */
export async function getLatestFieldFeature(
  fieldId: string
): Promise<AiFeatureStore | null> {
  const colRef = collection(db, 'ai_feature_store');
  const q = query(
    colRef,
    where('field_id', '==', fieldId),
    where('is_complete', '==', true),
    orderBy('generated_at', 'desc'),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { feature_id: d.id, ...d.data() } as AiFeatureStore;
}

// ─────────────────────────────────────────────────────────────────────────────
// AI PIPELINE  →  ai_requests/{req_id}  +  ai_results/{result_id}
// ─────────────────────────────────────────────────────────────────────────────

/** Create an AI request — triggers Cloud Function automatically */
export async function createAiRequest(
  requestData: Omit<AiRequest, 'request_id' | 'status' | 'created_at' | 'updated_at' | 'retry_count'>
): Promise<string> {
  const colRef = collection(db, 'ai_requests');
  const docRef = await addDoc(colRef, {
    ...requestData,
    status: 'pending' as const,
    retry_count: 0,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });
  return docRef.id;
}

/** Listen to a single AI request for status updates (real-time) */
export function subscribeToAiRequest(
  requestId: string,
  callback: (req: AiRequest | null) => void
): Unsubscribe {
  return onSnapshot(doc(db, 'ai_requests', requestId), snap => {
    callback(snap.exists() ? ({ request_id: snap.id, ...snap.data() } as AiRequest) : null);
  });
}

/** Get AI result by request_id */
export async function getAiResultByRequestId(
  requestId: string
): Promise<AiResult | null> {
  const q = query(
    collection(db, 'ai_results'),
    where('request_id', '==', requestId),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { result_id: d.id, ...d.data() } as AiResult;
}

// ─────────────────────────────────────────────────────────────────────────────
// USER AI RESULTS (Denormalized)
// users/{uid}/detections + /recommendations
// ─────────────────────────────────────────────────────────────────────────────

/** Get all disease detections for a user */
export async function getUserDetections(userId: string): Promise<DiseaseDetection[]> {
  const colRef = collection(db, `users/${userId}/detections`);
  const snap = await getDocs(query(colRef, orderBy('created_at', 'desc')));
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as DiseaseDetection));
}

/** Real-time listener for new detections (auto-updates when Cloud Function completes) */
export function subscribeToDetections(
  userId: string,
  callback: (detections: DiseaseDetection[]) => void
): Unsubscribe {
  const colRef = collection(db, `users/${userId}/detections`);
  return onSnapshot(query(colRef, orderBy('created_at', 'desc')), snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as DiseaseDetection)));
  });
}

/** Get all crop recommendations for a user */
export async function getUserRecommendations(
  userId: string
): Promise<CropRecommendation[]> {
  const colRef = collection(db, `users/${userId}/recommendations`);
  const snap = await getDocs(query(colRef, orderBy('created_at', 'desc')));
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as CropRecommendation));
}

/** Get recommendations for a specific field */
export async function getFieldRecommendations(
  userId: string,
  fieldId: string
): Promise<CropRecommendation[]> {
  const colRef = collection(db, `users/${userId}/recommendations`);
  const q = query(colRef, where('field_id', '==', fieldId), orderBy('created_at', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as CropRecommendation));
}

// ─────────────────────────────────────────────────────────────────────────────
// TRAINING DATASET  →  training_dataset/{data_id}
// ─────────────────────────────────────────────────────────────────────────────

/** Save a training data point (called by Cloud Function after result) */
export async function saveTrainingDatapoint(
  data: Omit<TrainingDataset, 'data_id' | 'created_at'>
): Promise<string> {
  const colRef = collection(db, 'training_dataset');
  const docRef = await addDoc(colRef, { ...data, created_at: serverTimestamp() });
  return docRef.id;
}

// ─────────────────────────────────────────────────────────────────────────────
// FEEDBACK LOOP  →  prediction_feedback/{feedback_id}
// ─────────────────────────────────────────────────────────────────────────────

/** Submit user feedback on an AI prediction */
export async function submitPredictionFeedback(
  feedback: Omit<PredictionFeedback, 'feedback_id' | 'timestamp'>
): Promise<string> {
  const colRef = collection(db, 'prediction_feedback');
  const docRef = await addDoc(colRef, { ...feedback, timestamp: serverTimestamp() });
  return docRef.id;
}

// ─────────────────────────────────────────────────────────────────────────────
// GLOBAL REFERENCE DATA  →  Read-only from client
// ─────────────────────────────────────────────────────────────────────────────

/** Get featured farming tips */
export async function getFeaturedTips(count: number = 5): Promise<FarmingTip[]> {
  const q = query(
    collection(db, 'farming_tips'),
    where('is_featured', '==', true),
    orderBy('published_at', 'desc'),
    limit(count)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ tip_id: d.id, ...d.data() } as FarmingTip));
}

/** Get tips by category */
export async function getTipsByCategory(
  category: string,
  count: number = 10
): Promise<FarmingTip[]> {
  const q = query(
    collection(db, 'farming_tips'),
    where('category', '==', category),
    orderBy('published_at', 'desc'),
    limit(count)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ tip_id: d.id, ...d.data() } as FarmingTip));
}

/** Get market prices for a crop and district */
export async function getMarketPrices(
  cropName: string,
  district?: string
): Promise<MarketPrice[]> {
  const constraints: QueryConstraint[] = [
    where('crop_name', '==', cropName),
    orderBy('recorded_at', 'desc'),
    limit(10),
  ];
  if (district) {
    constraints.unshift(where('district', '==', district));
  }
  const snap = await getDocs(query(collection(db, 'market_prices'), ...constraints));
  return snap.docs.map(d => ({ price_id: d.id, ...d.data() } as MarketPrice));
}

/** Get crop reference (for AI input validation) */
export async function getCropReference(cropId: string): Promise<CropReference | null> {
  const snap = await getDoc(doc(db, 'crops_ref', cropId));
  return snap.exists() ? (snap.data() as CropReference) : null;
}

/** Get all crop references (for selection UI) */
export async function getAllCropsRef(): Promise<CropReference[]> {
  const snap = await getDocs(collection(db, 'crops_ref'));
  return snap.docs.map(d => d.data() as CropReference);
}

/** Get disease reference by ID */
export async function getDiseaseReference(
  diseaseId: string
): Promise<DiseaseReference | null> {
  const snap = await getDoc(doc(db, 'diseases_ref', diseaseId));
  return snap.exists() ? (snap.data() as DiseaseReference) : null;
}

/** Get cached weather for a geo_hash region */
export async function getCachedWeather(
  regionHash: string
): Promise<WeatherCache | null> {
  const snap = await getDoc(doc(db, 'weather_cache', regionHash));
  if (!snap.exists()) return null;
  const data = snap.data() as WeatherCache;
  // Check if cache is still valid
  const now = Date.now();
  const expires = data.expires_at?.toMillis?.() ?? 0;
  return now < expires ? data : null;
}
