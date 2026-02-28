/**
 * Voice planning with LiveKit: fixed layout, progressive content sections.
 * Left = waveform (fixed) + scrollable content (map, calendar, weather, video, itinerary).
 * Right = conversation transcript + text input.
 */

import { useState, useEffect, useCallback, useRef, type MutableRefObject } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LiveWaveform } from "@/components/ui/live-waveform";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import TripMap, { type LocationPoint } from "./TripMap";
import TripCalendar from "./TripCalendar";
import TripWeather from "./TripWeather";
import VideoCard, { SmallVideoCard, type VideoInfo } from "./VideoCard";

const APP_DATA_TOPIC = "tbo-app-data";
const TOKEN_API = import.meta.env.VITE_TOKEN_API || "http://localhost:8765";
const LIVEKIT_WS = import.meta.env.VITE_LIVEKIT_WS || "";

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
              if (data.text) onTranscript({ id: `a-${Date.now()}`, role: "agent", text: data.text });
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

  const typeIcon: Record<string, React.ReactNode> = {
    place: <MapPin className="h-3 w-3" />,
    food: <Utensils className="h-3 w-3" />,
    transport: <Bus className="h-3 w-3" />,
    experience: <Camera className="h-3 w-3" />,
  };
  const typeColor: Record<string, string> = {
    place: "text-primary bg-primary/10",
    food: "text-orange-600 bg-orange-500/10",
    transport: "text-muted-foreground bg-secondary",
    experience: "text-emerald-600 bg-emerald-500/10",
  };

  return (
    <div className="flex-1 flex min-h-0 h-full">
      {/* ═══ LEFT: Waveform (fixed) + Scrollable Content ═══ */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Fixed waveform section */}
        <div className="shrink-0 border-b border-border px-6 py-4 bg-background/80 backdrop-blur-sm">
          <div className="flex items-center justify-center gap-4">
            <div
              className={cn(
                "w-44 h-16 rounded-xl border-2 flex items-center justify-center transition-all",
                connected ? "border-primary bg-primary/5" : "border-muted bg-muted/30",
                discoveryStatus === "running" && "opacity-30"
              )}
            >
              {connected ? (
                <LiveWaveform active height={48} barWidth={3} barGap={2} mode="static" fadeEdges barColor="primary" />
              ) : (
                <span className="text-xs text-muted-foreground">Connecting…</span>
              )}
            </div>
            <div className="text-left">
              <p className="text-sm text-foreground font-medium">
                {connected
                  ? discoveryStatus === "running"
                    ? "Analyzing videos for your trip…"
                    : "Speak — the agent is listening"
                  : "Waiting for room…"}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {discoveryStatus === "running"
                  ? "We'll resume once analysis finishes."
                  : "You can also type below."}
              </p>
            </div>
          </div>

          {/* Discovery progress */}
          <AnimatePresence>
            {discoveryStatus === "running" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 flex items-center gap-2 justify-center"
              >
                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                <span className="text-[11px] text-muted-foreground">
                  {discoveryQuery
                    ? `Searching YouTube for "${discoveryQuery.slice(0, 60)}"…`
                    : "Searching YouTube for travel videos…"}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Scrollable content area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Map section */}
          <AnimatePresence>
            {hasMap && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-semibold text-foreground">Route</span>
                  {locations.origin && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-600">
                      {locations.origin.name}
                    </span>
                  )}
                  {locations.destination && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-600">
                      {locations.destination.name}
                    </span>
                  )}
                </div>
                <TripMap origin={locations.origin} destination={locations.destination} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Map skeleton (before map data) */}
          {!hasMap && transcripts.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground/40" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-[160px] w-full rounded-xl" />
            </div>
          )}

          {/* Calendar section */}
          <AnimatePresence>
            {hasDates && dates && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
              >
                <TripCalendar
                  startDate={dates.start_date}
                  endDate={dates.end_date}
                  numDays={dates.num_days}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Calendar skeleton */}
          {!hasDates && hasMap && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-3.5 w-3.5 rounded" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-[200px] w-full rounded-xl" />
            </div>
          )}

          {/* Weather section */}
          <AnimatePresence>
            {hasWeather && dates && locations.destination && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
              >
                <TripWeather
                  lat={locations.destination.lat}
                  lng={locations.destination.lng}
                  startDate={dates.start_date}
                  endDate={dates.end_date}
                  destinationName={locations.destination.name}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Primary video card */}
          <AnimatePresence>
            {primaryVideo && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <VideoCard video={primaryVideo} label="Primary video used for planning" />
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
                className="space-y-1.5"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Youtube className="h-3.5 w-3.5 text-red-500" />
                  <span className="text-[10px] font-semibold text-muted-foreground">
                    Also found based on metrics
                  </span>
                </div>
                {contextVideos.slice(0, 4).map((v) => (
                  <SmallVideoCard key={v.video_id} {...v} />
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Discovery video skeleton */}
          {discoveryStatus === "running" && !primaryVideo && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Youtube className="h-3.5 w-3.5 text-muted-foreground/40" />
                <Skeleton className="h-3 w-36" />
              </div>
              <Skeleton className="h-[180px] w-full rounded-xl" />
              <div className="space-y-1.5">
                {[1, 2].map((i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-lg" />
                ))}
              </div>
            </div>
          )}

          {/* Live Itinerary */}
          <AnimatePresence>
            {itinerary?.days?.length ? (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="h-4 w-4 text-primary" />
                  <span className="text-xs font-semibold text-foreground">Live Itinerary</span>
                  <span className="text-[10px] text-muted-foreground ml-auto">{itinerary.destination}</span>
                </div>
                <div className="space-y-5">
                  {itinerary.days.map((d) => (
                    <div key={d.day} className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                          Day {d.day}
                        </span>
                        <span className="text-xs font-medium text-foreground">{d.title}</span>
                      </div>
                      <div className="space-y-1 pl-2 border-l-2 border-border/60 ml-1">
                        {d.items.map((it, i) => (
                          <div
                            key={i}
                            className={cn(
                              "flex items-start gap-2 rounded-lg px-2 py-1.5 text-[11px]",
                              typeColor[it.type] || "bg-secondary"
                            )}
                          >
                            <span className="mt-0.5 shrink-0">{typeIcon[it.type]}</span>
                            <div className="min-w-0">
                              <span className="font-semibold">{it.time}</span>{" "}
                              <span>{it.title}</span>
                              {it.note && (
                                <span className="block text-muted-foreground text-[10px]">{it.note}</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            ) : discoveryStatus !== "idle" || transcripts.length > 4 ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground/40" />
                  <Skeleton className="h-3.5 w-28" />
                </div>
                {[1, 2, 3].map((i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <div className="space-y-1 pl-3">
                      <Skeleton className="h-8 w-full rounded-lg" />
                      <Skeleton className="h-8 w-5/6 rounded-lg" />
                      <Skeleton className="h-8 w-4/5 rounded-lg" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic text-center py-8">
                Answer the agent's questions — your trip plan will build here.
              </p>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ═══ RIGHT: Conversation ═══ */}
      <div className="w-[340px] shrink-0 flex flex-col border-l border-border bg-gradient-to-b from-background via-card/80 to-background">
        <div className="px-4 py-2.5 border-b border-border">
          <span className="text-sm font-semibold">Conversation</span>
        </div>
        <div ref={chatScrollRef} className="flex-1 overflow-y-auto px-3 py-4 space-y-3">
          <AnimatePresence>
            {transcripts.length === 0 && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-xs text-muted-foreground italic text-center py-4"
              >
                Speak or type — the conversation will appear here.
              </motion.p>
            )}
            {transcripts.map((t) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "rounded-2xl px-3 py-2 text-[13px]",
                  t.role === "user"
                    ? "ml-6 bg-primary text-primary-foreground rounded-tr-sm"
                    : "mr-6 bg-secondary/80 rounded-tl-sm border border-border"
                )}
              >
                <span className="text-[9px] font-semibold opacity-70 uppercase">
                  {t.role === "agent" ? "Agent" : "You"}
                </span>
                <p className="mt-0.5 leading-relaxed">{t.text}</p>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        {/* Text input */}
        <div className="border-t border-border px-3 py-2 flex items-center gap-2 bg-background/80">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="Type or paste a YouTube link…"
            disabled={discoveryStatus === "running"}
            className="flex-1 text-xs px-3 py-2 rounded-md border border-input bg-background focus:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
          />
          <Button
            size="icon"
            className="h-7 w-7"
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
    <div className="h-[calc(100vh-3.5rem)] flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="h-10 border-b border-border flex items-center px-4 gap-3 shrink-0 bg-card/50">
        <Button variant="ghost" size="sm" onClick={onBack} className="h-7 px-2 text-muted-foreground">
          Back
        </Button>
        <div className="h-4 w-px bg-border" />
        <p className="text-sm font-medium truncate">Plan your trip</p>
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
