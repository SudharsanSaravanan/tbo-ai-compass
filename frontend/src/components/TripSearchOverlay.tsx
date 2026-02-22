import { useState, useEffect, useCallback } from "react";
import { X, Mic, Keyboard, DollarSign, Sparkles, ArrowRight, Target, Gauge, Building } from "lucide-react";
import { Orb } from "react-ai-orb";
import { Button } from "@/components/ui/button";
import { useAudioLevel } from "@/hooks/useAudioLevel";
import { cn } from "@/lib/utils";

interface TripSearchOverlayProps {
  onClose: () => void;
  onSubmit: (data: TripFormData) => void;
  initialQuery?: string;
}

export interface TripFormData {
  destination: string;
  budget: string;
  purpose: string;
  interests: string;
  pace: string;
  accommodation: string;
}

type Mode = "form" | "voice";

export default function TripSearchOverlay({ onClose, onSubmit, initialQuery = "" }: TripSearchOverlayProps) {
  const [mode, setMode] = useState<Mode>("form");
  const [destination] = useState(initialQuery);
  const [budget, setBudget] = useState("");
  const [purpose, setPurpose] = useState("");
  const [interests, setInterests] = useState("");
  const [pace, setPace] = useState("");
  const [accommodation, setAccommodation] = useState("");

  // Voice orb
  const { levelRef, ready, start, stop } = useAudioLevel();
  const [level, setLevel] = useState(0);
  const [micActive, setMicActive] = useState(false);

  // Start/stop mic based on micActive
  useEffect(() => {
    if (micActive) {
      start();
    } else {
      stop();
    }
    return () => stop();
  }, [micActive, start, stop]);

  // Sync audio level
  useEffect(() => {
    if (!micActive) return;
    let raf = 0;
    const loop = () => {
      setLevel((l) => l + (levelRef.current - l) * 0.25);
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(raf);
  }, [micActive, levelRef]);

  const orbSize = micActive ? 1.5 + level * 0.8 : 1.2;
  const animSpeed = micActive ? 1 + level * 3 : 0.3;
  const hueRotation = micActive ? 120 + level * 180 : 200;

  const handleSubmit = () => {
    onSubmit({ destination, budget, purpose, interests, pace, accommodation });
  };

  const switchToVoice = () => {
    setMode("voice");
    setMicActive(true);
  };

  const switchToForm = () => {
    setMicActive(false);
    setMode("form");
  };

  const budgetOptions = ["Budget", "Mid-range", "Luxury", "No limit"];
  const purposeOptions = ["Leisure", "Honeymoon", "Family Vacation", "Solo Adventure", "Business + Leisure", "Friends Trip"];
  const interestOptions = ["Beach", "Culture", "Food", "Adventure", "Shopping", "Nature", "Nightlife", "Wellness"];
  const paceOptions = ["Relaxed", "Moderate", "Packed"];
  const accommodationOptions = ["Hostel", "Hotel", "Resort", "Villa / Airbnb", "No preference"];

  const ChipSelector = ({ options, value, onChange, multi = false }: { options: string[]; value: string; onChange: (v: string) => void; multi?: boolean }) => {
    const [showOther, setShowOther] = useState(false);
    const [otherText, setOtherText] = useState("");
    const isOtherSelected = multi
      ? value.split(",").map(s => s.trim()).some(v => v !== "" && !options.includes(v))
      : value !== "" && !options.includes(value);

    return (
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          {options.map((opt) => {
            const selected = multi ? value.split(",").map(s => s.trim()).includes(opt) : value === opt;
            return (
              <button
                key={opt}
                onClick={() => {
                  if (multi) {
                    const curr = value.split(",").map(s => s.trim()).filter(Boolean);
                    onChange(selected ? curr.filter(i => i !== opt).join(", ") : [...curr, opt].join(", "));
                  } else {
                    onChange(value === opt ? "" : opt);
                    setShowOther(false);
                  }
                }}
                className={cn(
                  "px-4 py-2 rounded-full text-xs font-medium border transition-all",
                  selected
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-white/10 text-white/70 border-white/15 hover:bg-white/20"
                )}
              >
                {opt}
              </button>
            );
          })}
          <button
            onClick={() => setShowOther(!showOther)}
            className={cn(
              "px-4 py-2 rounded-full text-xs font-medium border transition-all",
              isOtherSelected || showOther
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-white/10 text-white/70 border-white/15 hover:bg-white/20"
            )}
          >
            Other
          </button>
        </div>
        {showOther && (
          <input
            value={otherText}
            onChange={(e) => setOtherText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && otherText.trim()) {
                if (multi) {
                  const curr = value.split(",").map(s => s.trim()).filter(Boolean);
                  onChange([...curr, otherText.trim()].join(", "));
                } else {
                  onChange(otherText.trim());
                }
                setOtherText("");
                setShowOther(false);
              }
            }}
            placeholder="Type and press Enter..."
            className="w-full bg-white/10 border border-white/15 rounded-xl px-4 py-2.5 text-white placeholder:text-white/30 outline-none focus:border-primary/60 focus:bg-white/15 transition-colors text-sm"
            autoFocus
          />
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-lg animate-fade-in flex">
      {/* Close */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onClose}
        className="absolute top-5 right-5 text-white/70 hover:text-white hover:bg-white/10 z-10"
      >
        <X className="h-6 w-6" />
      </Button>

      {/* Left — Form */}
      <div className={cn(
        "flex flex-col justify-center px-6 sm:px-10 lg:px-16 py-10 overflow-y-auto transition-all duration-500",
        mode === "form" ? "w-full lg:w-1/2" : "w-0 lg:w-0 overflow-hidden opacity-0 p-0"
      )}>
        <div className="max-w-lg mx-auto w-full space-y-6">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-1">Tell us about your trip</h2>
            <p className="text-white/50 text-sm">Help us tailor the perfect itinerary for you.</p>
          </div>

          {/* 1 — Budget */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-white/60 uppercase tracking-wider flex items-center gap-2">
              <DollarSign className="h-3.5 w-3.5" /> What's your budget?
            </label>
            <ChipSelector options={budgetOptions} value={budget} onChange={setBudget} />
          </div>

          {/* 2 — Purpose */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-white/60 uppercase tracking-wider flex items-center gap-2">
              <Target className="h-3.5 w-3.5" /> Purpose of travel
            </label>
            <ChipSelector options={purposeOptions} value={purpose} onChange={setPurpose} />
          </div>

          {/* 3 — Interests */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-white/60 uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5" /> What excites you?
            </label>
            <ChipSelector options={interestOptions} value={interests} onChange={setInterests} multi />
          </div>

          {/* 4 — Pace */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-white/60 uppercase tracking-wider flex items-center gap-2">
              <Gauge className="h-3.5 w-3.5" /> Preferred pace
            </label>
            <ChipSelector options={paceOptions} value={pace} onChange={setPace} />
          </div>

          {/* 5 — Accommodation */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-white/60 uppercase tracking-wider flex items-center gap-2">
              <Building className="h-3.5 w-3.5" /> Stay preference
            </label>
            <ChipSelector options={accommodationOptions} value={accommodation} onChange={setAccommodation} />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <Button onClick={handleSubmit} className="flex-1 rounded-xl h-12 text-sm font-semibold">
              Generate Itinerary <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={switchToVoice}
              className="h-12 w-12 rounded-xl border-white/20 text-white/70 bg-white/10 hover:bg-white/20 hover:text-white shrink-0"
            >
              <Mic className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Right — Voice Orb */}
      <div className={cn(
        "flex flex-col items-center justify-center transition-all duration-500",
        mode === "form"
          ? "hidden lg:flex lg:w-1/2 border-l border-white/10"
          : "w-full"
      )}>
        <div className="relative w-[240px] h-[240px] sm:w-[300px] sm:h-[300px]" style={{ marginLeft: 4 }}>
          <div
            className="absolute inset-0 flex items-center justify-center transition-transform duration-100"
            style={{ transform: `scale(${1 + (micActive ? level * 0.15 : 0)})` }}
          >
            <Orb
              size={orbSize}
              animationSpeedBase={animSpeed}
              animationSpeedHue={micActive ? 1 + level * 2 : 0.2}
              hueRotation={hueRotation}
              mainOrbHueAnimation={micActive}
            />
          </div>
        </div>

        <p className="mt-4 text-white/50 text-xs">
          {micActive ? (ready ? "Listening..." : "Requesting mic...") : "Tap to start listening"}
        </p>

        <div className="flex items-center gap-3 mt-6">
          {!micActive ? (
            <Button
              onClick={() => setMicActive(true)}
              className="rounded-full px-6 h-10 text-xs font-medium"
            >
              <Mic className="h-4 w-4 mr-2" /> Start Listening
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={() => setMicActive(false)}
              className="rounded-full px-6 h-10 text-xs font-medium border-white/20 text-white/70 bg-white/10 hover:bg-white/20 hover:text-white"
            >
              Pause
            </Button>
          )}

          {mode === "voice" && (
            <Button
              variant="outline"
              size="sm"
              onClick={switchToForm}
              className="rounded-full border-white/20 text-white/70 bg-white/10 hover:bg-white/20 hover:text-white text-xs px-4 h-10"
            >
              <Keyboard className="h-3.5 w-3.5 mr-1.5" />
              Switch to form
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}