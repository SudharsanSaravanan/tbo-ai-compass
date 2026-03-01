import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin, Utensils, Camera, Bus, Clock, Edit3, Check, X,
  Youtube, Cloud, Globe, ChevronDown, ChevronUp, CheckSquare,
  Sun, CloudSun, CloudRain, CloudSnow, Wind, Cloudy, Zap, History, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import MapCard from "@/components/MapCard";
import TripChecklist from "@/components/TripChecklist";
import { fetchWeatherForCity, type DailyWeather } from "@/lib/weather";

interface ItineraryItem {
  time: string;
  title: string;
  type: "place" | "food" | "transport" | "experience";
  note?: string;
}

interface ItineraryDay {
  day: number;
  title: string;
  items: ItineraryItem[];
}

interface CompletedItineraryProps {
  destination: string;
  onOpenAIChat: () => void;
  /** ISO date string YYYY-MM-DD – if provided, real weather is fetched */
  startDate?: string;
  /** ISO date string YYYY-MM-DD */
  endDate?: string;
}

const FULL_ITINERARY: ItineraryDay[] = [
  {
    day: 1,
    title: "Arrival & First Impressions",
    items: [
      { time: "10:00 AM", title: "Arrive & hotel check-in", type: "transport", note: "Airport transfer included" },
      { time: "12:30 PM", title: "Local welcome lunch", type: "food", note: "Traditional cuisine" },
      { time: "3:00 PM", title: "Walking tour of old town", type: "place", note: "Guided heritage walk" },
      { time: "7:00 PM", title: "Sunset viewpoint visit", type: "experience", note: "Best sunset spot in the city" },
    ],
  },
  {
    day: 2,
    title: "Culture & Exploration",
    items: [
      { time: "8:30 AM", title: "Breakfast at local café", type: "food" },
      { time: "10:00 AM", title: "Museum & heritage site", type: "place", note: "UNESCO World Heritage" },
      { time: "1:00 PM", title: "Street food tour", type: "food", note: "Must-try local dishes" },
      { time: "4:00 PM", title: "Market & shopping district", type: "experience" },
      { time: "7:30 PM", title: "Cultural performance", type: "experience", note: "Traditional dance show" },
    ],
  },
  {
    day: 3,
    title: "Adventure Day",
    items: [
      { time: "7:00 AM", title: "Sunrise trek / nature hike", type: "experience", note: "Moderate difficulty, 3hr" },
      { time: "12:00 PM", title: "Scenic lunch spot", type: "food" },
      { time: "2:30 PM", title: "Water activity / adventure sport", type: "experience" },
      { time: "6:00 PM", title: "Farewell dinner", type: "food", note: "Fine dining experience" },
    ],
  },
];

const YOUTUBE_VIDEOS = [
  { id: "1", title: `Top 10 Things to Do — Travel Guide`, thumbnail: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=320&h=180&fit=crop", channel: "Travel Insider", views: "1.2M" },
  { id: "2", title: `Street Food You MUST Try`, thumbnail: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=320&h=180&fit=crop", channel: "Food Ranger", views: "890K" },
  { id: "3", title: `Hidden Gems & Secret Spots`, thumbnail: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=320&h=180&fit=crop", channel: "Lost LeBlanc", views: "2.1M" },
  { id: "4", title: `Budget Travel — Complete Guide`, thumbnail: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=320&h=180&fit=crop", channel: "Kara & Nate", views: "567K" },
];

/** Map WMO-like numeric code to a Lucide icon */
function wmoIcon(code: number): React.ReactNode {
  if (code === 0) return <Sun className="h-5 w-5 text-yellow-500" />;
  if (code <= 2) return <CloudSun className="h-5 w-5 text-yellow-400" />;
  if (code === 3) return <Cloudy className="h-5 w-5 text-slate-400" />;
  if (code <= 48) return <Cloud className="h-5 w-5 text-slate-400" />;
  if (code <= 67) return <CloudRain className="h-5 w-5 text-blue-400" />;
  if (code <= 77) return <CloudSnow className="h-5 w-5 text-sky-300" />;
  if (code <= 82) return <CloudRain className="h-5 w-5 text-blue-500" />;
  if (code <= 99) return <Zap className="h-5 w-5 text-violet-500" />;
  return <Wind className="h-5 w-5 text-teal-400" />;
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

// Generate trip dates for the calendar
function getTripDates(startDate?: string, numDays = 3) {
  const start = startDate ? new Date(startDate + "T00:00:00") : (() => { const d = new Date(); d.setDate(d.getDate() + 1); return d; })();
  const dates: Date[] = [];
  for (let i = 0; i < numDays; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    dates.push(d);
  }
  return dates;
}

// Returns "Mon, 23 Feb" for a given day index (0-based)
function getDayDate(dayIdx: number, startDate?: string) {
  const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const d = startDate
    ? new Date(startDate + "T00:00:00")
    : (() => { const n = new Date(); n.setDate(n.getDate() + 1); return n; })();
  d.setDate(d.getDate() + dayIdx);
  return `${DAY_NAMES[d.getDay()]}, ${d.getDate()} ${d.toLocaleString("default", { month: "short" })}`;
}

export default function CompletedItinerary({ destination, onOpenAIChat, startDate, endDate }: CompletedItineraryProps) {
  const [itinerary, setItinerary] = useState(FULL_ITINERARY);
  const [editingItem, setEditingItem] = useState<{ day: number; idx: number } | null>(null);
  const [editText, setEditText] = useState("");
  const [collapsedDays, setCollapsedDays] = useState<Set<number>>(new Set());
  const [showChecklist, setShowChecklist] = useState(false);

  // ── Real weather state ──────────────────────────────────────────────────
  const [weatherDays, setWeatherDays] = useState<DailyWeather[]>([]);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [isHistoricalWeather, setIsHistoricalWeather] = useState(false);

  useEffect(() => {
    if (!destination) return;
    // Derive a 7-day window if no explicit dates given
    const today = new Date();
    const sd = startDate ?? (() => { const d = new Date(today); d.setDate(d.getDate() + 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; })();
    const ed = endDate ?? (() => { const d = new Date(today); d.setDate(d.getDate() + 7); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; })();

    setWeatherLoading(true);
    fetchWeatherForCity(destination, sd, ed)
      .then(({ days, isHistorical }) => {
        setWeatherDays(days.slice(0, 7));
        setIsHistoricalWeather(isHistorical);
      })
      .catch(() => { /* leave weatherDays empty — handled below */ })
      .finally(() => setWeatherLoading(false));
  }, [destination, startDate, endDate]);

  const numDays = FULL_ITINERARY.length;
  const tripDates = getTripDates(startDate, numDays);

  const startEdit = (dayIdx: number, itemIdx: number, currentTitle: string) => {
    setEditingItem({ day: dayIdx, idx: itemIdx });
    setEditText(currentTitle);
  };

  const saveEdit = () => {
    if (!editingItem) return;
    setItinerary((prev) =>
      prev.map((day, di) =>
        di === editingItem.day
          ? { ...day, items: day.items.map((item, ii) => (ii === editingItem.idx ? { ...item, title: editText } : item)) }
          : day
      )
    );
    setEditingItem(null);
  };

  const toggleDay = (dayIdx: number) => {
    setCollapsedDays((prev) => {
      const next = new Set(prev);
      if (next.has(dayIdx)) next.delete(dayIdx);
      else next.add(dayIdx);
      return next;
    });
  };


  return (
    <div className="flex h-full min-h-0">
      {/* Left — Full Itinerary */}
      <div className="flex-1 overflow-y-auto px-6 py-5 border-r border-border">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-xl font-heading font-bold text-foreground">{destination} Itinerary</h2>
            <p className="text-xs text-muted-foreground mt-0.5">3 Days • Personalized for you</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={onOpenAIChat}
              className="gap-1.5 rounded-xl text-xs"
            >
              {/* <Bot className="h-3.5 w-3.5" /> */}
              Refine with AI
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowChecklist(!showChecklist)}
              className="gap-1.5 rounded-xl text-xs"
            >
              <CheckSquare className="h-3.5 w-3.5" />
              Checklist
            </Button>
            <Button
              size="sm"
              variant="default"
              className="gap-1.5 rounded-xl text-xs"
              onClick={() => {
                window.open(`/shared/${encodeURIComponent(destination)}`, '_blank');
              }}
            >
              <Globe className="h-3.5 w-3.5" />
              Share Trip
            </Button>
          </div>
        </div>

        {/* Weather strip */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-5 rounded-xl border border-border bg-card overflow-hidden"
        >
          {/* Header row: title + location + badge */}
          <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-border/50">
            <div className="flex items-center gap-2">
              <Cloud className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">Weather Forecast</span>
              {weatherLoading && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
              {!weatherLoading && isHistoricalWeather && weatherDays.length > 0 && (
                <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                  <History className="h-2.5 w-2.5" />
                  Historical (same season)
                </span>
              )}
              {!weatherLoading && !isHistoricalWeather && weatherDays.length > 0 && (
                <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
                  Live Forecast
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />
              <span>{destination}</span>
            </div>
          </div>

          {/* 7-day grid */}
          {weatherLoading ? (
            <div className="flex items-center justify-center gap-1.5 py-8">
              {[0, 1, 2].map((i) => (
                <div key={i} className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          ) : weatherDays.length > 0 ? (
            <div className="grid gap-2 p-4" style={{ gridTemplateColumns: `repeat(${Math.min(weatherDays.length, 7)}, 1fr)` }}>
              {weatherDays.slice(0, 7).map((w, i) => {
                const d = new Date(w.date + "T00:00:00");
                const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
                return (
                  <div key={i} className="flex flex-col items-center gap-1 p-2 rounded-lg bg-accent/30 border border-border/50">
                    <p className="text-[10px] font-semibold text-foreground">{DAY_NAMES[d.getDay()]}</p>
                    <p className="text-[9px] text-muted-foreground">{d.getDate()} {d.toLocaleString("default", { month: "short" })}</p>
                    <div className="my-1">{wmoIcon(w.weatherCode)}</div>
                    <p className="text-[10px] font-bold text-foreground">{Math.round(w.tempMax)}°</p>
                    <p className="text-[9px] text-muted-foreground">{Math.round(w.tempMin)}°</p>
                    {w.precipitationProbability > 0 && (
                      <p className="text-[8px] text-blue-500">💧{w.precipitationProbability}%</p>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center justify-center py-6 text-xs text-muted-foreground">
              Weather data unavailable
            </div>
          )}
        </motion.div>

        {/* Checklist (togglable) */}
        <AnimatePresence>
          {showChecklist && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-5 overflow-hidden"
            >
              <TripChecklist />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Itinerary days */}
        <div className="space-y-3">
          {itinerary.map((day, dayIdx) => (
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
                    {getDayDate(dayIdx, startDate)}
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
                        <div key={itemIdx} className="flex items-center gap-2.5 py-2 group">
                          <div className={cn("h-7 w-7 rounded-lg flex items-center justify-center shrink-0", typeColor[item.type])}>
                            {typeIcon[item.type]}
                          </div>
                          <span className="text-[10px] text-muted-foreground font-mono w-16 shrink-0">{item.time}</span>

                          {editingItem?.day === dayIdx && editingItem?.idx === itemIdx ? (
                            <div className="flex-1 flex items-center gap-1.5">
                              <input
                                value={editText}
                                onChange={(e) => setEditText(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && saveEdit()}
                                className="flex-1 bg-secondary/60 border border-border rounded-lg px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-ring"
                                autoFocus
                              />
                              <Button size="icon" variant="ghost" onClick={saveEdit} className="h-6 w-6">
                                <Check className="h-3 w-3" />
                              </Button>
                              <Button size="icon" variant="ghost" onClick={() => setEditingItem(null)} className="h-6 w-6">
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex-1 flex items-center justify-between min-w-0">
                              <div className="min-w-0">
                                <p className="text-sm text-foreground">{item.title}</p>
                                {item.note && <p className="text-[10px] text-muted-foreground">{item.note}</p>}
                              </div>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => startEdit(dayIdx, itemIdx, item.title)}
                                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                              >
                                <Edit3 className="h-3 w-3 text-muted-foreground" />
                              </Button>
                            </div>
                          )}
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
        {/* Calendar with trip dates marked */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
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
        </motion.div>

        {/* YouTube Videos */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-6"
        >
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
        </motion.div>
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
  );
}
