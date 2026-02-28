import { useEffect, useState } from "react";
import { Cloud, Droplets } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { type DailyWeather, fetchWeatherForDates, weatherIcon } from "@/lib/weather";

interface TripWeatherProps {
  lat: number;
  lng: number;
  startDate: string;
  endDate: string;
  destinationName: string;
}

export default function TripWeather({ lat, lng, startDate, endDate, destinationName }: TripWeatherProps) {
  const [days, setDays] = useState<DailyWeather[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!lat || !lng || !startDate || !endDate) return;
    setLoading(true);
    setError(null);
    fetchWeatherForDates(lat, lng, startDate, endDate)
      .then(setDays)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [lat, lng, startDate, endDate]);

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card/50 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Cloud className="h-4 w-4 text-primary" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (error || days.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-card/50 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Cloud className="h-4 w-4 text-primary" />
        <span className="text-xs font-semibold text-foreground">Weather in {destinationName}</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {days.slice(0, 6).map((d) => {
          const dt = new Date(d.date + "T00:00:00");
          const dayName = dt.toLocaleDateString("en-US", { weekday: "short" });
          const dayNum = dt.getDate();
          return (
            <div
              key={d.date}
              className="bg-accent/30 border rounded-lg p-2 text-center transition-colors hover:bg-accent/50"
            >
              <p className="text-[10px] text-muted-foreground">{dayName} {dayNum}</p>
              <p className="text-lg leading-none my-1">{weatherIcon(d.weatherCode)}</p>
              <p className="text-[11px] font-semibold">
                {Math.round(d.tempMax)}° / {Math.round(d.tempMin)}°
              </p>
              {d.precipitationProbability > 20 && (
                <div className="flex items-center justify-center gap-0.5 mt-0.5 text-[10px] text-blue-500">
                  <Droplets className="h-2.5 w-2.5" />
                  <span>{d.precipitationProbability}%</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
