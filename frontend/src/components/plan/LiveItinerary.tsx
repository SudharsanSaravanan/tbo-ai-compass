import { useMemo } from "react";
import { MapContainer, TileLayer, Marker, Polyline } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const greenIcon = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  shadowUrl: markerShadow,
  iconSize: [32, 52],
  iconAnchor: [16, 52],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const redIcon = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl: markerShadow,
  iconSize: [32, 52],
  iconAnchor: [16, 52],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

export interface LocationPoint {
  name: string;
  lat: number;
  lng: number;
}

interface TripMapProps {
  origin?: LocationPoint | null;
  destination?: LocationPoint | null;
}

export default function TripMap({ origin, destination }: TripMapProps) {
  const center = useMemo<[number, number]>(() => {
    const pts: [number, number][] = [];
    if (origin) pts.push([origin.lat, origin.lng]);
    if (destination) pts.push([destination.lat, destination.lng]);
    if (pts.length === 0) return [20.5937, 78.9629];
    const lat = pts.reduce((s, p) => s + p[0], 0) / pts.length;
    const lng = pts.reduce((s, p) => s + p[1], 0) / pts.length;
    return [lat, lng];
  }, [origin, destination]);

  const zoom = useMemo(() => {
    if (!origin || !destination) return 6;
    const d =
      Math.abs(origin.lat - destination.lat) +
      Math.abs(origin.lng - destination.lng);
    if (d > 15) return 4;
    if (d > 5) return 5;
    return 6;
  }, [origin, destination]);

  const polyline = useMemo<[number, number][]>(() => {
    const pts: [number, number][] = [];
    if (origin) pts.push([origin.lat, origin.lng]);
    if (destination) pts.push([destination.lat, destination.lng]);
    return pts;
  }, [origin, destination]);

  return (
    <div className="w-full flex justify-center mt-10">
      <div className="w-full max-w-6xl">

        {/* Section Header */}
        <div className="mb-8 flex flex-col gap-3">

          <h2 className="text-3xl font-bold tracking-tight text-foreground">
            Route Overview
          </h2>

          <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl">
            Explore your travel path visually with an interactive map view of your journey.
          </p>

          {(origin && destination) && (
            <div className="mt-4 inline-flex items-center gap-3 px-6 py-3 rounded-full bg-primary/10 text-primary font-semibold text-base shadow-sm w-fit">
              <span className="text-foreground font-semibold">
                {origin.name}
              </span>
              <span className="text-primary text-lg">→</span>
              <span className="text-foreground font-semibold">
                {destination.name}
              </span>
            </div>
          )}
        </div>

        {/* Premium Map Card */}
        <div className="relative h-[500px] rounded-3xl overflow-hidden shadow-2xl border border-border/30 bg-white">

          <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-white/85 to-transparent z-20 pointer-events-none" />

          <MapContainer
            center={center}
            zoom={zoom}
            scrollWheelZoom={false}
            className="h-full w-full z-0"
            key={`${center[0]}-${center[1]}-${zoom}`}
          >
            <TileLayer
              attribution="© Mapbox © OpenStreetMap"
              url={`https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/512/{z}/{x}/{y}@2x?access_token=${import.meta.env.VITE_MAPBOX_TOKEN}`}
              tileSize={512}
              zoomOffset={-1}
            />

            {origin && (
              <Marker position={[origin.lat, origin.lng]} icon={greenIcon} />
            )}

            {destination && (
              <Marker position={[destination.lat, destination.lng]} icon={redIcon} />
            )}

            {polyline.length === 2 && (
              <Polyline
                positions={polyline}
                pathOptions={{
                  color: "#6366f1",
                  weight: 6,
                  opacity: 0.9,
                }}
              />
            )}
          </MapContainer>

          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
        </div>

      </div>
    </div>
  );
}