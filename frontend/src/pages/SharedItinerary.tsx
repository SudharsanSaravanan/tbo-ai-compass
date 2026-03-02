import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin,
  Utensils,
  Camera,
  Bus,
  Clock,
  Youtube,
  Cloud,
  ChevronDown,
  ChevronUp,
  CheckSquare,
  Sun,
  CloudSun,
  CloudRain,
  CloudSnow,
  Wind,
  Cloudy,
  Copy,
  Check,
  MessageSquare,
  X,
  Send,
  Globe,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import MapCard, { MapLocation } from "@/components/MapCard";
import TripChecklist from "@/components/TripChecklist";
import tboLogo from "@/assets/tbo-logo.png";
import { fetchTboCityCode, fetchTboHotels, TboHotel } from "@/services/tboHotelService";

// ────────────────────────────────────────────────
// Data
// ────────────────────────────────────────────────

const FULL_ITINERARY = [
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
  { id: "1", title: "Top 10 Things to Do — Travel Guide", thumbnail: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=320&h=180&fit=crop", channel: "Travel Insider", views: "1.2M" },
  { id: "2", title: "Street Food You MUST Try", thumbnail: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=320&h=180&fit=crop", channel: "Food Ranger", views: "890K" },
  { id: "3", title: "Hidden Gems & Secret Spots", thumbnail: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=320&h=180&fit=crop", channel: "Lost LeBlanc", views: "2.1M" },
  { id: "4", title: "Budget Travel — Complete Guide", thumbnail: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=320&h=180&fit=crop", channel: "Kara & Nate", views: "567K" },
];

type WeatherCondition = "sunny" | "partly-cloudy" | "cloudy" | "rainy" | "snowy" | "windy";

const WEATHER_ICON: Record<WeatherCondition, JSX.Element> = {
  sunny: <Sun className="h-5 w-5 text-yellow-500" />,
  "partly-cloudy": <CloudSun className="h-5 w-5 text-yellow-400" />,
  cloudy: <Cloudy className="h-5 w-5 text-slate-400" />,
  rainy: <CloudRain className="h-5 w-5 text-blue-400" />,
  snowy: <CloudSnow className="h-5 w-5 text-sky-300" />,
  windy: <Wind className="h-5 w-5 text-teal-400" />,
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

// ────────────────────────────────────────────────
// Date Helpers
// ────────────────────────────────────────────────

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

// ────────────────────────────────────────────────
// MAIN COMPONENT
// ────────────────────────────────────────────────

export default function SharedItinerary() {
  const { destination: destParam } = useParams();
  const destination = decodeURIComponent(destParam || "Bali");

  const [collapsedDays, setCollapsedDays] = useState<Set<number>>(new Set());
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestText, setRequestText] = useState("");
  const [requestSent, setRequestSent] = useState(false);
  const [copied, setCopied] = useState(false);

  const [hotels, setHotels] = useState<TboHotel[]>([]);
  const [hotelsLoading, setHotelsLoading] = useState(false);
  const [selectedHotelIndex, setSelectedHotelIndex] = useState<number | null>(null);

  const tripDates = getTripDates();



  useEffect(() => {
    const loadHotels = async () => {
      if (!destination) return;
      setHotelsLoading(true);
      try {
        let cityCode = await fetchTboCityCode(destination);
        if (!cityCode) {
          cityCode = await fetchTboCityCode(destination.split(',')[0]);
        }
        if (cityCode) {
          const hotelsLists = await fetchTboHotels(cityCode);
          setHotels(hotelsLists.slice(0, 10));
        }
      } catch (e) {
        console.error(e);
      } finally {
        setHotelsLoading(false);
      }
    };
    loadHotels();
  }, [destination]);

  const toggleDay = (dayIdx: number) => {
    setCollapsedDays((prev) => {
      const next = new Set(prev);
      if (next.has(dayIdx)) next.delete(dayIdx);
      else next.add(dayIdx);
      return next;
    });
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendRequest = () => {
    if (!requestText.trim()) return;
    // In real app → send to backend / email / notification system
    setRequestSent(true);
    setRequestText("");
    setTimeout(() => {
      setShowRequestForm(false);
      setRequestSent(false);
    }, 3000);
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* FIXED HEADER */}
      <header className="h-11 border-b border-border flex items-center px-5 gap-4 shrink-0 bg-card/80 backdrop-blur-sm z-20">
        <img src={tboLogo} alt="TBO" className="h-7" />
        <div className="h-4 w-px bg-border" />
        <p className="text-sm font-medium text-foreground truncate flex-1">
          {destination} — Shared Itinerary
        </p>

        {/* Right side controls */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-3 text-xs rounded-lg gap-1.5"
            onClick={handleCopyLink}
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copied!" : "Copy Link"}
          </Button>

          <Button
            size="sm"
            variant={showRequestForm ? "secondary" : "outline"}
            className="h-7 px-3 text-xs rounded-lg gap-1.5"
            onClick={() => setShowRequestForm(!showRequestForm)}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            Request Changes
          </Button>

          <span className="text-xs text-muted-foreground pl-2 border-l border-border">
            Read-only
          </span>
        </div>
      </header>

      {/* Request Changes Form */}
      <AnimatePresence>
        {showRequestForm && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-b border-border bg-card overflow-hidden z-10"
          >
            <div className="px-6 py-5 max-w-3xl mx-auto">
              {requestSent ? (
                <div className="text-center py-6">
                  <Check className="h-8 w-8 text-green-500 mx-auto mb-3" />
                  <h3 className="text-base font-semibold">Request Sent!</h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    Thank you! We'll review your suggestions and get back to you.
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-semibold">Request Changes</h3>
                    <Button variant="ghost" size="icon" onClick={() => setShowRequestForm(false)}>
                      <X className="h-5 w-5" />
                    </Button>
                  </div>

                  <textarea
                    value={requestText}
                    onChange={(e) => setRequestText(e.target.value)}
                    placeholder="What would you like to change? (e.g. add one more day, change hotel category, include specific activity...)"
                    className="w-full h-28 bg-secondary/60 border border-border rounded-lg px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring/40"
                  />

                  <div className="mt-4 flex justify-end">
                    <Button
                      onClick={handleSendRequest}
                      disabled={!requestText.trim()}
                      className="px-6"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Send Request
                    </Button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MAIN CONTENT */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left – Itinerary */}
        <div className="flex-1 overflow-y-auto px-6 py-6 border-r border-border">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-foreground">{destination} Itinerary</h2>
            <p className="text-xs text-muted-foreground mt-1">3 Days • Personalized plan</p>
          </div>

          {/* Weather */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 rounded-xl border border-border bg-card overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-border/50">
              <div className="flex items-center gap-2">
                <Cloud className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">Weather Forecast</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" />
                <span>{destination}</span>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-2 p-4">
              {getWeatherDates().map((w, i) => (
                <div
                  key={i}
                  className="flex flex-col items-center gap-1 p-2 rounded-lg bg-accent/30 border border-border/50"
                >
                  <p className="text-[10px] font-semibold text-foreground">{w.dayName}</p>
                  <p className="text-[9px] text-muted-foreground">{w.dateLabel}</p>
                  <div className="my-1">{WEATHER_ICON[w.condition]}</div>
                  <p className="text-[10px] font-bold text-foreground">{w.high}°</p>
                  <p className="text-[9px] text-muted-foreground">{w.low}°</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Days */}
          <div className="space-y-4 mb-12">
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
                  className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-accent/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-primary/10 text-primary">
                      Day {day.day}
                    </span>
                    <span className="text-[10px] px-2 py-1 rounded border border-border/70 text-muted-foreground">
                      {getDayDate(dayIdx)}
                    </span>
                    <span className="text-base font-medium">{day.title}</span>
                    <span className="text-xs text-muted-foreground ml-1">
                      • {day.items.length} activities
                    </span>
                  </div>
                  {collapsedDays.has(dayIdx) ? (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronUp className="h-5 w-5 text-muted-foreground" />
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
                      <div className="px-5 py-3 space-y-2">
                        {day.items.map((item, idx) => (
                          <div key={idx} className="flex items-start gap-3 py-1">
                            <div
                              className={cn(
                                "h-8 w-8 rounded-md flex items-center justify-center shrink-0",
                                typeColor[item.type]
                              )}
                            >
                              {typeIcon[item.type]}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-baseline gap-3">
                                <span className="text-xs font-mono text-muted-foreground w-14 shrink-0">
                                  {item.time}
                                </span>
                                <p className="text-sm font-medium">{item.title}</p>
                              </div>
                              {item.note && (
                                <p className="text-xs text-muted-foreground mt-0.5 pl-[3.7rem]">
                                  {item.note}
                                </p>
                              )}
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

          {/* Checklist – at the very bottom */}
          <div className="mb-8">
            <div className="flex items-center gap-2.5 mb-4">
              <CheckSquare className="h-5 w-5 text-primary" />
              <h3 className="text-base font-semibold text-foreground">Trip Checklist</h3>
            </div>
            {/* Interactive checklist */}
            <TripChecklist />
          </div>
        </div>

        {/* Middle – Calendar + Videos */}
        <div className="w-[320px] shrink-0 overflow-y-auto border-r border-border bg-card/30 px-5 py-6">
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">Trip Dates</span>
            </div>
            <div className="rounded-xl border bg-card p-1">
              <Calendar
                mode="multiple"
                selected={tripDates}
                className="p-2 pointer-events-none"
                modifiersClassNames={{
                  selected: "bg-primary text-primary-foreground rounded-md",
                }}
              />
            </div>
            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground px-1">
              <div className="h-3 w-3 rounded-sm bg-primary" />
              <span>Trip days</span>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-4">
              <Youtube className="h-4.5 w-4.5 text-red-600" />
              <span className="text-sm font-semibold">Inspiration Videos</span>
            </div>
            <div className="space-y-4">
              {YOUTUBE_VIDEOS.map((video) => (
                <div
                  key={video.id}
                  className="group rounded-xl overflow-hidden border bg-card hover:shadow-md transition-shadow cursor-pointer"
                >
                  <div className="relative aspect-video">
                    <img
                      src={video.thumbnail}
                      alt={video.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 flex items-center justify-center transition-colors">
                      <div className="w-10 h-10 rounded-full bg-red-600/90 flex items-center justify-center">
                        <div className="w-0 h-0 border-t-[6px] border-t-transparent border-l-[11px] border-l-white border-b-[6px] border-b-transparent ml-1" />
                      </div>
                    </div>
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-medium line-clamp-2">{video.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {video.channel} • {video.views} views
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Suggested Hotels */}
          <div className="mt-8 border-t border-border pt-6">
            <div className="flex items-center gap-2 mb-4">
              <Globe className="h-4.5 w-4.5 text-blue-500" />
              <span className="text-sm font-semibold">Suggested Hotels</span>
              {hotelsLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground ml-auto" />}
            </div>
            {hotels.length === 0 && !hotelsLoading ? (
              <div className="text-xs text-muted-foreground p-3 bg-accent rounded-xl">
                No hotels found for this city.
              </div>
            ) : (
              <div className="space-y-4">
                {hotels.map((h, i) => (
                  <div key={h.HotelCode} className={cn("rounded-xl border border-border bg-card p-3 transition-colors cursor-pointer", selectedHotelIndex === i ? "border-primary bg-primary/5" : "hover:shadow-md")} onClick={() => setSelectedHotelIndex(i)}>
                    <p className="font-semibold text-sm line-clamp-1" title={h.HotelName}>{h.HotelName}</p>
                    <p className="text-[10px] text-muted-foreground line-clamp-2 mt-1">{h.Address}</p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {h.PhoneNumber && <a href={`tel:${h.PhoneNumber}`} className="text-[10px] text-primary bg-primary/10 px-2.5 py-1 rounded-full inline-flex items-center gap-1.5 hover:bg-primary/20 transition-colors" target="_blank" onClick={(e) => e.stopPropagation()}><MapPin className="h-3 w-3" /> Call</a>}
                      {h.HotelWebsiteUrl && <a href={h.HotelWebsiteUrl} target="_blank" className="text-[10px] text-primary bg-primary/10 px-2.5 py-1 rounded-full inline-flex items-center gap-1.5 hover:bg-primary/20 transition-colors" onClick={(e) => e.stopPropagation()}><Globe className="h-3 w-3" /> Website</a>}
                    </div>
                    <div className="mt-3 pt-3 border-t flex justify-end">
                      <Button size="sm" className="h-8 text-xs w-full rounded-md" aria-label="Book Hotel" onClick={(e) => { e.stopPropagation(); alert('Booking feature coming soon!'); }}>Book Now</Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right – Map */}
        <div className="w-[400px] shrink-0 flex flex-col bg-card/30">
          <div className="px-5 py-4 border-b flex items-center gap-2">
            <MapPin className="h-4.5 w-4.5 text-primary" />
            <span className="text-base font-semibold">Trip Map</span>
          </div>
          <div className="flex-1 relative">
            <MapCard
              className="absolute inset-0 w-full h-full"
              locations={
                selectedHotelIndex !== null && hotels[selectedHotelIndex] && hotels[selectedHotelIndex].Map
                  ? [{
                    lat: parseFloat(hotels[selectedHotelIndex].Map.split("|")[0]),
                    lng: parseFloat(hotels[selectedHotelIndex].Map.split("|")[1]),
                    title: hotels[selectedHotelIndex].HotelName
                  }]
                  : undefined
              }
            />
          </div>
        </div>
      </div>

      {/* FIXED FOOTER */}
      <footer className="h-10 border-t border-border flex items-center justify-center shrink-0 bg-card/60 text-xs text-muted-foreground z-10">
        Powered by TBO AI Compass • Shared on {new Date().toLocaleDateString()}
      </footer>
    </div>
  );
}