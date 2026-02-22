import { Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import TripCard from "@/components/TripCard";
import { mockTrips } from "@/lib/mock-data";

export default function MyTrips() {
  return (
    <div className="container py-8 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">My Trips</h1>
          <p className="text-muted-foreground text-sm">Manage your generated itineraries</p>
        </div>
        <Button asChild className="rounded-full">
          <Link to="/"><Plus className="h-4 w-4 mr-1" /> New Trip</Link>
        </Button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {mockTrips.map((trip) => (
          <TripCard key={trip.id} {...trip} />
        ))}
      </div>
    </div>
  );
}
