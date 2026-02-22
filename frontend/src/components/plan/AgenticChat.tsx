import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Mic, Check, Keyboard } from "lucide-react";
import tboLogo from "@/assets/tbo-logo.png";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Orb } from "react-ai-orb";
import { useAudioLevel } from "@/hooks/useAudioLevel";

interface ChatMessage {
  id: string;
  role: "ai" | "user";
  text: string;
  step?: number;
  locked?: boolean;
  options?: string[];
}

interface AgenticChatProps {
  initialQuery: string;
  onStepComplete: (step: number, answer: string) => void;
  currentStep: number;
}

const STEPS = [
  {
    question: "Let me help you plan the perfect trip! First, let me confirm — you'd like to explore **{destination}**?",
    options: ["Yes, that's right!", "Actually, somewhere else"],
    key: "destination",
  },
  {
    question: "When are you planning to travel, and how long will you be there?",
    options: ["3-5 days", "1 week", "10-14 days", "2+ weeks"],
    key: "duration",
  },
  {
    question: "What's your budget range for this trip?",
    options: ["Budget-friendly", "Mid-range", "Luxury", "No limit"],
    key: "budget",
  },
  {
    question: "What kind of travel experience are you looking for?",
    options: ["Relaxed & scenic", "Adventure & thrill", "Food & culture", "Mix of everything"],
    key: "style",
  },
  {
    question: "How many people are traveling?",
    options: ["Solo", "Couple", "Family (3-5)", "Group (6+)"],
    key: "travelers",
  },
];

export default function AgenticChat({ initialQuery, onStepComplete, currentStep }: AgenticChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [showVoice, setShowVoice] = useState(false);
  const [typing, setTyping] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { levelRef, start: startMic, stop: stopMic } = useAudioLevel();

  // Sync audio level when voice mode is active
  useEffect(() => {
    if (!showVoice) return;
    startMic();
    let raf = 0;
    const loop = () => {
      setAudioLevel((l) => l + (levelRef.current - l) * 0.25);
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => {
      cancelAnimationFrame(raf);
      stopMic();
    };
  }, [showVoice, startMic, stopMic, levelRef]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const greeting = STEPS[0].question.replace("{destination}", initialQuery || "a new destination");
      setMessages([
        {
          id: "greet",
          role: "ai",
          text: `Hey there! 👋 I'm your AI travel agent. ${greeting}`,
          step: 0,
          options: STEPS[0].options,
        },
      ]);
    }, 600);
    return () => clearTimeout(timer);
  }, [initialQuery]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, typing]);

  const handleAnswer = (answer: string, step: number) => {
    const userMsg: ChatMessage = {
      id: `user-${step}`,
      role: "user",
      text: answer,
      step,
      locked: true,
    };

    setMessages((prev) =>
      prev.map((m) => (m.step === step && m.role === "ai" ? { ...m, locked: true, options: undefined } : m)).concat(userMsg)
    );

    onStepComplete(step, answer);

    const nextStep = step + 1;
    if (nextStep < STEPS.length) {
      setTyping(true);
      setTimeout(() => {
        setTyping(false);
        const nextQ = STEPS[nextStep].question.replace("{destination}", initialQuery || "your destination");
        setMessages((prev) => [
          ...prev,
          {
            id: `ai-${nextStep}`,
            role: "ai",
            text: nextQ,
            step: nextStep,
            options: STEPS[nextStep].options,
          },
        ]);
      }, 1200);
    } else {
      setTyping(true);
      setTimeout(() => {
        setTyping(false);
        setMessages((prev) => [
          ...prev,
          {
            id: "ai-done",
            role: "ai",
            text: "Perfect! 🎉 I have everything I need. Let me craft your personalized itinerary now — checking weather, finding the best spots, and matching your style...",
            locked: true,
          },
        ]);
      }, 1000);
    }
  };

  const handleSend = () => {
    if (!inputText.trim()) return;
    handleAnswer(inputText.trim(), currentStep);
    setInputText("");
  };

  const handleVoiceText = (text: string) => {
    setShowVoice(false);
    if (text.trim()) {
      setInputText(text);
    }
  };

  return (
    <div className="flex flex-col h-full border-l border-border bg-gradient-to-b from-background via-card/80 to-background relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute top-20 right-8 w-32 h-32 rounded-full bg-primary/5 blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute bottom-32 left-4 w-24 h-24 rounded-full bg-primary/3 blur-2xl pointer-events-none animate-pulse" style={{ animationDelay: "1s" }} />

      {/* Header */}
      <div className="px-5 py-4 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3">
          <img src={tboLogo} alt="TBO Navigator" className="h-9" />
        </div>
      </div>

      <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-5 space-y-5 relative z-10">
        <AnimatePresence mode="popLayout">
          {messages.map((msg, i) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 30, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
              className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}
            >
              <motion.div
                animate={{ y: [0, -2, 0] }}
                transition={{ duration: 4 + i * 0.5, repeat: Infinity, ease: "easeInOut" }}
                className={cn("relative max-w-[88%]")}
              >
                <div
                  className={cn(
                    "rounded-2xl px-4 py-3 text-sm leading-relaxed backdrop-blur-sm",
                    msg.role === "ai"
                      ? "bg-secondary/80 text-foreground rounded-tl-sm border border-border/50 shadow-sm"
                      : "bg-primary text-primary-foreground rounded-tr-sm shadow-md shadow-primary/10"
                  )}
                >
                  {msg.text}
                  {msg.locked && msg.role === "user" && (
                    <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="inline-flex ml-2 text-primary-foreground/70">
                      <Check className="h-3.5 w-3.5" />
                    </motion.span>
                  )}
                </div>

                {msg.options && !msg.locked && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.4 }}
                    className="flex flex-wrap gap-2 mt-2.5"
                  >
                    {msg.options.map((opt, j) => (
                      <motion.button
                        key={opt}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.3 + j * 0.08 }}
                        onClick={() => handleAnswer(opt, msg.step!)}
                        className="px-3.5 py-2 text-xs font-medium rounded-xl border border-primary/20 text-primary bg-primary/5 hover:bg-primary/10 hover:shadow-sm transition-all duration-200"
                      >
                        {opt}
                      </motion.button>
                    ))}
                  </motion.div>
                )}
              </motion.div>
            </motion.div>
          ))}
        </AnimatePresence>

        {typing && (
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="flex justify-start">
            <motion.div
              animate={{ y: [0, -3, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="bg-secondary/80 backdrop-blur-sm rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1.5 border border-border/50"
            >
              <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "300ms" }} />
            </motion.div>
          </motion.div>
        )}
      </div>

      {/* Input */}
      <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      <div className="px-4 py-3 relative z-10">
        <AnimatePresence mode="wait">
          {showVoice ? (
            <motion.div
              key="voice"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex items-center justify-center gap-2"
            >
              <div className="flex-1 flex items-center justify-center h-10 rounded-xl bg-secondary/60 border border-border/50 overflow-hidden">
                <div className="w-[40px] h-[40px] -my-4 mt-[-12px] pointer-events-auto">
                  <Orb
                    size={0.4 + audioLevel * 0.15}
                    animationSpeedBase={1 + audioLevel * 3}
                    animationSpeedHue={1 + audioLevel * 2}
                    hueRotation={120 + audioLevel * 180}
                    mainOrbHueAnimation={true}
                  />
                </div>
                <span className="text-xs text-muted-foreground ml-1">Listening...</span>
              </div>
              <Button
                size="icon"
                variant="outline"
                onClick={() => setShowVoice(false)}
                className="rounded-xl h-10 w-10 shrink-0 border-border/50 text-muted-foreground hover:text-primary"
              >
                <Keyboard className="h-4 w-4" />
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="text"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2"
            >
              <input
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Type your answer..."
                className="flex-1 bg-secondary/60 backdrop-blur-sm border border-border/50 rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-ring focus:bg-secondary/80 transition-colors"
              />
              <Button
                size="icon"
                variant="outline"
                onClick={() => setShowVoice(true)}
                className="rounded-xl h-10 w-10 shrink-0 border-border/50 text-muted-foreground hover:text-primary hover:border-primary/30"
              >
                <Mic className="h-4 w-4" />
              </Button>
              <Button size="icon" onClick={handleSend} className="rounded-xl h-10 w-10 shrink-0 shadow-md shadow-primary/10">
                <Send className="h-4 w-4" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
