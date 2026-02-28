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
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const redIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
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
    if (pts.length === 0) return [20.5937, 78.9629]; // India center
    const lat = pts.reduce((s, p) => s + p[0], 0) / pts.length;
    const lng = pts.reduce((s, p) => s + p[1], 0) / pts.length;
    return [lat, lng];
  }, [origin, destination]);

  const zoom = useMemo(() => {
    if (!origin || !destination) return 6;
    const d = Math.abs(origin.lat - destination.lat) + Math.abs(origin.lng - destination.lng);
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
    <div className="w-full h-[200px] rounded-xl overflow-hidden border border-border shadow-sm">
      <MapContainer center={center} zoom={zoom} scrollWheelZoom={false} className="h-full w-full z-0" key={`${center[0]}-${center[1]}-${zoom}`}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {origin && (
          <Marker position={[origin.lat, origin.lng]} icon={greenIcon} />
        )}
        {destination && (
          <Marker position={[destination.lat, destination.lng]} icon={redIcon} />
        )}
        {polyline.length === 2 && (
          <Polyline positions={polyline} pathOptions={{ color: "#6366f1", weight: 3, dashArray: "8 4" }} />
        )}
      </MapContainer>
    </div>
  );
}
