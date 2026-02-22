import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Calendar as CalendarIcon, Users, Clock, Search, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import { ScaleLoader } from "react-spinners";
import heroImage from "@/assets/hero-travel.png";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import TripSearchOverlay from "@/components/TripSearchOverlay";
import { cn } from "@/lib/utils";

const recentSearches = [
  "7 days in Bali for a couple, mid-budget",
  "Family trip to Tokyo with kids, 10 days",
  "Weekend getaway to Swiss Alps, luxury",
];

const suggestions = [
  { icon: "🏖️", label: "Beach Escape", query: "5-day beach vacation in Maldives" },
  { icon: "🏔️", label: "Mountain Trek", query: "Hiking trip to Patagonia for adventurers" },
  { icon: "🍜", label: "Food Tour", query: "Street food tour across Bangkok and Chiang Mai" },
  { icon: "🏛️", label: "Cultural Journey", query: "2-week cultural tour through Italy" },
];

let siteLoaded = false;

export default function Index() {
  const [query, setQuery] = useState("");
  const [showOrb, setShowOrb] = useState(false);
  const [travelDate, setTravelDate] = useState<Date>();
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(!siteLoaded);
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) {
      const timer = setTimeout(() => {
        siteLoaded = true;
        setLoading(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleSearch = () => {
    const q = query.trim() || "Trip";
    navigate("/plan", { state: { query: q } });
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-[100] bg-background flex items-center justify-center">
        <div className="flex">
          <ScaleLoader color="#2563eb" height={50} width={6} radius={4} />
          <ScaleLoader color="#f97316" height={50} width={6} radius={4} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] pb-12">
      {/* Hero Section – aligned with content width */}
      <section className="relative pt-6 md:pt-8 pb-4 md:pb-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative h-[65vh] min-h-[480px] md:h-[65vh] md:min-h-[440px] lg:min-h-[520px] rounded-3xl lg:rounded-4xl overflow-hidden shadow-2xl">
            {/* Mobile: Static Image Background */}
            <div className="absolute inset-0 md:hidden">
              <img
                src={heroImage}
                alt="Travel destination"
                className="absolute inset-0 w-full h-full object-cover"
              />
            </div>

            {/* Desktop: YouTube Video Background */}
            <div className="absolute inset-0 overflow-hidden hidden md:block">
              {/* <iframe
                className="
                  absolute top-1/2 left-1/2 
                  -translate-x-1/2 -translate-y-1/2 
                  w-[160%] lg:w-[140%] xl:w-[120%] 
                  h-[200%] 
                  min-w-full min-h-full 
                  pointer-events-none
                "
                src="https://www.youtube.com/embed/J6z3Q-5bpvc?autoplay=1&enablejsapi=1&mute=1&controls=0&loop=1&playlist=J6z3Q-5bpvc"
                title="Travel background video"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              /> */}
            </div>

            {/* Darker gradient overlay for better text readability */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/30 to-black/65" />

            {/* Hero Content */}
            <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-5 sm:px-8 lg:px-12">
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold font-heading text-white mb-5 md:mb-6 tracking-tight drop-shadow-2xl">
                Trip Planning, Simplified
              </h1>

              <p className="text-white/90 text-base sm:text-base md:text-lg lg:text-xl max-w-3xl mb-8 md:mb-12 drop-shadow-lg">
                AI-crafted itineraries with transport, stays, food, and experiences — tailored to your budget, dates,
                and travel style.
              </p>

              {/* Search Bar – TourRadar / modern style */}
              <div className="bg-white/95 backdrop-blur-md rounded-full shadow-2xl p-1.5 sm:p-2 flex items-center w-full max-w-4xl">
                <div className="flex-1 flex items-center gap-3 sm:gap-4 px-5 sm:px-6 py-3 sm:py-4 border-r border-gray-200">
                  <MapPin className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground shrink-0" />
                  <input
                    ref={searchInputRef}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    placeholder="Where would you like to go?"
                    className="w-full bg-transparent text-base sm:text-lg text-gray-900 placeholder:text-gray-500 outline-none"
                  />
                </div>

                <Popover>
                  <PopoverTrigger asChild>
                    <button className="hidden md:flex items-center gap-3 px-6 py-4 border-r border-gray-200 text-base whitespace-nowrap hover:bg-gray-50 transition-colors cursor-pointer">
                      <CalendarIcon className="h-5 w-5 shrink-0 text-muted-foreground" />
                      <span className={cn(travelDate ? "text-gray-900" : "text-muted-foreground")}>
                        {travelDate ? format(travelDate, "MMM d, yyyy") : "Anytime"}
                      </span>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={travelDate}
                      onSelect={setTravelDate}
                      disabled={(date) => date < new Date()}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>

                <Popover>
                  <PopoverTrigger asChild>
                    <button className="hidden lg:flex items-center gap-3 px-6 py-4 text-base whitespace-nowrap hover:bg-gray-50 transition-colors cursor-pointer">
                      <Users className="h-5 w-5 shrink-0 text-muted-foreground" />
                      <span className="text-gray-900">
                        {adults} Adult{adults !== 1 ? "s" : ""}{children > 0 ? `, ${children} Child${children !== 1 ? "ren" : ""}` : ""}
                      </span>
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 p-4" align="start">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Adults</span>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => setAdults(Math.max(1, adults - 1))}
                            className="h-8 w-8 rounded-full border flex items-center justify-center text-sm hover:bg-accent transition-colors"
                          >−</button>
                          <span className="text-sm w-4 text-center">{adults}</span>
                          <button
                            onClick={() => setAdults(Math.min(10, adults + 1))}
                            className="h-8 w-8 rounded-full border flex items-center justify-center text-sm hover:bg-accent transition-colors"
                          >+</button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Children</span>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => setChildren(Math.max(0, children - 1))}
                            className="h-8 w-8 rounded-full border flex items-center justify-center text-sm hover:bg-accent transition-colors"
                          >−</button>
                          <span className="text-sm w-4 text-center">{children}</span>
                          <button
                            onClick={() => setChildren(Math.min(10, children + 1))}
                            className="h-8 w-8 rounded-full border flex items-center justify-center text-sm hover:bg-accent transition-colors"
                          >+</button>
                        </div>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>

                <Button
                  onClick={handleSearch}
                  size="lg"
                  className="rounded-full px-6 sm:px-8 h-11 sm:h-12 ml-2 sm:ml-3 bg-primary hover:bg-primary/90 text-base sm:text-lg font-medium"
                >
                  <Search className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                  Search
                </Button>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* Quick Suggestions + Recent Searches */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-12">
        {/* Suggestion Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-12 md:mb-16">
          {suggestions.map((s) => (
            <button
              key={s.label}
              onClick={() => {
                setQuery(s.query);
                navigate("/intent", { state: { query: s.query } });
              }}
              className="group bg-card border rounded-2xl p-5 md:p-6 text-left hover:shadow-xl hover:scale-[1.02] transition-all duration-300"
            >
              <span className="text-3xl md:text-4xl mb-3 md:mb-4 block">{s.icon}</span>
              <p className="font-semibold text-lg md:text-xl mb-1">{s.label}</p>
              <p className="text-sm md:text-base text-muted-foreground line-clamp-2">{s.query}</p>
            </button>
          ))}
        </div>

        {/* Recent Searches */}
        <div>
          <h2 className="text-lg font-semibold text-muted-foreground mb-4 md:mb-5 flex items-center gap-2">
            <Clock className="h-5 w-5" /> Recent Searches
          </h2>

          <div className="space-y-3 md:space-y-4">
            {recentSearches.map((s) => (
              <button
                key={s}
                onClick={() => {
                  setQuery(s);
                  navigate("/intent", { state: { query: s } });
                }}
                className="w-full flex items-center gap-4 px-5 py-4 md:px-6 md:py-5 bg-card border rounded-2xl text-left hover:bg-accent hover:shadow-md transition-all duration-200"
              >
                <MapPin className="h-5 w-5 text-muted-foreground shrink-0" />
                <span className="text-base md:text-lg truncate">{s}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {showOrb && (
        <TripSearchOverlay
          initialQuery={query}
          onClose={() => setShowOrb(false)}
          onSubmit={(data) => {
            setShowOrb(false);
            const q = data.destination || query || "Trip";
            navigate("/intent", { state: { query: q } });
          }}
        />
      )}
    </div>
  );
}
