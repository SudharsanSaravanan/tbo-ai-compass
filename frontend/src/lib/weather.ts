/**
 * Weather service — WeatherAPI.com
 *
 * Smart routing:
 *   daysDiff ≥ 0 && ≤ 10  → real forecast  (forecast.json, up to 10 days)
 *   daysDiff > 10          → historical for same dates 1 year ago  (history.json)
 *   daysDiff < 0           → trip is in the past, historical from last year
 *
 * Fallback strategy:
 *   1. forecast fails → silently return []
 *   2. history day fails → skip that day, continue loop
 *   3. API key missing → return [] immediately, no network call
 *   4. Network error → return [] (caller decides what to show)
 */

const WEATHER_API_KEY = import.meta.env.VITE_WEATHER_API_KEY || "";
const WEATHER_BASE = "https://api.weatherapi.com/v1";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DailyWeather {
  date: string;               // YYYY-MM-DD  (actual trip date, not historical date)
  tempMax: number;            // °C
  tempMin: number;            // °C
  precipitationProbability: number; // 0-100
  weatherCode: number;        // WMO-like code for Lucide icon mapping
  conditionText: string;      // Human-readable e.g. "Partly cloudy"
  conditionIcon: string;      // Full https:// URL to WeatherAPI icon
  isHistorical?: boolean;     // true = seasonal avg from last year
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Zero-pad ISO date from a Date object */
function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Days from today (midnight) to trip start (midnight). Negative = trip is past. */
function daysBetweenTodayAndStart(startDateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(startDateStr + "T00:00:00");
  start.setHours(0, 0, 0, 0);
  return Math.ceil((start.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Map WeatherAPI condition code → WMO-like numeric code.
 * Used by the existing wmoIcon() renderer in VoicePlanView.
 */
export function conditionCodeToWmo(code: number): number {
  if (code === 1000) return 0;                                                      // Clear / Sunny
  if (code === 1003) return 1;                                                      // Partly cloudy
  if (code === 1006 || code === 1009) return 3;                                     // Cloudy / Overcast
  if ([1030, 1135, 1147].includes(code)) return 45;                                 // Fog / Mist / Haze
  if ([1063, 1150, 1153, 1168, 1171, 1180, 1183].includes(code)) return 51;        // Light drizzle/rain
  if ([1186, 1189, 1192, 1195, 1198, 1201, 1240, 1243, 1246].includes(code)) return 61; // Moderate/heavy rain
  if ([1066, 1114, 1117, 1204, 1207, 1210, 1213, 1216, 1219,
    1222, 1225, 1255, 1258].includes(code)) return 71;                           // Snow
  if ([1087, 1273, 1276, 1279, 1282].includes(code)) return 95;                    // Thunderstorm
  return 2; // fallback: partly cloudy
}

/** Emoji icon from condition text (used in non-Lucide contexts) */
export function weatherIcon(conditionText: string): string {
  const t = conditionText.toLowerCase();
  if (t.includes("thunder") || t.includes("storm")) return "⛈️";
  if (t.includes("snow") || t.includes("blizzard") || t.includes("sleet")) return "❄️";
  if (t.includes("heavy rain")) return "🌧️";
  if (t.includes("rain") || t.includes("drizzle") || t.includes("shower")) return "🌦️";
  if (t.includes("fog") || t.includes("mist") || t.includes("haze")) return "🌫️";
  if (t.includes("overcast") || t.includes("cloudy")) return "☁️";
  if (t.includes("partly cloudy") || t.includes("partly sunny")) return "⛅";
  if (t.includes("sunny") || t.includes("clear")) return "☀️";
  return "🌡️";
}

// ─── Core fetchers ────────────────────────────────────────────────────────────

/**
 * Fetch forecast for trips starting within 10 days.
 * WeatherAPI free plan supports up to 10 days ahead.
 */
async function fetchForecast(
  locQ: string,
  startDate: string,
  endDate: string
): Promise<DailyWeather[]> {
  const start = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // How many days from today until end of trip — capped at 10 (API limit)
  const daysNeeded = Math.min(
    Math.max(
      Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) + 1,
      1  // at least 1 day
    ),
    10
  );

  const url =
    `${WEATHER_BASE}/forecast.json` +
    `?key=${WEATHER_API_KEY}` +
    `&q=${encodeURIComponent(locQ)}` +
    `&days=${daysNeeded}` +
    `&aqi=no&alerts=no`;

  const resp = await fetch(url);
  if (!resp.ok) {
    // Log the API error body to help diagnose key / quota issues
    const body = await resp.text().catch(() => "");
    console.warn(`WeatherAPI forecast ${resp.status}:`, body);
    throw new Error(`WeatherAPI forecast failed (${resp.status})`);
  }

  const data = await resp.json();
  const results: DailyWeather[] = [];

  for (const fd of (data.forecast?.forecastday ?? [])) {
    const dDate = new Date((fd.date as string) + "T00:00:00");
    // Only include days that fall within the trip window
    if (dDate >= start && dDate <= end) {
      const day = fd.day;
      results.push({
        date: fd.date as string,
        tempMax: day.maxtemp_c ?? 0,
        tempMin: day.mintemp_c ?? 0,
        precipitationProbability: day.daily_chance_of_rain ?? 0,
        weatherCode: conditionCodeToWmo(day.condition?.code ?? 1000),
        conditionText: day.condition?.text ?? "",
        conditionIcon: day.condition?.icon ? `https:${day.condition.icon}` : "",
        isHistorical: false,
      });
    }
  }

  return results;
}

/**
 * Fetch historical data for the same date-range 1 year ago.
 * Gives accurate seasonal context for far-future or past trips.
 *
 * WeatherAPI history API handles one day per request, so we loop.
 * Failed individual days are silently skipped (partial results returned).
 */
async function fetchHistorical(
  locQ: string,
  startDate: string,
  endDate: string
): Promise<DailyWeather[]> {
  const start = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T00:00:00");

  // Historical dates = same calendar dates, 1 year back
  const histStart = new Date(start);
  histStart.setFullYear(histStart.getFullYear() - 1);
  const histEnd = new Date(end);
  histEnd.setFullYear(histEnd.getFullYear() - 1);

  const results: DailyWeather[] = [];
  const cursor = new Date(histStart);       // date we send to API (last year)
  const labelCursor = new Date(start);      // date we label on the UI (this year)

  while (cursor <= histEnd) {
    const dt = formatDate(cursor);
    const url =
      `${WEATHER_BASE}/history.json` +
      `?key=${WEATHER_API_KEY}` +
      `&q=${encodeURIComponent(locQ)}` +
      `&dt=${dt}` +
      `&aqi=no`;

    try {
      const resp = await fetch(url);
      if (resp.ok) {
        const data = await resp.json();
        const fd = data.forecast?.forecastday?.[0];
        if (fd?.day) {
          const day = fd.day;
          results.push({
            date: formatDate(labelCursor),  // label as actual trip date
            tempMax: day.maxtemp_c ?? 0,
            tempMin: day.mintemp_c ?? 0,
            precipitationProbability: day.daily_chance_of_rain ?? 0,
            weatherCode: conditionCodeToWmo(day.condition?.code ?? 1000),
            conditionText: day.condition?.text ?? "",
            conditionIcon: day.condition?.icon ? `https:${day.condition.icon}` : "",
            isHistorical: true,
          });
        }
      } else {
        const body = await resp.text().catch(() => "");
        console.warn(`WeatherAPI history ${resp.status} for ${dt}:`, body);
        // Don't throw — skip this day and continue
      }
    } catch (e) {
      console.warn(`WeatherAPI history network error for ${dt}:`, e);
      // Skip day, don't abort the loop
    }

    cursor.setDate(cursor.getDate() + 1);
    labelCursor.setDate(labelCursor.getDate() + 1);
  }

  return results;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Fetch weather for trip dates using lat/lng coordinates.
 * Used by VoicePlanView (gets coords from the agent location payload).
 *
 * Returns [] on any failure — callers should handle empty array gracefully.
 */
export async function fetchWeatherForDates(
  lat: number,
  lng: number,
  startDate: string,
  endDate: string
): Promise<DailyWeather[]> {
  if (!WEATHER_API_KEY) {
    console.warn("WeatherAPI: VITE_WEATHER_API_KEY not set — skipping weather fetch");
    return [];
  }

  const locQ = `${lat},${lng}`;
  const daysDiff = daysBetweenTodayAndStart(startDate);

  try {
    // ≤ 10 days away (including today, daysDiff=0) → real forecast
    if (daysDiff >= 0 && daysDiff <= 10) {
      return await fetchForecast(locQ, startDate, endDate);
    }
    // > 10 days OR past trips → historical seasonal data
    return await fetchHistorical(locQ, startDate, endDate);
  } catch (err) {
    console.warn("WeatherAPI fetchWeatherForDates failed:", err);
    return [];
  }
}

/**
 * Fetch weather by city name string (used by CompletedItinerary / standalone).
 * Returns { days, isHistorical } — isHistorical drives the badge label.
 */
export async function fetchWeatherForCity(
  city: string,
  startDate: string,
  endDate: string
): Promise<{ days: DailyWeather[]; isHistorical: boolean }> {
  if (!WEATHER_API_KEY) {
    console.warn("WeatherAPI: VITE_WEATHER_API_KEY not set — skipping weather fetch");
    return { days: [], isHistorical: false };
  }

  const daysDiff = daysBetweenTodayAndStart(startDate);
  const useHistorical = daysDiff > 10 || daysDiff < 0;

  try {
    const days = useHistorical
      ? await fetchHistorical(city, startDate, endDate)
      : await fetchForecast(city, startDate, endDate);
    return { days, isHistorical: useHistorical };
  } catch (err) {
    console.warn("WeatherAPI fetchWeatherForCity failed:", err);
    return { days: [], isHistorical: useHistorical };
  }
}
