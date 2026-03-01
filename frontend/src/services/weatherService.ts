/**
 * Weather Service — WeatherAPI.com
 * Used by TripDashboard and WeatherDisplay components.
 *
 * Smart logic:
 *   trip start ≤ 10 days away  → real forecast
 *   trip start > 10 days away  → historical data (same dates, 1 year ago)
 */

const WEATHER_API_KEY = import.meta.env.VITE_WEATHER_API_KEY || "";
const WEATHER_BASE = "https://api.weatherapi.com/v1";

export interface WeatherDate {
    date: string;
    tempMin: number;
    tempMax: number;
    condition: string;
    icon: string;
    rainProbability?: number;
    alert?: string;
    isHistorical?: boolean;
}

export interface WeatherResponse {
    type: "forecast" | "historical";
    city: string;
    dates: WeatherDate[];
    error?: boolean;
    message?: string;
}

function formatDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

function getDaysDifference(startDate: Date): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tripStart = new Date(startDate);
    tripStart.setHours(0, 0, 0, 0);
    return Math.ceil((tripStart.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function conditionToEmoji(text: string): string {
    const t = text.toLowerCase();
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

async function fetchForecast(
    city: string,
    startDate: Date,
    endDate: Date
): Promise<WeatherDate[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const daysToEnd = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const days = Math.min(Math.max(daysToEnd, 1), 10);

    const url = `${WEATHER_BASE}/forecast.json?key=${WEATHER_API_KEY}&q=${encodeURIComponent(city)}&days=${days}&aqi=no&alerts=no`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`WeatherAPI forecast ${resp.status}`);
    const data = await resp.json();

    const results: WeatherDate[] = [];
    for (const fd of (data.forecast?.forecastday ?? [])) {
        const d = fd.date as string;
        const dDate = new Date(d + "T00:00:00");
        if (dDate >= startDate && dDate <= endDate) {
            const day = fd.day;
            const condText = day.condition?.text ?? "";
            results.push({
                date: d,
                tempMin: day.mintemp_c,
                tempMax: day.maxtemp_c,
                condition: condText,
                icon: conditionToEmoji(condText),
                rainProbability: day.daily_chance_of_rain ?? undefined,
                isHistorical: false,
            });
        }
    }
    return results;
}

async function fetchHistorical(
    city: string,
    startDate: Date,
    endDate: Date
): Promise<WeatherDate[]> {
    const results: WeatherDate[] = [];
    const cursor = new Date(startDate);
    const actualCursor = new Date(startDate);

    // Go back 1 year for historical seasonal data
    cursor.setFullYear(cursor.getFullYear() - 1);
    const histEnd = new Date(endDate);
    histEnd.setFullYear(histEnd.getFullYear() - 1);

    while (cursor <= histEnd) {
        const dt = formatDate(cursor);
        const url = `${WEATHER_BASE}/history.json?key=${WEATHER_API_KEY}&q=${encodeURIComponent(city)}&dt=${dt}&aqi=no`;
        try {
            const resp = await fetch(url);
            if (resp.ok) {
                const data = await resp.json();
                const fd = data.forecast?.forecastday?.[0];
                if (fd) {
                    const day = fd.day;
                    const condText = day.condition?.text ?? "";
                    results.push({
                        date: formatDate(actualCursor),
                        tempMin: day.mintemp_c,
                        tempMax: day.maxtemp_c,
                        condition: condText,
                        icon: conditionToEmoji(condText),
                        rainProbability: day.daily_chance_of_rain ?? undefined,
                        isHistorical: true,
                    });
                }
            }
        } catch {
            // skip day on fetch error
        }

        cursor.setDate(cursor.getDate() + 1);
        actualCursor.setDate(actualCursor.getDate() + 1);
    }

    return results;
}

/**
 * Main function: fetch weather for a trip.
 * Auto-determines forecast vs historical based on trip proximity.
 */
export async function getWeatherForTrip(
    city: string,
    startDate: Date | string,
    endDate: Date | string
): Promise<WeatherResponse> {
    if (!WEATHER_API_KEY) {
        return { type: "forecast", city, dates: [], error: true, message: "Weather API key not configured" };
    }

    const tripStart = typeof startDate === "string" ? new Date(startDate) : startDate;
    const tripEnd = typeof endDate === "string" ? new Date(endDate) : endDate;

    if (isNaN(tripStart.getTime()) || isNaN(tripEnd.getTime())) {
        return { type: "forecast", city, dates: [], error: true, message: "Invalid trip dates" };
    }

    const daysDiff = getDaysDifference(tripStart);
    const useHistorical = daysDiff > 10 || daysDiff < 0;

    try {
        const dates = useHistorical
            ? await fetchHistorical(city, tripStart, tripEnd)
            : await fetchForecast(city, tripStart, tripEnd);

        if (dates.length === 0) {
            return {
                type: useHistorical ? "historical" : "forecast",
                city,
                dates: [],
                error: true,
                message: "Weather data temporarily unavailable",
            };
        }

        return { type: useHistorical ? "historical" : "forecast", city, dates };
    } catch (error) {
        console.error("Error in getWeatherForTrip:", error);
        return { type: "forecast", city, dates: [], error: true, message: "Weather data unavailable" };
    }
}

export type { WeatherResponse as WeatherResponseType };

