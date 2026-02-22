import { Cloud, Droplets, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { WeatherResponse } from "@/services/weatherService";

interface WeatherDisplayProps {
    weather: WeatherResponse | null;
    loading?: boolean;
}

export default function WeatherDisplay({ weather, loading }: WeatherDisplayProps) {
    if (loading) {
        return (
            <div className="bg-card border rounded-xl p-4 animate-pulse">
                <div className="h-4 bg-muted rounded w-24 mb-3"></div>
                <div className="grid grid-cols-3 md:grid-cols-7 gap-2">
                    {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                        <div key={i} className="bg-muted rounded-lg h-20"></div>
                    ))}
                </div>
            </div>
        );
    }

    if (!weather) {
        return null;
    }

    if (weather.error) {
        return (
            <div className="bg-card border border-destructive/20 rounded-xl p-4">
                <div className="flex items-center gap-2 text-destructive text-sm">
                    <Cloud className="h-4 w-4" />
                    <span>{weather.message || "Weather data temporarily unavailable"}</span>
                </div>
            </div>
        );
    }

    if (weather.dates.length === 0) {
        return null;
    }

    return (
        <div className="bg-card border rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Cloud className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold text-sm">
                        Weather for {weather.city}
                    </h3>
                </div>
                {weather.type === "historical" && (
                    <Badge variant="secondary" className="text-xs">
                        Based on Historical Trends
                    </Badge>
                )}
            </div>

            <div className="grid grid-cols-3 md:grid-cols-7 gap-2">
                {weather.dates.slice(0, 7).map((day, index) => {
                    const date = new Date(day.date);
                    const dayName = date.toLocaleDateString("en-US", { weekday: "short" });

                    return (
                        <div
                            key={index}
                            className="bg-accent/30 border rounded-xl p-3 text-center hover:bg-accent/50 transition-colors"
                        >
                            <p className="text-xs text-muted-foreground mb-1">{dayName}</p>
                            <p className="text-2xl mb-1">{day.icon}</p>
                            <p className="text-xs font-semibold mb-0.5">
                                {day.tempMax}° / {day.tempMin}°
                            </p>
                            <p className="text-xs text-muted-foreground capitalize truncate">
                                {day.condition}
                            </p>

                            {day.rainProbability !== undefined && day.rainProbability > 30 && (
                                <div className="flex items-center justify-center gap-1 mt-1 text-xs text-blue-600">
                                    <Droplets className="h-3 w-3" />
                                    <span>{day.rainProbability}%</span>
                                </div>
                            )}

                            {day.alert && (
                                <div className="mt-1 text-xs text-warning flex items-center justify-center gap-1">
                                    <AlertTriangle className="h-3 w-3" />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {weather.dates.length > 7 && (
                <p className="text-xs text-muted-foreground text-center mt-3">
                    Showing first 7 days of {weather.dates.length}-day forecast
                </p>
            )}
        </div>
    );
}
