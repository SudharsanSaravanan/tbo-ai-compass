import { useMemo, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import { MapPin } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icons for Leaflet in bundled environments
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: markerIcon2x,
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
});

export interface MapLocation {
    lat: number;
    lng: number;
    title: string;
}

interface MapCardProps {
    locations?: MapLocation[];
    routePath?: [number, number][];
    loading?: boolean;
    className?: string;
}

const staticLocations: MapLocation[] = [
    { lat: 28.6139, lng: 77.209, title: "Start Point" },
    { lat: 28.62, lng: 77.22, title: "Checkpoint" },
    { lat: 28.63, lng: 77.23, title: "Destination" },
];

function MapUpdater({ center }: { center: [number, number] }) {
    const map = useMap();
    useEffect(() => {
        map.flyTo(center, Math.max(map.getZoom(), 13), {
            animate: true,
            duration: 1.5
        });
    }, [center, map]);
    return null;
}

export default function MapCard({
    locations = staticLocations,
    routePath,
    loading = false,
    className,
}: MapCardProps) {
    // Compute center from locations
    const center = useMemo<[number, number]>(() => {
        if (locations.length === 0) return [28.6139, 77.209];
        const lat = locations.reduce((sum, loc) => sum + loc.lat, 0) / locations.length;
        const lng = locations.reduce((sum, loc) => sum + loc.lng, 0) / locations.length;
        return [lat, lng];
    }, [locations]);

    // Compute polyline positions from routePath or locations
    const polylinePositions = useMemo<[number, number][]>(() => {
        if (routePath && routePath.length > 0) return routePath;
        return locations.map((loc) => [loc.lat, loc.lng] as [number, number]);
    }, [routePath, locations]);

    if (loading) {
        return (
            <div className={className || "w-full h-[300px] md:h-[400px] rounded-xl shadow-md bg-card border flex flex-col items-center justify-center gap-3 animate-pulse"}>
                <MapPin className="h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">Loading map…</p>
            </div>
        );
    }

    return (
        <div className={className || "w-full h-[300px] md:h-[400px] rounded-xl shadow-md overflow-hidden border"}>
            <MapContainer
                center={center}
                zoom={13}
                scrollWheelZoom={false}
                className="h-full w-full z-0"
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <MapUpdater center={center} />

                {locations.map((loc, idx) => (
                    <Marker key={idx} position={[loc.lat, loc.lng]}>
                        <Popup>
                            <span className="font-medium text-sm">{loc.title}</span>
                        </Popup>
                    </Marker>
                ))}

                {polylinePositions.length > 1 && (
                    <Polyline
                        positions={polylinePositions}
                        pathOptions={{ color: "#6366f1", weight: 4, opacity: 0.8 }}
                    />
                )}
            </MapContainer>
        </div>
    );
}
