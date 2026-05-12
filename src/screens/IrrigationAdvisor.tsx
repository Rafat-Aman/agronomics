import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Droplets, CloudRain, Sun, Cloud, Thermometer,
  Bell, BellOff, Clock, Calendar, CheckCircle2,
  AlertTriangle, Wind, MapPin, RotateCcw,
  AlarmClock, Leaf, ChevronDown
} from 'lucide-react';
import { motion } from 'motion/react';
import Layout from '../components/Layout';
import { useAuth } from '../AuthContext';
import { getUserFields } from '../lib/db';
import type { Field } from '../types';

// ─── Platform detection ───────────────────────────────────────────────────────
const isNativePlatform = (): boolean =>
  typeof window !== 'undefined' &&
  'Capacitor' in window &&
  !!(window as any).Capacitor?.isNativePlatform?.();

// ─── Soil type moisture adjustment table ─────────────────────────────────────
const SOIL_SCORE_BONUS: Record<string, number> = {
  sandy:    -18,  // drains very fast
  'sandy loam': -8,
  loamy:     0,
  alluvial:  5,   // common in Bangladesh, good retention
  clay:      12,  // holds water well
  'silty clay': 10,
  peat:      8,
  unknown:   0,
};

const SOIL_WATER_MULTIPLIER: Record<string, number> = {
  sandy:    1.4,
  'sandy loam': 1.2,
  loamy:    1.0,
  alluvial: 0.95,
  clay:     0.85,
  'silty clay': 0.88,
  peat:     1.0,
  unknown:  1.0,
};

function getSoilKey(soilType: string): string {
  const lower = soilType.toLowerCase();
  return Object.keys(SOIL_SCORE_BONUS).find(k => lower.includes(k)) ?? 'unknown';
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface ForecastDay {
  date: Date;
  tempMax: number;
  tempMin: number;
  humidity: number;
  description: string;
  main: string;
  pop: number;
}

interface LandCondition {
  moistureScore: number;
  level: 'wet' | 'adequate' | 'dry' | 'very_dry';
  waterNeededMm: number;
  urgency: 'none' | 'low' | 'medium' | 'high';
  label: string;
  description: string;
}

interface ScheduleDay {
  date: Date;
  rainChance: number;
  needsWater: boolean;
  waterAmount: number;
  morningTime: string | null;
  eveningTime: string | null;
  reason: string;
  status: 'rain' | 'optional' | 'needed' | 'urgent';
}

// ─── Logic helpers ────────────────────────────────────────────────────────────

function assessLandCondition(
  mainWeather: string,
  humidity: number,
  temp: number,
  rainProbability: number,   // 0–100
  soilType = 'Unknown'
): LandCondition {
  const lower = mainWeather.toLowerCase();
  const isRaining =
    lower.includes('rain') || lower.includes('drizzle') || lower.includes('thunder');

  let moistureScore: number;
  if (isRaining) {
    moistureScore = 82 + humidity * 0.12;
  } else {
    moistureScore = humidity * 0.55 + rainProbability * 0.35 + 10;
  }

  // Temperature depletion factor
  if (temp > 38) moistureScore -= 20;
  else if (temp > 35) moistureScore -= 12;
  else if (temp > 32) moistureScore -= 6;
  else if (temp < 20) moistureScore += 5;

  // Soil-type moisture correction
  const soilKey = getSoilKey(soilType);
  moistureScore += SOIL_SCORE_BONUS[soilKey] ?? 0;
  moistureScore = Math.max(5, Math.min(95, Math.round(moistureScore)));

  const wm = SOIL_WATER_MULTIPLIER[soilKey] ?? 1.0;

  if (moistureScore >= 70) {
    return {
      moistureScore,
      level: 'wet',
      waterNeededMm: 0,
      urgency: 'none',
      label: 'Well Moistened',
      description: 'Soil has adequate moisture. No irrigation needed today.',
    };
  }
  if (moistureScore >= 50) {
    return {
      moistureScore,
      level: 'adequate',
      waterNeededMm: Math.round(10 * wm),
      urgency: 'low',
      label: 'Adequate',
      description: 'Soil moisture is acceptable. Light irrigation recommended.',
    };
  }
  if (moistureScore >= 30) {
    return {
      moistureScore,
      level: 'dry',
      waterNeededMm: Math.round(25 * wm),
      urgency: 'medium',
      label: 'Dry',
      description: 'Soil is getting dry. Irrigation is needed soon.',
    };
  }
  return {
    moistureScore,
    level: 'very_dry',
    waterNeededMm: Math.round((35 + (30 - moistureScore) * 0.5) * wm),
    urgency: 'high',
    label: 'Very Dry',
    description: 'Critical moisture deficit. Immediate irrigation required.',
  };
}

function generateSchedule(forecast: ForecastDay[], soilType = 'Unknown'): ScheduleDay[] {
  return forecast.map(day => {
    const pop = day.pop;
    const isHighRain = pop >= 60;
    const isOptional = pop >= 30 && pop < 60;
    const cond = assessLandCondition(day.main, day.humidity, day.tempMax, pop, soilType);
    const needsWater = !isHighRain && cond.level !== 'wet';
    const isUrgent = cond.level === 'very_dry' || cond.level === 'dry';

    return {
      date: day.date,
      rainChance: pop,
      needsWater,
      waterAmount: cond.waterNeededMm,
      morningTime: needsWater ? '5:30 AM' : null,
      eveningTime: needsWater && isUrgent ? '6:00 PM' : null,
      reason: isHighRain
        ? 'Rain expected — skip irrigation'
        : isOptional
        ? 'Light rain possible — monitor soil'
        : isUrgent
        ? 'Urgent irrigation needed'
        : needsWater
        ? 'Irrigation recommended'
        : 'Soil adequate — no action needed',
      status: isHighRain ? 'rain' : isOptional ? 'optional' : isUrgent ? 'urgent' : 'needed',
    };
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function IrrigationAdvisor() {
  const { currentUser } = useAuth();

  // Field state
  const [fields, setFields] = useState<Field[]>([]);
  const [selectedFieldId, setSelectedFieldId] = useState<string>('__location__');
  const [fieldSelectorOpen, setFieldSelectorOpen] = useState(false);

  // Weather state
  const [currentWeather, setCurrentWeather] = useState<any>(null);
  const [forecast, setForecast] = useState<ForecastDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [locationSource, setLocationSource] = useState<'gps' | 'ip' | 'default' | null>(null);

  // Notification state
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>('default');
  const notifTimeoutsRef = useRef<number[]>([]);
  const capacitorNotifIds = useRef<number[]>([]);

  const native = isNativePlatform();

  // Load user's saved fields
  useEffect(() => {
    if (!currentUser?.uid) return;
    getUserFields(currentUser.uid).then(setFields).catch(() => {});
  }, [currentUser?.uid]);

  // Restore notification preference
  useEffect(() => {
    const saved = localStorage.getItem('irrigation_notifications');
    if (saved === 'true') setNotificationsEnabled(true);
    if (!native && 'Notification' in window) setNotifPermission(Notification.permission);
  }, [native]);

  // ── Weather fetch ──────────────────────────────────────────────────────────

  const fetchWeather = useCallback(
    (isRefresh = false, overrideLat?: number, overrideLon?: number) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const apiKey = import.meta.env.VITE_WEATHER_API_KEY;

      const fetchAll = async (lat: number, lon: number) => {
        try {
          const [currRes, fcRes] = await Promise.all([
            fetch(
              `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`
            ),
            fetch(
              `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`
            ),
          ]);
          if (!currRes.ok || !fcRes.ok) throw new Error('Failed to fetch weather data');
          const currData = await currRes.json();
          const fcData = await fcRes.json();

          setCurrentWeather(currData);

          const dailyMap: Record<string, any[]> = {};
          fcData.list.forEach((item: any) => {
            const key = new Date(item.dt * 1000).toDateString();
            if (!dailyMap[key]) dailyMap[key] = [];
            dailyMap[key].push(item);
          });

          const days: ForecastDay[] = Object.entries(dailyMap)
            .slice(0, 7)
            .map(([key, items]) => {
              const temps = items.map((i: any) => i.main.temp);
              const noon = items.reduce((closest: any, item: any) => {
                const h = new Date(item.dt * 1000).getHours();
                return Math.abs(h - 12) < Math.abs(new Date(closest.dt * 1000).getHours() - 12)
                  ? item
                  : closest;
              });
              return {
                date: new Date(key),
                tempMax: Math.round(Math.max(...temps)),
                tempMin: Math.round(Math.min(...temps)),
                humidity: Math.round(
                  items.reduce((s: number, i: any) => s + i.main.humidity, 0) / items.length
                ),
                description: noon.weather[0]?.description || 'clear',
                main: noon.weather[0]?.main || 'Clear',
                pop: Math.round(Math.max(...items.map((i: any) => i.pop || 0)) * 100),
              };
            });

          setForecast(days);
        } catch (err: any) {
          setError(err.message || 'Could not load weather data');
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      };

      // Use override coordinates (field-specific)
      if (overrideLat !== undefined && overrideLon !== undefined) {
        setLocationSource('gps');
        fetchAll(overrideLat, overrideLon);
        return;
      }

      const fallback = () =>
        fetch('https://get.geojs.io/v1/ip/geo.json')
          .then(r => r.json())
          .then(g => {
            setLocationSource('ip');
            return fetchAll(parseFloat(g.latitude), parseFloat(g.longitude));
          })
          .catch(() => {
            setLocationSource('default');
            return fetchAll(23.8103, 90.4125);
          });

      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          ({ coords }) => {
            setLocationSource('gps');
            fetchAll(coords.latitude, coords.longitude);
          },
          () => fallback(),
          { timeout: 8000, enableHighAccuracy: false }
        );
      } else {
        fallback();
      }
    },
    []
  );

  // Trigger fetch when selected field changes
  useEffect(() => {
    const field = fields.find((f: Field) => f.field_id === selectedFieldId);
    if (field) {
      fetchWeather(false, field.center_point.lat, field.center_point.lng);
    } else {
      fetchWeather(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFieldId, fetchWeather]);

  // ── Notifications ──────────────────────────────────────────────────────────

  const scheduleNotifications = useCallback(
    async (schedule: ScheduleDay[]) => {
      if (!notificationsEnabled) return;

      const now = new Date();
      const threeDays = 3 * 24 * 60 * 60 * 1000;
      const days = schedule.slice(0, 3).filter(d => d.needsWater);

      if (native) {
        try {
          const { LocalNotifications } = await import('@capacitor/local-notifications');

          // Cancel old ones
          if (capacitorNotifIds.current.length > 0) {
            await LocalNotifications.cancel({
              notifications: capacitorNotifIds.current.map(id => ({ id })),
            }).catch(() => {});
            capacitorNotifIds.current = [];
          }

          const pending: any[] = [];
          let nextId = Math.floor(Date.now() / 1000) % 1000000;

          for (const day of days) {
            const dateStr = day.date.toDateString();
            if (day.morningTime) {
              const at = new Date(`${dateStr} 05:30:00`);
              if (at.getTime() - now.getTime() > 0 && at.getTime() - now.getTime() < threeDays) {
                pending.push({
                  id: ++nextId,
                  title: '🌱 Morning Watering Reminder',
                  body: `Time to irrigate! Apply ${day.waterAmount}mm of water for best results.`,
                  schedule: { at },
                  smallIcon: 'ic_launcher_foreground',
                  iconColor: '#16a34a',
                });
                capacitorNotifIds.current.push(nextId);
              }
            }
            if (day.eveningTime) {
              const at = new Date(`${dateStr} 18:00:00`);
              if (at.getTime() - now.getTime() > 0 && at.getTime() - now.getTime() < threeDays) {
                pending.push({
                  id: ++nextId,
                  title: '💧 Evening Watering Reminder',
                  body: `Soil is dry — apply ${day.waterAmount}mm to protect your crops.`,
                  schedule: { at },
                  smallIcon: 'ic_launcher_foreground',
                  iconColor: '#16a34a',
                });
                capacitorNotifIds.current.push(nextId);
              }
            }
          }

          if (pending.length > 0) {
            await LocalNotifications.schedule({ notifications: pending });
          }
        } catch {
          // LocalNotifications plugin not available
        }
      } else {
        // Web browser notifications
        notifTimeoutsRef.current.forEach((id: number) => clearTimeout(id));
        notifTimeoutsRef.current = [];
        if (!('Notification' in window) || Notification.permission !== 'granted') return;

        for (const day of days) {
          const dateStr = day.date.toDateString();
          const trySchedule = (timeStr: string, title: string, body: string) => {
            const t = new Date(`${dateStr} ${timeStr}`);
            const delay = t.getTime() - now.getTime();
            if (delay > 0 && delay < threeDays) {
              const id = window.setTimeout(() => {
                if (Notification.permission === 'granted') {
                  new Notification(title, {
                    body,
                    icon: '/splash_bg.png',
                    tag: `irrigation-${dateStr}-${timeStr}`,
                  });
                }
              }, delay);
              notifTimeoutsRef.current.push(id);
            }
          };
          if (day.morningTime) trySchedule('05:30:00', '🌱 Morning Watering Reminder', `Time to irrigate! Apply ${day.waterAmount}mm.`);
          if (day.eveningTime) trySchedule('18:00:00', '💧 Evening Watering Reminder', `Soil is dry — apply ${day.waterAmount}mm.`);
        }
      }
    },
    [notificationsEnabled, native]
  );

  useEffect(() => {
    if (forecast.length > 0 && currentWeather && notificationsEnabled) {
      const soilType = fields.find((f: Field) => f.field_id === selectedFieldId)?.soil_summary?.type;
      scheduleNotifications(generateSchedule(forecast, soilType));
    }
  }, [forecast, currentWeather, notificationsEnabled, scheduleNotifications, fields, selectedFieldId]);

  // Cleanup on unmount
  useEffect(() => () => {
    notifTimeoutsRef.current.forEach((id: number) => clearTimeout(id));
  }, []);

  const handleToggleNotifications = async () => {
    if (!notificationsEnabled) {
      let granted = false;

      if (native) {
        try {
          const { LocalNotifications } = await import('@capacitor/local-notifications');
          const result = await LocalNotifications.requestPermissions();
          granted = result.display === 'granted';
        } catch {
          granted = false;
        }
      } else if ('Notification' in window) {
        const perm = await Notification.requestPermission();
        setNotifPermission(perm);
        granted = perm === 'granted';
      }

      if (granted) {
        setNotificationsEnabled(true);
        localStorage.setItem('irrigation_notifications', 'true');
        const soilType = fields.find((f: Field) => f.field_id === selectedFieldId)?.soil_summary?.type;
        if (forecast.length > 0) scheduleNotifications(generateSchedule(forecast, soilType));
      }
    } else {
      setNotificationsEnabled(false);
      localStorage.setItem('irrigation_notifications', 'false');

      if (native) {
        try {
          const { LocalNotifications } = await import('@capacitor/local-notifications');
          if (capacitorNotifIds.current.length > 0) {
            await LocalNotifications.cancel({
              notifications: capacitorNotifIds.current.map(id => ({ id })),
            }).catch(() => {});
            capacitorNotifIds.current = [];
          }
        } catch {}
      } else {
        notifTimeoutsRef.current.forEach((id: number) => clearTimeout(id));
        notifTimeoutsRef.current = [];
      }
    }
  };

  // ── Loading / Error ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <Layout showBack title="Smart Irrigation">
        <div className="flex flex-col items-center justify-center pt-20 space-y-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-on-surface-variant/60 text-sm">Analyzing field conditions…</p>
        </div>
      </Layout>
    );
  }

  if (error || !currentWeather) {
    return (
      <Layout showBack title="Smart Irrigation">
        <div className="flex flex-col items-center justify-center p-6 pt-20 text-center space-y-4">
          <CloudRain className="w-12 h-12 text-on-surface-variant/40 mx-auto" />
          <p className="text-on-surface-variant/70">Could not load weather data.</p>
          <p className="text-on-surface-variant/40 text-sm">{error}</p>
          <button
            onClick={() => {
              const field = fields.find((f: Field) => f.field_id === selectedFieldId);
              field
                ? fetchWeather(false, field.center_point.lat, field.center_point.lng)
                : fetchWeather(false);
            }}
            className="bg-primary/10 text-primary px-6 py-3 rounded-2xl font-bold"
          >
            Retry
          </button>
        </div>
      </Layout>
    );
  }

  // ── Derived data ───────────────────────────────────────────────────────────

  const selectedField = fields.find((f: Field) => f.field_id === selectedFieldId) ?? null;
  const fieldSoilType = selectedField?.soil_summary?.type ?? 'Unknown';

  const mainWeather: string = currentWeather.weather[0]?.main || 'Clear';
  const humidity: number = currentWeather.main.humidity;
  const temp: number = Math.round(currentWeather.main.temp);
  const city: string = currentWeather.name;
  const isRaining =
    mainWeather.toLowerCase().includes('rain') ||
    mainWeather.toLowerCase().includes('drizzle') ||
    mainWeather.toLowerCase().includes('thunder');
  const isCloudy = mainWeather.toLowerCase().includes('cloud');

  const forecastRainPct = forecast[0]?.pop ?? 20;
  const rainProbability = isRaining ? 90 : forecastRainPct;

  const condition = assessLandCondition(mainWeather, humidity, temp, rainProbability, fieldSoilType);
  const schedule = generateSchedule(forecast, fieldSoilType);
  const nextWateringDay = schedule.find(d => d.needsWater) ?? null;

  const conditionTheme = {
    wet:      { bg: 'bg-blue-50',    border: 'border-blue-100',   text: 'text-blue-700',    bar: 'bg-blue-500',    icon: 'text-blue-500'    },
    adequate: { bg: 'bg-emerald-50', border: 'border-emerald-100', text: 'text-emerald-700', bar: 'bg-emerald-500', icon: 'text-emerald-500' },
    dry:      { bg: 'bg-orange-50',  border: 'border-orange-100', text: 'text-orange-700',  bar: 'bg-orange-500',  icon: 'text-orange-500'  },
    very_dry: { bg: 'bg-red-50',     border: 'border-red-100',    text: 'text-red-700',     bar: 'bg-red-500',     icon: 'text-red-500'     },
  };
  const ct = conditionTheme[condition.level];

  const getDayLabel = (date: Date, idx: number) => {
    if (idx === 0) return 'Today';
    if (idx === 1) return 'Tomorrow';
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  };

  const weatherEmoji = isRaining ? '🌧️' : isCloudy ? '⛅' : '☀️';
  const locationLabel =
    selectedField
      ? `📍 ${selectedField.field_name}`
      : locationSource === 'gps' ? '📍 GPS'
      : locationSource === 'ip'  ? '🌐 IP-based' : '🏙️ Default';

  const doRefresh = () => {
    selectedField
      ? fetchWeather(true, selectedField.center_point.lat, selectedField.center_point.lng)
      : fetchWeather(true);
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Layout showBack title="Smart Irrigation">
      <div className="px-4 sm:px-5 pb-12 space-y-4 sm:space-y-6">

        {/* ── Field Selector ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <button
            onClick={() => setFieldSelectorOpen((o: boolean) => !o)}
            className="w-full flex items-center justify-between bg-surface-container-low border border-outline-variant/20 rounded-2xl px-4 py-3"
          >
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              <span className="font-bold text-sm text-on-surface">
                {selectedField ? selectedField.field_name : 'My Current Location'}
              </span>
              {selectedField && (
                <span className="text-[10px] text-on-surface-variant/50 font-medium">
                  · {selectedField.area_size} {selectedField.area_unit}
                </span>
              )}
            </div>
            <ChevronDown
              className={`w-4 h-4 text-on-surface-variant/50 transition-transform ${fieldSelectorOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {fieldSelectorOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-1 bg-surface-container-lowest border border-outline-variant/15 rounded-2xl overflow-hidden shadow-lg z-10"
            >
              {/* Use current location */}
              <button
                onClick={() => { setSelectedFieldId('__location__'); setFieldSelectorOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                  selectedFieldId === '__location__'
                    ? 'bg-primary/10 text-primary font-bold'
                    : 'hover:bg-surface-container text-on-surface'
                }`}
              >
                <MapPin className="w-4 h-4 flex-shrink-0" />
                <div>
                  <p className="text-sm font-bold">My Current Location</p>
                  <p className="text-[10px] text-on-surface-variant/60">Uses device GPS</p>
                </div>
              </button>

              {fields.length === 0 && (
                <p className="px-4 py-3 text-xs text-on-surface-variant/50">
                  No saved fields — add fields in the Fields tab.
                </p>
              )}

              {fields.map((f: Field) => (
                <button
                  key={f.field_id}
                  onClick={() => { setSelectedFieldId(f.field_id!); setFieldSelectorOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left border-t border-outline-variant/10 transition-colors ${
                    selectedFieldId === f.field_id
                      ? 'bg-primary/10 text-primary font-bold'
                      : 'hover:bg-surface-container text-on-surface'
                  }`}
                >
                  <Leaf className="w-4 h-4 flex-shrink-0 text-primary/70" />
                  <div>
                    <p className="text-sm font-bold">{f.field_name}</p>
                    <p className="text-[10px] text-on-surface-variant/60">
                      {f.area_size} {f.area_unit}
                      {f.soil_summary?.type && f.soil_summary.type !== 'Unknown'
                        ? ` · ${f.soil_summary.type} soil`
                        : ''}
                      {f.active_crop ? ` · ${f.active_crop}` : ''}
                    </p>
                  </div>
                </button>
              ))}
            </motion.div>
          )}

          {/* Field soil info pill */}
          {selectedField && fieldSoilType !== 'Unknown' && (
            <div className="flex items-center gap-2 mt-2 px-1">
              <span className="text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-widest">Soil:</span>
              <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                {fieldSoilType}
              </span>
              {selectedField.soil_summary?.ph && (
                <span className="text-[10px] font-bold text-on-surface-variant/50 bg-surface-container px-2 py-0.5 rounded-full">
                  pH {selectedField.soil_summary.ph}
                </span>
              )}
              {selectedField.active_crop && (
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                  🌾 {selectedField.active_crop}
                </span>
              )}
            </div>
          )}
        </motion.div>

        {/* ── Weather Status Hero ── */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className={`relative rounded-2xl sm:rounded-[2rem] overflow-hidden p-5 sm:p-6 ${
            isRaining
              ? 'bg-gradient-to-br from-blue-900 to-slate-800'
              : 'bg-gradient-to-br from-emerald-900 to-green-800'
          }`}
        >
          <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full opacity-10 bg-white" />

          <div className="flex justify-between items-start">
            <div className="text-white">
              <p className="text-white/50 text-[10px] sm:text-xs font-bold uppercase tracking-widest mb-2 flex items-center gap-1">
                <MapPin className="w-3 h-3" /> {city} &nbsp;·&nbsp; {locationLabel}
              </p>
              <div className="flex items-center gap-3">
                <span className="text-5xl sm:text-6xl">{weatherEmoji}</span>
                <div>
                  <p className="text-3xl font-black">{temp}°C</p>
                  <p className="text-white/70 text-sm capitalize">
                    {currentWeather.weather[0]?.description}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 mt-3">
                <div className="flex items-center gap-1.5">
                  <Droplets className="w-4 h-4 text-blue-300" />
                  <span className="text-white/80 text-sm font-bold">{humidity}% humidity</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CloudRain className="w-4 h-4 text-blue-300" />
                  <span className="text-white/80 text-sm font-bold">{rainProbability}% rain chance</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Thermometer className="w-4 h-4 text-orange-300" />
                  <span className="text-white/80 text-sm font-bold">{temp}°C</span>
                </div>
              </div>
            </div>

            <button
              onClick={doRefresh}
              disabled={refreshing}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 transition-all"
            >
              <RotateCcw className={`w-4 h-4 text-white/70 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div
            className={`mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold ${
              isRaining ? 'bg-blue-500/30 text-blue-100' : 'bg-white/10 text-white'
            }`}
          >
            {isRaining ? (
              <><CloudRain className="w-4 h-4" /> It is raining now</>
            ) : (
              <><Sun className="w-4 h-4" /> No rain currently</>
            )}
          </div>
        </motion.div>

        {/* ── Land Condition Card ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.5 }}
          className={`rounded-2xl sm:rounded-[2rem] p-4 sm:p-5 border ${ct.bg} ${ct.border}`}
        >
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/50 mb-1">
                {selectedField ? `${selectedField.field_name} — Land Condition` : 'Land Condition'}
              </p>
              <h3 className={`text-xl sm:text-2xl font-black ${ct.text}`}>{condition.label}</h3>
              <p className="text-on-surface-variant/70 text-xs sm:text-sm mt-0.5 leading-relaxed">
                {condition.description}
              </p>
            </div>
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${ct.bg} border ${ct.border}`}>
              <Leaf className={`w-6 h-6 ${ct.icon}`} />
            </div>
          </div>

          <div className="space-y-1.5 mt-4">
            <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/50">
              <span>Soil Moisture Index</span>
              <span className={ct.text}>{condition.moistureScore}%</span>
            </div>
            <div className="h-3 w-full bg-white/60 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${condition.moistureScore}%` }}
                transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
                className={`h-full rounded-full ${ct.bar}`}
              />
            </div>
            <div className="flex justify-between text-[8px] text-on-surface-variant/40 font-bold uppercase">
              <span>Very Dry</span>
              <span>Adequate</span>
              <span>Wet</span>
            </div>
          </div>

          {/* Soil type influence indicator */}
          {fieldSoilType !== 'Unknown' && (
            <p className="text-[9px] text-on-surface-variant/40 mt-2 font-medium">
              * Score adjusted for {fieldSoilType.toLowerCase()} soil water retention
            </p>
          )}
        </motion.div>

        {/* ── Water Needed Card ── */}
        {condition.waterNeededMm > 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.5 }}
            className={`rounded-2xl sm:rounded-[2rem] p-4 sm:p-5 border ${
              condition.urgency === 'high' ? 'bg-red-50 border-red-100' : 'bg-orange-50 border-orange-100'
            }`}
          >
            <div className="flex items-center gap-2 mb-3">
              {condition.urgency === 'high' ? (
                <AlertTriangle className="w-5 h-5 text-red-600" />
              ) : (
                <AlarmClock className="w-5 h-5 text-orange-600" />
              )}
              <p className={`font-bold text-sm ${condition.urgency === 'high' ? 'text-red-700' : 'text-orange-700'}`}>
                {condition.urgency === 'high' ? 'Urgent Irrigation Required' : 'Irrigation Recommended'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/70 rounded-xl p-3">
                <p className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant/50 mb-1">
                  Water Needed
                </p>
                <p className="text-2xl font-black text-on-surface">
                  {condition.waterNeededMm}
                  <span className="text-sm font-bold text-on-surface-variant/60"> mm</span>
                </p>
                <p className="text-[9px] text-on-surface-variant/50 mt-0.5">per sq. meter</p>
              </div>
              <div className="bg-white/70 rounded-xl p-3">
                <p className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant/50 mb-1">
                  Irrigation Time
                </p>
                <p className="text-2xl font-black text-on-surface">
                  {condition.waterNeededMm * 2}
                  <span className="text-sm font-bold text-on-surface-variant/60"> min</span>
                </p>
                <p className="text-[9px] text-on-surface-variant/50 mt-0.5">approx. drip time</p>
              </div>
            </div>

            <div className="flex items-start gap-2 mt-3 bg-white/50 rounded-xl p-3">
              <Clock className={`w-4 h-4 mt-0.5 flex-shrink-0 ${condition.urgency === 'high' ? 'text-red-600' : 'text-orange-600'}`} />
              <p className="text-xs text-on-surface-variant/80 font-medium">
                Best time: <span className="font-bold text-on-surface">5:30 AM</span> (morning) or{' '}
                <span className="font-bold text-on-surface">6:00 PM</span> (evening) — minimizes evaporation loss.
              </p>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.5 }}
            className="rounded-2xl sm:rounded-[2rem] p-4 sm:p-5 bg-emerald-50 border border-emerald-100"
          >
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 flex-shrink-0" />
              <div>
                <p className="font-bold text-emerald-700">No irrigation needed today</p>
                <p className="text-xs text-emerald-600/70 mt-0.5">
                  Soil has sufficient moisture. Check again tomorrow.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Next Scheduled Watering ── */}
        {nextWateringDay && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.5 }}
            className="rounded-2xl sm:rounded-[2rem] p-4 sm:p-5 bg-primary text-white"
          >
            <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest mb-1">
              Next Scheduled Watering
            </p>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-black">
                  {nextWateringDay.date.toDateString() === new Date().toDateString()
                    ? 'Today'
                    : nextWateringDay.date.toLocaleDateString('en-US', {
                        weekday: 'long', month: 'short', day: 'numeric',
                      })}
                </p>
                <div className="flex flex-wrap gap-2 mt-1.5">
                  {nextWateringDay.morningTime && (
                    <span className="flex items-center gap-1 bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full">
                      <Clock className="w-3 h-3" /> {nextWateringDay.morningTime}
                    </span>
                  )}
                  {nextWateringDay.eveningTime && (
                    <span className="flex items-center gap-1 bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full">
                      <Clock className="w-3 h-3" /> {nextWateringDay.eveningTime}
                    </span>
                  )}
                </div>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
                <Droplets className="w-7 h-7 text-white" />
              </div>
            </div>
          </motion.div>
        )}

        {/* ── 7-Day Watering Schedule ── */}
        {schedule.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4 text-primary" />
              <h2 className="text-xs sm:text-sm font-bold uppercase tracking-widest text-on-surface-variant/50">
                7-Day Watering Schedule
                {selectedField && (
                  <span className="normal-case ml-1 text-primary/70">— {selectedField.field_name}</span>
                )}
              </h2>
            </div>

            <div className="rounded-2xl sm:rounded-[2rem] overflow-hidden divide-y border border-outline-variant/10 bg-surface-container-low">
              {schedule.map((day, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center px-4 sm:px-5 py-3 sm:py-4 gap-3 sm:gap-4"
                >
                  <div
                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      day.status === 'rain'     ? 'bg-blue-100' :
                      day.status === 'optional' ? 'bg-yellow-100' :
                      day.status === 'urgent'   ? 'bg-red-100' :
                                                  'bg-emerald-100'
                    }`}
                  >
                    {day.status === 'rain' && <CloudRain className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />}
                    {day.status === 'optional' && <Cloud className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600" />}
                    {day.status === 'urgent' && <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />}
                    {day.status === 'needed' && <Droplets className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-on-surface font-bold text-sm">{getDayLabel(day.date, i)}</p>
                      <span className="text-on-surface-variant/40 text-xs">
                        {day.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <p className="text-on-surface-variant/60 text-xs font-medium mt-0.5">{day.reason}</p>
                    {day.needsWater && (
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        {day.morningTime && (
                          <span className="bg-primary/10 text-primary text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" /> {day.morningTime}
                          </span>
                        )}
                        {day.eveningTime && (
                          <span className="bg-orange-100 text-orange-700 text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" /> {day.eveningTime}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="text-right flex-shrink-0">
                    {day.needsWater ? (
                      <>
                        <p className="text-on-surface font-black text-sm">{day.waterAmount}mm</p>
                        <p className="text-on-surface-variant/40 text-[9px] uppercase">needed</p>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-1 justify-end">
                          <CloudRain className="w-3 h-3 text-blue-500" />
                          <p className="text-blue-600 font-bold text-xs">{day.rainChance}%</p>
                        </div>
                        <p className="text-on-surface-variant/40 text-[9px] uppercase">rain</p>
                      </>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>

            <p className="text-center text-on-surface-variant/30 text-[8px] sm:text-[10px] mt-3 uppercase tracking-widest font-bold">
              🔵 Rain &nbsp; 🟡 Monitor &nbsp; 🟢 Water &nbsp; 🔴 Urgent
            </p>
          </motion.div>
        )}

        {/* ── Notification Settings ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="rounded-2xl sm:rounded-[2rem] p-4 sm:p-5 bg-surface-container-low border border-outline-variant/10"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  notificationsEnabled ? 'bg-primary/10' : 'bg-surface-container-high'
                }`}
              >
                {notificationsEnabled ? (
                  <Bell className="w-5 h-5 text-primary" />
                ) : (
                  <BellOff className="w-5 h-5 text-on-surface-variant/40" />
                )}
              </div>
              <div>
                <p className="text-on-surface font-bold text-sm">Watering Reminders</p>
                <p className="text-on-surface-variant/50 text-xs">
                  {notificationsEnabled
                    ? 'Notifications are ON'
                    : 'Tap to enable watering reminders'}
                </p>
              </div>
            </div>

            <button
              onClick={handleToggleNotifications}
              className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${
                notificationsEnabled ? 'bg-primary' : 'bg-outline-variant/30'
              }`}
            >
              <div
                className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-300 ${
                  notificationsEnabled ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {notificationsEnabled && (
            <div className="mt-3 bg-primary/5 rounded-xl p-3">
              <p className="text-primary/70 text-xs font-medium">
                You will be reminded at <span className="font-bold text-primary">5:30 AM</span> and{' '}
                <span className="font-bold text-primary">6:00 PM</span> on scheduled watering days.
              </p>
            </div>
          )}

          {/* Web browser notification denied */}
          {!native && notifPermission === 'denied' && (
            <div className="mt-3 bg-red-50 border border-red-100 rounded-xl p-3">
              <p className="text-red-600 text-xs font-medium">
                Notifications are blocked. Please allow them in your browser settings to receive
                watering reminders.
              </p>
            </div>
          )}
        </motion.div>

        {/* ── Wind advisory ── */}
        {currentWeather.wind?.speed > 8 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55, duration: 0.5 }}
            className="rounded-2xl sm:rounded-[2rem] p-4 sm:p-5 bg-yellow-50 border border-yellow-100 flex items-start gap-3"
          >
            <Wind className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <p className="text-yellow-700 text-sm font-medium">
              <span className="font-bold">High wind detected</span> ({Math.round(currentWeather.wind.speed * 3.6)} km/h) —
              avoid spraying fertilizers or pesticides today to prevent drift.
            </p>
          </motion.div>
        )}

      </div>
    </Layout>
  );
}
