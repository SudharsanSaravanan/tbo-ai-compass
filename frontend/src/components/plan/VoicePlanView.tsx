/**
 * Voice planning with LiveKit: fixed layout, progressive content sections.
 * Left = waveform (fixed) + scrollable content (map, calendar, weather, video, itinerary).
 * Right = conversation transcript + text input.
 */

import { useState, useEffect, useCallback, useRef, type MutableRefObject } from "react";
import { type DailyWeather, fetchWeatherForDates } from "@/lib/weather";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useDataChannel,
  useRoomContext,
} from "@livekit/components-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin,
  Utensils,
  Camera,
  Bus,
  FileText,
  Send,
  Loader2,
  Youtube,
  ArrowLeft,
  Sun,
  CloudSun,
  Cloud,
  Cloudy,
  CloudRain,
  CloudSnow,
  Wind,
  Zap,
} from "lucide-react";


/** Map a WMO weather code to a coloured Lucide icon element */
function wmoIcon(code: number): React.ReactNode {
  if (code === 0) return <Sun className="h-3.5 w-3.5 text-yellow-500" />;
  if (code <= 2) return <CloudSun className="h-3.5 w-3.5 text-yellow-400" />;
  if (code === 3) return <Cloudy className="h-3.5 w-3.5 text-slate-400" />;
  if (code <= 48) return <Cloud className="h-3.5 w-3.5 text-slate-400" />;  // fog
  if (code <= 67) return <CloudRain className="h-3.5 w-3.5 text-blue-400" />;  // drizzle / rain
  if (code <= 77) return <CloudSnow className="h-3.5 w-3.5 text-sky-300" />;   // snow
  if (code <= 82) return <CloudRain className="h-3.5 w-3.5 text-blue-500" />;  // showers
  if (code <= 99) return <Zap className="h-3.5 w-3.5 text-violet-500" />;      // thunderstorm
  return <Wind className="h-3.5 w-3.5 text-teal-400" />;
}
import { Button } from "@/components/ui/button";
import { LiveWaveform } from "@/components/ui/live-waveform";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import TripMap, { type LocationPoint } from "./TripMap";
import TripCalendar from "./TripCalendar";
import TripFoodSpots from "./TripFoodSpots";
import VideoCard, { SmallVideoCard, type VideoInfo } from "./VideoCard";
import { type FoodSpot } from "@/lib/tavily";

const APP_DATA_TOPIC = "tbo-app-data";
const TOKEN_API = import.meta.env.VITE_TOKEN_API || "http://localhost:8765";
const LIVEKIT_WS = import.meta.env.VITE_LIVEKIT_WS || "";

/**
 * Strip any LLM function-call markup that leaks into agent text.
 * Handles all known variants:
 *   - <function=name>...</function>   (well-formed)
 *   - <function_calls>...</function_calls>  (XML-style)
 *   - <function> / <function ...>  (bare / unclosed — strips to end of string)
 *   - }<function  (dangling JSON + tag start, e.g. "travelers": "2 adults"}<function>)
 *   - leftover </function> closing tags
 */
function cleanAgentText(text: string): string {
  let out = text;
  // Well-formed blocks
  out = out.replace(/<function=[^>]+>[\s\S]*?<\/function>/g, "");
  // XML-style function_calls blocks
  out = out.replace(/<function_calls>[\s\S]*?<\/function_calls>/g, "");
  // Bare / unclosed <function> or <function ...> — nuke from that point to end
  out = out.replace(/<function[\s>=][\s\S]*$/g, "");
  out = out.replace(/<function>[\s\S]*$/g, "");
  // Dangling JSON fragment + tag: e.g. "value"}<function or "value"}{ ...
  out = out.replace(/\}\s*<[\s\S]*$/g, "");
  out = out.replace(/\}\s*\{[\s\S]*$/g, "");
  // Any remaining stray tags
  out = out.replace(/<\/?function[^>]*>/g, "");
  return out.trim();
}

/* ─── Types ─── */

export interface ItineraryItemType {
  time: string;
  title: string;
  type: "place" | "food" | "transport" | "experience";
  note?: string;
}

export interface ItineraryDayType {
  day: number;
  title: string;
  items: ItineraryItemType[];
}

export interface ItineraryPayload {
  destination: string;
  days: ItineraryDayType[];
}

interface TranscriptEntry {
  id: string;
  role: "user" | "agent";
  text: string;
}

interface TravelDates {
  start_date: string;
  end_date: string;
  num_days: number;
  dates_raw?: string;
  duration?: string;
}

interface ContextVideo {
  video_id: string;
  title: string;
  url: string;
  thumbnail: string;
}

/* ─── Inner Room Content ─── */

function VoiceRoomContent({
  onItineraryUpdate,
  itinerary,
  transcripts,
  onTranscript,
  onLocations,
  locations,
  onDates,
  dates,
  onPrimaryVideo,
  primaryVideo,
  onContextVideos,
  contextVideos,
  discoveryStatus,
  setDiscoveryStatus,
  initialMessage,
  initialMessageSentRef,
}: {
  onItineraryUpdate: (p: ItineraryPayload) => void;
  itinerary: ItineraryPayload | null;
  transcripts: TranscriptEntry[];
  onTranscript: (t: TranscriptEntry) => void;
  onLocations: (o: LocationPoint | null, d: LocationPoint | null) => void;
  locations: { origin: LocationPoint | null; destination: LocationPoint | null };
  onDates: (d: TravelDates) => void;
  dates: TravelDates | null;
  onPrimaryVideo: (v: VideoInfo) => void;
  primaryVideo: VideoInfo | null;
  onContextVideos: (v: ContextVideo[]) => void;
  contextVideos: ContextVideo[];
  discoveryStatus: "idle" | "running" | "done";
  setDiscoveryStatus: (s: "idle" | "running" | "done") => void;
  initialMessage?: string;
  /** Stable ref from VoicePlanView so it survives StrictMode double-mount */
  initialMessageSentRef: MutableRefObject<boolean>;
}) {
  const room = useRoomContext();
  const [inputText, setInputText] = useState("");
  const [sendingText, setSendingText] = useState(false);
  const [discoveryQuery, setDiscoveryQuery] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const [weatherByDate, setWeatherByDate] = useState<Record<string, DailyWeather>>({});
  const [foodSpots, setFoodSpots] = useState<FoodSpot[]>([]);
  const [selectedFoodSpot, setSelectedFoodSpot] = useState<FoodSpot | null>(null);

  useEffect(() => {
    setConnected(room.state === "connected");
  }, [room.state]);

  // Auto-send initialMessage exactly once when the room first becomes connected.
  // NOTE: we do NOT manually add to transcript here — the agent echoes the
  // message back as a `user_transcript` data-channel event, which is the same
  // path normal typed messages go through. Adding it manually AND waiting for
  // the echo was causing the double-bubble.
  useEffect(() => {
    if (!initialMessage || !connected || initialMessageSentRef.current) return;

    const local = room.localParticipant;
    if (!local) return;

    initialMessageSentRef.current = true;

    // Send to agent via the text channel (same as handleSendText)
    (local as any).sendText(initialMessage, { topic: "lk.chat" }).catch((e: unknown) => {
      console.error("Failed to send initial trip query", e);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, initialMessage]);

  // Auto-scroll chat
  useEffect(() => {
    chatScrollRef.current?.scrollTo({ top: chatScrollRef.current.scrollHeight, behavior: "smooth" });
  }, [transcripts.length]);

  useDataChannel(
    APP_DATA_TOPIC,
    useCallback(
      (msg) => {
        try {
          let raw: string;
          if (msg instanceof Uint8Array) {
            raw = new TextDecoder().decode(msg);
          } else if (msg && typeof (msg as { payload?: unknown }).payload !== "undefined") {
            const p = (msg as { payload: Uint8Array }).payload;
            raw = p instanceof Uint8Array ? new TextDecoder().decode(p) : String(p);
          } else {
            raw = typeof msg === "string" ? msg : JSON.stringify(msg);
          }
          const data = JSON.parse(raw);

          switch (data?.type) {
            case "location_update":
              onLocations(data.origin ?? null, data.destination ?? null);
              break;
            case "travel_dates":
              if (data.start_date) {
                onDates({
                  start_date: data.start_date,
                  end_date: data.end_date || data.start_date,
                  num_days: data.num_days || 1,
                  dates_raw: data.dates_raw,
                  duration: data.duration,
                });
              }
              break;
            case "discovery_status":
              if (typeof data.query === "string") setDiscoveryQuery(data.query);
              if (data.status === "running") setDiscoveryStatus("running");
              else if (data.status === "done") setDiscoveryStatus("done");
              else setDiscoveryStatus("idle");
              break;
            case "top_video":
              if (data.video_id) {
                onPrimaryVideo({
                  video_id: data.video_id,
                  title: data.title || "",
                  url: data.url || "",
                  channel: data.channel,
                  thumbnail: data.thumbnail || `https://img.youtube.com/vi/${data.video_id}/maxresdefault.jpg`,
                  transcript_summary: data.transcript_summary,
                });
              }
              break;
            case "context_videos":
              if (Array.isArray(data.videos)) onContextVideos(data.videos);
              break;
            case "discovery_result":
              break;
            case "itinerary":
              if (data.payload) onItineraryUpdate(data.payload);
              break;
            case "user_transcript":
              if (data.text) onTranscript({ id: `u-${Date.now()}`, role: "user", text: data.text });
              break;
            case "agent_transcript":
              if (data.text) onTranscript({ id: `a-${Date.now()}`, role: "agent", text: cleanAgentText(data.text) });
              break;
          }
        } catch {
          /* ignore */
        }
      },
      [onItineraryUpdate, onTranscript, onLocations, onDates, onPrimaryVideo, onContextVideos, setDiscoveryStatus]
    )
  );

  // Mute mic during discovery
  useEffect(() => {
    const local = room.localParticipant;
    if (!local) return;
    if (discoveryStatus === "running") {
      (local as any).setMicrophoneEnabled?.(false);
    } else {
      (local as any).setMicrophoneEnabled?.(true);
    }
  }, [discoveryStatus, room.localParticipant]);

  const handleSendText = async () => {
    const text = inputText.trim();
    if (!text) return;
    const local = room.localParticipant;
    if (!local) return;
    try {
      setSendingText(true);
      await (local as any).sendText(text, { topic: "lk.chat" });
      setInputText("");
    } catch (e) {
      console.error("Failed to send text", e);
    } finally {
      setSendingText(false);
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSendText();
    }
  };

  const hasMap = !!(locations.origin || locations.destination);
  const hasDates = !!(dates?.start_date);
  const hasWeather = hasDates && !!locations.destination;

  // Fetch weather when destination + dates are available
  useEffect(() => {
    if (!hasWeather || !locations.destination || !dates) return;
    fetchWeatherForDates(
      locations.destination.lat,
      locations.destination.lng,
      dates.start_date,
      dates.end_date
    )
      .then((days) => {
        const map: Record<string, DailyWeather> = {};
        days.forEach((d) => { map[d.date] = d; });
        setWeatherByDate(map);
      })
      .catch(() => { /* silently ignore */ });
  }, [hasWeather, locations.destination?.lat, locations.destination?.lng, dates?.start_date, dates?.end_date]);

  const typeIcon: Record<string, React.ReactNode> = {
    place: <MapPin className="h-3 w-3" />,
    food: <Utensils className="h-3 w-3" />,
    transport: <Bus className="h-3 w-3" />,
    experience: <Camera className="h-3 w-3" />,
  };
  const typeColor: Record<string, string> = {
    place: "text-blue-700 bg-blue-50 border-blue-100/80",
    food: "text-orange-600 bg-orange-50 border-orange-100/80",
    transport: "text-slate-500 bg-slate-100/80 border-slate-200/60",
    experience: "text-emerald-700 bg-emerald-50 border-emerald-100/80",
  };

  return (
    <div className="flex-1 flex min-h-0 h-full">
      {/* ═══ LEFT: Waveform (fixed) + Scrollable Content ═══ */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Voice Hero Section */}
        <div className="shrink-0 border-b border-border/50">
          <div
            className={cn(
              "px-6 py-5 transition-all",
              "bg-gradient-to-r from-primary/5 via-background to-primary/5",
              discoveryStatus === "running" && "from-amber-50/60 via-background to-amber-50/60"
            )}
          >
            <div className="flex items-center justify-center gap-5">
              {/* Waveform orb */}
              <div
                className={cn(
                  "relative w-48 h-16 rounded-2xl flex items-center justify-center transition-all duration-500",
                  connected
                    ? "bg-primary/8 border border-primary/20 shadow-[0_0_24px_rgba(var(--primary),0.12)]"
                    : "bg-muted/40 border border-border",
                  discoveryStatus === "running" && "opacity-40"
                )}
              >
                {connected ? (
                  <LiveWaveform active height={48} barWidth={3} barGap={2} mode="static" fadeEdges barColor="primary" />
                ) : (
                  <span className="text-xs text-muted-foreground tracking-wide">Connecting…</span>
                )}
              </div>

              {/* Status text */}
              <div className="text-left space-y-0.5">
                <p className={cn(
                  "text-sm font-semibold tracking-tight",
                  connected ? "text-foreground" : "text-muted-foreground"
                )}>
                  {connected
                    ? discoveryStatus === "running"
                      ? "Analyzing videos for your trip…"
                      : "Speak — the agent is listening"
                    : "Waiting for room…"}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {discoveryStatus === "running"
                    ? "Mic muted. We'll resume once analysis finishes."
                    : "Your voice is live. You can also type below."}
                </p>
              </div>
            </div>

            {/* Discovery progress pill */}
            <AnimatePresence>
              {discoveryStatus === "running" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-3 flex items-center gap-2 justify-center"
                >
                  <div className="inline-flex items-center gap-2 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/40 rounded-full px-3 py-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span className="text-[10px] font-medium">
                      {discoveryQuery
                        ? `Searching "${discoveryQuery.slice(0, 50)}"…`
                        : "Searching travel videos…"}
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Scrollable content area — premium SaaS layout */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto bg-slate-50/60 dark:bg-background">
          <div className="px-4 py-5 space-y-4">

            {/* ── SECTION 1: Calendar + Map side-by-side ── */}
            <AnimatePresence>
              {(hasMap || hasDates) && (
                <motion.div
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45 }}
                  className="grid grid-cols-1 md:grid-cols-[2fr_3fr] gap-4"
                >
                  {/* Calendar card */}
                  {hasDates && dates && (
                    <div className="bg-white dark:bg-card rounded-2xl border border-border/60 shadow-sm p-4 flex flex-col">
                      <TripCalendar
                        startDate={dates.start_date}
                        endDate={dates.end_date}
                        numDays={dates.num_days}
                      />
                      {/* ── Food spots embedded below calendar ── */}
                      {locations.destination && (
                        <TripFoodSpots
                          compact
                          destinationName={locations.destination.name}
                          destinationLat={locations.destination.lat}
                          destinationLng={locations.destination.lng}
                          selectedSpot={selectedFoodSpot}
                          onSelectSpot={setSelectedFoodSpot}
                          onSpotsLoaded={setFoodSpots}
                          itineraryDays={
                            itinerary?.days.map((d) => ({
                              day: d.day,
                              placeNames: d.items
                                .filter((it) => it.type === "place")
                                .map((it) => it.title),
                            })) ?? []
                          }
                        />
                      )}
                    </div>
                  )}
                  {/* Calendar skeleton */}
                  {!hasDates && hasMap && (
                    <div className="bg-white dark:bg-card rounded-2xl border border-border/60 shadow-sm p-4 space-y-3">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-[220px] w-full rounded-xl" />
                    </div>
                  )}

                  {/* Map card */}
                  {hasMap && (
                    <div className="bg-white dark:bg-card rounded-2xl border border-border/60 shadow-sm p-4 flex flex-col gap-3">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5 text-primary" />
                        <span className="text-xs font-semibold text-foreground">Route</span>
                        {locations.origin && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 font-medium border border-green-200/60">
                            {locations.origin.name}
                          </span>
                        )}
                        {locations.destination && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-600 font-medium border border-red-200/60">
                            {locations.destination.name}
                          </span>
                        )}
                      </div>
                      <div className="rounded-xl overflow-hidden flex-1 min-h-[200px]">
                        <TripMap
                          origin={locations.origin}
                          destination={locations.destination}
                          foodSpots={foodSpots}
                          selectedFoodSpot={selectedFoodSpot}
                          itinerary={itinerary}
                        />
                      </div>
                    </div>
                  )}
                  {/* Map skeleton */}
                  {!hasMap && transcripts.length > 0 && (
                    <div className="bg-white dark:bg-card rounded-2xl border border-border/60 shadow-sm p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground/40" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                      <Skeleton className="h-[200px] w-full rounded-xl" />
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* skeleton row when nothing yet */}
            {!hasMap && !hasDates && transcripts.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-[2fr_3fr] gap-4">
                <div className="bg-white dark:bg-card rounded-2xl border border-border/60 shadow-sm p-4 space-y-3">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-[220px] w-full rounded-xl" />
                </div>
                <div className="bg-white dark:bg-card rounded-2xl border border-border/60 shadow-sm p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground/40" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                  <Skeleton className="h-[200px] w-full rounded-xl" />
                </div>
              </div>
            )}

            <AnimatePresence>
              {primaryVideo && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                >
                  <div className="bg-white dark:bg-card rounded-2xl border border-border/60 shadow-sm overflow-hidden">
                    <div className="px-4 pt-4 pb-1">
                      <span className="text-[10px] font-semibold text-primary uppercase tracking-widest">
                        Video Reference
                      </span>
                    </div>
                    <VideoCard video={primaryVideo} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Context videos */}
            <AnimatePresence>
              {contextVideos.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="bg-white dark:bg-card rounded-2xl border border-border/60 shadow-sm p-4 space-y-2"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Youtube className="h-3.5 w-3.5 text-red-500" />
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                      Also found based on metrics
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {contextVideos.slice(0, 4).map((v) => (
                      <SmallVideoCard key={v.video_id} {...v} />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Discovery video skeleton */}
            {discoveryStatus === "running" && !primaryVideo && (
              <div className="bg-white dark:bg-card rounded-2xl border border-border/60 shadow-sm p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Youtube className="h-3.5 w-3.5 text-muted-foreground/40" />
                  <Skeleton className="h-3 w-36" />
                </div>
                <Skeleton className="h-[160px] w-full rounded-xl" />
                <div className="space-y-1.5">
                  {[1, 2].map((i) => (
                    <Skeleton key={i} className="h-12 w-full rounded-lg" />
                  ))}
                </div>
              </div>
            )}

            {/* ── SECTION 4: Itinerary timeline ── */}
            <AnimatePresence>
              {itinerary?.days?.length ? (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="bg-white dark:bg-card rounded-2xl border border-border/60 shadow-sm p-5"
                >
                  {/* Itinerary header */}
                  <div className="flex items-center gap-2 mb-5">
                    <FileText className="h-4 w-4 text-primary" />
                    <span className="text-sm font-semibold text-foreground">Live Itinerary</span>
                    <span className="ml-auto text-[10px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                      {itinerary.destination}
                    </span>
                  </div>

                  {/* Timeline days */}
                  <div className="space-y-7">
                    {itinerary.days.map((d, di) => {
                      // Compute the calendar date for this itinerary day
                      const dayWeather = (() => {
                        if (!dates?.start_date) return null;
                        const base = new Date(dates.start_date + "T00:00:00");
                        base.setDate(base.getDate() + (d.day - 1));
                        const y = base.getFullYear();
                        const mo = String(base.getMonth() + 1).padStart(2, "0");
                        const dy = String(base.getDate()).padStart(2, "0");
                        const key = `${y}-${mo}-${dy}`;
                        return weatherByDate[key] ?? null;
                      })();

                      // Format date label: "Mon, 5 Mar"
                      const dayDateLabel = (() => {
                        if (!dates?.start_date) return null;
                        const base = new Date(dates.start_date + "T00:00:00");
                        base.setDate(base.getDate() + (d.day - 1));
                        const weekday = base.toLocaleDateString("en-US", { weekday: "short" });
                        const num = base.getDate();
                        const mon = base.toLocaleDateString("en-US", { month: "short" });
                        return `${weekday}, ${num} ${mon}`;
                      })();

                      return (
                        <div key={d.day} className="relative">
                          {/* Day pill */}
                          <div className="flex items-center gap-2 mb-3 flex-wrap">
                            <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-foreground text-[10px] font-bold shrink-0 shadow-sm">
                              {d.day}
                            </div>
                            {dayDateLabel && (
                              <span className="text-[11px] text-muted-foreground font-medium">{dayDateLabel}</span>
                            )}
                            <span className="text-sm font-semibold text-foreground">{d.title}</span>
                            {dayWeather && (
                              <span className="ml-auto flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-slate-100/80 dark:bg-muted border border-border/40 rounded-full px-2.5 py-0.5">
                                {wmoIcon(dayWeather.weatherCode)}
                                <span className="text-foreground font-semibold">{Math.round(dayWeather.tempMax)}°</span>
                                <span className="text-muted-foreground/70">/{Math.round(dayWeather.tempMin)}°</span>
                              </span>
                            )}
                            {di < itinerary.days.length - 1 && (
                              <div className="absolute left-3.5 top-7 bottom-0 w-px bg-border/70 -translate-x-1/2" />
                            )}
                          </div>

                          {/* Activity cards */}
                          <div className="pl-10 space-y-2">
                            {d.items.map((it, i) => (
                              <div
                                key={i}
                                className={cn(
                                  "flex items-start gap-3 rounded-xl px-3 py-3 text-xs border border-transparent transition-shadow hover:shadow-sm",
                                  typeColor[it.type] || "bg-slate-50 border-slate-100"
                                )}
                              >
                                <span className="mt-0.5 shrink-0 opacity-80">{typeIcon[it.type]}</span>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-baseline gap-2 flex-wrap">
                                    <span className="font-semibold text-[11px] tabular-nums text-muted-foreground/80">{it.time}</span>
                                    <span className="font-semibold text-foreground text-[13px]">{it.title}</span>
                                  </div>
                                  {it.note && (
                                    <span className="block text-muted-foreground text-[11px] mt-0.5 leading-relaxed">{it.note}</span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              ) : discoveryStatus !== "idle" || transcripts.length > 4 ? (
                <div className="bg-white dark:bg-card rounded-2xl border border-border/60 shadow-sm p-5 space-y-4">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground/40" />
                    <Skeleton className="h-3.5 w-28" />
                  </div>
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="space-y-2 pl-10">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-9 w-full rounded-xl" />
                      <Skeleton className="h-9 w-5/6 rounded-xl" />
                      <Skeleton className="h-9 w-4/5 rounded-xl" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <FileText className="h-8 w-8 text-muted-foreground/20 mb-3" />
                  <p className="text-xs text-muted-foreground italic">
                    Answer the agent's questions — your trip plan will build here.
                  </p>
                </div>
              )}
            </AnimatePresence>

          </div>
        </div>
      </div>

      {/* ═══ RIGHT: Conversation ═══ */}
      <div className="w-[320px] shrink-0 flex flex-col border-l border-border/60 bg-white/70 dark:bg-card/80 backdrop-blur-sm">
        {/* Panel header */}
        <div className="px-4 py-3 border-b border-border/50 bg-white/80 dark:bg-card shrink-0">
          <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Conversation</span>
        </div>

        {/* Messages */}
        <div ref={chatScrollRef} className="flex-1 overflow-y-auto px-3 py-4 space-y-3">
          <AnimatePresence>
            {transcripts.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-10 gap-2"
              >
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Send className="h-3.5 w-3.5 text-primary" />
                </div>
                <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
                  Speak or type<br />the conversation will appear here.
                </p>
              </motion.div>
            )}
            {transcripts.map((t) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={cn(
                  "flex flex-col gap-0.5",
                  t.role === "user" ? "items-end" : "items-start"
                )}
              >
                <span className="text-[9px] font-bold uppercase tracking-widest px-1 text-muted-foreground/60">
                  {t.role === "agent" ? "Agent" : "You"}
                </span>
                <div className={cn(
                  "rounded-2xl px-3.5 py-2.5 text-[12.5px] leading-relaxed max-w-[92%] shadow-sm",
                  t.role === "user"
                    ? "bg-primary text-primary-foreground rounded-tr-sm"
                    : "bg-white dark:bg-card border border-border/60 text-foreground rounded-tl-sm"
                )}>
                  {t.text}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Text input */}
        <div className="border-t border-border/50 px-3 py-3 flex items-center gap-2 bg-white/90 dark:bg-card shrink-0">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="Type a message…"
            disabled={discoveryStatus === "running"}
            className="flex-1 text-xs px-3 py-2 rounded-xl border border-input bg-slate-50 dark:bg-background focus:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60 transition-shadow focus:shadow-sm"
          />
          <Button
            size="icon"
            className="h-8 w-8 rounded-xl shrink-0"
            disabled={sendingText || !inputText.trim() || discoveryStatus === "running"}
            onClick={() => void handleSendText()}
          >
            <Send className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ─── Outer Wrapper ─── */

interface VoicePlanViewProps {
  initialQuery: string;
  /** Optional pre-composed trip query to auto-send to the agent once connected */
  initialMessage?: string;
  onBack: () => void;
}

export default function VoicePlanView({ initialQuery, initialMessage, onBack }: VoicePlanViewProps) {
  const [token, setToken] = useState<string | null>(null);
  const [wsUrl, setWsUrl] = useState<string>("");
  const [roomName] = useState(() => `plan-${initialQuery.replace(/\s+/g, "-")}-${Date.now()}`);
  const [error, setError] = useState<string | null>(null);

  // Shared state lifted here for persistence across LiveKitRoom reconnects
  const [itinerary, setItinerary] = useState<ItineraryPayload | null>(null);
  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([]);
  const [locations, setLocations] = useState<{
    origin: LocationPoint | null;
    destination: LocationPoint | null;
  }>({ origin: null, destination: null });
  const [dates, setDates] = useState<TravelDates | null>(null);
  const [primaryVideo, setPrimaryVideo] = useState<VideoInfo | null>(null);
  const [contextVideos, setContextVideos] = useState<ContextVideo[]>([]);
  const [discoveryStatus, setDiscoveryStatus] = useState<"idle" | "running" | "done">("idle");

  // Lives here (outside VoiceRoomContent) so StrictMode double-mount doesn't reset it
  const initialMessageSentRef = useRef(false);

  // Stable callback — avoids VoiceRoomContent effects re-running on every render
  const handleTranscript = useCallback(
    (t: TranscriptEntry) => setTranscripts((prev) => [...prev, t]),
    []
  );

  useEffect(() => {
    const url = `${TOKEN_API}/token?room=${encodeURIComponent(roomName)}`;
    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setToken(data.token);
        setWsUrl(data.wsUrl || LIVEKIT_WS || "");
      })
      .catch((e) => setError(e.message));
  }, [roomName]);

  const handleLocations = useCallback((o: LocationPoint | null, d: LocationPoint | null) => {
    setLocations((prev) => ({
      origin: o ?? prev.origin,
      destination: d ?? prev.destination,
    }));
  }, []);

  if (error) {
    return (
      <div className="h-[calc(100vh-3.5rem)] flex flex-col items-center justify-center gap-4 p-8">
        <p className="text-destructive">Could not get voice room token: {error}</p>
        <p className="text-xs text-muted-foreground">
          Ensure the token server is running and LIVEKIT_* are set.
        </p>
        <Button onClick={onBack}>Back</Button>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="h-[calc(100vh-3.5rem)] flex items-center justify-center">
        <p className="text-muted-foreground">Getting voice room token…</p>
      </div>
    );
  }

  const effectiveWsUrl = wsUrl || LIVEKIT_WS || undefined;
  if (!effectiveWsUrl) {
    return (
      <div className="h-[calc(100vh-3.5rem)] flex flex-col items-center justify-center gap-4 p-8">
        <p className="text-muted-foreground">
          Set VITE_LIVEKIT_WS in .env or ensure the token server returns wsUrl.
        </p>
        <Button onClick={onBack}>Back</Button>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col overflow-hidden bg-slate-50/40 dark:bg-background">
      {/* Top bar — elevated glass header */}
      <div className="h-12 border-b border-border/50 flex items-center px-4 gap-3 shrink-0 bg-white/90 dark:bg-card/90 backdrop-blur-sm shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
        <button
          onClick={onBack}
          className="flex items-center justify-center h-7 w-7 rounded-lg bg-transparent hover:bg-slate-100 dark:hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
          aria-label="Go back"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="h-4 w-px bg-border/60" />
        <p className="text-sm font-semibold tracking-tight text-foreground">Plan your trip</p>
      </div>
      {/* Main content — FIXED, no page scroll */}
      <div className="flex-1 min-h-0">
        <LiveKitRoom
          serverUrl={effectiveWsUrl}
          token={token}
          connect
          audio
          video={false}
          className="flex-1 flex flex-col min-h-0 h-full"
        >
          <VoiceRoomContent
            onItineraryUpdate={setItinerary}
            itinerary={itinerary}
            transcripts={transcripts}
            onTranscript={handleTranscript}
            onLocations={handleLocations}
            locations={locations}
            onDates={setDates}
            dates={dates}
            onPrimaryVideo={setPrimaryVideo}
            primaryVideo={primaryVideo}
            onContextVideos={setContextVideos}
            contextVideos={contextVideos}
            discoveryStatus={discoveryStatus}
            setDiscoveryStatus={setDiscoveryStatus}
            initialMessage={initialMessage}
            initialMessageSentRef={initialMessageSentRef}
          />
          <RoomAudioRenderer />
        </LiveKitRoom>
      </div>
    </div>
  );
}
