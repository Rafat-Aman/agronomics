import { useState, useEffect, useCallback } from 'react';
import { CloudRain, Wind, Droplets, ChevronRight, Eye, RotateCcw } from 'lucide-react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';

export default function Weather() {
  const [weatherData, setWeatherData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const navigate = useNavigate();

  const fetchWeather = useCallback((showRefreshSpinner = false) => {
    if (showRefreshSpinner) setRefreshing(true);
    else setLoading(true);
    setError(null);

    const apiKey = import.meta.env.VITE_WEATHER_API_KEY;

    const fetchByUrl = async (url: string) => {
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch weather data');
        const data = await response.json();
        setWeatherData(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    };

    const fetchByIpFallback = async () => {
      try {
        const geoRes = await fetch('https://get.geojs.io/v1/ip/geo.json');
        if (!geoRes.ok) throw new Error('IP Geo failed');
        const geoData = await geoRes.json();
        fetchByUrl(`https://api.openweathermap.org/data/2.5/weather?lat=${geoData.latitude}&lon=${geoData.longitude}&units=metric&appid=${apiKey}`);
      } catch {
        fetchByUrl(`https://api.openweathermap.org/data/2.5/weather?q=Dhaka,BD&units=metric&appid=${apiKey}`);
      }
    };

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        ({ coords }) =>
          fetchByUrl(`https://api.openweathermap.org/data/2.5/weather?lat=${coords.latitude}&lon=${coords.longitude}&units=metric&appid=${apiKey}`),
        () => fetchByIpFallback(),
        { timeout: 10000, enableHighAccuracy: true }
      );
    } else {
      fetchByIpFallback();
    }
  }, []);

  useEffect(() => {
    fetchWeather();
  }, [fetchWeather]);

  if (loading) {
    return (
      <div className="rounded-[2rem] min-h-[180px] flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #1a4a2e 0%, #2d7a4e 50%, #1e6b45 100%)' }}>
        <div className="w-8 h-8 border-4 border-white/60 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !weatherData) {
    return (
      <div className="rounded-[2rem] min-h-[180px] flex flex-col items-center justify-center gap-2 p-8" style={{ background: 'linear-gradient(135deg, #1a4a2e 0%, #2d7a4e 50%, #1e6b45 100%)' }}>
        <CloudRain className="w-8 h-8 text-white/60" />
        <p className="font-medium text-sm text-white/80">Could not load weather data.</p>
        <p className="text-xs text-white/50">{error}</p>
      </div>
    );
  }

  const temp = Math.round(weatherData.main.temp);
  const feelsLike = Math.round(weatherData.main.feels_like);
  const humidity = weatherData.main.humidity;
  const windSpeed = Math.round(weatherData.wind.speed * 3.6);
  const description = weatherData.weather[0]?.description || 'Clear';
  const mainCondition = weatherData.weather[0]?.main || 'Clear';
  const cloudCover = weatherData.clouds?.all || 0;
  const city = weatherData.name;
  const country = weatherData.sys?.country || '';
  const visibility = weatherData.visibility ? Math.round(weatherData.visibility / 1000) : null;

  const getWeatherEmoji = (condition: string) => {
    const c = condition.toLowerCase();
    if (c.includes('thunder')) return '⛈️';
    if (c.includes('rain') || c.includes('drizzle')) return '🌧️';
    if (c.includes('snow')) return '❄️';
    if (c.includes('cloud')) return '⛅';
    if (c.includes('mist') || c.includes('fog') || c.includes('haze')) return '🌫️';
    return '☀️';
  };

  const getFarmingTip = (condition: string, humidity: number, temp: number) => {
    const c = condition.toLowerCase();
    if (c.includes('rain') || c.includes('thunder')) return '🌱 Hold off on pesticide spraying today.';
    if (humidity > 80) return '⚠️ High humidity — watch for fungal diseases.';
    if (temp > 35) return '💧 Irrigate crops in early morning or late evening.';
    if (temp < 15) return '🧊 Protect sensitive crops from cold stress.';
    if (c.includes('clear') && humidity < 50) return '✅ Great day for field operations!';
    return '🌿 Moderate conditions — good for farm work.';
  };

  const gradientBg = () => {
    const c = mainCondition.toLowerCase();
    if (c.includes('rain') || c.includes('drizzle') || c.includes('thunder'))
      return 'linear-gradient(135deg, #1a2a4a 0%, #2d4a7a 60%, #1e3b6b 100%)';
    if (c.includes('cloud'))
      return 'linear-gradient(135deg, #2a3a2e 0%, #4a6a52 60%, #3a5a42 100%)';
    return 'linear-gradient(135deg, #1a4a2e 0%, #2d7a4e 60%, #1e6b45 100%)';
  };

  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      onClick={() => navigate('/weather')}
      className="rounded-[2rem] p-6 cursor-pointer relative overflow-hidden shadow-xl"
      style={{ background: gradientBg() }}
    >
      {/* Ambient blobs */}
      <div className="absolute -right-12 -top-12 w-52 h-52 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, #7fff7f, transparent)' }} />
      <div className="absolute -left-8 -bottom-8 w-40 h-40 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #ffffff, transparent)' }} />

      <div className="relative z-10">
        {/* Top Row */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="font-data text-[10px] font-medium uppercase tracking-[0.08em] text-white/70">
                {city}, {country} · Live
              </span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-data font-semibold text-[60px] leading-none tracking-[-0.03em] text-white">{temp}</span>
              <span className="font-data text-2xl text-white/70 font-medium">°C</span>
            </div>
            <p className="text-white/70 text-sm capitalize mt-1 font-medium">{description}</p>
            <p className="font-data text-[11px] text-white/50 mt-0.5">Feels like {feelsLike}°</p>
          </div>
          <div className="flex flex-col items-end gap-3">
            <button
              id="weather-refresh-btn"
              onClick={(e) => { e.stopPropagation(); fetchWeather(true); }}
              disabled={refreshing}
              title="Refresh my location"
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 transition-all duration-200 disabled:opacity-50 flex items-center justify-center"
            >
              <RotateCcw className={`w-3.5 h-3.5 text-white/70 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <span className="text-5xl opacity-90">{getWeatherEmoji(mainCondition)}</span>
          </div>
        </div>

        {/* Stats Row — backdrop tiles */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          {[
            { label: 'Humidity', value: `${humidity}%` },
            { label: 'Wind', value: `${windSpeed}km/h` },
            { label: 'Visibility', value: visibility != null ? `${visibility}km` : `${cloudCover}%` },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white/12 rounded-[14px] px-3 py-2.5 backdrop-blur-sm">
              <p className="font-data text-[9px] font-medium uppercase tracking-[0.08em] text-white/55">{label}</p>
              <p className="font-data text-[15px] font-semibold text-white mt-1">{value}</p>
            </div>
          ))}
        </div>

        {/* Farming Tip Banner */}
        <div className="bg-white/10 rounded-2xl px-4 py-2.5 backdrop-blur-sm border border-white/10">
          <p className="text-[11px] font-semibold text-white/80">{getFarmingTip(mainCondition, humidity, temp)}</p>
        </div>
      </div>
    </motion.div>
  );
}
