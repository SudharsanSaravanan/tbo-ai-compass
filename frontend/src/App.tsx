import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import AppHeader from "@/components/AppHeader";
import { ScrollToTop } from "@/components/ScrollToTop";
import AppFooter from "@/components/AppFooter";
import Index from "./pages/Index";
import IntentPreview from "./pages/IntentPreview";
import TripDashboard from "./pages/TripDashboard";
import FoodDetails from "./pages/FoodDetails";
import TripInfo from "./pages/TripInfo";
import MicrositeCreate from "./pages/MicrositeCreate";
import MicrositeView from "./pages/MicrositeView";
import MyTrips from "./pages/MyTrips";
import TripPlan from "./pages/TripPlan";
import SharedItinerary from "./pages/SharedItinerary";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AppLayout() {
  const location = useLocation();
  const isMicrosite = location.pathname.startsWith("/m/") || location.pathname.startsWith("/shared/") || location.pathname === "/plan";

  return (
    <>
      <ScrollToTop />
      {!isMicrosite && <AppHeader />}
      <main>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/intent" element={<IntentPreview />} />
          <Route path="/plan" element={<TripPlan />} />
          <Route path="/trip/:tripId" element={<TripDashboard />} />
          <Route path="/trip/:tripId/info" element={<TripInfo />} />
          <Route path="/food/:venueId" element={<FoodDetails />} />
          <Route path="/microsite/create/:tripId" element={<MicrositeCreate />} />
          <Route path="/m/:slug" element={<MicrositeView />} />
          <Route path="/shared/:destination" element={<SharedItinerary />} />
          <Route path="/my-trips" element={<MyTrips />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      {!isMicrosite && <AppFooter />}
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppLayout />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
