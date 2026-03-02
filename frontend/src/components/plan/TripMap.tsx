import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

import { type FoodSpot, mapboxGeocode, geocodeNearPoint, haversineKm } from "@/lib/tavily";

// ─── Leaflet default icon fix ─────────────────────────────────────────────────
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({ iconRetinaUrl: markerIcon2x, iconUrl: markerIcon, shadowUrl: markerShadow });

// ─── Route pin icons ──────────────────────────────────────────────────────────
const greenIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  shadowUrl: markerShadow, iconSize: [30, 48], iconAnchor: [15, 48], popupAnchor: [1, -34], shadowSize: [41, 41],
});
const redIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl: markerShadow, iconSize: [30, 48], iconAnchor: [15, 48], popupAnchor: [1, -34], shadowSize: [41, 41],
});
const blueIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
  shadowUrl: markerShadow, iconSize: [30, 48], iconAnchor: [15, 48], popupAnchor: [1, -34], shadowSize: [41, 41],
});

/** Fork-and-knife teardrop pin for food spots */
const makeFoodIcon = (active = false) => {
  const bg = active ? "#c2410c" : "#f97316";
  const border = active ? "#7c2d12" : "#c2410c";
  return L.divIcon({
    className: "",
    html: `<svg width="30" height="40" viewBox="0 0 30 40" xmlns="http://www.w3.org/2000/svg">
      <path d="M15 1C8.1 1 2.5 6.7 2.5 13.6C2.5 23.8 15 39 15 39S27.5 23.8 27.5 13.6C27.5 6.7 21.9 1 15 1z"
        fill="${bg}" stroke="${border}" stroke-width="1.2"/>
      <line x1="10.5" y1="8" x2="10.5" y2="19" stroke="white" stroke-width="1.6" stroke-linecap="round"/>
      <line x1="9" y1="8" x2="9" y2="12" stroke="white" stroke-width="1.2" stroke-linecap="round"/>
      <line x1="12" y1="8" x2="12" y2="12" stroke="white" stroke-width="1.2" stroke-linecap="round"/>
      <path d="M9 12 Q10.5 14 12 12" fill="none" stroke="white" stroke-width="1.2"/>
      <line x1="19.5" y1="8" x2="19.5" y2="19" stroke="white" stroke-width="1.6" stroke-linecap="round"/>
      <path d="M19.5 8 Q22 10 19.5 14" fill="${bg}" stroke="white" stroke-width="1.2" stroke-linejoin="round"/>
    </svg>`,
    iconSize: [30, 40], iconAnchor: [15, 40], popupAnchor: [0, -42],
  });
};


/** Day-number label: appears ONLY at the first waypoint of a day's route. */
const makeStartLabel = (dayNum: number, color: string) =>
  L.divIcon({
    className: "",
    html: `<div style="
      width:28px;height:28px;
      background:${color};
      border:3px solid white;
      border-radius:50%;
      display:flex;align-items:center;justify-content:center;
      color:white;font-size:12px;font-weight:800;
      box-shadow:0 2px 8px rgba(0,0,0,0.30);
      font-family:sans-serif;
    ">${dayNum}</div>`,
    iconSize: [28, 28], iconAnchor: [14, 14],
  });

/** Small dot: shown at all other stops (no number, same day color). */
const makeStopDot = (color: string) =>
  L.divIcon({
    className: "",
    html: `<div style="
      width:10px;height:10px;
      background:${color};
      border:2px solid white;
      border-radius:50%;
      box-shadow:0 1px 4px rgba(0,0,0,0.22);
    "></div>`,
    iconSize: [10, 10], iconAnchor: [5, 5],
  });

// ─── Day colour palette ───────────────────────────────────────────────────────
const DAY_PALETTE = [
  { color: "#8B5CF6", label: "Purple" },  // Day 1
  { color: "#14B8A6", label: "Teal" },  // Day 2
  { color: "#F43F5E", label: "Rose" },  // Day 3
  { color: "#F59E0B", label: "Amber" },  // Day 4
  { color: "#6366F1", label: "Indigo" },  // Day 5
  { color: "#10B981", label: "Emerald" },  // Day 6
  { color: "#EC4899", label: "Pink" },  // Day 7
];

// ─── Types ────────────────────────────────────────────────────────────────────
export interface LocationPoint { name: string; lat: number; lng: number; }

interface ItineraryItem {
  time: string;
  title: string;
  type: "place" | "food" | "transport" | "experience";
  note?: string;
}
interface ItineraryDay { day: number; title: string; items: ItineraryItem[]; }
interface ItineraryData { destination: string; days: ItineraryDay[]; }

interface DayRoute {
  day: number;
  title: string;
  color: string;
  waypoints: { name: string; lat: number; lng: number }[];
  /** Actual driving geometry from Mapbox Directions API (fallback: straight lines) */
  routePath: [number, number][];
}

interface TripMapProps {
  origin?: LocationPoint | null;
  destination?: LocationPoint | null;
  foodSpots?: FoodSpot[];
  selectedFoodSpot?: FoodSpot | null;
  itinerary?: ItineraryData | null;
  selectedHotel?: { name: string; lat: number; lng: number } | null;
}

// ─── Inner map controllers ────────────────────────────────────────────────────

/** Flies to selected food spot */
function FoodController({ spot }: { spot?: FoodSpot | null }) {
  const map = useMap();
  useEffect(() => {
    if (spot && spot.lat !== 0) map.flyTo([spot.lat, spot.lng], 15, { duration: 1.4 });
  }, [spot, map]);
  return null;
}

function HotelController({ spot }: { spot?: { lat: number; lng: number } | null }) {
  const map = useMap();
  useEffect(() => {
    if (spot && spot.lat !== 0) map.flyTo([spot.lat, spot.lng], 15, { duration: 1.4 });
  }, [spot, map]);
  return null;
}

/** Resets the overview when switching back to overview tab */
function OverviewResetController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => { map.flyTo(center, zoom, { duration: 0.8 }); }, []);
  return null;
}

/** Fits the map to all day-route waypoints */
function DaywiseBoundsController({ routes }: { routes: DayRoute[] }) {
  const map = useMap();
  useEffect(() => {
    const pts = routes.flatMap((r) => r.routePath);
    if (pts.length === 0) return;
    map.fitBounds(L.latLngBounds(pts), { padding: [32, 32], maxZoom: 13 });
  }, [routes]);
  return null;
}

// ─── Mapbox Directions API ────────────────────────────────────────────────────

/** Fetches the actual driving route geometry between waypoints using Mapbox Directions API. */
async function fetchDrivingRoute(
  waypoints: { lat: number; lng: number }[],
  token: string
): Promise<[number, number][]> {
  if (waypoints.length < 2) return waypoints.map((w) => [w.lat, w.lng]);
  try {
    const coordStr = waypoints.slice(0, 25).map((w) => `${w.lng},${w.lat}`).join(";");
    const url =
      `https://api.mapbox.com/directions/v5/mapbox/driving/${coordStr}` +
      `?geometries=geojson&overview=full&access_token=${token}`;
    const res = await fetch(url);
    const data = await res.json();
    const geom: [number, number][] = data.routes?.[0]?.geometry?.coordinates ?? [];
    if (!geom.length) throw new Error("no geometry");
    // Mapbox returns [lng, lat], Leaflet wants [lat, lng]
    return geom.map(([lng, lat]) => [lat, lng]);
  } catch {
    // Fallback: straight lines between waypoints
    return waypoints.map((w) => [w.lat, w.lng]);
  }
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function TripMap({
  origin,
  destination,
  foodSpots = [],
  selectedFoodSpot,
  itinerary,
  selectedHotel,
}: TripMapProps) {
  const [tab, setTab] = useState<"overview" | "daywise">("overview");
  const [dayRoutes, setDayRoutes] = useState<DayRoute[]>([]);
  const [loadingDaywise, setLoadingDaywise] = useState(false);
  const loadedForRef = useRef<string | null>(null); // tracks which destination was loaded

  // ── Overview: center + zoom ─────────────────────────────────────────────────
  const center = useMemo<[number, number]>(() => {
    const pts: [number, number][] = [];
    if (origin) pts.push([origin.lat, origin.lng]);
    if (destination) pts.push([destination.lat, destination.lng]);
    if (!pts.length) return [20.5937, 78.9629];
    return [pts.reduce((s, p) => s + p[0], 0) / pts.length, pts.reduce((s, p) => s + p[1], 0) / pts.length];
  }, [origin, destination]);

  const zoom = useMemo(() => {
    if (!origin || !destination) return 6;
    const d = Math.abs(origin.lat - destination.lat) + Math.abs(origin.lng - destination.lng);
    return d > 15 ? 4 : d > 5 ? 5 : 6;
  }, [origin, destination]);

  const polyline = useMemo<[number, number][]>(() => {
    const pts: [number, number][] = [];
    if (origin) pts.push([origin.lat, origin.lng]);
    if (destination) pts.push([destination.lat, destination.lng]);
    return pts;
  }, [origin, destination]);

  // ── Day-wise: load on tab switch ────────────────────────────────────────────
  useEffect(() => {
    if (tab !== "daywise" || !itinerary || !destination) return;
    // Reload if itinerary changed (different destination or day count)
    const destKey = `${destination.lat.toFixed(4)},${destination.lng.toFixed(4)}-${itinerary.days.length}`;
    if (loadedForRef.current === destKey) return;
    loadedForRef.current = destKey;

    setLoadingDaywise(true);
    const token = import.meta.env.VITE_MAPBOX_TOKEN as string;

    async function load() {
      const routes: DayRoute[] = [];

      for (let di = 0; di < itinerary!.days.length; di++) {
        const day = itinerary!.days[di];
        const { color } = DAY_PALETTE[di % DAY_PALETTE.length];

        // Only geocode `type === "place"` items — these are actual tourist sights
        // with reliable geocodes (beaches, forts, temples, national parks, etc.).
        //
        // Excluded intentionally:
        //   "food"       → restaurants rarely exist in geocoding DBs; geocoding
        //                  failures trigger the jitter-fallback near destination
        //                  center, which creates zigzag routes and broken numbering.
        //   "experience" → hotel check-ins, arrivals, departures — not real POIs.
        //   "transport"  → transit hubs that belong between days, not as stops.
        const items = day.items.filter((it) => it.type === "place");
        if (!items.length) continue;

        const waypoints: { name: string; lat: number; lng: number }[] = [];

        // ── Sequential geocoding with delay ─────────────────────────────────
        // Mapbox (primary) has no strict rate limit — minimal gap between calls.
        // We still add a small gap to avoid browser connection queue saturation.
        for (let ii = 0; ii < items.length; ii++) {
          const item = items[ii];
          // Strip time prefixes like "9:00 AM - " or "07:30 — "
          const cleanName = item.title
            .replace(/^\d{1,2}:\d{2}\s*(AM|PM)?\s*[-–—:]\s*/i, "")
            .trim();

          // 100ms gap — enough to avoid browser queue saturation, Mapbox handles the rest
          if (ii > 0 || di > 0) {
            await new Promise((r) => setTimeout(r, 100));
          }

          const geo = await geocodeNearPoint(
            cleanName,
            destination!.name,
            destination!.lat,
            destination!.lng,
            120
          );

          if (geo) {
            // ── Deduplication guard ──────────────────────────────────────────
            // If a previous stop in this day is within 80 m, skip this point.
            // Same-location items (e.g. two activities at the same park) share
            // a geocode → stacked markers make lower numbers visually disappear.
            const isDuplicate = waypoints.some(
              (w) => haversineKm(w.lat, w.lng, geo.lat, geo.lng) < 0.08
            );
            if (!isDuplicate) {
              waypoints.push({ name: cleanName, lat: geo.lat, lng: geo.lng });
            }
          } else {
            // ── Guaranteed fallback ──────────────────────────────────────────
            // Geocoding failed entirely — place the marker near destination
            // with a small deterministic offset so the day is never dropped.
            const sign = (di % 2 === 0 ? 1 : -1) * (ii % 2 === 0 ? 1 : -1);
            waypoints.push({
              name: cleanName,
              lat: destination!.lat + sign * 0.003 * (ii + 1),
              lng: destination!.lng + sign * 0.004 * (ii + 1),
            });
          }
        }

        if (!waypoints.length) continue;

        // Get actual Mapbox Directions road geometry
        const routePath = await fetchDrivingRoute(waypoints, token);
        routes.push({ day: day.day, title: day.title, color, waypoints, routePath });
      }

      setDayRoutes(routes);
      setLoadingDaywise(false);
    }

    load();
  }, [tab, itinerary, destination]);

  return (
    <div className="w-full flex justify-center mt-6">
      <div className="w-full max-w-6xl">

        {/* ── Header + Tab switcher ─────────────────────────────────────── */}
        <div className="mb-5 flex items-center gap-4 flex-wrap">
          {/* Left: title changes per tab */}
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-foreground">
              {tab === "overview" ? "Route Overview" : "Day-wise Plan"}
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {tab === "overview"
                ? "Visual representation of your journey"
                : "Actual routes per day — coloured by day"}
            </p>
          </div>

          {/* Centre: pill tab switcher */}
          <div className="flex items-center rounded-xl bg-slate-100 border border-slate-200 p-1 gap-0.5 shrink-0">
            {(["overview", "daywise"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={[
                  "px-4 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap",
                  tab === t
                    ? "bg-white text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                ].join(" ")}
              >
                {t === "overview" ? "Route Overview" : "Day-wise Plan"}
              </button>
            ))}
          </div>

          {/* Right: origin→destination badge (overview only) */}
          {tab === "overview" && origin && destination && (
            <div className="px-4 py-1.5 rounded-full bg-primary/10 text-primary font-semibold text-sm shadow-sm shrink-0">
              {origin.name} → {destination.name}
            </div>
          )}
        </div>

        {/* ── Map card ─────────────────────────────────────────────────── */}
        <div className="relative h-[460px] rounded-3xl overflow-hidden shadow-2xl border border-border/30 bg-white">

          {/* Top gradient */}
          <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-white/70 to-transparent z-20 pointer-events-none" />

          {/* Overview: pin legend */}
          {tab === "overview" && (
            <div className="absolute bottom-6 left-4 z-30 flex flex-col gap-1.5 pointer-events-none">
              {origin && (
                <div className="flex items-center gap-1.5 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-full shadow text-[10px] font-medium text-slate-600">
                  <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                  {origin.name}
                </div>
              )}
              {destination && (
                <div className="flex items-center gap-1.5 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-full shadow text-[10px] font-medium text-slate-600">
                  <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                  {destination.name}
                </div>
              )}
              {selectedFoodSpot && (
                <div className="flex items-center gap-1.5 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-full shadow text-[10px] font-medium text-orange-600">
                  <span className="w-2 h-2 rounded-full bg-orange-400 shrink-0" />
                  {selectedFoodSpot.name}
                </div>
              )}
              {selectedHotel && (
                <div className="flex items-center gap-1.5 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-full shadow text-[10px] font-medium text-blue-600">
                  <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                  {selectedHotel.name}
                </div>
              )}
            </div>
          )}

          {/* Day-wise: loading overlay */}
          {tab === "daywise" && loadingDaywise && (
            <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm gap-3">
              <div className="flex gap-1.5">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-2 h-2 rounded-full bg-primary animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
              <p className="text-sm font-medium text-muted-foreground">
                Building your day-wise route map…
              </p>
            </div>
          )}

          {/* Single MapContainer — never remounts, controllers manage view */}
          <MapContainer
            center={center}
            zoom={zoom}
            scrollWheelZoom={false}
            className="h-full w-full z-0"
            key={`map-${center[0].toFixed(2)}-${center[1].toFixed(2)}`}
          >
            <TileLayer
              attribution="© Mapbox © OpenStreetMap"
              url={`https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/512/{z}/{x}/{y}@2x?access_token=${import.meta.env.VITE_MAPBOX_TOKEN}`}
              tileSize={512}
              zoomOffset={-1}
            />

            {/* ── OVERVIEW TAB ── */}
            {tab === "overview" && (
              <>
                {origin && <Marker position={[origin.lat, origin.lng]} icon={greenIcon} />}
                {destination && <Marker position={[destination.lat, destination.lng]} icon={redIcon} />}
                {polyline.length === 2 && (
                  <Polyline positions={polyline} pathOptions={{ color: "#6366f1", weight: 5, opacity: 0.85 }} />
                )}
                {foodSpots.filter((s) => s.lat !== 0).map((s, i) => {
                  const isActive = selectedFoodSpot?.name === s.name;
                  return (
                    <Marker
                      key={`food-${i}`}
                      position={[s.lat, s.lng]}
                      icon={makeFoodIcon(isActive)}
                      opacity={!selectedFoodSpot || isActive ? 1 : 0.5}
                    />
                  );
                })}
                <FoodController spot={selectedFoodSpot} />
                {selectedHotel && (
                  <Marker position={[selectedHotel.lat, selectedHotel.lng]} icon={blueIcon} />
                )}
                <HotelController spot={selectedHotel} />
                <OverviewResetController key={`ov-${center[0]}`} center={center} zoom={zoom} />
              </>
            )}

            {/* ── DAY-WISE TAB ── */}
            {tab === "daywise" && !loadingDaywise && dayRoutes.length > 0 && (
              <>
                {dayRoutes.map((route) => (
                  <span key={`day-${route.day}`}>
                    {/* Actual Mapbox road geometry — dashed + coloured */}
                    {route.routePath.length >= 2 && (
                      <Polyline
                        positions={route.routePath}
                        pathOptions={{
                          color: route.color,
                          weight: 4,
                          opacity: 0.9,
                          dashArray: "10 7",
                          lineCap: "round",
                          lineJoin: "round",
                        }}
                      />
                    )}
                    {/* Day start label + small stop dots */}
                    {route.waypoints.map((wp, idx) => (
                      <Marker
                        key={`wp-${route.day}-${idx}`}
                        position={[wp.lat, wp.lng]}
                        icon={
                          idx === 0
                            ? makeStartLabel(route.day, route.color)
                            : makeStopDot(route.color)
                        }
                      />
                    ))}
                  </span>
                ))}
                <DaywiseBoundsController routes={dayRoutes} />
              </>
            )}
          </MapContainer>

          {/* Bottom depth */}
          <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black/15 to-transparent pointer-events-none" />
        </div>

        {/* ── Day-wise legend (below map) ────────────────────────────────── */}
        {tab === "daywise" && !loadingDaywise && dayRoutes.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {dayRoutes.map((route) => (
              <div
                key={route.day}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl border bg-white shadow-sm text-xs font-medium text-slate-700"
                style={{ borderColor: route.color + "60" }}
              >
                {/* Dashed line swatch */}
                <svg width="24" height="6" viewBox="0 0 24 6">
                  <line
                    x1="0" y1="3" x2="24" y2="3"
                    stroke={route.color} strokeWidth="3"
                    strokeDasharray="7 4" strokeLinecap="round"
                  />
                </svg>
                <span style={{ color: route.color }} className="font-bold">Day {route.day}</span>
                <span className="text-slate-500 truncate max-w-[140px]">{route.title}</span>
              </div>
            ))}
          </div>
        )}

        {/* Day-wise: empty state */}
        {tab === "daywise" && !loadingDaywise && dayRoutes.length === 0 && itinerary && (
          <div className="mt-4 text-center text-sm text-muted-foreground py-6 border rounded-2xl bg-slate-50">
            No itinerary places to map yet. Ask the agent to plan your itinerary first.
          </div>
        )}

        {tab === "daywise" && !itinerary && (
          <div className="mt-4 text-center text-sm text-muted-foreground py-6 border rounded-2xl bg-slate-50">
            Generate your itinerary to see the day-wise route map.
          </div>
        )}
      </div>
    </div>
  );
}