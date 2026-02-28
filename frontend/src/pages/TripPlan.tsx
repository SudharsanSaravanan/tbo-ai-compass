import { useLocation, useNavigate } from "react-router-dom";
import VoicePlanView from "@/components/plan/VoicePlanView";

export default function TripPlan() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = (location.state as { query?: string; initialMessage?: string }) || {};
  const query = state.query || "Bali";
  const initialMessage = state.initialMessage;

  return (
    <VoicePlanView
      initialQuery={query}
      initialMessage={initialMessage}
      onBack={() => navigate("/")}
    />
  );
}
