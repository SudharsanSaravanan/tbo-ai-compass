import { useNavigate } from "react-router-dom";
import { ArrowLeft, Star, MapPin, Clock, Leaf, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { mockFoodVenue } from "@/lib/mock-data";

export default function FoodDetails() {
  const navigate = useNavigate();
  const v = mockFoodVenue;

  return (
    <div className="animate-fade-in">
      <div className="relative h-64 md:h-80">
        <img src={v.image} alt={v.name} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 to-transparent" />
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="absolute top-4 left-4 text-primary-foreground bg-foreground/20 hover:bg-foreground/40">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
      </div>
      <div className="container max-w-3xl -mt-16 relative z-10">
        <div className="bg-card border rounded-2xl p-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
            <div>
              <h1 className="text-2xl font-bold">{v.name}</h1>
              <p className="text-muted-foreground text-sm">{v.cuisine}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-sm font-medium text-warning">
                <Star className="h-4 w-4 fill-warning" /> {v.rating}
              </span>
              <span className="text-xs text-muted-foreground">({v.reviews} reviews)</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-4">
            <span className="flex items-center gap-1"><MapPin className="h-4 w-4" /> {v.address}</span>
            <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> {v.hours}</span>
          </div>

          <p className="text-sm leading-relaxed mb-4">{v.description}</p>

          <div className="flex flex-wrap gap-2 mb-6">
            {v.dietaryTags.map((t) => (
              <Badge key={t} variant="secondary" className="flex items-center gap-1">
                <Leaf className="h-3 w-3" /> {t}
              </Badge>
            ))}
          </div>

          <h2 className="text-lg font-semibold mb-4">Menu Highlights</h2>
          <div className="space-y-3">
            {v.menu.map((item) => (
              <div key={item.name} className="flex items-start justify-between gap-4 p-4 bg-accent/50 rounded-xl">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm">{item.name}</p>
                    {item.popular && <Flame className="h-3.5 w-3.5 text-destructive" />}
                    {item.dietary && <Badge variant="outline" className="text-[10px] h-5">{item.dietary}</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                </div>
                <span className="text-sm font-semibold text-primary">{item.price}</span>
              </div>
            ))}
          </div>

          <div className="mt-6">
            <Button className="w-full">Add to Itinerary</Button>
          </div>
        </div>
      </div>
      <div className="h-8" />
    </div>
  );
}
