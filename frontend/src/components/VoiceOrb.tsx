import { useEffect, useState, useCallback } from "react";
import { X, Keyboard, Mic } from "lucide-react";
import { Orb } from "react-ai-orb";
import { Button } from "@/components/ui/button";
import { useAudioLevel } from "@/hooks/useAudioLevel";

interface VoiceOrbProps {
  onClose: () => void;
  onSwitchToText: () => void;
}

export default function VoiceOrb({ onClose, onSwitchToText }: VoiceOrbProps) {
  const { levelRef, ready, start, stop } = useAudioLevel();
  const [level, setLevel] = useState(0);

  // Auto-start mic
  useEffect(() => {
    start();
    return () => stop();
  }, [start, stop]);

  // Sync audio level to state
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      setLevel((l) => l + (levelRef.current - l) * 0.25);
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(raf);
  }, [levelRef]);

  // Map audio level to orb props for Siri-like reactivity
  const orbSize = 1.5 + level * 0.8;
  const animSpeed = 1 + level * 3;
  const hueRotation = 120 + level * 180;

  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-black/85 backdrop-blur-md animate-fade-in">
      {/* Close button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onClose}
        className="absolute top-6 right-6 text-white/80 hover:text-white hover:bg-white/10"
      >
        <X className="h-6 w-6" />
      </Button>

      {/* Orb - centered, shifted 4px left */}
      <div className="relative w-[260px] h-[260px] sm:w-[320px] sm:h-[320px]" style={{ marginLeft: 4 }}>
        <div
          className="absolute inset-0 flex items-center justify-center transition-transform duration-100"
          style={{ transform: `scale(${1 + level * 0.15})` }}
        >
          <Orb
            size={orbSize}
            animationSpeedBase={animSpeed}
            animationSpeedHue={1 + level * 2}
            hueRotation={hueRotation}
            mainOrbHueAnimation={true}
          />
        </div>
      </div>

      {/* Status */}
      <p className="mt-4 text-white/60 text-xs">
        {ready ? "Listening..." : "Requesting mic..."}
      </p>

      {/* Switch to text button */}
      <Button
        variant="outline"
        size="sm"
        onClick={onSwitchToText}
        className="mt-4 rounded-full border-white/20 text-white/70 bg-white/10 hover:bg-white/20 hover:text-white text-xs px-4 h-8"
      >
        <Keyboard className="h-3 w-3 mr-1.5" />
        Switch to typing
      </Button>
    </div>
  );
}
