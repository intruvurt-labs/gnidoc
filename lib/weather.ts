// hooks/useWeather.ts
import { useState, useEffect, useCallback } from 'react';
import { useIntegrations } from '@/contexts/IntegrationsContext';

export interface WeatherData {
  location: {
    name: string;
    country: string;
    lat: number;
    lon: number;
  };
  current: {
    temp: number;
    feelsLike: number;
    humidity: number;
    pressure: number;
    windSpeed: number;
    windDirection: number;
    description: string;
    icon: string;
    timestamp: Date;
  };
  forecast?: {
    date: Date;
    tempMin: number;
    tempMax: number;
    description: string;
    icon: string;
  }[];
}

export interface WeatherError {
  code: string;
  message: string;
}

interface UseWeatherOptions {
  lat?: number;
  lon?: number;
  city?: string;
  units?: 'metric' | 'imperial';
  autoFetch?: boolean;
}

export function useWeather(options: UseWeatherOptions = {}) {
  const {
    lat,
    lon,
    city,
    units = 'metric',
    autoFetch = true,
  } = options;

  const { getIntegrationConnection } = useIntegrations();

  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<WeatherError | null>(null);

  const fetchWeather = useCallback(async (
    customLat?: number,
    customLon?: number,
    customCity?: string
  ) => {
    const connection = getIntegrationConnection('openweathermap');
    if (!connection?.credentials?.apiKey) {
      const err: WeatherError = {
        code: 'NO_API_KEY',
        message: 'OpenWeatherMap API key not configured.',
      };
      setError(err);
      return null;
    }

    const apiKey = connection.credentials.apiKey;
    const targetLat = customLat ?? lat;
    const targetLon = customLon ?? lon;
    const targetCity = customCity ?? city;

    if (!targetLat && !targetLon && !targetCity) {
      const err: WeatherError = {
        code: 'MISSING_LOCATION',
        message: 'Provide lat/lon or city name.',
      };
      setError(err);
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      let url = `https://api.openweathermap.org/data/2.5/weather?`;
      if (targetLat !== undefined && targetLon !== undefined) {
        url += `lat=${targetLat}&lon=${targetLon}`;
      } else if (targetCity) {
        url += `q=${encodeURIComponent(targetCity)}`;
      }
      url += `&appid=${apiKey}&units=${units}`;

      console.log('[Weather] Fetching weather...');
      const response = await fetch(url);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      const data = await response.json();
      const weatherData: WeatherData = {
        location: {
          name: data.name,
          country: data.sys.country,
          lat: data.coord.lat,
          lon: data.coord.lon,
        },
        current: {
          temp: data.main.temp,
          feelsLike: data.main.feels_like,
          humidity: data.main.humidity,
          pressure: data.main.pressure,
          windSpeed: data.wind.speed,
          windDirection: data.wind.deg,
          description: data.weather[0].description,
          icon: data.weather[0].icon,
          timestamp: new Date(data.dt * 1000),
        },
      };

      setWeather(weatherData);
      console.log('[Weather] Fetched for:', weatherData.location.name);
      return weatherData;
    } catch (err) {
      const weatherError: WeatherError = {
        code: 'FETCH_FAILED',
        message: err instanceof Error ? err.message : 'Fetch failed',
      };
      setError(weatherError);
      console.error('[Weather] Fetch failed:', weatherError);
      return null;
    } finally {
      setLoading(false);
    }
  }, [lat, lon, city, units, getIntegrationConnection]);

  const fetchForecast = useCallback(async (
    customLat?: number,
    customLon?: number,
    customCity?: string
  ) => {
    const connection = getIntegrationConnection('openweathermap');
    if (!connection?.credentials?.apiKey) {
      const err: WeatherError = {
        code: 'NO_API_KEY',
        message: 'OpenWeatherMap API key not configured.',
      };
      setError(err);
      return null;
    }

    const apiKey = connection.credentials.apiKey;
    const targetLat = customLat ?? lat;
    const targetLon = customLon ?? lon;
    const targetCity = customCity ?? city;

    if (!targetLat && !targetLon && !targetCity) {
      const err: WeatherError = {
        code: 'MISSING_LOCATION',
        message: 'Provide lat/lon or city name.',
      };
      setError(err);
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      let url = `https://api.openweathermap.org/data/2.5/forecast?`;
      if (targetLat !== undefined && targetLon !== undefined) {
        url += `lat=${targetLat}&lon=${targetLon}`;
      } else if (targetCity) {
        url += `q=${encodeURIComponent(targetCity)}`;
      }
      url += `&appid=${apiKey}&units=${units}`;

      console.log('[Weather] Fetching forecast...');
      const response = await fetch(url);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      const data = await response.json();

      const dailyForecasts = (data.list as any[])
        .filter((_: any, index: number) => index % 8 === 0)
        .slice(0, 5)
        .map((item: any) => ({
          date: new Date(item.dt * 1000),
          tempMin: item.main.temp_min,
          tempMax: item.main.temp_max,
          description: item.weather[0].description,
          icon: item.weather[0].icon,
        }));

      const weatherData: WeatherData = {
        location: {
          name: data.city.name,
          country: data.city.country,
          lat: data.city.coord.lat,
          lon: data.city.coord.lon,
        },
        current: {
          temp: data.list[0].main.temp,
          feelsLike: data.list[0].main.feels_like,
          humidity: data.list[0].main.humidity,
          pressure: data.list[0].main.pressure,
          windSpeed: data.list[0].wind.speed,
          windDirection: data.list[0].wind.deg,
          description: data.list[0].weather[0].description,
          icon: data.list[0].weather[0].icon,
          timestamp: new Date(data.list[0].dt * 1000),
        },
        forecast: dailyForecasts,
      };

      setWeather(weatherData);
      console.log('[Weather] Forecast fetched successfully');
      return weatherData;
    } catch (err) {
      const weatherError: WeatherError = {
        code: 'FETCH_FAILED',
        message: err instanceof Error ? err.message : 'Failed to fetch forecast',
      };
      setError(weatherError);
      console.error('[Weather] Forecast fetch failed:', weatherError);
      return null;
    } finally {
      setLoading(false);
    }
  }, [lat, lon, city, units, getIntegrationConnection]);

  useEffect(() => {
    if (autoFetch && (lat !== undefined || lon !== undefined || city !== undefined)) {
      fetchWeather(lat, lon, city);
    }
  }, [autoFetch, lat, lon, city, fetchWeather]);

  return {
    weather,
    loading,
    error,
    fetchWeather,
    fetchForecast,
    refetch: fetchWeather,
  };
}

// Optional helper functions
export async function fetchWeatherByCoordinates(
  lat: number,
  lon: number,
  apiKey: string,
  units: 'metric' | 'imperial' = 'metric'
): Promise<WeatherData> {
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=${units}`;
  const response = await fetch(url);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `HTTP ${response.status}`);
  }
  const data = await response.json();
  return {
    location: {
      name: data.name,
      country: data.sys.country,
      lat: data.coord.lat,
      lon: data.coord.lon,
    },
    current: {
      temp: data.main.temp,
      feelsLike: data.main.feels_like,
      humidity: data.main.humidity,
      pressure: data.main.pressure,
      windSpeed: data.wind.speed,
      windDirection: data.wind.deg,
      description: data.weather[0].description,
      icon: data.weather[0].icon,
      timestamp: new Date(data.dt * 1000),
    },
  };
}

export async function fetchWeatherByCity(
  city: string,
  apiKey: string,
  units: 'metric' | 'imperial' = 'metric'
): Promise<WeatherData> {
  const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=${units}`;
  const response = await fetch(url);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `HTTP ${response.status}`);
  }
  const data = await response.json();
  return {
    location: {
      name: data.name,
      country: data.sys.country,
      lat: data.coord.lat,
      lon: data.coord.lon,
    },
    current: {
      temp: data.main.temp,
      feelsLike: data.main.feels_like,
      humidity: data.main.humidity,
      pressure: data.main.pressure,
      windSpeed: data.wind.speed,
      windDirection: data.wind.deg,
      description: data.weather[0].description,
      icon: data.weather[0].icon,
      timestamp: new Date(data.dt * 1000),
    },
  };
}

export function getWeatherIconUrl(iconCode: string, size: '2x' | '4x' = '2x'): string {
  return `https://openweathermap.org/img/wn/${iconCode}@${size}.png`;
}
