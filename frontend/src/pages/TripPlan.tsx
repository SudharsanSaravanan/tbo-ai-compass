import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import AgenticChat from "@/components/plan/AgenticChat";
import ProcessVisualization from "@/components/plan/ProcessVisualization";
import LiveItinerary from "@/components/plan/LiveItinerary";
import CompletedItinerary from "@/components/plan/CompletedItinerary";

const TOTAL_STEPS = 5;

export default function TripPlan() {
  const location = useLocation();
  const navigate = useNavigate();
  const query = (location.state as { query?: string })?.query || "Bali";
  const [currentStep, setCurrentStep] = useState(0);
  const [planningComplete, setPlanningComplete] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);
  const [aiEditStep, setAiEditStep] = useState(0);
  const [listening, setListening] = useState(true); // voice mode is default

  const handleStepComplete = (step: number, answer: string) => {
    const nextStep = step + 1;
    setCurrentStep(nextStep);
    // planningComplete is now triggered by onAllDone from ProcessVisualization
    // once the last stage animation finishes by itself
  };

  // Completed view
  if (planningComplete && !showAIChat) {
    return (
      <div className="h-[calc(100vh-3.5rem)] flex flex-col">
        <div className="h-11 border-b border-border flex items-center px-4 gap-3 shrink-0 bg-card/50">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="h-7 px-2 text-muted-foreground">
            <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back
          </Button>
          <div className="h-4 w-px bg-border" />
          <p className="text-sm text-foreground font-medium truncate">✅ {query} — Itinerary Ready</p>
        </div>
        <div className="flex-1 min-h-0">
          <CompletedItinerary destination={query} onOpenAIChat={() => setShowAIChat(true)} />
        </div>
      </div>
    );
  }

  // AI Chat re-edit: full 3-panel layout (itinerary | process | chat)
  if (planningComplete && showAIChat) {
    return (
      <div className="h-[calc(100vh-3.5rem)] flex flex-col">
        <div className="h-11 border-b border-border flex items-center px-4 gap-3 shrink-0 bg-card/50">
          <Button variant="ghost" size="sm" onClick={() => setShowAIChat(false)} className="h-7 px-2 text-muted-foreground">
            <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back to Itinerary
          </Button>
          <div className="h-4 w-px bg-border" />
          <p className="text-sm text-foreground font-medium truncate">Editing: {query} with AI</p>
          <div className="flex-1" />
          <div className="flex items-center gap-1.5">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div
                key={i}
                className={`h-1.5 w-6 rounded-full transition-colors duration-300 ${i < aiEditStep ? "bg-primary" : i === aiEditStep ? "bg-primary/40" : "bg-secondary"
                  }`}
              />
            ))}
          </div>
        </div>
        <div className="flex-1 flex min-h-0">
          {/* Left — Live Itinerary */}
          <div className="w-[320px] shrink-0 min-h-0 overflow-hidden">
            <LiveItinerary currentStep={aiEditStep} totalSteps={TOTAL_STEPS} destination={query} />
          </div>
          {/* Middle — Process Visualization */}
          <div className="flex-1 min-w-[280px] min-h-0 overflow-hidden border-l border-border">
            <ProcessVisualization currentStep={aiEditStep} totalSteps={TOTAL_STEPS} listening={listening} />
          </div>
          {/* Right — AI Chat */}
          <div className="w-[370px] shrink-0 flex flex-col min-h-0 relative">
            <AgenticChat
              initialQuery={query}
              onStepComplete={(step, answer) => setAiEditStep(step + 1)}
              currentStep={aiEditStep}
              onListeningChange={setListening}
            />
          </div>
        </div>
      </div>
    );
  }

  // Planning mode
  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col">
      <div className="h-11 border-b border-border flex items-center px-4 gap-3 shrink-0 bg-card/50">
        <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="h-7 px-2 text-muted-foreground">
          <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back
        </Button>
        <div className="h-4 w-px bg-border" />
        <p className="text-sm text-foreground font-medium truncate">Planning: {query}</p>
        <div className="flex-1" />
        <div className="flex items-center gap-1.5">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 w-6 rounded-full transition-colors duration-300 ${i < currentStep ? "bg-primary" : i === currentStep ? "bg-primary/40" : "bg-secondary"
                }`}
            />
          ))}
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        <div className="w-[320px] shrink-0 min-h-0 overflow-hidden">
          <LiveItinerary currentStep={currentStep} totalSteps={TOTAL_STEPS} destination={query} />
        </div>
        <div className="flex-1 min-w-[280px] min-h-0 overflow-hidden border-l border-border">
          <ProcessVisualization
            currentStep={currentStep}
            totalSteps={TOTAL_STEPS}
            listening={listening}
            onAllDone={() => setPlanningComplete(true)}
          />
        </div>
        <div className="w-[370px] shrink-0 flex flex-col min-h-0 relative">
          <AgenticChat initialQuery={query} onStepComplete={handleStepComplete} currentStep={currentStep} onListeningChange={setListening} />
        </div>
      </div>
    </div>
  );
}
