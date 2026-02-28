import { useLocation, useNavigate } from "react-router-dom";
import VoicePlanView from "@/components/plan/VoicePlanView";

export default function TripPlan() {
  const location = useLocation();
  const navigate = useNavigate();
  const query = (location.state as { query?: string })?.query || "Bali";

  return (
    <VoicePlanView
      initialQuery={query}
      onBack={() => navigate("/")}
    />
  );
}
