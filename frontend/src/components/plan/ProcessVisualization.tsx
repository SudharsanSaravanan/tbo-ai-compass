import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Cloud, CalendarCheck, Video, ShieldCheck, Heart, CheckCircle2 } from "lucide-react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { cn } from "@/lib/utils";

interface ProcessVisualizationProps {
  currentStep: number;
  totalSteps: number;
}

interface ProcessStage {
  id: string;
  emoji: string;
  lottieUrl?: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  details: string[];
}

const STAGES: ProcessStage[] = [
  {
    id: "weather",
    emoji: "🌤️",
    lottieUrl: "https://lottie.host/aa086493-e5e4-41f1-aaa4-1973b30cc976/f4YrApvaGC.lottie",
    icon: <Cloud className="h-6 w-6" />,
    title: "Checking Weather",
    subtitle: "Analyzing forecast for your travel dates",
    details: ["Fetching 7-day forecast...", "Checking rain probability...", "Finding best outdoor days..."],
  },
  {
    id: "dates",
    emoji: "📅",
    lottieUrl: "https://lottie.host/3ae0517a-5acc-4b2b-8402-91fb60986946/pCZeWvPlil.lottie",
    icon: <CalendarCheck className="h-6 w-6" />,
    title: "Optimizing Dates",
    subtitle: "Finding the best travel windows",
    details: ["Comparing seasonal trends...", "Checking local events...", "Avoiding peak crowds..."],
  },
  {
    id: "videos",
    emoji: "▶️",
    lottieUrl: "https://lottie.host/c2757a66-b825-4443-9709-61677897400e/cWfu6xm27Z.lottie",
    icon: <Video className="h-6 w-6" />,
    title: "Finding Travel Content",
    subtitle: "Extracting relevant YouTube videos & guides",
    details: ["Searching travel vlogs...", "Finding food guides...", "Curating hidden gems..."],
  },
  {
    id: "safety",
    emoji: "🛡️",
    lottieUrl: "https://lottie.host/ab91fc4f-a53d-46fc-941f-a3c85a886cc1/VionV4rBqZ.lottie",
    icon: <ShieldCheck className="h-6 w-6" />,
    title: "Safety Check",
    subtitle: "Validating local conditions & food safety",
    details: ["Checking travel advisories...", "Reviewing health guidelines...", "Verifying local regulations..."],
  },
  {
    id: "match",
    emoji: "💜",
    icon: <Heart className="h-6 w-6" />,
    title: "Personalizing",
    subtitle: "Matching experiences to your style",
    details: ["Analyzing preferences...", "Ranking activities...", "Building your perfect day..."],
  },
];

export default function ProcessVisualization({ currentStep, totalSteps }: ProcessVisualizationProps) {
  const [activeStage, setActiveStage] = useState(-1);
  const [detailIndex, setDetailIndex] = useState(0);
  const [stageDone, setStageDone] = useState(false);

  // Advance stages based on chat progress
  useEffect(() => {
    if (currentStep < 1) return;
    const targetStage = Math.min(currentStep - 1, STAGES.length - 1);
    if (targetStage > activeStage) {
      setStageDone(false);
      setDetailIndex(0);
      setActiveStage(targetStage);
    }
  }, [currentStep]);

  // Complete all stages when planning done
  useEffect(() => {
    if (currentStep >= totalSteps) {
      let stageIdx = 0;
      const runStages = () => {
        if (stageIdx >= STAGES.length) return;
        setStageDone(false);
        setDetailIndex(0);
        setActiveStage(stageIdx);
        const idx = stageIdx;
        setTimeout(() => {
          setStageDone(true);
          stageIdx++;
          setTimeout(runStages, 400);
        }, 1500);
      };
      runStages();
    }
  }, [currentStep, totalSteps]);

  // Cycle through detail text for active stage
  useEffect(() => {
    if (activeStage < 0 || stageDone) return;
    const stage = STAGES[activeStage];
    const interval = setInterval(() => {
      setDetailIndex((prev) => (prev + 1) % stage.details.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [activeStage, stageDone]);

  // Mark stage done after delay (during normal flow)
  useEffect(() => {
    if (activeStage < 0 || currentStep >= totalSteps) return;
    const timer = setTimeout(() => setStageDone(true), 4000);
    return () => clearTimeout(timer);
  }, [activeStage]);

  const stage = activeStage >= 0 ? STAGES[activeStage] : null;
  const progress = activeStage < 0 ? 0 : Math.min(((activeStage + (stageDone ? 1 : 0.5)) / STAGES.length) * 100, 100);

  return (
    <div className="flex flex-col h-full items-center justify-center px-8 py-8 overflow-hidden relative">

      {/* Waiting state */}
      {activeStage < 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center relative z-10 flex flex-col items-center"
        >
          <div className="w-[146px] h-[146px] mb-4">
            <DotLottieReact
              // src="https://lottie.host/d76bf6ce-86f7-4bab-9b62-d3ed537bedd5/BHCABa46SG.lottie"
              src="https://lottie.host/0179381c-805f-4b37-be14-26b3552c13bf/LuPNLj4CgU.lottie"
              loop
              autoplay
            />
          </div>
          <p className="text-sm font-medium text-foreground mb-1">Waiting for your input</p>
          <p className="text-xs text-muted-foreground">Answer a few questions to start planning...</p>
        </motion.div>
      )}

      {/* Active process visualization */}
      <AnimatePresence mode="wait">
        {stage && (
          <motion.div
            key={stage.id}
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -20 }}
            transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
            className="text-center relative z-10 flex flex-col items-center"
          >
            {/* Big emoji */}
            <motion.div
              animate={
                stageDone
                  ? { scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }
                  : { y: [0, -12, 0], scale: [1, 1.05, 1] }
              }
              transition={{
                duration: stageDone ? 0.5 : 3,
                repeat: stageDone ? 0 : Infinity,
                ease: "easeInOut",
              }}
              className="relative mb-6"
            >
              {stage.lottieUrl ? (
                <div className="w-30 h-30 md:w-34 md:h-34">
                  <DotLottieReact src={stage.lottieUrl} loop autoplay />
                </div>
              ) : (
                <span className="text-7xl md:text-8xl block">{stage.emoji}</span>
              )}


              {/* Done checkmark overlay */}
              {/* {stageDone && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-success flex items-center justify-center shadow-lg"
                >
                  <CheckCircle2 className="h-5 w-5 text-success-foreground" />
                </motion.div>
              )} */}
            </motion.div>

            {/* Title */}
            <h2 className="text-lg font-heading font-semibold text-foreground mb-1">
              {stageDone ? `${stage.title} ✓` : stage.title}
            </h2>
            <p className="text-xs text-muted-foreground mb-4">{stage.subtitle}</p>

            {/* Cycling detail text */}
            {!stageDone && (
              <AnimatePresence mode="wait">
                <motion.div
                  key={detailIndex}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3 }}
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/80 border border-border/50"
                >
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="h-3.5 w-3.5 border-2 border-primary/30 border-t-primary rounded-full"
                  />
                  <span className="text-xs text-muted-foreground">{stage.details[detailIndex]}</span>
                </motion.div>
              </AnimatePresence>
            )}

            {stageDone && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-xs text-success font-medium"
              >
                Complete — moving to next step
              </motion.p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom progress */}
      <div className="absolute bottom-8 left-8 right-8 z-10">
        {/* Stage dots */}
        <div className="flex items-center justify-center gap-3 mb-3">
          {STAGES.map((s, i) => (
            <motion.div
              key={s.id}
              animate={{
                scale: i === activeStage ? 1.3 : 1,
                opacity: i <= activeStage ? 1 : 0.3,
              }}
              className={cn(
                "h-2 w-2 rounded-full transition-colors duration-300",
                i < activeStage || (i === activeStage && stageDone)
                  ? "bg-success"
                  : i === activeStage
                    ? "bg-primary"
                    : "bg-muted-foreground/30"
              )}
            />
          ))}
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-secondary rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-primary rounded-full"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
        <p className="text-[10px] text-muted-foreground text-center mt-1.5">
          {Math.round(progress)}% complete
        </p>
      </div>
    </div>
  );
}
