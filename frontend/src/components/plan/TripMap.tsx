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
  iconSize: [30, 48],
  iconAnchor: [15, 48],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const redIcon = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl: markerShadow,
  iconSize: [30, 48],
  iconAnchor: [15, 48],
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
    <div className="w-full flex justify-center mt-6">
      <div className="w-full max-w-6xl">

        {/* Section Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              Route Overview
            </h2>
            <p className="text-base text-muted-foreground mt-1">
              Visual representation of your journey
            </p>
          </div>

          {(origin && destination) && (
            <div className="px-5 py-2 rounded-full bg-primary/10 text-primary font-semibold text-sm shadow-sm">
              {origin.name} → {destination.name}
            </div>
          )}
        </div>

        {/* Premium Map Card */}
        <div className="relative h-[460px] rounded-3xl overflow-hidden shadow-2xl border border-border/30 bg-white">

          {/* Soft gradient overlay */}
          <div className="absolute top-0 left-0 right-0 h-28 bg-gradient-to-b from-white/80 to-transparent z-20 pointer-events-none" />

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
              <Marker
                position={[origin.lat, origin.lng]}
                icon={greenIcon}
              />
            )}

            {destination && (
              <Marker
                position={[destination.lat, destination.lng]}
                icon={redIcon}
              />
            )}

            {polyline.length === 2 && (
              <Polyline
                positions={polyline}
                pathOptions={{
                  color: "#6366f1",
                  weight: 5,
                  opacity: 0.85,
                }}
              />
            )}
          </MapContainer>

          {/* Bottom Depth Effect */}
          <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black/15 to-transparent pointer-events-none" />
        </div>
      </div>
    </div>
  );
}