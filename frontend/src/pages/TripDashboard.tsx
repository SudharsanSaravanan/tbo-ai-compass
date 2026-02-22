import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  MapPin, Calendar, DollarSign, Users, Cloud, Send, ChevronRight,
  Utensils, Hotel, Compass as CompassIcon, Car, Info, Share2, MessageSquare, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { mockTrips, mockItinerary, mockWeather, mockChatMessages } from "@/lib/mock-data";
import { getWeatherForTrip, type WeatherResponse } from "@/services/weatherService";
import WeatherDisplay from "@/components/WeatherDisplay";

const typeIcons = { food: Utensils, hotel: Hotel, activity: CompassIcon, transport: Car };
const typeColors = { food: "text-warning", hotel: "text-primary", activity: "text-success", transport: "text-muted-foreground" };

export default function TripDashboard() {
  const { tripId } = useParams();
  const trip = mockTrips.find((t) => t.id === tripId) || mockTrips[0];
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState(mockChatMessages);

  // Weather state
  const [weather, setWeather] = useState<WeatherResponse | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);

  // Fetch weather on mount
  useEffect(() => {
    const fetchWeather = async () => {
      setWeatherLoading(true);
      try {
        // Parse trip dates from the trip object
        // Format: "Mar 15 – Mar 22, 2026"
        const dateRange = trip.dates.split("–").map(d => d.trim());
        const year = dateRange[1].split(",")[1].trim();
        const startDateStr = `${dateRange[0]}, ${year}`;
        const endDateStr = dateRange[1];

        const startDate = new Date(startDateStr);
        const endDate = new Date(endDateStr);

        const weatherData = await getWeatherForTrip(
          trip.destination.split(",")[0], // Extract city name
          startDate,
          endDate
        );

        setWeather(weatherData);
      } catch (error) {
        console.error("Failed to fetch weather:", error);
        setWeather({
          type: "forecast",
          city: trip.destination,
          dates: [],
          error: true,
          message: "Weather data temporarily unavailable"
        });
      } finally {
        setWeatherLoading(false);
      }
    };

    fetchWeather();
  }, [trip.destination, trip.dates]);

  const sendMessage = () => {
    if (!chatInput.trim()) return;
    setMessages([...messages, { role: "user", content: chatInput }, { role: "assistant", content: "I'll update that for you! Give me a moment to adjust the itinerary..." }]);
    setChatInput("");
  };

  return (
    <div className="container py-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold">{trip.title}</h1>
          <p className="text-muted-foreground text-sm mt-1">{trip.destination}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to={`/trip/${tripId}/info`}><Info className="h-4 w-4 mr-1" /> Weather & Checklist</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to={`/microsite/create/${tripId}`}><Share2 className="h-4 w-4 mr-1" /> Share</Link>
          </Button>
          <Button size="sm" onClick={() => setChatOpen(true)} className="md:hidden">
            <MessageSquare className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {[
          { icon: Calendar, label: "Dates", value: trip.dates },
          { icon: Users, label: "Travelers", value: trip.travelers },
          { icon: DollarSign, label: "Budget", value: trip.budget },
          { icon: Cloud, label: "Weather", value: "27–30°C, Sunny" },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="bg-card border rounded-xl p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Icon className="h-3.5 w-3.5" /><span className="text-xs">{label}</span>
            </div>
            <p className="text-sm font-semibold truncate">{value}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-6">
        {/* Itinerary */}
        <div className="flex-1 min-w-0 space-y-4">
          <h2 className="text-lg font-semibold">Itinerary</h2>
          {mockItinerary.map((day) => (
            <div key={day.day} className="bg-card border rounded-2xl overflow-hidden">
              <div className="px-5 py-3 border-b bg-accent/50">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm">Day {day.day}: {day.title}</h3>
                  <span className="text-xs text-muted-foreground">{day.date}</span>
                </div>
              </div>
              <div className="divide-y">
                {day.activities.map((act, i) => {
                  const Icon = typeIcons[act.type];
                  return (
                    <div key={i} className="flex items-center gap-4 px-5 py-3 hover:bg-accent/30 transition-colors">
                      <span className="text-xs text-muted-foreground w-16 shrink-0">{act.time}</span>
                      <div className={`${typeColors[act.type]}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className="text-sm flex-1">{act.title}</span>
                      <span className="text-xs text-muted-foreground">{act.cost}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Chat Panel - Desktop */}
        <div className="hidden md:flex flex-col w-80 shrink-0 bg-card border rounded-2xl overflow-hidden h-[calc(100vh-12rem)] sticky top-20">
          <div className="px-4 py-3 border-b bg-accent/50">
            <h3 className="font-semibold text-sm flex items-center gap-1.5">
              <MessageSquare className="h-4 w-4 text-primary" /> Trip Assistant
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] text-sm px-3 py-2 rounded-xl ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground"
                  }`}>
                  {m.content}
                </div>
              </div>
            ))}
          </div>
          <div className="p-3 border-t">
            <div className="flex gap-2">
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                placeholder="Refine your trip..."
                className="flex-1 text-sm bg-accent rounded-lg px-3 py-2 outline-none placeholder:text-muted-foreground"
              />
              <Button size="sm" onClick={sendMessage}><Send className="h-4 w-4" /></Button>
            </div>
          </div>
        </div>
      </div>

      {/* Weather Summary */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-4">Weather Forecast</h2>
        <WeatherDisplay weather={weather} loading={weatherLoading} />
      </div>

      {/* Mobile Chat Drawer */}
      {chatOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-foreground/40" onClick={() => setChatOpen(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-card rounded-t-2xl h-[70vh] flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h3 className="font-semibold text-sm">Trip Assistant</h3>
              <Button variant="ghost" size="sm" onClick={() => setChatOpen(false)}><X className="h-4 w-4" /></Button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] text-sm px-3 py-2 rounded-xl ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground"
                    }`}>{m.content}</div>
                </div>
              ))}
            </div>
            <div className="p-3 border-t">
              <div className="flex gap-2">
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  placeholder="Refine your trip..."
                  className="flex-1 text-sm bg-accent rounded-lg px-3 py-2 outline-none placeholder:text-muted-foreground"
                />
                <Button size="sm" onClick={sendMessage}><Send className="h-4 w-4" /></Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
