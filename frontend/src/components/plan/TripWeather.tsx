import { useEffect, useState } from "react";
import { Cloud, Droplets, Wind } from "lucide-react";
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
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Cloud className="h-4 w-4 text-primary" />
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error || days.length === 0) return null;

  return (
    <div className="mt-10 rounded-2xl border border-border/40 bg-white/70 backdrop-blur-md p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Cloud className="h-5 w-5 text-primary" />
          <span className="text-lg font-semibold text-foreground">
            Weather in {destinationName}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {days.slice(0, 6).map((d) => {
          const dt = new Date(d.date + "T00:00:00");
          const dayName = dt.toLocaleDateString("en-US", { weekday: "short" });
          const dayNum = dt.getDate();
          const mon = dt.toLocaleDateString("en-US", { month: "short" });

          return (
            <div
              key={d.date}
              className="group rounded-xl bg-gradient-to-br from-white to-slate-50 border border-border/30 p-4 text-center hover:shadow-md transition-all"
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {dayName}
              </p>
              <p className="text-xs text-muted-foreground/70 mb-2">
                {mon} {dayNum}
              </p>

              <div className="text-3xl mb-2">
                {weatherIcon(d.weatherCode)}
              </div>

              <div className="text-xl font-bold text-foreground tabular-nums">
                {Math.round(d.tempMax)}°
              </div>

              <div className="text-sm text-muted-foreground tabular-nums">
                {Math.round(d.tempMin)}°
              </div>

              {d.precipitationProbability > 20 && (
                <div className="mt-2 flex items-center justify-center gap-1 text-xs text-blue-500 font-medium">
                  <Droplets className="h-3 w-3" />
                  {d.precipitationProbability}%
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

