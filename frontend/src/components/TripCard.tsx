import { Calendar, Users, DollarSign, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

interface TripCardProps {
  id: string;
  title: string;
  destination: string;
  dates: string;
  budget: string;
  travelers: string;
  status: "planned" | "draft" | "shared";
  image: string;
  days: number;
}

const statusColors = {
  planned: "bg-success/10 text-success border-success/20",
  draft: "bg-muted text-muted-foreground border-border",
  shared: "bg-primary/10 text-primary border-primary/20",
};

export default function TripCard({ id, title, destination, dates, budget, travelers, status, image, days }: TripCardProps) {
  return (
    <Link to={`/trip/${id}`} className="group block">
      <div className="bg-card rounded border overflow-hidden card-hover">
        <div className="relative h-44 overflow-hidden">
          <img src={image} alt={destination} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          <Badge className={`absolute top-3 right-3 ${statusColors[status]} capitalize border`}>
            {status}
          </Badge>
          <div className="absolute bottom-3 left-3 bg-card/90 rounded px-2 py-1 text-xs font-medium">
            {days} days
          </div>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <h3 className="font-heading font-semibold text-card-foreground group-hover:text-primary transition-colors">{title}</h3>
            <p className="text-sm text-muted-foreground">{destination}</p>
          </div>
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{dates}</span>
            <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{travelers}</span>
            <span className="flex items-center gap-1"><DollarSign className="h-3.5 w-3.5" />{budget}</span>
          </div>
          <div className="flex items-center text-xs font-medium text-primary">
            Read More <ArrowRight className="h-3.5 w-3.5 ml-1" />
          </div>
        </div>
      </div>
    </Link>
  );
}
