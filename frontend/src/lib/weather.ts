export interface DailyWeather {
  date: string;
  tempMax: number;
  tempMin: number;
  precipitationProbability: number;
  weatherCode: number;
}

const WMO_ICONS: Record<number, string> = {
  0: "☀️", 1: "🌤️", 2: "⛅", 3: "☁️",
  45: "🌫️", 48: "🌫️",
  51: "🌦️", 53: "🌦️", 55: "🌧️",
  61: "🌧️", 63: "🌧️", 65: "🌧️",
  71: "🌨️", 73: "🌨️", 75: "🌨️",
  80: "🌦️", 81: "🌧️", 82: "⛈️",
  95: "⛈️", 96: "⛈️", 99: "⛈️",
};

export function weatherIcon(code: number): string {
  return WMO_ICONS[code] ?? "🌡️";
}

export async function fetchWeatherForDates(
  lat: number,
  lng: number,
  startDate: string,
  endDate: string
): Promise<DailyWeather[]> {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("longitude", String(lng));
  url.searchParams.set("daily", "temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code");
  url.searchParams.set("timezone", "Asia/Kolkata");
  url.searchParams.set("start_date", startDate);
  url.searchParams.set("end_date", endDate);

  const resp = await fetch(url.toString());
  if (!resp.ok) throw new Error(`Weather API ${resp.status}`);

  const data = await resp.json();
  const daily = data.daily;
  if (!daily?.time) return [];

  return (daily.time as string[]).map((d: string, i: number) => ({
    date: d,
    tempMax: daily.temperature_2m_max[i],
    tempMin: daily.temperature_2m_min[i],
    precipitationProbability: daily.precipitation_probability_max?.[i] ?? 0,
    weatherCode: daily.weather_code?.[i] ?? 0,
  }));
}
