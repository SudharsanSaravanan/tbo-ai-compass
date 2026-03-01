import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  MapPin,
  Calendar as CalendarIcon,
  Users,
  Search,
  ChevronDown,
  Navigation,
  Youtube,
  Sparkles,
  Trash2,
  FolderOpen,
  Link2,
  ChevronRight,
} from "lucide-react";
import { format } from "date-fns";
import { ScaleLoader } from "react-spinners";
import { motion, AnimatePresence } from "framer-motion";
import heroImage from "@/assets/hero-travel.png";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import TripSearchOverlay from "@/components/TripSearchOverlay";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "tbo_travel_plans";
const BUCKETS_STORAGE_KEY = "tbo_travel_buckets";

interface SavedPlan {
  id: string;
  type: "youtube" | "blog";
  planName: string;
  note?: string;
  url: string;
  videoId: string | null;
  title: string;
  savedAt: string;
  thumbnail: string | null;
  bucketId: string | null;
  bucketName?: string;
}

interface Bucket {
  id: string;
  name: string;
  createdAt: string;
}

function readPlansFromStorage(): SavedPlan[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function readBucketsFromStorage(): Bucket[] {
  try {
    const raw = localStorage.getItem(BUCKETS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

let siteLoaded = false;

export default function Index() {
  const [query, setQuery] = useState("");
  const [origin, setOrigin] = useState("");
  const [showOrb, setShowOrb] = useState(false);
  const [travelDate, setTravelDate] = useState<Date>();
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(!siteLoaded);
  const [savedPlans, setSavedPlans] = useState<SavedPlan[]>([]);
  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [selectedBucketFilter, setSelectedBucketFilter] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) {
      const timer = setTimeout(() => {
        siteLoaded = true;
        setLoading(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  // Read plans + buckets on mount and listen for storage changes (pushed by extension background)
  useEffect(() => {
    setSavedPlans(readPlansFromStorage());
    setBuckets(readBucketsFromStorage());

    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY || e.key === null) {
        setSavedPlans(readPlansFromStorage());
      }
      if (e.key === BUCKETS_STORAGE_KEY || e.key === null) {
        setBuckets(readBucketsFromStorage());
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const handleSearch = () => {
    const destination = query.trim();
    const from = origin.trim();

    if (!destination && !from && !travelDate) {
      navigate("/plan");
      return;
    }

    const parts: string[] = ["I want to plan a trip"];
    if (from) parts.push(`from ${from}`);
    if (destination) parts.push(`to ${destination}`);
    if (travelDate) {
      const formatted = format(travelDate, "MMMM d, yyyy");
      parts.push(`during ${formatted}`);
    }
    const totalPeople = adults + children;
    const peopleDesc = children > 0
      ? `${adults} adult${adults !== 1 ? "s" : ""} and ${children} child${children !== 1 ? "ren" : ""}`
      : `${adults} adult${adults !== 1 ? "s" : ""}`;
    parts.push(`for ${peopleDesc} (${totalPeople} ${totalPeople === 1 ? "person" : "people"} total)`);

    const initialMessage = parts.join(" ") + ". Please plan this trip for me.";
    navigate("/plan", { state: { query: destination || from || "Trip", initialMessage } });
  };

  const handleGenerateItinerary = (plan: SavedPlan) => {
    const title = plan.planName || plan.title || "Travel Plan";
    const initialMessage =
      `I want to plan a trip based on this YouTube travel video: ${plan.url}. ` +
      `The video is titled "${title}". Please use this video as your reference and help me plan this trip.`;
    navigate("/plan", { state: { query: title, initialMessage } });
  };

  const handleRemovePlan = (planId: string) => {
    const updated = savedPlans.filter((p) => p.id !== planId);
    setSavedPlans(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch { /* ignore */ }
  };

  // Grouped view: buckets with plans, and "Uncategorized" for plans without a bucket
  const filteredPlans = selectedBucketFilter
    ? savedPlans.filter((p) => p.bucketId === selectedBucketFilter)
    : savedPlans;

  // Build groups: one per bucket (that has plans), plus "Uncategorized"
  const buildGroups = () => {
    const groups: { bucket: Bucket | null; plans: SavedPlan[] }[] = [];
    const remaining = [...filteredPlans];

    if (!selectedBucketFilter) {
      buckets.forEach((b) => {
        const bPlans = remaining.filter((p) => p.bucketId === b.id);
        if (bPlans.length > 0) {
          groups.push({ bucket: b, plans: bPlans });
          bPlans.forEach((p) => remaining.splice(remaining.indexOf(p), 1));
        }
      });
    }

    // Remaining (uncategorized or filtered bucket view)
    if (remaining.length > 0) {
      groups.push({ bucket: null, plans: remaining });
    }

    return groups;
  };

  const groups = buildGroups();

  if (loading) {
    return (
      <div className="fixed inset-0 z-[100] bg-background flex items-center justify-center">
        <div className="flex">
          <ScaleLoader color="#2563eb" height={50} width={6} radius={4} />
          <ScaleLoader color="#f97316" height={50} width={6} radius={4} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] pb-12">
      {/* ── Hero Section ── */}
      <section className="relative pt-6 md:pt-8 pb-4 md:pb-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative h-[65vh] min-h-[480px] md:h-[65vh] md:min-h-[440px] lg:min-h-[520px] rounded-3xl lg:rounded-4xl overflow-hidden shadow-2xl">
            {/* Mobile: Static Image */}
            <div className="absolute inset-0 md:hidden">
              <img
                src={heroImage}
                alt="Travel destination"
                className="absolute inset-0 w-full h-full object-cover"
              />
            </div>

            {/* Desktop: YouTube Video Background */}
            <div className="absolute inset-0 overflow-hidden hidden md:block">
              {/* <iframe
                className="
                  absolute top-1/2 left-1/2 
                  -translate-x-1/2 -translate-y-1/2 
                  w-[160%] lg:w-[140%] xl:w-[120%] 
                  h-[200%] 
                  min-w-full min-h-full 
                  pointer-events-none
                "
                src="https://www.youtube.com/embed/J6z3Q-5bpvc?autoplay=1&enablejsapi=1&mute=1&controls=0&loop=1&playlist=J6z3Q-5bpvc"
                title="Travel background video"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              /> */}
            </div>

            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/30 to-black/65" />

            {/* Hero Content */}
            <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-5 sm:px-8 lg:px-12">
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold font-heading text-white mb-5 md:mb-6 tracking-tight drop-shadow-2xl">
                Trip Planning, Simplified
              </h1>
              <p className="text-white/90 text-base sm:text-base md:text-lg lg:text-xl max-w-3xl mb-8 md:mb-12 drop-shadow-lg">
                AI-crafted itineraries with transport, stays, food, and experiences — tailored to your budget, dates,
                and travel style.
              </p>

              {/* Search Bar */}
              <div className="bg-white/95 backdrop-blur-md rounded-full shadow-2xl p-1.5 sm:p-2 flex items-center w-full max-w-5xl">
                {/* Origin */}
                <div className="flex-1 flex items-center gap-3 sm:gap-4 px-5 sm:px-6 py-3 sm:py-4 border-r border-gray-200">
                  <Navigation className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground shrink-0" />
                  <input
                    value={origin}
                    onChange={(e) => setOrigin(e.target.value)}
                    placeholder="From where?"
                    className="w-full bg-transparent text-base sm:text-lg text-gray-900 placeholder:text-gray-500 outline-none"
                  />
                </div>

                {/* Destination */}
                <div className="flex-1 flex items-center gap-3 sm:gap-4 px-5 sm:px-6 py-3 sm:py-4 border-r border-gray-200">
                  <MapPin className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground shrink-0" />
                  <input
                    ref={searchInputRef}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    placeholder="Your destination?"
                    className="w-full bg-transparent text-base sm:text-lg text-gray-900 placeholder:text-gray-500 outline-none"
                  />
                </div>

                {/* Date */}
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="hidden md:flex items-center gap-3 px-6 py-4 border-r border-gray-200 text-base whitespace-nowrap hover:bg-gray-50 transition-colors cursor-pointer">
                      <CalendarIcon className="h-5 w-5 shrink-0 text-muted-foreground" />
                      <span className={cn(travelDate ? "text-gray-900" : "text-muted-foreground")}>
                        {travelDate ? format(travelDate, "MMM d, yyyy") : "Anytime"}
                      </span>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={travelDate}
                      onSelect={setTravelDate}
                      disabled={(date) => date < new Date()}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>

                {/* Guests */}
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="hidden lg:flex items-center gap-3 px-6 py-4 text-base whitespace-nowrap hover:bg-gray-50 transition-colors cursor-pointer">
                      <Users className="h-5 w-5 shrink-0 text-muted-foreground" />
                      <span className="text-gray-900">
                        {adults} Adult{adults !== 1 ? "s" : ""}
                        {children > 0 ? `, ${children} Child${children !== 1 ? "ren" : ""}` : ""}
                      </span>
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 p-4" align="start">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Adults</span>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => setAdults(Math.max(1, adults - 1))}
                            className="h-8 w-8 rounded-full border flex items-center justify-center text-sm hover:bg-accent transition-colors"
                          >−</button>
                          <span className="text-sm w-4 text-center">{adults}</span>
                          <button
                            onClick={() => setAdults(Math.min(10, adults + 1))}
                            className="h-8 w-8 rounded-full border flex items-center justify-center text-sm hover:bg-accent transition-colors"
                          >+</button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Children</span>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => setChildren(Math.max(0, children - 1))}
                            className="h-8 w-8 rounded-full border flex items-center justify-center text-sm hover:bg-accent transition-colors"
                          >−</button>
                          <span className="text-sm w-4 text-center">{children}</span>
                          <button
                            onClick={() => setChildren(Math.min(10, children + 1))}
                            className="h-8 w-8 rounded-full border flex items-center justify-center text-sm hover:bg-accent transition-colors"
                          >+</button>
                        </div>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>

                <Button
                  onClick={handleSearch}
                  size="lg"
                  className="rounded-full px-6 sm:px-8 h-11 sm:h-12 ml-2 sm:ml-3 bg-primary hover:bg-primary/90 text-base sm:text-lg font-medium"
                >
                  <Search className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                  Search
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Saved Travel Resources ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-12">
        {/* Header + bucket filter */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 md:mb-8 gap-3">
          <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2.5">
            Your Saved Travel Resources
            {savedPlans.length > 0 && (
              <span className="text-sm text-muted-foreground bg-muted px-3 py-1 rounded-full font-medium">
                {savedPlans.length} saved
              </span>
            )}
          </h2>

          {/* Bucket filter pills */}
          {buckets.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setSelectedBucketFilter(null)}
                className={cn(
                  "flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border transition-all",
                  selectedBucketFilter === null
                    ? "bg-primary text-white border-primary shadow-sm"
                    : "bg-card border-border text-muted-foreground hover:border-primary/50"
                )}
              >
                All
              </button>
              {buckets.map((b) => {
                const count = savedPlans.filter((p) => p.bucketId === b.id).length;
                return (
                  <button
                    key={b.id}
                    onClick={() => setSelectedBucketFilter(b.id)}
                    className={cn(
                      "flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border transition-all",
                      selectedBucketFilter === b.id
                        ? "bg-primary text-white border-primary shadow-sm"
                        : "bg-card border-border text-muted-foreground hover:border-primary/50"
                    )}
                  >
                    <FolderOpen className="h-3 w-3" />
                    {b.name}
                    {count > 0 && (
                      <span className={cn(
                        "ml-0.5 px-1.5 py-0 rounded-full text-[10px] font-bold",
                        selectedBucketFilter === b.id ? "bg-white/20" : "bg-muted"
                      )}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {savedPlans.length === 0 ? (
          /* Empty state */
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col items-center justify-center py-16 md:py-24 rounded-3xl border-2 border-dashed border-border bg-card/50"
          >
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <FolderOpen className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No saved travel resources yet</h3>
            <p className="text-muted-foreground text-sm text-center max-w-sm leading-relaxed">
              Use the <strong>TBO AI Compass</strong> browser extension to save YouTube travel videos or
              blog URLs. Organise them into buckets like "Chennai Trip" and generate itineraries instantly.
            </p>
            <div className="mt-6 flex items-center gap-4 flex-wrap justify-center">
              <a
                href="https://www.youtube.com/results?search_query=travel+destinations"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
              >
                <Youtube className="h-4 w-4 text-red-500" />
                Explore travel videos
              </a>
            </div>
          </motion.div>
        ) : filteredPlans.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-12 rounded-2xl border border-dashed border-border"
          >
            <FolderOpen className="h-8 w-8 text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground text-sm">No resources in this bucket yet.</p>
          </motion.div>
        ) : (
          /* Grouped display */
          <div className="space-y-10">
            <AnimatePresence>
              {groups.map((group, gi) => (
                <motion.div
                  key={group.bucket?.id ?? "uncategorized"}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ duration: 0.3, delay: gi * 0.05 }}
                >
                  {/* Group header */}
                  {group.bucket ? (
                    <div className="flex items-center gap-2.5 mb-4">
                      <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-3 py-1.5 rounded-full">
                        <FolderOpen className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                        <span className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                          {group.bucket.name}
                        </span>
                        <span className="text-xs text-amber-500 font-medium">
                          {group.plans.length} item{group.plans.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="flex-1 h-px bg-amber-200/50 dark:bg-amber-800/30" />
                    </div>
                  ) : savedPlans.length !== filteredPlans.length || buckets.length > 0 ? (
                    <div className="flex items-center gap-2.5 mb-4">
                      <div className="flex items-center gap-2 bg-muted/60 border border-border px-3 py-1.5 rounded-full">
                        <span className="text-sm font-medium text-muted-foreground">Uncategorized</span>
                        <span className="text-xs text-muted-foreground">
                          {group.plans.length} item{group.plans.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="flex-1 h-px bg-border/50" />
                    </div>
                  ) : null}

                  {/* Cards grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 md:gap-6">
                    <AnimatePresence>
                      {group.plans.map((plan, i) => (
                        <motion.div
                          key={plan.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ duration: 0.3, delay: i * 0.05 }}
                          className="group bg-card border rounded-2xl overflow-hidden hover:shadow-xl hover:scale-[1.02] transition-all duration-300 flex flex-col"
                        >
                          {plan.type === "youtube" ? (
                            /* ── YouTube card ── */
                            <>
                              <div className="relative aspect-video bg-muted overflow-hidden">
                                <img
                                  src={plan.thumbnail || `https://img.youtube.com/vi/${plan.videoId}/mqdefault.jpg`}
                                  alt={plan.title}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${plan.videoId}/default.jpg`;
                                  }}
                                />
                                {/* Play overlay */}
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/30">
                                  <a
                                    href={plan.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center shadow-lg hover:bg-red-700 transition-colors"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <svg className="w-6 h-6 text-white ml-0.5" viewBox="0 0 24 24" fill="currentColor">
                                      <path d="M8 5v14l11-7z" />
                                    </svg>
                                  </a>
                                </div>
                                {/* Type badge */}
                                <div className="absolute top-2 left-2">
                                  <span className="flex items-center gap-1 text-[10px] font-semibold bg-red-600 text-white px-2 py-0.5 rounded-full">
                                    <Youtube className="h-2.5 w-2.5" /> YouTube
                                  </span>
                                </div>
                                {/* Date badge */}
                                <div className="absolute top-2 right-2">
                                  <span className="text-[10px] font-medium bg-black/60 text-white px-2 py-0.5 rounded-full backdrop-blur-sm">
                                    {new Date(plan.savedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                  </span>
                                </div>
                                {/* Remove button */}
                                <button
                                  onClick={() => handleRemovePlan(plan.id)}
                                  className="absolute bottom-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                                  title="Remove"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>

                              <div className="p-4 flex flex-col flex-1">
                                {plan.bucketName && (
                                  <div className="flex items-center gap-1 mb-2">
                                    <FolderOpen className="h-3 w-3 text-amber-500" />
                                    <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                                      {plan.bucketName}
                                    </span>
                                  </div>
                                )}
                                <p className="font-semibold text-sm md:text-base line-clamp-2 mb-1 leading-snug">
                                  {plan.planName || plan.title}
                                </p>
                                {plan.note && (
                                  <p className="text-xs text-muted-foreground line-clamp-1 mb-3">{plan.note}</p>
                                )}
                                <div className="mt-auto pt-3">
                                  <Button
                                    onClick={() => handleGenerateItinerary(plan)}
                                    size="sm"
                                    className="w-full rounded-xl bg-primary hover:bg-primary/90 text-sm font-medium gap-1.5"
                                  >
                                    <Sparkles className="h-3.5 w-3.5" />
                                    Generate Itinerary
                                  </Button>
                                </div>
                              </div>
                            </>
                          ) : (
                            /* ── Blog / URL card ── */
                            <>
                              {/* Blog visual header */}
                              <div className="relative h-16 bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center overflow-hidden">
                                <div className="absolute inset-0 opacity-10 bg-[repeating-linear-gradient(45deg,white_0px,white_1px,transparent_1px,transparent_8px)]" />
                                <Link2 className="h-7 w-7 text-white/80" />
                                {/* Date */}
                                <div className="absolute top-2 right-2">
                                  <span className="text-[10px] font-medium bg-black/40 text-white px-2 py-0.5 rounded-full backdrop-blur-sm">
                                    {new Date(plan.savedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                  </span>
                                </div>
                                {/* Type badge */}
                                <div className="absolute top-2 left-2">
                                  <span className="flex items-center gap-1 text-[10px] font-semibold bg-blue-900/70 text-blue-100 px-2 py-0.5 rounded-full backdrop-blur-sm">
                                    <Link2 className="h-2.5 w-2.5" /> Blog
                                  </span>
                                </div>
                                {/* Remove button */}
                                <button
                                  onClick={() => handleRemovePlan(plan.id)}
                                  className="absolute bottom-2 right-2 w-7 h-7 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                                  title="Remove"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>

                              <div className="p-4 flex flex-col flex-1">
                                {plan.bucketName && (
                                  <div className="flex items-center gap-1 mb-2">
                                    <FolderOpen className="h-3 w-3 text-amber-500" />
                                    <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                                      {plan.bucketName}
                                    </span>
                                  </div>
                                )}
                                <p className="font-semibold text-sm md:text-base line-clamp-2 mb-1 leading-snug">
                                  {plan.planName || plan.title}
                                </p>
                                {plan.note && (
                                  <p className="text-xs text-muted-foreground line-clamp-1 mb-1">{plan.note}</p>
                                )}
                                <a
                                  href={plan.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[11px] text-primary/70 hover:text-primary hover:underline truncate block mb-3"
                                >
                                  {plan.url.replace(/^https?:\/\/(www\.)?/, "").slice(0, 50)}
                                </a>
                                <div className="mt-auto pt-1 flex gap-2">
                                  <Button
                                    onClick={() => handleGenerateItinerary(plan)}
                                    size="sm"
                                    className="flex-1 rounded-xl bg-primary hover:bg-primary/90 text-sm font-medium gap-1.5"
                                  >
                                    <Sparkles className="h-3.5 w-3.5" />
                                    Generate
                                  </Button>
                                  <a
                                    href={plan.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center justify-center w-9 h-9 rounded-xl border border-border bg-card hover:bg-accent transition-colors"
                                    title="Open URL"
                                  >
                                    <ChevronRight className="h-4 w-4" />
                                  </a>
                                </div>
                              </div>
                            </>
                          )}
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </section>

      {showOrb && (
        <TripSearchOverlay
          initialQuery={query}
          onClose={() => setShowOrb(false)}
          onSubmit={(data) => {
            setShowOrb(false);
            const q = data.destination || query || "Trip";
            navigate("/intent", { state: { query: q } });
          }}
        />
      )}
    </div>
  );
}
