import { useLocation, useNavigate } from "react-router-dom";
import { MapPin, Calendar, DollarSign, Users, Sparkles, ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const parsedIntent = {
  destination: "Bali, Indonesia",
  dates: "Mar 15 – Mar 22, 2026",
  duration: "7 days",
  budget: "$2,000 – $2,800",
  travelers: "2 Adults",
  interests: ["Temples", "Beach", "Food", "Culture"],
  tripStyle: "Relaxed & Romantic",
};

export default function IntentPreview() {
  const location = useLocation();
  const navigate = useNavigate();
  const query = (location.state as any)?.query || "7 days in Bali for a couple, mid-budget";

  return (
    <div className="container max-w-2xl py-12 animate-fade-in">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-6 text-muted-foreground">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back
      </Button>

      <div className="flex items-center gap-2 mb-2">
        <div className="travel-gradient rounded-lg p-1.5">
          <Sparkles className="h-4 w-4 text-primary-foreground" />
        </div>
        <span className="text-sm font-medium text-primary">AI Parsed Trip Intent</span>
      </div>
      <h1 className="text-2xl font-bold mb-2">Trip Summary</h1>
      <p className="text-muted-foreground text-sm mb-8">"{query}"</p>

      <div className="bg-card border rounded-2xl divide-y">
        {[
          { icon: MapPin, label: "Destination", value: parsedIntent.destination },
          { icon: Calendar, label: "Dates", value: `${parsedIntent.dates} (${parsedIntent.duration})` },
          { icon: DollarSign, label: "Budget Range", value: parsedIntent.budget },
          { icon: Users, label: "Travelers", value: parsedIntent.travelers },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex items-center gap-4 px-5 py-4">
            <div className="bg-primary/10 rounded-lg p-2">
              <Icon className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="font-medium text-sm">{value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 bg-card border rounded-2xl p-5">
        <p className="text-xs text-muted-foreground mb-3">Interests</p>
        <div className="flex flex-wrap gap-2">
          {parsedIntent.interests.map((i) => (
            <span key={i} className="bg-accent text-accent-foreground text-xs font-medium px-3 py-1.5 rounded-full">{i}</span>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-4 mb-1">Trip Style</p>
        <p className="text-sm font-medium flex items-center gap-1.5">
          <CheckCircle2 className="h-4 w-4 text-success" /> {parsedIntent.tripStyle}
        </p>
      </div>

      <div className="mt-8 flex gap-3">
        <Button variant="outline" className="flex-1" onClick={() => navigate(-1)}>Edit Details</Button>
        <Button className="flex-1" onClick={() => navigate("/trip/trip-1")}>
          Generate Itinerary <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
