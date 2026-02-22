import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Cloud, CalendarCheck, Video, ShieldCheck, Heart } from "lucide-react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { cn } from "@/lib/utils";
import { LiveWaveform } from "@/components/ui/live-waveform";

interface ProcessVisualizationProps {
  currentStep: number;
  totalSteps: number;
  /** Whether the mic is actively listening (drives waveform in waiting state) */
  listening?: boolean;
  /** Whether AI is processing input (drives processing waveform) */
  aiProcessing?: boolean;
  /** Called after the last stage animation finishes so parent can transition */
  onAllDone?: () => void;
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
    lottieUrl: "https://lottie.host/d76bf6ce-86f7-4bab-9b62-d3ed537bedd5/BHCABa46SG.lottie",
    title: "Personalizing",
    subtitle: "Matching experiences to your style",
    details: ["Analyzing preferences...", "Ranking activities...", "Building your perfect day..."],
  },
];

export default function ProcessVisualization({ currentStep, totalSteps, listening = false, aiProcessing = false, onAllDone }: ProcessVisualizationProps) {
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

  // Remove the old "complete all stages" batch effect — stages now run one-by-one
  // as the user answers each question (driven by currentStep above).

  // Cycle through detail text for active stage
  useEffect(() => {
    if (activeStage < 0 || stageDone) return;
    const stage = STAGES[activeStage];
    const interval = setInterval(() => {
      setDetailIndex((prev) => (prev + 1) % stage.details.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [activeStage, stageDone]);

  // Mark stage done after 4 s; if it’s the last stage call onAllDone
  useEffect(() => {
    if (activeStage < 0) return;
    const timer = setTimeout(() => {
      setStageDone(true);
      if (activeStage === STAGES.length - 1) {
        // brief pause so the user sees the waveform return before transitioning
        setTimeout(() => onAllDone?.(), 800);
      }
    }, 4000);
    return () => clearTimeout(timer);
  }, [activeStage]);

  const stage = activeStage >= 0 ? STAGES[activeStage] : null;
  const progress = activeStage < 0 ? 0 : Math.min(((activeStage + (stageDone ? 1 : 0.5)) / STAGES.length) * 100, 100);

  return (
    <div className="flex flex-col h-full items-center justify-center px-8 py-8 overflow-hidden relative">

      {/* Waiting state OR between-stage waveform — both show full waveform */}
      <AnimatePresence>
        {(activeStage < 0 || (stageDone && activeStage < STAGES.length - 1)) && (
          <motion.div
            key={activeStage < 0 ? "waiting" : `done-${activeStage}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.45 }}
            className="text-center relative z-10 flex flex-col items-center w-full px-6"
          >
            {/* Half-width reactive waveform — opens mic itself via active=true */}
            <div className="w-1/2 mx-auto mb-5">
              <LiveWaveform
                active={true}
                height={80}
                barWidth={3}
                barGap={2}
                mode="static"
                fadeEdges={true}
                barColor="primary"
              />
            </div>

            <motion.p
              animate={{ opacity: [1, 0.45, 1] }}
              transition={{ duration: 1.4, repeat: Infinity }}
              className="text-sm font-medium text-foreground mb-1"
            >
              {stageDone ? "✓ Done — listening for next answer" : "Listening…"}
            </motion.p>
            <p className="text-xs text-muted-foreground">
              {stageDone ? "Speak your next preference" : "Answer a few questions to start planning…"}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active process visualization — only shown while stage is RUNNING */}
      <AnimatePresence mode="wait">
        {stage && !stageDone && (
          <motion.div
            key={`${stage.id}-running`}
            initial={{ opacity: 0, scale: 0.85, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: -20 }}
            transition={{ duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
            className="text-center relative z-10 flex flex-col items-center"
          >
            {/* Lottie / emoji */}
            <motion.div
              animate={{ y: [0, -10, 0], scale: [1, 1.04, 1] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="relative mb-6"
            >
              {stage.lottieUrl ? (
                <div className="w-30 h-30 md:w-34 md:h-34">
                  <DotLottieReact src={stage.lottieUrl} loop autoplay />
                </div>
              ) : (
                <span className="text-7xl md:text-8xl block">{stage.emoji}</span>
              )}
            </motion.div>

            {/* Title */}
            <h2 className="text-lg font-heading font-semibold text-foreground mb-1">{stage.title}</h2>
            <p className="text-xs text-muted-foreground mb-4">{stage.subtitle}</p>

            {/* Cycling detail text */}
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

            {/* Processing waveform strip beneath detail text */}
            {/* <div className="w-full max-w-[200px] mt-4">
              <LiveWaveform
                active={false}
                processing={true}
                height={36}
                barWidth={3}
                barGap={2}
                mode="static"
                fadeEdges={true}
                barColor="primary"
              />
            </div> */}
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
