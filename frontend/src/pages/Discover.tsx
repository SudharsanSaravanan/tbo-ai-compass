import { useState } from "react";
import { Search, Star, MapPin, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { mockDiscoverItems } from "@/lib/mock-data";
import { Link } from "react-router-dom";

const filters = ["All", "Hotels", "Activities", "Food"];

export default function Discover() {
  const [activeFilter, setActiveFilter] = useState("All");
  const [search, setSearch] = useState("");

  const filtered = mockDiscoverItems.filter((item) => {
    if (activeFilter !== "All" && item.type !== activeFilter.toLowerCase().slice(0, -1)) return false;
    if (search && !item.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="container py-8 animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1">Discover</h1>
        <p className="text-muted-foreground text-sm">Browse hotels, activities, and restaurants in Bali</p>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1 flex items-center gap-2 bg-card border rounded-xl px-4 py-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search places..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <div className="flex gap-2">
          {filters.map((f) => (
            <Button
              key={f}
              variant={activeFilter === f ? "default" : "outline"}
              size="sm"
              className="rounded-full"
              onClick={() => setActiveFilter(f)}
            >
              {f}
            </Button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((item) => (
          <Link
            key={item.id}
            to={item.type === "food" ? `/food/${item.id}` : "#"}
            className="group bg-card border rounded-2xl overflow-hidden card-hover"
          >
            <div className="relative h-44 overflow-hidden">
              <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              <Badge className="absolute top-3 left-3 bg-card/90 text-card-foreground capitalize border-0">
                {item.type}
              </Badge>
            </div>
            <div className="p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-semibold text-sm">{item.name}</h3>
                <span className="flex items-center gap-0.5 text-xs font-medium text-warning shrink-0">
                  <Star className="h-3.5 w-3.5 fill-warning" /> {item.rating}
                </span>
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mb-3">
                <MapPin className="h-3 w-3" /> {item.location}
              </p>
              <div className="flex items-center justify-between">
                <div className="flex gap-1.5 flex-wrap">
                  {item.tags.slice(0, 2).map((t) => (
                    <span key={t} className="bg-accent text-accent-foreground text-[10px] px-2 py-0.5 rounded-full">{t}</span>
                  ))}
                </div>
                <span className="text-sm font-semibold text-primary">{item.price}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
