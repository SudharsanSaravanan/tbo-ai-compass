import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Cloud, AlertTriangle, CheckSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { mockWeather, mockPackingList } from "@/lib/mock-data";

export default function TripInfo() {
  const navigate = useNavigate();
  const { tripId } = useParams();

  return (
    <div className="container max-w-3xl py-8 animate-fade-in">
      <Button variant="ghost" size="sm" onClick={() => navigate(`/trip/${tripId}`)} className="mb-6 text-muted-foreground">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Trip
      </Button>

      <h1 className="text-2xl font-bold mb-6">Weather & Checklist</h1>

      {/* Weather */}
      <div className="bg-card border rounded-2xl p-5 mb-6">
        <h2 className="font-semibold flex items-center gap-2 mb-4"><Cloud className="h-5 w-5 text-primary" /> 7-Day Forecast</h2>
        <div className="grid grid-cols-7 gap-2">
          {mockWeather.map((w) => (
            <div key={w.day} className="text-center p-3 bg-accent/50 rounded-xl">
              <p className="text-xs text-muted-foreground mb-1">{w.day}</p>
              <p className="text-2xl mb-1">{w.icon}</p>
              <p className="text-sm font-semibold">{w.temp}°</p>
              <p className="text-[10px] text-muted-foreground">{w.condition}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Alert */}
      <div className="bg-warning/10 border border-warning/20 rounded-xl px-4 py-3 flex items-start gap-3 mb-6">
        <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
        <div>
          <p className="font-medium text-sm">Weather Alert</p>
          <p className="text-xs text-muted-foreground">Rain expected on Thursday. Consider indoor activities or bring a rain jacket.</p>
        </div>
      </div>

      {/* Packing List */}
      <div className="bg-card border rounded-2xl p-5">
        <h2 className="font-semibold flex items-center gap-2 mb-4"><CheckSquare className="h-5 w-5 text-success" /> Packing Recommendations</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {mockPackingList.map((cat) => (
            <div key={cat.category}>
              <h3 className="text-sm font-medium mb-2">{cat.category}</h3>
              <div className="space-y-1.5">
                {cat.items.map((item) => (
                  <label key={item} className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                    <input type="checkbox" className="rounded border-border accent-primary" />
                    {item}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
