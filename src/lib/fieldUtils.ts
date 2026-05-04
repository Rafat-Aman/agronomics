/**
 * fieldUtils.ts — GPS Field Mapping Utilities
 * Pure functions: no side effects, no imports from React or Firebase.
 */

export interface LatLng {
  lat: number;
  lng: number;
}

export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface CanvasSize {
  width: number;
  height: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// GPS SMOOTHING — Rolling 3-point average to reduce jitter
// ─────────────────────────────────────────────────────────────────────────────

const GPS_WINDOW = 3;

/**
 * Given a history of recent readings and a new raw reading,
 * returns the smoothed position (average of last GPS_WINDOW points).
 */
export function smoothGpsPoint(history: LatLng[], newPoint: LatLng): LatLng {
  const window = [...history.slice(-(GPS_WINDOW - 1)), newPoint];
  const lat = window.reduce((s, p) => s + p.lat, 0) / window.length;
  const lng = window.reduce((s, p) => s + p.lng, 0) / window.length;
  return { lat, lng };
}

// ─────────────────────────────────────────────────────────────────────────────
// AREA CALCULATION — Geodetic Shoelace formula → square meters → user unit
// ─────────────────────────────────────────────────────────────────────────────

const EARTH_RADIUS_M = 6_378_137;
const RAD = Math.PI / 180;

/**
 * Calculates the area of a polygon defined by lat/lng points.
 * Uses the geodetic version of the Shoelace formula.
 * Returns area in the requested unit.
 */
export function calculatePolygonArea(
  points: LatLng[],
  unit: 'acres' | 'hectares' | 'bigha' = 'acres'
): number {
  if (points.length < 3) return 0;

  // Shoelace on projected coordinates
  let area = 0;
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const xi = EARTH_RADIUS_M * points[i].lng * RAD * Math.cos(points[i].lat * RAD);
    const yi = EARTH_RADIUS_M * points[i].lat * RAD;
    const xj = EARTH_RADIUS_M * points[j].lng * RAD * Math.cos(points[j].lat * RAD);
    const yj = EARTH_RADIUS_M * points[j].lat * RAD;
    area += xi * yj - xj * yi;
  }
  const sqMeters = Math.abs(area) / 2;

  switch (unit) {
    case 'hectares': return sqMeters / 10_000;
    case 'bigha':    return sqMeters / 1_337.8;   // 1 bigha ≈ 1337.8 m² (Bangladesh standard)
    case 'acres':
    default:         return sqMeters / 4_046.86;
  }
}

/** Convert an area value between units */
export function convertArea(
  value: number,
  from: 'acres' | 'hectares' | 'bigha',
  to: 'acres' | 'hectares' | 'bigha'
): number {
  if (from === to) return value;
  // Convert to m² first
  const toSqM: Record<string, number> = {
    acres: 4_046.86,
    hectares: 10_000,
    bigha: 1_337.8,
  };
  const sqM = value * toSqM[from];
  return sqM / toSqM[to];
}

// ─────────────────────────────────────────────────────────────────────────────
// CENTROID
// ─────────────────────────────────────────────────────────────────────────────

export function computeCentroid(points: LatLng[]): LatLng {
  if (points.length === 0) return { lat: 0, lng: 0 };
  const lat = points.reduce((s, p) => s + p.lat, 0) / points.length;
  const lng = points.reduce((s, p) => s + p.lng, 0) / points.length;
  return { lat, lng };
}

// ─────────────────────────────────────────────────────────────────────────────
// AREA CORRECTION — Scale polygon around centroid to match user's stated area
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Scales a polygon's points so that its area matches `targetArea`.
 * Uses centroid-based uniform scaling: scaleFactor = sqrt(target / calculated).
 */
export function scalePolygon(
  points: LatLng[],
  calculatedArea: number,
  targetArea: number
): LatLng[] {
  if (calculatedArea <= 0 || targetArea <= 0) return points;
  const scaleFactor = Math.sqrt(targetArea / calculatedArea);
  // Clamp to reasonable range (0.5x – 2x) to prevent wild distortions
  const clamped = Math.min(Math.max(scaleFactor, 0.5), 2.0);
  const centroid = computeCentroid(points);

  return points.map((p) => ({
    lat: centroid.lat + (p.lat - centroid.lat) * clamped,
    lng: centroid.lng + (p.lng - centroid.lng) * clamped,
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// COORDINATE ↔ PIXEL PROJECTION  (Mercator, for SVG overlay)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Projects a lat/lng coordinate to an (x, y) pixel position
 * within the given canvas, relative to the map bounds.
 */
export function latLngToPixel(
  point: LatLng,
  bounds: MapBounds,
  canvas: CanvasSize
): { x: number; y: number } {
  const xRatio = (point.lng - bounds.west) / (bounds.east - bounds.west);
  // Mercator Y is inverted (north = top)
  const latToMercY = (lat: number) => Math.log(Math.tan((lat * RAD) / 2 + Math.PI / 4));
  const northY = latToMercY(bounds.north);
  const southY = latToMercY(bounds.south);
  const pointY = latToMercY(point.lat);
  const yRatio = (northY - pointY) / (northY - southY);

  return {
    x: xRatio * canvas.width,
    y: yRatio * canvas.height,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// OSM TILE UTILITIES  (zoom level 16 for farm-level detail)
// ─────────────────────────────────────────────────────────────────────────────

const TILE_ZOOM = 16;
const TILE_SIZE = 256; // OSM tile size in px

/** Convert lat/lng to OSM tile XY at zoom 16 */
export function latLngToTile(lat: number, lng: number, zoom: number = TILE_ZOOM) {
  const n = Math.pow(2, zoom);
  const x = Math.floor(((lng + 180) / 360) * n);
  const latRad = lat * RAD;
  const y = Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n);
  return { x, y, zoom };
}

/** Convert OSM tile XY back to the NW corner lat/lng */
export function tileToLatLng(x: number, y: number, zoom: number = TILE_ZOOM): LatLng {
  const n = Math.pow(2, zoom);
  const lng = (x / n) * 360 - 180;
  const latRad = Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n)));
  return { lat: latRad / RAD, lng };
}

/**
 * Given a center lat/lng, compute the 3×3 grid of tiles that should be rendered
 * and the bounding box of the entire 3×3 tile grid.
 */
export function getTileGrid(centerLat: number, centerLng: number, zoom: number = TILE_ZOOM) {
  const center = latLngToTile(centerLat, centerLng, zoom);
  const tiles: Array<{ tx: number; ty: number; url: string; offsetX: number; offsetY: number }> = [];

  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const tx = center.x + dx;
      const ty = center.y + dy;
      tiles.push({
        tx,
        ty,
        url: `https://tile.openstreetmap.org/${zoom}/${tx}/${ty}.png`,
        offsetX: (dx + 1) * TILE_SIZE,
        offsetY: (dy + 1) * TILE_SIZE,
      });
    }
  }

  // Bounds of the 3×3 tile grid (NW corner of top-left tile, SE corner of bottom-right tile)
  const nw = tileToLatLng(center.x - 1, center.y - 1, zoom);
  const se = tileToLatLng(center.x + 2, center.y + 2, zoom);

  const bounds: MapBounds = {
    north: nw.lat,
    south: se.lat,
    west: nw.lng,
    east: se.lng,
  };

  return { tiles, bounds, tileSize: TILE_SIZE, gridSize: TILE_SIZE * 3 };
}

// ─────────────────────────────────────────────────────────────────────────────
// GEO HASH — Simple 6-char hash for the Field.geo_hash field
// ─────────────────────────────────────────────────────────────────────────────

const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';

export function generateGeoHash(lat: number, lng: number, precision: number = 6): string {
  let minLat = -90, maxLat = 90, minLng = -180, maxLng = 180;
  let hash = '';
  let bits = 0, bitsTotal = 0, hashValue = 0;
  let isEven = true;

  while (hash.length < precision) {
    if (isEven) {
      const mid = (minLng + maxLng) / 2;
      if (lng > mid) { hashValue = (hashValue << 1) + 1; minLng = mid; }
      else { hashValue = hashValue << 1; maxLng = mid; }
    } else {
      const mid = (minLat + maxLat) / 2;
      if (lat > mid) { hashValue = (hashValue << 1) + 1; minLat = mid; }
      else { hashValue = hashValue << 1; maxLat = mid; }
    }
    isEven = !isEven;
    bits++;
    bitsTotal++;
    if (bits === 5) {
      hash += BASE32[hashValue];
      bits = 0;
      hashValue = 0;
    }
  }
  return hash;
}

// ─────────────────────────────────────────────────────────────────────────────
// OFFLINE DRAFT CACHE — localStorage helpers
// ─────────────────────────────────────────────────────────────────────────────

export interface FieldDraft {
  points: LatLng[];
  mode: 'polygon' | 'simple';
  name: string;
  areaUnit: 'acres' | 'hectares' | 'bigha';
  savedAt: number; // epoch ms
}

export function saveDraft(userId: string, draft: FieldDraft): void {
  try {
    localStorage.setItem(`field_draft_${userId}`, JSON.stringify(draft));
  } catch { /* storage full — ignore */ }
}

export function loadDraft(userId: string): FieldDraft | null {
  try {
    const raw = localStorage.getItem(`field_draft_${userId}`);
    return raw ? (JSON.parse(raw) as FieldDraft) : null;
  } catch {
    return null;
  }
}

export function clearDraft(userId: string): void {
  localStorage.removeItem(`field_draft_${userId}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// DISTANCE HELPER (Haversine) — used for GPS accuracy estimation
// ─────────────────────────────────────────────────────────────────────────────

export function haversineMeters(a: LatLng, b: LatLng): number {
  const dLat = (b.lat - a.lat) * RAD;
  const dLng = (b.lng - a.lng) * RAD;
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h =
    sinDLat * sinDLat +
    Math.cos(a.lat * RAD) * Math.cos(b.lat * RAD) * sinDLng * sinDLng;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

/** Format an area number nicely */
export function formatArea(value: number, unit: 'acres' | 'hectares' | 'bigha'): string {
  const labels: Record<string, string> = { acres: 'ac', hectares: 'ha', bigha: 'বিঘা' };
  return `${value.toFixed(2)} ${labels[unit]}`;
}
