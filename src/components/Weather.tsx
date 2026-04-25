import { useState, useEffect } from 'react';
import { CloudRain, Wind, Droplets } from 'lucide-react';
import { motion } from 'motion/react';

export default function Weather() {
  const [weatherData, setWeatherData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWeatherByUrl = async (url: string) => {
      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error('Failed to fetch weather data');
        }
        const data = await response.json();
        setWeatherData(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    const apiKey = import.meta.env.VITE_WEATHER_API_KEY;

    const fetchWeatherByIpFallback = async () => {
      try {
        const geoRes = await fetch('https://get.geojs.io/v1/ip/geo.json');
        if (!geoRes.ok) throw new Error('IP Geo failed');
        const geoData = await geoRes.json();
        
        fetchWeatherByUrl(`https://api.openweathermap.org/data/2.5/weather?lat=${geoData.latitude}&lon=${geoData.longitude}&units=metric&appid=${apiKey}`);
      } catch (err) {
        console.warn('Fallback IP geolocation failed, using default location.');
        fetchWeatherByUrl(`https://api.openweathermap.org/data/2.5/weather?q=Dhaka,BD&units=metric&appid=${apiKey}`);
      }
    };

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          fetchWeatherByUrl(`https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&units=metric&appid=${apiKey}`);
        },
        (error) => {
          console.warn('Geolocation failed or denied, trying IP fallback.', error);
          fetchWeatherByIpFallback();
        },
        { timeout: 10000 }
      );
    } else {
      fetchWeatherByIpFallback();
    }
  }, []);

  if (loading) {
    return (
       <div className="bg-surface-container-lowest rounded-[2rem] p-8 editorial-shadow min-h-[160px] flex items-center justify-center">
         <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
       </div>
    );
  }

  if (error || !weatherData) {
    return (
       <div className="bg-surface-container-lowest rounded-[2rem] p-8 editorial-shadow min-h-[160px] flex flex-col items-center justify-center text-red-500 gap-2">
         <CloudRain className="w-8 h-8" />
         <p className="font-medium text-sm">Could not load weather data.</p>
         <p className="text-xs opacity-70">{error}</p>
       </div>
    );
  }

  // Parse OpenWeatherMap data
  const temp = Math.round(weatherData.main.temp);
  const humidity = weatherData.main.humidity;
  const windSpeed = Math.round(weatherData.wind.speed * 3.6); // m/s to km/h
  const description = weatherData.weather[0]?.main || 'Clear';
  const cloudCover = weatherData.clouds?.all || 0;
  const city = weatherData.name;
  const country = weatherData.sys.country;

  return (
    <div className="bg-surface-container-lowest rounded-[2rem] p-8 editorial-shadow relative overflow-hidden group">
      <div className="absolute -right-8 -top-8 w-64 h-64 bg-tertiary/10 rounded-full blur-3xl group-hover:bg-tertiary/20 transition-colors" />
      <div className="relative z-10">
        <div className="flex justify-between items-start gap-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-tertiary">
              <CloudRain className="w-5 h-5" />
              <span className="font-bold tracking-wide uppercase text-[10px]">Real-time Weather</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-7xl font-headline font-bold text-on-surface">{temp}°</span>
              <span className="text-2xl font-headline font-medium text-on-surface-variant">C</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold text-on-surface">{city}, {country}</p>
            <p className="text-sm text-on-surface-variant">{description}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 mt-8">
          <div className="flex items-center gap-2">
            <Droplets className="w-5 h-5 text-primary" />
            <div>
              <p className="text-[10px] font-bold uppercase text-on-surface-variant/60">Humidity</p>
              <p className="text-base font-bold">{humidity}%</p>
            </div>
          </div>
          <div className="h-8 w-px bg-outline-variant/30" />
          <div className="flex items-center gap-2">
            <Wind className="w-5 h-5 text-primary" />
            <div>
              <p className="text-[10px] font-bold uppercase text-on-surface-variant/60">Wind</p>
              <p className="text-base font-bold">{windSpeed} km/h</p>
            </div>
          </div>
          <div className="h-8 w-px bg-outline-variant/30" />
          <div className="flex items-center gap-2">
            <CloudRain className="w-5 h-5 text-primary" />
            <div>
              <p className="text-[10px] font-bold uppercase text-on-surface-variant/60">Clouds</p>
              <p className="text-base font-bold">{cloudCover}%</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
