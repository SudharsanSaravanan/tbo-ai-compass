// Weather Service for Trip Weaver
// Handles smart weather logic: forecast (≤16 days) vs historical (>16 days)

interface WeatherDate {
    date: string;
    tempMin: number;
    tempMax: number;
    condition: string;
    icon: string;
    rainProbability?: number;
    alert?: string;
}

interface WeatherResponse {
    type: "forecast" | "historical";
    city: string;
    dates: WeatherDate[];
    error?: boolean;
    message?: string;
}

interface GeoLocation {
    lat: number;
    lon: number;
    name: string;
}

const OPENWEATHER_API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY || "";
const OPENWEATHER_BASE_URL = "https://api.openweathermap.org/data/2.5";
const OPENWEATHER_GEO_URL = "https://api.openweathermap.org/geo/1.0";

/**
 * Get coordinates for a city name
 */
async function getCityCoordinates(city: string): Promise<GeoLocation | null> {
    try {
        const response = await fetch(
            `${OPENWEATHER_GEO_URL}/direct?q=${encodeURIComponent(city)}&limit=1&appid=${OPENWEATHER_API_KEY}`
        );

        if (!response.ok) {
            console.error("Failed to get city coordinates:", response.statusText);
            return null;
        }

        const data = await response.json();
        if (data && data.length > 0) {
            return {
                lat: data[0].lat,
                lon: data[0].lon,
                name: data[0].name,
            };
        }

        return null;
    } catch (error) {
        console.error("Error fetching city coordinates:", error);
        return null;
    }
}

/**
 * Fetch 16-day forecast from OpenWeather
 */
async function getForecastWeather(
    lat: number,
    lon: number,
    startDate: Date,
    endDate: Date
): Promise<WeatherDate[]> {
    try {
        // OpenWeather 16-day daily forecast endpoint
        const response = await fetch(
            `${OPENWEATHER_BASE_URL}/data/2.5/forecast?lat=${lat}&lon=${lon}&cnt=16&units=metric&appid=${OPENWEATHER_API_KEY}`
        );

        if (!response.ok) {
            console.error("Failed to fetch forecast weather:", response.statusText);
            return [];
        }

        const data = await response.json();
        const weatherDates: WeatherDate[] = [];

        // Filter forecast to match trip dates
        const startTime = startDate.getTime();
        const endTime = endDate.getTime();

        if (data.list && Array.isArray(data.list)) {
            for (const day of data.list) {
                const forecastDate = new Date(day.dt * 1000);
                const forecastTime = forecastDate.getTime();

                // Only include days within the trip date range
                if (forecastTime >= startTime && forecastTime <= endTime) {
                    weatherDates.push({
                        date: forecastDate.toISOString().split("T")[0],
                        tempMin: Math.round(day.temp.min),
                        tempMax: Math.round(day.temp.max),
                        condition: day.weather[0]?.main || "Unknown",
                        icon: getWeatherIcon(day.weather[0]?.main || "Unknown"),
                        rainProbability: day.pop ? Math.round(day.pop * 100) : undefined,
                        alert: getWeatherAlert(day.weather[0]?.main),
                    });
                }
            }
        }

        return weatherDates;
    } catch (error) {
        console.error("Error fetching forecast weather:", error);
        return [];
    }
}

/**
 * Fetch historical/climate average weather
 * Note: OpenWeather's historical API requires a paid plan.
 * For this implementation, we'll use current weather as a proxy for historical average.
 * In production, you should use the actual historical API or climate data service.
 */
async function getHistoricalWeather(
    lat: number,
    lon: number,
    startDate: Date,
    endDate: Date
): Promise<WeatherDate[]> {
    try {
        // Using current weather as a proxy for historical average
        // In production, use: api.openweathermap.org/data/3.0/onecall/timemachine
        const response = await fetch(
            `${OPENWEATHER_BASE_URL}/weather?lat=${lat}&lon=${lon}&units=metric&appid=${OPENWEATHER_API_KEY}`
        );

        if (!response.ok) {
            console.error("Failed to fetch historical weather:", response.statusText);
            return [];
        }

        const data = await response.json();
        const weatherDates: WeatherDate[] = [];

        // Generate weather for each day in the trip range based on current conditions
        // This is a simplified approach - ideally use actual historical API
        const currentDate = new Date(startDate);
        while (currentDate <= endDate) {
            weatherDates.push({
                date: currentDate.toISOString().split("T")[0],
                tempMin: Math.round(data.main.temp_min),
                tempMax: Math.round(data.main.temp_max),
                condition: data.weather[0]?.main || "Unknown",
                icon: getWeatherIcon(data.weather[0]?.main || "Unknown"),
                rainProbability: data.clouds?.all || undefined,
            });
            currentDate.setDate(currentDate.getDate() + 1);
        }

        return weatherDates;
    } catch (error) {
        console.error("Error fetching historical weather:", error);
        return [];
    }
}

/**
 * Map weather condition to emoji icon
 */
function getWeatherIcon(condition: string): string {
    const iconMap: Record<string, string> = {
        Clear: "☀️",
        Clouds: "☁️",
        Rain: "🌧️",
        Drizzle: "🌦️",
        Thunderstorm: "⛈️",
        Snow: "❄️",
        Mist: "🌫️",
        Fog: "🌫️",
        Haze: "🌫️",
    };

    return iconMap[condition] || "⛅";
}

/**
 * Determine if weather condition warrants an alert
 */
function getWeatherAlert(condition: string): string | undefined {
    const alertMap: Record<string, string> = {
        Thunderstorm: "⚠️ Severe weather expected",
        Snow: "⚠️ Snow conditions",
        Extreme: "⚠️ Extreme weather alert",
    };

    return alertMap[condition];
}

/**
 * Calculate days difference between today and trip start date
 */
function getDaysDifference(startDate: Date): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tripStart = new Date(startDate);
    tripStart.setHours(0, 0, 0, 0);

    const diffTime = tripStart.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
}

/**
 * Main function: Get weather for a trip
 * Automatically determines whether to use forecast or historical data
 */
export async function getWeatherForTrip(
    city: string,
    startDate: Date | string,
    endDate: Date | string
): Promise<WeatherResponse> {
    // Validate API key
    if (!OPENWEATHER_API_KEY) {
        return {
            type: "forecast",
            city,
            dates: [],
            error: true,
            message: "Weather API key not configured",
        };
    }

    // Convert dates to Date objects if needed
    const tripStartDate = typeof startDate === "string" ? new Date(startDate) : startDate;
    const tripEndDate = typeof endDate === "string" ? new Date(endDate) : endDate;

    // Validate dates
    if (isNaN(tripStartDate.getTime()) || isNaN(tripEndDate.getTime())) {
        return {
            type: "forecast",
            city,
            dates: [],
            error: true,
            message: "Invalid trip dates",
        };
    }

    try {
        // Step 1: Get city coordinates
        const location = await getCityCoordinates(city);
        if (!location) {
            return {
                type: "forecast",
                city,
                dates: [],
                error: true,
                message: "City not found",
            };
        }

        // Step 2: Determine days difference
        const daysDiff = getDaysDifference(tripStartDate);

        // Step 3: Fetch appropriate weather data
        let weatherDates: WeatherDate[];
        let weatherType: "forecast" | "historical";

        if (daysDiff <= 16 && daysDiff >= 0) {
            // Use forecast API
            weatherType = "forecast";
            weatherDates = await getForecastWeather(
                location.lat,
                location.lon,
                tripStartDate,
                tripEndDate
            );
        } else {
            // Use historical/climate data
            weatherType = "historical";
            weatherDates = await getHistoricalWeather(
                location.lat,
                location.lon,
                tripStartDate,
                tripEndDate
            );
        }

        // Handle empty results
        if (weatherDates.length === 0) {
            return {
                type: weatherType,
                city: location.name,
                dates: [],
                error: true,
                message: "Weather data temporarily unavailable",
            };
        }

        return {
            type: weatherType,
            city: location.name,
            dates: weatherDates,
        };
    } catch (error) {
        console.error("Error in getWeatherForTrip:", error);
        return {
            type: "forecast",
            city,
            dates: [],
            error: true,
            message: "Weather data unavailable",
        };
    }
}

// Export for testing and type usage
export type { WeatherResponse, WeatherDate };
