import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Droplets, CloudRain, Sun, Cloud, Thermometer,
  Bell, BellOff, Clock, Calendar, CheckCircle2,
  AlertTriangle, Wind, MapPin, RotateCcw,
  AlarmClock, Leaf
} from 'lucide-react';
import { motion } from 'motion/react';
import Layout from '../components/Layout';

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

function assessLandCondition(
  mainWeather: string,
  humidity: number,
  temp: number,
  rainProbability: number
): LandCondition {
  const lower = mainWeather.toLowerCase();
  const isRaining =
    lower.includes('rain') ||
    lower.includes('drizzle') ||
    lower.includes('thunder');

  let moistureScore: number;
  if (isRaining) {
    moistureScore = 82 + humidity * 0.12;
  } else {
    moistureScore = humidity * 0.55 + rainProbability * 0.35 + 10;
  }

  if (temp > 38) moistureScore -= 20;
  else if (temp > 35) moistureScore -= 12;
  else if (temp > 32) moistureScore -= 6;
  else if (temp < 20) moistureScore += 5;

  moistureScore = Math.max(5, Math.min(95, Math.round(moistureScore)));

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
      waterNeededMm: 10,
      urgency: 'low',
      label: 'Adequate',
      description: 'Soil moisture is acceptable. Light irrigation recommended.',
    };
  }
  if (moistureScore >= 30) {
    return {
      moistureScore,
      level: 'dry',
      waterNeededMm: 25,
      urgency: 'medium',
      label: 'Dry',
      description: 'Soil is getting dry. Irrigation is needed soon.',
    };
  }
  return {
    moistureScore,
    level: 'very_dry',
    waterNeededMm: 35 + Math.round((30 - moistureScore) * 0.5),
    urgency: 'high',
    label: 'Very Dry',
    description: 'Critical moisture deficit. Immediate irrigation required.',
  };
}

function generateSchedule(forecast: ForecastDay[]): ScheduleDay[] {
  return forecast.map(day => {
    const pop = day.pop;
    const isHighRain = pop >= 60;
    const isOptional = pop >= 30 && pop < 60;
    const cond = assessLandCondition(day.main, day.humidity, day.tempMax, pop);
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
      status: isHighRain
        ? 'rain'
        : isOptional
        ? 'optional'
        : isUrgent
        ? 'urgent'
        : 'needed',
    };
  });
}

export default function IrrigationAdvisor() {
  const [currentWeather, setCurrentWeather] = useState<any>(null);
  const [forecast, setForecast] = useState<ForecastDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [locationSource, setLocationSource] = useState<'gps' | 'ip' | 'default' | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>('default');
  const notifTimeoutsRef = useRef<number[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('irrigation_notifications');
    if (saved === 'true') setNotificationsEnabled(true);
    if ('Notification' in window) setNotifPermission(Notification.permission);
  }, []);

  const fetchWeather = useCallback((isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    const apiKey = import.meta.env.VITE_WEATHER_API_KEY;

    const fetchAll = async (lat: number, lon: number) => {
      try {
        const [currRes, fcRes] = await Promise.all([
          fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`),
          fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`),
        ]);
        if (!currRes.ok || !fcRes.ok) throw new Error('Failed to fetch weather');
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
        setError(err.message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    };

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
        { timeout: 10000, enableHighAccuracy: true }
      );
    } else {
      fallback();
    }
  }, []);

  useEffect(() => {
    fetchWeather();
  }, [fetchWeather]);

  const scheduleNotifications = useCallback(
    (schedule: ScheduleDay[]) => {
      notifTimeoutsRef.current.forEach(id => clearTimeout(id));
      notifTimeoutsRef.current = [];

      if (!notificationsEnabled || Notification.permission !== 'granted') return;

      const now = new Date();
      const threeDays = 3 * 24 * 60 * 60 * 1000;

      for (const day of schedule.slice(0, 3)) {
        if (!day.needsWater) continue;
        const dateStr = day.date.toDateString();

        const trySchedule = (timeStr: string, title: string, body: string) => {
          const t = new Date(`${dateStr} ${timeStr}`);
          const delay = t.getTime() - now.getTime();
          if (delay > 0 && delay < threeDays) {
            const id = window.setTimeout(() => {
              if (Notification.permission === 'granted') {
                new Notification(title, { body, icon: '/splash_bg.png', tag: `irrigation-${dateStr}-${timeStr}` });
              }
            }, delay);
            notifTimeoutsRef.current.push(id);
          }
        };

        if (day.morningTime) {
          trySchedule(
            '05:30:00',
            'Morning Watering Reminder',
            `Time to irrigate your crops! Apply ${day.waterAmount}mm of water now for best results.`
          );
        }
        if (day.eveningTime) {
          trySchedule(
            '18:00:00',
            'Evening Watering Reminder',
            `Evening irrigation time. Soil is dry — apply ${day.waterAmount}mm to protect your crops.`
          );
        }
      }
    },
    [notificationsEnabled]
  );

  useEffect(() => {
    if (forecast.length > 0 && currentWeather && notificationsEnabled) {
      scheduleNotifications(generateSchedule(forecast));
    }
  }, [forecast, currentWeather, notificationsEnabled, scheduleNotifications]);

  useEffect(() => () => { notifTimeoutsRef.current.forEach(id => clearTimeout(id)); }, []);

  const handleToggleNotifications = async () => {
    if (!('Notification' in window)) return;

    if (!notificationsEnabled) {
      const permission = await Notification.requestPermission();
      setNotifPermission(permission);
      if (permission === 'granted') {
        setNotificationsEnabled(true);
        localStorage.setItem('irrigation_notifications', 'true');
        if (forecast.length > 0) scheduleNotifications(generateSchedule(forecast));
      }
    } else {
      setNotificationsEnabled(false);
      localStorage.setItem('irrigation_notifications', 'false');
      notifTimeoutsRef.current.forEach(id => clearTimeout(id));
      notifTimeoutsRef.current = [];
    }
  };

  // ─── Loading / Error states ───────────────────────────────────────────────

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
            onClick={() => fetchWeather()}
            className="bg-primary/10 text-primary px-6 py-3 rounded-2xl font-bold"
          >
            Retry
          </button>
        </div>
      </Layout>
    );
  }

  // ─── Derived data ─────────────────────────────────────────────────────────

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

  const condition = assessLandCondition(mainWeather, humidity, temp, rainProbability);
  const schedule = generateSchedule(forecast);
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
    locationSource === 'gps' ? '📍 GPS' :
    locationSource === 'ip'  ? '🌐 IP-based' : '🏙️ Default';

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <Layout showBack title="Smart Irrigation">
      <div className="px-4 sm:px-5 pb-12 space-y-4 sm:space-y-6">

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
              onClick={() => fetchWeather(true)}
              disabled={refreshing}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 transition-all"
            >
              <RotateCcw className={`w-4 h-4 text-white/70 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Rain / No-rain pill */}
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
                Land Condition
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

          {/* Moisture progress bar */}
          <div className="space-y-1.5 mt-4">
            <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/50">
              <span>Soil Moisture</span>
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
        </motion.div>

        {/* ── Water Needed Card ── */}
        {condition.waterNeededMm > 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.5 }}
            className={`rounded-2xl sm:rounded-[2rem] p-4 sm:p-5 border ${
              condition.urgency === 'high'
                ? 'bg-red-50 border-red-100'
                : 'bg-orange-50 border-orange-100'
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
                        weekday: 'long',
                        month: 'short',
                        day: 'numeric',
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
                  {/* Status icon */}
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

                  {/* Day info */}
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

                  {/* Right: water amount or rain chance */}
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
                    : 'Enable to get watering reminders'}
                </p>
              </div>
            </div>

            {/* Toggle switch */}
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
                Keep the app open for browser reminders to work.
              </p>
            </div>
          )}

          {notifPermission === 'denied' && (
            <div className="mt-3 bg-red-50 border border-red-100 rounded-xl p-3">
              <p className="text-red-600 text-xs font-medium">
                Notifications are blocked in your browser. Please allow them in browser settings to
                receive watering reminders.
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
