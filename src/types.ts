/**
 * AGRIGUIDE-AI — Complete Firestore Type Definitions
 * Production-ready, AI-optimized schema (v2.0)
 */

// ─────────────────────────────────────────────
// CORE APP TYPES
// ─────────────────────────────────────────────

export type Language = 'en' | 'bn';
export type UserRole = 'farmer' | 'expert' | 'admin';
export type AiRequestType = 'disease_detection' | 'crop_recommendation' | 'yield_prediction';
export type AiRequestStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type DataSource = 'api' | 'sensor' | 'manual' | 'system';
export type CropStatus = 'growing' | 'harvested' | 'attention_needed' | 'failed';
export type Season = 'kharif' | 'rabi' | 'boro' | 'aman' | 'aus' | 'zaid';
export type Severity = 'mild' | 'moderate' | 'severe' | 'critical';
export type TrainingLabel = 'disease' | 'crop' | 'yield' | 'soil';
export type NotificationLevel = 'minimal' | 'smart' | 'all';
export type AiAssistanceLevel = 'manual' | 'auto';
export type PriceTrend = 'up' | 'down' | 'stable';

// ─────────────────────────────────────────────
// A. USERS  →  users/{user_id}
// ─────────────────────────────────────────────

export interface UserProfile {
  uid: string;
  name: string;
  email?: string;
  phone: string;
  role: UserRole;
  region: UserRegion;
  created_at: any; // Firestore FieldValue.serverTimestamp()
  last_active: any;
}

export interface UserRegion {
  district: string;
  lat: number;
  lng: number;
  geo_hash?: string;
}

// ─────────────────────────────────────────────
// B. USER SETTINGS  →  users/{uid}/settings/profile
// ─────────────────────────────────────────────

export interface UserSettings {
  language: Language;
  preferred_crops: string[];
  notification_level: NotificationLevel;
  ai_assistance_level: AiAssistanceLevel;
  units: 'metric' | 'imperial';
}

// ─────────────────────────────────────────────
// C. USER FIELDS  →  users/{uid}/fields/{field_id}
// (denormalized for fast dashboard reads)
// ─────────────────────────────────────────────

export interface Field {
  field_id?: string;
  field_name: string;
  area_size: number;
  area_unit: 'acres' | 'hectares' | 'bigha';
  geo_hash: string;
  center_point: GeoPoint;
  soil_summary: SoilSummary;
  // Denormalized for fast UI
  active_crop?: string;
  health_status?: 'healthy' | 'attention_needed' | 'critical' | 'unknown';
  created_at: any;
}

export interface GeoPoint {
  lat: number;
  lng: number;
  altitude?: number;
}

export interface SoilSummary {
  type: string;
  ph: number;
}

// ─────────────────────────────────────────────
// D. GPS BOUNDARIES  →  fields_global/{fid}/boundaries/{point_id}
// ─────────────────────────────────────────────

export interface FieldBoundary {
  point_id?: string;
  seq: number;
  lat: number;
  lng: number;
  altitude?: number;
  recorded_at: any;
}

// ─────────────────────────────────────────────
// E. FIELD SNAPSHOTS  →  fields_global/{fid}/snapshots/{snapshot_id}
// Time-series ML input (CRITICAL for AI)
// ─────────────────────────────────────────────

export interface FieldSnapshot {
  snapshot_id?: string;
  timestamp: any;
  weather: WeatherReading;
  soil: SoilReading;
  source: DataSource;
  quality_score?: number; // 0.0 - 1.0, ML data quality indicator
}

export interface WeatherReading {
  temperature: number;       // °C
  humidity: number;          // %
  rainfall_mm?: number;
  wind_speed_kmh?: number;
  uv_index?: number;
}

export interface SoilReading {
  moisture_pct: number;      // %
  ph?: number;
  nitrogen?: number;         // mg/kg
  phosphorus?: number;       // mg/kg
  potassium?: number;        // mg/kg
  organic_matter_pct?: number;
}

// ─────────────────────────────────────────────
// F. CROP CYCLES  →  fields_global/{fid}/crop_cycles/{cycle_id}
// Replaces simple crop_history
// ─────────────────────────────────────────────

export interface CropCycle {
  cycle_id?: string;
  crop_name: string;
  variety?: string;
  start_date: string; // ISO date string
  end_date: string | null;
  status: CropStatus;
  growth_stage?: string;
  growth_pct?: number;        // 0 - 100
  yield_prediction_kg?: number | null;
  actual_yield_kg?: number | null;
  fertilizer_used?: string[];
  irrigation_count?: number;
  season?: Season;
}

// ─────────────────────────────────────────────
// STEP 4 — AI FEATURE STORE
// ai_feature_store/{feature_id}
// ─────────────────────────────────────────────

export interface AiFeatureStore {
  feature_id?: string;
  user_id: string;
  field_id: string;
  generated_at: any;

  // Structured ML inputs — clean, consistent format
  soil: SoilFeatures;
  weather: WeatherFeatures;
  field: FieldFeatures;
  crop_history: CropHistoryEntry[];

  schema_version: string; // e.g. "v1", "v2" — for forward-compat
  is_complete: boolean;   // Only complete features sent to model
}

export interface SoilFeatures {
  type: string;
  ph: number;
  moisture: number;
  nitrogen: number;
  phosphorus: number;
  potassium: number;
  organic_matter_pct?: number;
}

export interface WeatherFeatures {
  avg_temp_30d: number;
  total_rainfall_30d: number;
  avg_humidity_30d: number;
  season: Season;
}

export interface FieldFeatures {
  area_size: number;
  area_unit: string;
  geo_hash: string;
  elevation_m?: number;
  irrigation_source?: string;
}

export interface CropHistoryEntry {
  crop: string;
  year: number;
  yield_kg?: number;
  season?: Season;
}

// ─────────────────────────────────────────────
// STEP 5 — AI PIPELINE
// ai_requests/{req_id} + ai_results/{result_id}
// ─────────────────────────────────────────────

export interface AiRequest {
  request_id?: string;
  type: AiRequestType;
  user_id: string;
  field_id?: string;
  feature_id?: string; // Links to ai_feature_store
  input: AiRequestInput;
  status: AiRequestStatus;
  priority?: number;
  retry_count?: number;
  created_at: any;
  updated_at?: any;
}

export interface AiRequestInput {
  image_url?: string;     // Storage path for disease detection
  crop_type?: string;     // Crop type for recommendation
  growth_stage?: string;
  [key: string]: any;     // Extensible for future model types
}

export interface AiResult {
  result_id?: string;
  request_id: string;
  type: AiRequestType;
  output: DiseaseOutput | RecommendationOutput | Record<string, any>;
  model_version: string;
  inference_time_ms?: number;
  processed_at: any;
}

export interface DiseaseOutput {
  disease_name: string;
  scientific_name?: string;
  confidence: number;           // 0.0 - 1.0
  severity?: Severity;
  affected_area_pct?: number;
  treatment: TreatmentInfo;
  alternative_treatments?: string[];
}

export interface TreatmentInfo {
  chemical?: string;
  dosage?: string;
  application?: string;
  urgency?: string;
}

export interface RecommendationOutput {
  recommended_crops: RecommendedCrop[];
  input_summary: string;
  model_notes?: string;
}

export interface RecommendedCrop {
  name: string;
  score: number;           // 0.0 - 1.0 confidence
  expected_profit_bdt?: number;
  expected_yield_kg?: number;
  sowing_window?: string;
}

// ─────────────────────────────────────────────
// STEP 5B — DENORMALIZED USER-FACING COPIES
// users/{uid}/detections/{id}
// users/{uid}/recommendations/{id}
// ─────────────────────────────────────────────

export interface DiseaseDetection {
  id?: string;
  request_id: string;
  result_id: string;
  field_id?: string;
  field_name?: string;  // Denormalized
  image_url: string;
  disease_name: string;
  confidence: number;
  severity?: Severity;
  treatment: TreatmentInfo;
  created_at: any;
}

export interface CropRecommendation {
  id?: string;
  request_id: string;
  result_id: string;
  field_id?: string;
  field_name?: string; // Denormalized
  recommended_crops: RecommendedCrop[];
  model_version: string;
  created_at: any;
}

// ─────────────────────────────────────────────
// STEP 6 — TRAINING DATASET LAYER
// training_dataset/{data_id}
// ─────────────────────────────────────────────

export interface TrainingDataset {
  data_id?: string;
  feature_id: string;
  result_id: string;
  label: string;
  label_type: TrainingLabel;
  label_confidence?: number;
  source: 'user' | 'expert' | 'system' | 'ai_model';
  verified: boolean;
  verified_by?: string;  // expert user_id or "system"
  verified_at?: any;
  split?: 'train' | 'val' | 'test'; // ML dataset split
  created_at: any;
}

// ─────────────────────────────────────────────
// STEP 7 — FEEDBACK LOOP
// prediction_feedback/{feedback_id}
// ─────────────────────────────────────────────

export interface PredictionFeedback {
  feedback_id?: string;
  result_id: string;
  request_id: string;
  user_id: string;
  is_correct: boolean;
  user_rating?: number;          // 1 - 5 stars
  correction_label?: string;
  correction_note?: string;
  timestamp: any;
}

// ─────────────────────────────────────────────
// STEP 8 — GLOBAL COLLECTIONS
// ─────────────────────────────────────────────

export interface FarmingTip {
  tip_id?: string;
  title: Record<Language, string>;
  category: string;
  crops?: string[];
  season?: Season[];
  body: Record<Language, string>;
  image_url?: string;
  read_time_min?: number;
  author?: string;
  published_at: any;
  views?: number;
  is_featured?: boolean;
}

export interface MarketPrice {
  price_id?: string;
  crop_name: string;
  variety?: string;
  district: string;
  price_per_kg: number;
  currency: string;
  market_name?: string;
  trend?: PriceTrend;
  recorded_at: any;
  source?: string;
}

export interface CropReference {
  crop_id: string;
  name: Record<Language, string>;
  variety_list?: string[];
  optimal_soil?: string[];
  ph_range?: [number, number];
  water_requirement?: 'low' | 'medium' | 'high';
  growth_days?: number;
  seasons?: Season[];
  compatible_districts?: string[];
}

export interface DiseaseReference {
  disease_id: string;
  name: Record<Language, string>;
  affects_crops: string[];
  symptoms?: string[];
  treatments?: string[];
  prevention?: string[];
  severity_scale?: Severity[];
}

export interface WeatherCache {
  region_hash: string;
  district: string;
  temperature: number;
  humidity: number;
  rainfall_mm?: number;
  wind_speed_kmh?: number;
  condition?: string;
  forecast_3d?: WeatherForecastDay[];
  fetched_at: any;
  expires_at: any;
}

export interface WeatherForecastDay {
  date: string;
  max_temp: number;
  min_temp: number;
  rain_pct: number;
}

// ─────────────────────────────────────────────
// UI / FRONTEND UTILITY TYPES
// ─────────────────────────────────────────────

export interface Tip {
  id: string;
  title: string;
  category: string;
  description: string;
  image: string;
  readTime: string;
}
