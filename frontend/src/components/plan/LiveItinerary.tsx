import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Utensils, Camera, Bus, Clock, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface ItineraryItem {
  time: string;
  title: string;
  type: "place" | "food" | "transport" | "experience";
  note?: string;
}

interface ItineraryDay {
  day: number;
  title: string;
  items: ItineraryItem[];
}

interface LiveItineraryProps {
  currentStep: number;
  totalSteps: number;
  destination: string;
}

const MOCK_ITINERARY: ItineraryDay[] = [
  {
    day: 1,
    title: "Arrival & First Impressions",
    items: [
      { time: "10:00 AM", title: "Arrive & hotel check-in", type: "transport" },
      { time: "12:30 PM", title: "Local welcome lunch", type: "food", note: "Traditional cuisine" },
      { time: "3:00 PM", title: "Walking tour of old town", type: "place" },
      { time: "7:00 PM", title: "Sunset viewpoint visit", type: "experience" },
    ],
  },
  {
    day: 2,
    title: "Culture & Exploration",
    items: [
      { time: "8:30 AM", title: "Breakfast at local café", type: "food" },
      { time: "10:00 AM", title: "Museum & heritage site", type: "place" },
      { time: "1:00 PM", title: "Street food tour", type: "food", note: "Must-try local dishes" },
      { time: "4:00 PM", title: "Market & shopping district", type: "experience" },
    ],
  },
  {
    day: 3,
    title: "Adventure Day",
    items: [
      { time: "7:00 AM", title: "Sunrise trek / nature hike", type: "experience" },
      { time: "12:00 PM", title: "Scenic lunch spot", type: "food" },
      { time: "2:30 PM", title: "Water activity / adventure sport", type: "experience" },
      { time: "6:00 PM", title: "Farewell dinner", type: "food", note: "Fine dining experience" },
    ],
  },
];

const typeIcon = {
  place: <MapPin className="h-3.5 w-3.5" />,
  food: <Utensils className="h-3.5 w-3.5" />,
  transport: <Bus className="h-3.5 w-3.5" />,
  experience: <Camera className="h-3.5 w-3.5" />,
};

const typeColor = {
  place: "text-primary bg-primary/10",
  food: "text-warning bg-warning/10",
  transport: "text-muted-foreground bg-secondary",
  experience: "text-success bg-success/10",
};

export default function LiveItinerary({ currentStep, totalSteps, destination }: LiveItineraryProps) {
  const [visibleDays, setVisibleDays] = useState(0);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (currentStep >= 3 && visibleDays === 0) {
      setVersion(1);
      setVisibleDays(1);
    }
    if (currentStep >= 4 && visibleDays < 2) {
      setVisibleDays(2);
    }
    if (currentStep >= totalSteps) {
      setTimeout(() => {
        setVisibleDays(3);
        setVersion(2);
      }, 2500);
    }
  }, [currentStep, totalSteps]);

  const showSkeleton = currentStep < 3;

  return (
    <div className="flex flex-col h-full bg-card/30 border-r border-border">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Live Itinerary</span>
        </div>
        {version > 0 && (
          <motion.span
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary"
          >
            Draft v{version}
          </motion.span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {/* Destination header */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-4"
        >
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Destination</p>
          <p className="text-base font-heading font-semibold text-foreground">{destination || "Planning..."}</p>
        </motion.div>

        {/* Skeleton state */}
        {showSkeleton && (
          <div className="space-y-4">
            <div className="text-xs text-muted-foreground text-center py-6">
              Answer a few more questions to start building your itinerary...
            </div>
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2 opacity-30">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-12 w-full rounded-lg" />
                <Skeleton className="h-12 w-full rounded-lg" />
                <Skeleton className="h-12 w-3/4 rounded-lg" />
              </div>
            ))}
          </div>
        )}

        {/* Itinerary days */}
        <AnimatePresence mode="popLayout">
          {MOCK_ITINERARY.slice(0, visibleDays).map((day, dayIndex) => (
            <motion.div
              key={day.day}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: dayIndex * 0.2 }}
              className="mb-6"
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                  Day {day.day}
                </span>
                <span className="text-xs font-medium text-foreground">{day.title}</span>
              </div>

              <div className="space-y-2 pl-2 border-l-2 border-border ml-1">
                {day.items.map((item, itemIndex) => (
                  <motion.div
                    key={itemIndex}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: dayIndex * 0.2 + itemIndex * 0.1 + 0.3 }}
                    className="flex items-start gap-2.5 pl-3 py-1.5"
                  >
                    <div className={cn("h-6 w-6 rounded-md flex items-center justify-center shrink-0 mt-0.5", typeColor[item.type])}>
                      {typeIcon[item.type]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground font-medium">{item.time}</span>
                      </div>
                      <p className="text-sm text-foreground">{item.title}</p>
                      {item.note && (
                        <p className="text-[11px] text-muted-foreground mt-0.5">{item.note}</p>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
