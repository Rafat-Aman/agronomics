import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Droplets, Wind, Thermometer,
  CloudRain, Sun, Cloud, Zap, Snowflake, AlertTriangle,
  Leaf, Sprout, Bug, Droplet, CheckCircle2, RotateCcw, MapPin
} from 'lucide-react';
import { motion } from 'motion/react';
import Layout from '../components/Layout';

interface ForecastDay {
  date: Date;
  tempMax: number;
  tempMin: number;
  humidity: number;
  windSpeed: number;
  description: string;
  main: string;
  pop: number; // probability of precipitation
  icon: string;
}

export default function WeatherForecast() {
  const navigate = useNavigate();
  const [currentWeather, setCurrentWeather] = useState<any>(null);
  const [forecast, setForecast] = useState<ForecastDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [locationSource, setLocationSource] = useState<'gps' | 'ip' | 'default' | null>(null);

  const fetchWeather = useCallback((isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    const apiKey = import.meta.env.VITE_WEATHER_API_KEY;

    const fetchAll = async (lat: number, lon: number) => {
      try {
        const [currRes, fcRes] = await Promise.all([
          fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`),
          fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`)
        ]);
        if (!currRes.ok || !fcRes.ok) throw new Error('Failed to fetch weather');
        const currData = await currRes.json();
        const fcData = await fcRes.json();

        setCurrentWeather(currData);

        // Group by day: pick noon reading or first of day
        const dailyMap: Record<string, any[]> = {};
        fcData.list.forEach((item: any) => {
          const d = new Date(item.dt * 1000);
          const key = d.toDateString();
          if (!dailyMap[key]) dailyMap[key] = [];
          dailyMap[key].push(item);
        });

        const days: ForecastDay[] = Object.entries(dailyMap).slice(0, 7).map(([key, items]) => {
          const temps = items.map((i: any) => i.main.temp);
          const noon = items.reduce((closest: any, item: any) => {
            const h = new Date(item.dt * 1000).getHours();
            return Math.abs(h - 12) < Math.abs(new Date(closest.dt * 1000).getHours() - 12) ? item : closest;
          });
          return {
            date: new Date(key),
            tempMax: Math.round(Math.max(...temps)),
            tempMin: Math.round(Math.min(...temps)),
            humidity: Math.round(items.reduce((s: number, i: any) => s + i.main.humidity, 0) / items.length),
            windSpeed: Math.round(items.reduce((s: number, i: any) => s + i.wind.speed, 0) / items.length * 3.6),
            description: noon.weather[0]?.description || 'clear',
            main: noon.weather[0]?.main || 'Clear',
            pop: Math.round(Math.max(...items.map((i: any) => i.pop || 0)) * 100),
            icon: noon.weather[0]?.icon || '01d',
          };
        });
        setForecast(days);
        setSelectedDay(0);
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
        .then(g => { setLocationSource('ip'); return fetchAll(parseFloat(g.latitude), parseFloat(g.longitude)); })
        .catch(() => { setLocationSource('default'); return fetchAll(23.8103, 90.4125); });

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => { setLocationSource('gps'); fetchAll(coords.latitude, coords.longitude); },
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

  const getWeatherEmoji = (main: string) => {
    const c = main.toLowerCase();
    if (c.includes('thunder')) return '⛈️';
    if (c.includes('rain') || c.includes('drizzle')) return '🌧️';
    if (c.includes('snow')) return '❄️';
    if (c.includes('cloud')) return '⛅';
    if (c.includes('mist') || c.includes('fog') || c.includes('haze')) return '🌫️';
    return '☀️';
  };

  const getDayLabel = (date: Date, idx: number) => {
    if (idx === 0) return 'Today';
    if (idx === 1) return 'Tomorrow';
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  };

  const getFarmingAdvice = (day: ForecastDay): { tip: string; icon: any; color: string; level: 'good' | 'warn' | 'bad' }[] => {
    const tips: { tip: string; icon: any; color: string; level: 'good' | 'warn' | 'bad' }[] = [];
    const c = day.main.toLowerCase();

    if (c.includes('rain') || c.includes('thunder')) {
      tips.push({ tip: 'Avoid pesticide & fertilizer application', icon: AlertTriangle, color: 'text-orange-600', level: 'warn' });
      tips.push({ tip: 'Ensure proper drainage in fields', icon: Droplet, color: 'text-blue-600', level: 'warn' });
      if (day.pop > 70) tips.push({ tip: 'Heavy rain expected — postpone harvesting', icon: CloudRain, color: 'text-red-600', level: 'bad' });
    }
    if (day.humidity > 80) {
      tips.push({ tip: 'High humidity: watch for fungal diseases', icon: Bug, color: 'text-red-600', level: 'bad' });
    }
    if (day.tempMax > 35) {
      tips.push({ tip: 'Irrigate in early morning or late evening only', icon: Droplets, color: 'text-blue-500', level: 'warn' });
      tips.push({ tip: 'Avoid field work during peak heat (11am–3pm)', icon: AlertTriangle, color: 'text-orange-600', level: 'warn' });
    }
    if (day.tempMin < 12) {
      tips.push({ tip: 'Risk of cold stress for seedlings', icon: Snowflake, color: 'text-sky-500', level: 'warn' });
    }
    if (day.windSpeed > 40) {
      tips.push({ tip: 'Strong winds — delay spraying operations', icon: Wind, color: 'text-yellow-600', level: 'warn' });
    }
    if (tips.length === 0) {
      tips.push({ tip: 'Good conditions for field operations', icon: CheckCircle2, color: 'text-emerald-600', level: 'good' });
      tips.push({ tip: 'Suitable for planting and transplanting', icon: Sprout, color: 'text-emerald-600', level: 'good' });
      if (day.humidity >= 40 && day.humidity <= 70) tips.push({ tip: 'Ideal humidity for most crops', icon: Leaf, color: 'text-emerald-500', level: 'good' });
    }
    return tips;
  };

  if (loading) {
    return (
      <Layout showBack title="Weather Forecast">
        <div className="flex flex-col items-center justify-center pt-20 space-y-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-on-surface-variant/60 text-sm">Fetching weather data…</p>
        </div>
      </Layout>
    );
  }

  if (error || !currentWeather) {
    return (
      <Layout showBack title="Weather Forecast">
        <div className="flex flex-col items-center justify-center p-6 pt-20 text-center space-y-4">
          <CloudRain className="w-12 h-12 text-on-surface-variant/40 mx-auto" />
          <p className="text-on-surface-variant/70">Could not load weather data.</p>
          <p className="text-on-surface-variant/40 text-sm">{error}</p>
          <button onClick={() => navigate(-1)} className="mt-4 bg-primary/10 text-primary px-6 py-3 rounded-2xl font-bold">Go Back</button>
        </div>
      </Layout>
    );
  }

  const locationLabel = locationSource === 'gps' ? '📍 GPS' : locationSource === 'ip' ? '🌐 IP-based' : locationSource === 'default' ? '🏙️ Default' : null;

  const current = {
    temp: Math.round(currentWeather.main.temp),
    feelsLike: Math.round(currentWeather.main.feels_like),
    humidity: currentWeather.main.humidity,
    wind: Math.round((currentWeather.wind?.speed || 0) * 3.6),
    description: currentWeather.weather[0]?.description || 'clear',
    main: currentWeather.weather[0]?.main || 'Clear',
    city: currentWeather.name,
    country: currentWeather.sys?.country || '',
    visibility: currentWeather.visibility ? Math.round(currentWeather.visibility / 1000) : null,
    pressure: currentWeather.main.pressure,
    tempMax: Math.round(currentWeather.main.temp_max),
    tempMin: Math.round(currentWeather.main.temp_min),
  };

  const selectedForecast = forecast[selectedDay];

  return (
    <Layout showBack title="Weather Forecast">
      <div className="px-4 sm:px-5 pb-12 space-y-4 sm:space-y-6">
        {/* Current Conditions Hero — dark gradient */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative rounded-2xl sm:rounded-[2rem] overflow-hidden p-5 sm:p-6 editorial-shadow-lg"
          style={{ background: 'linear-gradient(160deg, #0d3b16, #1f6b2e 40%, #0b6e8a)' }}
        >
          {/* ambient highlight */}
          <div className="absolute inset-0 pointer-events-none opacity-15"
            style={{ background: 'radial-gradient(circle at 80% 20%, white 0 30%, transparent 70%)' }} />

          <div className="relative flex justify-between items-start">
            <div>
              <div className="font-data text-[10px] font-medium tracking-[0.08em] uppercase text-white/60 mb-3">
                {current.city} · {current.country}
                {locationLabel && <span className="ml-2 text-white/40">{locationLabel}</span>}
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="font-data font-semibold text-[76px] sm:text-[88px] leading-none tracking-[-0.04em] text-white">
                  {current.temp}
                </span>
                <span className="font-data text-3xl text-white/70 font-medium">°C</span>
              </div>
              <p className="text-white/80 capitalize text-sm font-medium mt-2">{current.description}</p>
              <p className="font-data text-[11px] text-white/50 mt-1">
                Feels like {current.feelsLike}° · H {current.tempMax}° L {current.tempMin}°
              </p>
            </div>
            <div className="flex flex-col items-end gap-3">
              <button
                id="forecast-refresh-btn"
                onClick={() => fetchWeather(true)}
                disabled={refreshing}
                title="Refresh my location"
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 transition-all duration-200 disabled:opacity-40 flex items-center justify-center"
              >
                <RotateCcw className={`w-4 h-4 text-white/70 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
              <span className="text-5xl sm:text-6xl">{getWeatherEmoji(current.main)}</span>
            </div>
          </div>

          {/* 4-stat grid */}
          <div className="relative grid grid-cols-4 gap-2 mt-5">
            {[
              { label: 'Rain', value: `${forecast[0]?.pop ?? 0}%` },
              { label: 'Humidity', value: `${current.humidity}%` },
              { label: 'Wind', value: `${current.wind}km/h` },
              { label: 'Pressure', value: `${current.pressure}` },
            ].map(({ label, value }) => (
              <div key={label} className="bg-white/12 rounded-[14px] px-2 py-2.5 backdrop-blur-sm text-center">
                <p className="font-data text-[8px] font-medium uppercase tracking-[0.08em] text-white/55">{label}</p>
                <p className="font-data text-[13px] font-semibold text-white mt-1">{value}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* 7-Day Horizontal Scroll */}
        {forecast.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <h2 className="text-xs sm:text-sm font-bold uppercase tracking-widest text-on-surface-variant/50 mb-2 sm:mb-3 px-1">7-Day Forecast</h2>
            <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-2 -mx-1 px-1 no-scrollbar">
              {forecast.map((day, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedDay(i)}
                  className={`flex-shrink-0 rounded-2xl sm:rounded-[1.5rem] p-3 sm:p-4 flex flex-col items-center gap-1.5 sm:gap-2 min-w-[80px] sm:min-w-[90px] transition-all duration-300 ${selectedDay === i
                    ? 'bg-primary text-on-primary scale-105 shadow-lg'
                    : 'bg-surface-container-low text-on-surface hover:bg-surface-container-high'
                    }`}
                >
                  <span className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-wide ${selectedDay === i ? 'text-white/70' : 'text-on-surface-variant/60'}`}>{getDayLabel(day.date, i)}</span>
                  <span className="text-xl sm:text-2xl">{getWeatherEmoji(day.main)}</span>
                  <span className="font-data font-bold text-xs sm:text-sm">{day.tempMax}°</span>
                  <span className={`font-data text-[10px] sm:text-xs ${selectedDay === i ? 'text-white/60' : 'text-on-surface-variant/40'}`}>{day.tempMin}°</span>
                  {day.pop > 20 && (
                    <div className="flex items-center gap-1">
                      <Droplets className={`w-2.5 h-2.5 sm:w-3 sm:h-3 ${selectedDay === i ? 'text-blue-200' : 'text-blue-500'}`} />
                      <span className={`font-data text-[8px] sm:text-[9px] font-bold ${selectedDay === i ? 'text-blue-200' : 'text-blue-500'}`}>{day.pop}%</span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Selected Day Detail */}
        {selectedForecast && (
          <motion.div
            key={selectedDay}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="rounded-2xl sm:rounded-[2rem] p-4 sm:p-5 space-y-3 sm:space-y-4 bg-surface-container-low border border-outline-variant/10"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-on-surface font-bold text-base sm:text-lg">
                  {getDayLabel(selectedForecast.date, selectedDay)} — {selectedForecast.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </h3>
                <p className="text-on-surface-variant/60 capitalize text-xs sm:text-sm font-medium">{selectedForecast.description}</p>
              </div>
              <span className="text-3xl sm:text-4xl">{getWeatherEmoji(selectedForecast.main)}</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { icon: Thermometer, label: 'High', value: `${selectedForecast.tempMax}°C`, color: 'text-orange-600' },
                { icon: Thermometer, label: 'Low', value: `${selectedForecast.tempMin}°C`, color: 'text-blue-600' },
                { icon: Droplets, label: 'Humidity', value: `${selectedForecast.humidity}%`, color: 'text-sky-600' },
                { icon: Wind, label: 'Wind', value: `${selectedForecast.windSpeed}km/h`, color: 'text-emerald-600' },
              ].map(({ icon: Icon, label, value, color }) => (
                <div key={label} className="bg-surface-container-high/40 rounded-xl sm:rounded-2xl p-2.5 sm:p-3 flex flex-col gap-0.5 sm:gap-1">
                  <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${color}`} />
                  <p className="text-on-surface-variant/40 text-[8px] sm:text-[9px] uppercase tracking-wider font-bold">{label}</p>
                  <p className="font-data text-on-surface font-bold text-xs sm:text-sm">{value}</p>
                </div>
              ))}
            </div>

            {/* Rain Probability Bar */}
            <div>
              <div className="flex justify-between items-center mb-1 sm:mb-1.5">
                <span className="text-on-surface-variant/50 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider">Rain Probability</span>
                <span className="text-blue-600 font-bold text-xs sm:text-sm">{selectedForecast.pop}%</span>
              </div>
              <div className="h-2 w-full bg-surface-container-high rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${selectedForecast.pop}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className="h-full rounded-full bg-blue-500"
                />
              </div>
            </div>
          </motion.div>
        )}

        {/* Farming Advice for Selected Day */}
        {selectedForecast && (
          <motion.div
            key={`tips-${selectedDay}`}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.4 }}
          >
            <div className="flex items-center gap-2 mb-2 sm:mb-3">
              <Sprout className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
              <h2 className="text-xs sm:text-sm font-bold uppercase tracking-widest text-on-surface-variant/50">
                Farming Advice — {getDayLabel(selectedForecast.date, selectedDay)}
              </h2>
            </div>
            <div className="space-y-2 sm:space-y-3">
              {getFarmingAdvice(selectedForecast).map((advice, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.08 }}
                  className={`flex items-start gap-2.5 sm:gap-3 rounded-xl sm:rounded-2xl p-3.5 sm:p-4 border ${advice.level === 'good'
                    ? 'bg-emerald-50 border-emerald-100'
                    : advice.level === 'warn'
                      ? 'bg-orange-50 border-orange-100'
                      : 'bg-red-50 border-red-100'
                    }`}
                >
                  <advice.icon className={`w-4 h-4 sm:w-5 sm:h-5 mt-0.5 flex-shrink-0 ${advice.color}`} />
                  <p className="text-on-surface-variant text-xs sm:text-sm leading-relaxed font-medium">{advice.tip}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* All 7 Days Overview Table */}
        {forecast.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.5 }}
          >
            <h2 className="text-xs sm:text-sm font-bold uppercase tracking-widest text-on-surface-variant/50 mb-2 sm:mb-3 px-1">Week at a Glance</h2>
            {(() => {
              const weekMin = Math.min(...forecast.map(d => d.tempMin));
              const weekMax = Math.max(...forecast.map(d => d.tempMax));
              const weekRange = weekMax - weekMin || 1;
              return (
                <div className="rounded-2xl sm:rounded-[2rem] overflow-hidden divide-y border border-outline-variant/10 bg-surface-container-low">
                  {forecast.map((day, i) => {
                    const advice = getFarmingAdvice(day);
                    const overallLevel = advice.some(a => a.level === 'bad') ? 'bad' : advice.some(a => a.level === 'warn') ? 'warn' : 'good';
                    const barLeft = ((day.tempMin - weekMin) / weekRange) * 100;
                    const barWidth = ((day.tempMax - day.tempMin) / weekRange) * 100;
                    return (
                      <div
                        key={i}
                        onClick={() => setSelectedDay(i)}
                        className={`flex items-center px-4 sm:px-5 py-3 sm:py-3.5 gap-3 sm:gap-4 cursor-pointer hover:bg-surface-container-high transition-colors ${selectedDay === i ? 'bg-surface-container-high' : ''}`}
                      >
                        <span className="text-xl sm:text-2xl w-6 sm:w-8 text-center">{getWeatherEmoji(day.main)}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-on-surface font-semibold text-xs sm:text-sm">{getDayLabel(day.date, i)}</p>
                          <p className="text-on-surface-variant/50 text-[10px] sm:text-xs capitalize font-medium truncate">{day.description}</p>
                          {/* temp range bar */}
                          <div className="relative h-1 rounded-full bg-outline-variant/20 mt-1.5 overflow-visible">
                            <div
                              className="absolute h-full rounded-full temp-range-bar"
                              style={{ left: `${barLeft}%`, width: `${Math.max(barWidth, 6)}%` }}
                            />
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-data text-on-surface font-bold text-xs sm:text-sm">{day.tempMax}° / {day.tempMin}°</p>
                          <div className="flex items-center gap-1 justify-end mt-0.5">
                            <Droplets className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-blue-500" />
                            <span className="font-data text-[9px] sm:text-[10px] text-blue-500 font-bold">{day.pop}%</span>
                          </div>
                        </div>
                        <div className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full flex-shrink-0 ${overallLevel === 'good' ? 'bg-emerald-500' : overallLevel === 'warn' ? 'bg-orange-500' : 'bg-red-500'}`} />
                      </div>
                    );
                  })}
                </div>
              );
            })()}
            <p className="text-center text-on-surface-variant/30 text-[8px] sm:text-[10px] mt-3 uppercase tracking-widest font-bold">● Green: Good  ● Orange: Caution  ● Red: Avoid</p>
          </motion.div>
        )}
      </div>
    </Layout>
  );
}
