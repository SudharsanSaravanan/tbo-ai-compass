import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  MapPin, Utensils, Camera, Bus, Clock, Youtube, Cloud,
  ChevronDown, ChevronUp, Compass, CheckSquare,
  Sun, CloudSun, CloudRain, CloudSnow, Wind, Cloudy
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import MapCard from "@/components/MapCard";
import TripChecklist from "@/components/TripChecklist";
import tboLogo from "@/assets/tbo-logo.png";

const FULL_ITINERARY = [
  {
    day: 1,
    title: "Arrival & First Impressions",
    items: [
      { time: "10:00 AM", title: "Arrive & hotel check-in", type: "transport" as const, note: "Airport transfer included" },
      { time: "12:30 PM", title: "Local welcome lunch", type: "food" as const, note: "Traditional cuisine" },
      { time: "3:00 PM", title: "Walking tour of old town", type: "place" as const, note: "Guided heritage walk" },
      { time: "7:00 PM", title: "Sunset viewpoint visit", type: "experience" as const, note: "Best sunset spot in the city" },
    ],
  },
  {
    day: 2,
    title: "Culture & Exploration",
    items: [
      { time: "8:30 AM", title: "Breakfast at local café", type: "food" as const },
      { time: "10:00 AM", title: "Museum & heritage site", type: "place" as const, note: "UNESCO World Heritage" },
      { time: "1:00 PM", title: "Street food tour", type: "food" as const, note: "Must-try local dishes" },
      { time: "4:00 PM", title: "Market & shopping district", type: "experience" as const },
      { time: "7:30 PM", title: "Cultural performance", type: "experience" as const, note: "Traditional dance show" },
    ],
  },
  {
    day: 3,
    title: "Adventure Day",
    items: [
      { time: "7:00 AM", title: "Sunrise trek / nature hike", type: "experience" as const, note: "Moderate difficulty, 3hr" },
      { time: "12:00 PM", title: "Scenic lunch spot", type: "food" as const },
      { time: "2:30 PM", title: "Water activity / adventure sport", type: "experience" as const },
      { time: "6:00 PM", title: "Farewell dinner", type: "food" as const, note: "Fine dining experience" },
    ],
  },
];

const YOUTUBE_VIDEOS = [
  { id: "1", title: "Top 10 Things to Do — Travel Guide", thumbnail: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=320&h=180&fit=crop", channel: "Travel Insider", views: "1.2M" },
  { id: "2", title: "Street Food You MUST Try", thumbnail: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=320&h=180&fit=crop", channel: "Food Ranger", views: "890K" },
  { id: "3", title: "Hidden Gems & Secret Spots", thumbnail: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=320&h=180&fit=crop", channel: "Lost LeBlanc", views: "2.1M" },
  { id: "4", title: "Budget Travel — Complete Guide", thumbnail: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=320&h=180&fit=crop", channel: "Kara & Nate", views: "567K" },
];

type WeatherCondition = "sunny" | "partly-cloudy" | "cloudy" | "rainy" | "snowy" | "windy";

const WEATHER_ICON: Record<WeatherCondition, JSX.Element> = {
  "sunny": <Sun className="h-5 w-5 text-yellow-500" />,
  "partly-cloudy": <CloudSun className="h-5 w-5 text-yellow-400" />,
  "cloudy": <Cloudy className="h-5 w-5 text-slate-400" />,
  "rainy": <CloudRain className="h-5 w-5 text-blue-400" />,
  "snowy": <CloudSnow className="h-5 w-5 text-sky-300" />,
  "windy": <Wind className="h-5 w-5 text-teal-400" />,
};

const WEATHER_MOCK: { condition: WeatherCondition; high: number; low: number }[] = [
  { condition: "sunny", high: 32, low: 24 },
  { condition: "partly-cloudy", high: 30, low: 23 },
  { condition: "partly-cloudy", high: 31, low: 24 },
  { condition: "rainy", high: 28, low: 22 },
  { condition: "sunny", high: 33, low: 25 },
  { condition: "cloudy", high: 29, low: 23 },
  { condition: "sunny", high: 31, low: 24 },
];

function getWeatherDates() {
  const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return WEATHER_MOCK.map((w, i) => {
    const d = new Date();
    d.setDate(d.getDate() + 1 + i);
    return {
      ...w,
      dayName: DAY_NAMES[d.getDay()],
      dateLabel: `${d.getDate()} ${d.toLocaleString("default", { month: "short" })}`,
    };
  });
}

// Returns "Mon, 23 Feb" for a given itinerary day index (0-based, starting from tomorrow)
function getDayDate(dayIdx: number) {
  const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const d = new Date();
  d.setDate(d.getDate() + 1 + dayIdx);
  return `${DAY_NAMES[d.getDay()]}, ${d.getDate()} ${d.toLocaleString("default", { month: "short" })}`;
}

const typeIcon = {
  place: <MapPin className="h-3.5 w-3.5" />,
  food: <Utensils className="h-3.5 w-3.5" />,
  transport: <Bus className="h-3.5 w-3.5" />,
  experience: <Camera className="h-3.5 w-3.5" />,
};

const typeColor = {
  place: "text-primary bg-primary/10",
  food: "text-warning bg-warning/10",
  transport: "text-muted-foreground bg-secondary",
  experience: "text-success bg-success/10",
};

function getTripDates() {
  const start = new Date();
  start.setDate(start.getDate() + 1);
  const dates: Date[] = [];
  for (let i = 0; i < 3; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    dates.push(d);
  }
  return dates;
}

export default function MicrositeView() {
  const [collapsedDays, setCollapsedDays] = useState<Set<number>>(new Set());
  const tripDates = getTripDates();
  const destination = "Bali";

  const toggleDay = (dayIdx: number) => {
    setCollapsedDays((prev) => {
      const next = new Set(prev);
      if (next.has(dayIdx)) next.delete(dayIdx);
      else next.add(dayIdx);
      return next;
    });
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Top bar */}
      <div className="h-11 border-b border-border flex items-center px-4 gap-3 shrink-0 bg-card/50">
        <img src={tboLogo} alt="TBO" className="h-7" />
        <div className="h-4 w-px bg-border" />
        <p className="text-sm text-foreground font-medium truncate">
          {destination} — Shared Itinerary
        </p>
        <div className="flex-1" />
        <span className="text-xs text-muted-foreground">Read-only</span>
      </div>

      {/* 3-panel layout matching /plan completed view */}
      <div className="flex flex-1 min-h-0">
        {/* Left — Itinerary */}
        <div className="flex-1 overflow-y-auto px-6 py-5 border-r border-border">
          <div className="mb-5">
            <h2 className="text-xl font-heading font-bold text-foreground">{destination} Itinerary</h2>
            <p className="text-xs text-muted-foreground mt-0.5">3 Days • Personalized for you</p>
          </div>

          {/* Weather strip */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-5 rounded-xl border border-border bg-card overflow-hidden"
          >
            {/* Header: title + location */}
            <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-border/50">
              <div className="flex items-center gap-2">
                <Cloud className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">Weather Forecast</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" />
                <span>{destination}</span>
              </div>
            </div>
            {/* 7-day grid */}
            <div className="grid grid-cols-7 gap-2 p-4">
              {getWeatherDates().map((w, i) => (
                <div key={i} className="flex flex-col items-center gap-1 p-2 rounded-lg bg-accent/30 border border-border/50">
                  <p className="text-[10px] font-semibold text-foreground">{w.dayName}</p>
                  <p className="text-[9px] text-muted-foreground">{w.dateLabel}</p>
                  <div className="my-1">{WEATHER_ICON[w.condition]}</div>
                  <p className="text-[10px] font-bold text-foreground">{w.high}°</p>
                  <p className="text-[9px] text-muted-foreground">{w.low}°</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Checklist (read-only, always visible) */}
          <div className="mb-5">
            <TripChecklist readOnly />
          </div>

          {/* Itinerary days */}
          <div className="space-y-3">
            {FULL_ITINERARY.map((day, dayIdx) => (
              <motion.div
                key={day.day}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: dayIdx * 0.15 }}
                className="border border-border rounded-xl overflow-hidden bg-card"
              >
                <button
                  onClick={() => toggleDay(dayIdx)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-accent/30 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                      Day {day.day}
                    </span>
                    <span className="text-[10px] text-muted-foreground border border-border/60 px-1.5 py-0.5 rounded-md">
                      {getDayDate(dayIdx)}
                    </span>
                    <span className="text-sm font-medium text-foreground">{day.title}</span>
                    <span className="text-xs text-muted-foreground">• {day.items.length} activities</span>
                  </div>
                  {collapsedDays.has(dayIdx) ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>

                <AnimatePresence>
                  {!collapsedDays.has(dayIdx) && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-border"
                    >
                      <div className="px-4 py-2 space-y-1">
                        {day.items.map((item, itemIdx) => (
                          <div key={itemIdx} className="flex items-center gap-2.5 py-2">
                            <div className={cn("h-7 w-7 rounded-lg flex items-center justify-center shrink-0", typeColor[item.type])}>
                              {typeIcon[item.type]}
                            </div>
                            <span className="text-[10px] text-muted-foreground font-mono w-16 shrink-0">{item.time}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-foreground">{item.title}</p>
                              {item.note && <p className="text-[10px] text-muted-foreground">{item.note}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Middle — Calendar + YouTube */}
        <div className="w-[320px] shrink-0 overflow-y-auto border-r border-border bg-card/30 px-4 py-5">
          {/* Calendar */}
          <div className="flex items-center gap-2 mb-3">
            <Clock className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">Trip Dates</span>
          </div>
          <div className="rounded-xl border border-border bg-card p-1">
            <Calendar
              mode="multiple"
              selected={tripDates}
              className="p-2 pointer-events-auto"
              modifiersClassNames={{
                selected: "bg-primary text-primary-foreground rounded-md",
              }}
            />
          </div>
          <div className="flex items-center gap-2 mt-2 px-1">
            <div className="h-3 w-3 rounded-sm bg-primary" />
            <span className="text-[10px] text-muted-foreground">Trip days</span>
          </div>

          {/* YouTube Videos */}
          <div className="mt-6">
            <div className="flex items-center gap-2 mb-3">
              <Youtube className="h-4 w-4 text-destructive" />
              <span className="text-sm font-semibold text-foreground">Related Videos</span>
            </div>
            <div className="space-y-3">
              {YOUTUBE_VIDEOS.map((v) => (
                <div key={v.id} className="group cursor-pointer rounded-xl overflow-hidden border border-border bg-card hover:shadow-md transition-shadow">
                  <div className="relative aspect-video">
                    <img src={v.thumbnail} alt={v.title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                      <div className="w-9 h-9 rounded-full bg-destructive/90 flex items-center justify-center">
                        <div className="w-0 h-0 border-t-[5px] border-t-transparent border-l-[9px] border-l-white border-b-[5px] border-b-transparent ml-0.5" />
                      </div>
                    </div>
                  </div>
                  <div className="p-2.5">
                    <p className="text-xs font-medium text-foreground line-clamp-2">{v.title}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{v.channel} • {v.views} views</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right — Map */}
        <div className="w-[400px] shrink-0 flex flex-col bg-card/30">
          <div className="px-4 py-3 border-b border-border flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">Trip Map</span>
          </div>
          <div className="flex-1 relative">
            <MapCard className="w-full h-full overflow-hidden" />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="h-10 border-t border-border flex items-center justify-center shrink-0 bg-card/50">
        <span className="text-xs text-muted-foreground">Powered by TBO AI Compass</span>
      </div>
    </div>
  );
}
