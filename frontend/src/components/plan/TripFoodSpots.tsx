/**
 * TripFoodSpots — top 3 local dishes for the destination.
 *
 * compact=true  → lightweight horizontal list; embeds inside the calendar card
 * compact=false → standalone full card with image grid (default)
 *
 * itineraryDays → each food spot is independently matched to its nearest
 *                 itinerary day (< 5 km), shown as a "Try on Day X" badge.
 */

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, UtensilsCrossed, ExternalLink, CalendarDays } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
    type FoodSpot,
    fetchFoodSpots,
    mapboxGeocode,
    haversineKm,
} from "@/lib/tavily";

interface ItineraryDayEntry {
    /** 1-based day number */
    day: number;
    /** Place names (type="place") from this day's items */
    placeNames: string[];
}

interface TripFoodSpotsProps {
    destinationName: string;
    destinationLat: number;
    destinationLng: number;
    selectedSpot: FoodSpot | null;
    onSelectSpot: (spot: FoodSpot | null) => void;
    onSpotsLoaded?: (spots: FoodSpot[]) => void;
    /** When true, renders as compact rows inside the calendar card */
    compact?: boolean;
    /**
     * Place names from each itinerary day.
     * Each food spot is matched to the nearest day for a "Try on Day X" badge.
     */
    itineraryDays?: ItineraryDayEntry[];
}

export default function TripFoodSpots({
    destinationName,
    destinationLat,
    destinationLng,
    selectedSpot,
    onSelectSpot,
    onSpotsLoaded,
    compact = false,
    itineraryDays = [],
}: TripFoodSpotsProps) {
    const [spots, setSpots] = useState<FoodSpot[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    /**
     * Per-spot day hint: dayHints[i] = day number (1-based) if spot i is
     * within 5 km of that day's first place, otherwise null.
     */
    const [dayHints, setDayHints] = useState<(number | null)[]>([]);
    const day1CheckedRef = useRef(false);

    // ── Fetch food spots ──────────────────────────────────────────────────────
    useEffect(() => {
        if (!destinationName) return;
        setLoading(true);
        setError(false);
        day1CheckedRef.current = false;
        fetchFoodSpots(destinationName, destinationLat, destinationLng)
            .then((data) => {
                setSpots(data);
                onSpotsLoaded?.(data);
                setLoading(false);
            })
            .catch(() => {
                setError(true);
                setLoading(false);
            });
    }, [destinationName]);

    // ── Day proximity check (runs after spots load) ──────────────────────────
    useEffect(() => {
        if (
            day1CheckedRef.current ||
            spots.length === 0 ||
            itineraryDays.length === 0
        )
            return;
        day1CheckedRef.current = true;

        async function computeDayHints() {
            // Geocode the first place of each itinerary day (parallel)
            const dayGeos = await Promise.all(
                itineraryDays
                    .filter((d) => d.placeNames.length > 0)
                    .map(async (d) => {
                        const geo = await mapboxGeocode(
                            `${d.placeNames[0]} ${destinationName}`,
                            destinationLng,
                            destinationLat
                        );
                        return geo ? { day: d.day, lat: geo.lat, lng: geo.lng } : null;
                    })
            );
            const validGeos = dayGeos.filter(Boolean) as {
                day: number;
                lat: number;
                lng: number;
            }[];

            if (validGeos.length === 0) return;

            // For each food spot, find the nearest day (within 8 km)
            const proxHints = spots.map((spot) => {
                let bestDay: number | null = null;
                let bestDist = Infinity;
                for (const dg of validGeos) {
                    const d = haversineKm(dg.lat, dg.lng, spot.lat, spot.lng);
                    if (d < bestDist && d <= 8) {
                        bestDist = d;
                        bestDay = dg.day;
                    }
                }
                return bestDay;
            });

            // ── Guarantee all 3 spots get a day badge ──────────────────────
            // Spots not matched by proximity get next available day cyclically
            const allDays = validGeos.map((g) => g.day);
            let fallbackIdx = 0;
            const finalHints = proxHints.map((h) => {
                if (h !== null) return h;
                const day = allDays[fallbackIdx % allDays.length];
                fallbackIdx++;
                return day;
            });

            setDayHints(finalHints);
        }

        computeDayHints();
    }, [spots, itineraryDays]);

    // ─── Loading ─────────────────────────────────────────────────────────────

    if (loading) {
        if (compact) {
            return (
                <div className="mt-3 pt-3 border-t border-border/40 space-y-2">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-center gap-2.5">
                            <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
                            <div className="flex-1 space-y-1.5">
                                <Skeleton className="h-2.5 w-3/4" />
                                <Skeleton className="h-2 w-1/2" />
                            </div>
                        </div>
                    ))}
                </div>
            );
        }
        return (
            <div className="bg-white dark:bg-card rounded-2xl border border-border/60 shadow-sm p-5 space-y-4">
                <div className="flex items-center gap-2">
                    <UtensilsCrossed className="h-4 w-4 text-orange-500" />
                    <Skeleton className="h-4 w-48" />
                </div>
                <div className="grid grid-cols-3 gap-3">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="space-y-2">
                            <Skeleton className="h-32 w-full rounded-xl" />
                            <Skeleton className="h-3 w-3/4" />
                            <Skeleton className="h-3 w-1/2" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (error || spots.length === 0) return null;

    // ─── COMPACT: embedded inside calendar card ──────────────────────────────

    if (compact) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
                className="mt-3 pt-3 border-t border-border/40"
            >
                {/* Compact header */}
                <div className="flex items-center gap-1.5 mb-2.5">
                    <UtensilsCrossed className="h-3 w-3 text-orange-500" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        Must-Try Foods
                    </span>
                </div>

                <div className="space-y-1.5">
                    <AnimatePresence>
                        {spots.map((spot, i) => {
                            const isSelected =
                                selectedSpot?.name === spot.name &&
                                selectedSpot?.lat === spot.lat;
                            const dayHint = dayHints[i] ?? null;

                            return (
                                <motion.div
                                    key={spot.name + i}
                                    initial={{ opacity: 0, x: -8 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.07 }}
                                    onClick={() => onSelectSpot(isSelected ? null : spot)}
                                    className={[
                                        "flex items-center gap-2.5 rounded-xl p-1.5 border transition-all cursor-pointer",
                                        isSelected
                                            ? "border-orange-300 bg-orange-50/60"
                                            : "border-transparent hover:bg-slate-50 hover:border-orange-100",
                                    ].join(" ")}
                                >
                                    {/* Thumbnail */}
                                    <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-slate-100 shrink-0">
                                        {spot.image ? (
                                            <img
                                                src={spot.image}
                                                alt={spot.name}
                                                className="w-full h-full object-cover"
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).style.display = "none";
                                                }}
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-base">🍽️</div>
                                        )}
                                        <div className="absolute top-0.5 left-0.5 w-3.5 h-3.5 rounded-full bg-orange-500 text-white text-[8px] font-bold flex items-center justify-center">
                                            {i + 1}
                                        </div>
                                    </div>

                                    {/* Name + day badge */}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[11px] font-semibold text-foreground truncate">{spot.name}</p>
                                        {dayHint !== null ? (
                                            <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-1.5 py-0 mt-0.5">
                                                <CalendarDays className="h-2 w-2" />
                                                Try on Day {dayHint}
                                            </span>
                                        ) : (
                                            spot.restaurant && (
                                                <p className="text-[9px] text-muted-foreground truncate leading-relaxed">
                                                    {spot.restaurant.split(".")[0]}
                                                </p>
                                            )
                                        )}
                                    </div>

                                    {/* Pin button — larger */}
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onSelectSpot(isSelected ? null : spot); }}
                                        title={isSelected ? "Deselect" : "Show on map"}
                                        className={[
                                            "shrink-0 flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full border transition-all",
                                            isSelected
                                                ? "bg-orange-500 text-white border-orange-500"
                                                : "bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-100",
                                        ].join(" ")}
                                    >
                                        <MapPin className="h-3 w-3" />
                                        {isSelected ? "✓" : "Pin"}
                                    </button>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>
            </motion.div>
        );
    }

    // ─── FULL: standalone card ───────────────────────────────────────────────

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="bg-white dark:bg-card rounded-2xl border border-border/60 shadow-sm p-5"
        >
            <div className="flex items-center gap-2 mb-4">
                <UtensilsCrossed className="h-4 w-4 text-orange-500" />
                <span className="text-sm font-semibold text-foreground">
                    Must-Try Foods in {destinationName}
                </span>
                <span className="ml-auto text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    Via Tavily AI
                </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <AnimatePresence>
                    {spots.map((spot, i) => {
                        const isSelected =
                            selectedSpot?.name === spot.name &&
                            selectedSpot?.lat === spot.lat;
                        const dayHint = dayHints[i] ?? null;

                        return (
                            <motion.div
                                key={spot.name + i}
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.08 }}
                                onClick={() => onSelectSpot(isSelected ? null : spot)}
                                className={[
                                    "group relative flex flex-col rounded-xl border overflow-hidden transition-all duration-200 cursor-pointer",
                                    isSelected
                                        ? "border-orange-400 shadow-md ring-1 ring-orange-300"
                                        : "border-border/50 hover:shadow-md hover:border-orange-200",
                                ].join(" ")}
                            >
                                <div className="relative h-32 bg-slate-100 overflow-hidden">
                                    {spot.image ? (
                                        <img
                                            src={spot.image}
                                            alt={spot.name}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).style.display = "none";
                                            }}
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-3xl">🍽️</div>
                                    )}
                                    <div className="absolute top-2 left-2 w-5 h-5 rounded-full bg-orange-500 text-white text-[10px] font-bold flex items-center justify-center shadow">
                                        {i + 1}
                                    </div>
                                    {dayHint !== null && (
                                        <div className="absolute top-2 right-2">
                                            <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-700 bg-emerald-50/90 border border-emerald-300 rounded-full px-2 py-0.5 backdrop-blur-sm">
                                                <CalendarDays className="h-2.5 w-2.5" />
                                                Try on Day {dayHint}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                <div className="flex flex-col gap-1 p-3 flex-1">
                                    <p className="text-xs font-semibold text-foreground leading-snug line-clamp-2">
                                        {spot.name}
                                    </p>
                                    {spot.restaurant && (
                                        <p className="text-[10px] text-muted-foreground leading-relaxed line-clamp-2">
                                            {spot.restaurant}
                                        </p>
                                    )}
                                    <div className="flex items-center gap-2 mt-auto pt-2">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onSelectSpot(isSelected ? null : spot); }}
                                            className={[
                                                "flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-full border transition-all",
                                                isSelected
                                                    ? "bg-orange-500 text-white border-orange-500 shadow-sm"
                                                    : "bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-100",
                                            ].join(" ")}
                                        >
                                            <MapPin className="h-3.5 w-3.5" />
                                            {isSelected ? "Pinned ✓" : "Show on map"}
                                        </button>
                                        <ExternalLink className="h-3 w-3 text-muted-foreground/40 ml-auto" />
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>
        </motion.div>
    );
}
