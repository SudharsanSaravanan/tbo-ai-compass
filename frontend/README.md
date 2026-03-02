# TBO AI Compass - Frontend

## Overview
Travel planning often breaks down between inspiration and booking. Travelers discover destinations through YouTube, short-form videos, and blogs, but hesitate when turning that inspiration into a real trip. Existing tools rely on search and filters, forcing users to manually validate weather, food comfort, routes, and logistics.

The **TBO AI Compass Frontend** bridges this confidence gap by shifting travel planning from search-based workflows to conversational intelligence. Built with a voice-first approach, it treats social content as the starting point, understanding traveler intent (budget, dates, food preferences) to convert vague ideas or shared links into structured, experience-backed itineraries.

## Tech Stack
* **Framework:** React 18, Vite
* **Language:** TypeScript
* **Styling:** Tailwind CSS, Shadcn UI (Radix UI primitives), Framer Motion
* **Routing:** React Router v6
* **State/Data Management:** TanStack Query (React Query)
* **Real-time Voice/AI:** LiveKit Client & Components (`@livekit/components-react`), `react-ai-orb`
* **Maps:** Leaflet & React Leaflet

## Key Features

### 1. Unified Inspiration & Planning Hub
* **Immersive Interface:** A hero section capturing comprehensive trip intent (origin, destination, dates, an exact number of guests).
* **Browser Extension Syncing:** Seamlessly reads curated content (`tbo_travel_plans`, `tbo_travel_buckets`) pushed to `localStorage` directly from the TBO Compass Browser Extension. 
* **Content Dashboard:** Displays saved YouTube videos and blog URLs visually, categorized into user-defined trip buckets.
* **1-Click Generation:** Converts a saved YouTube video or web blog instantly into a contextual initial prompt for the AI planner.

### 2. Multi-Modal Conversational Planner
* **Advanced Form Overlay:** Captures precise trip criteria such as Budget, Purpose, Interests, Pace (Relaxed to Packed), and Accommodation preferences.
* **Voice-First AI Orb:** Siri-style interactive voice experience powered by `react-ai-orb` and custom audio level hooks (`useAudioLevel`), seamlessly integrated with LiveKit for real-time AI itinerary chat.

### 3. Comprehensive Trip Dashboard
* **Structured Itinerary:** Displays day-by-day routing covering food, hotels, transit, and activities, including timing and estimated costs.
* **In-Context AI Chat Assistant:** A sticky chat panel (drawer on mobile) enabling users to ask questions, request alternatives, and dynamically refine the generated itinerary on the fly.
* **Live Weather Integration:** Dynamically fetches weather data for the exact trip timeframe and geographic destination. 

### 4. Travel Agent B2B Microsites
* **Microsite Creator:** Empowers Travel Agents to turn an AI-generated itinerary into a customized, non-editable "microsite".
* **Shareable Client Views:** Clients view a branded link showcasing the vetted trip structure, checklists, and climate information, streamlining trust and final booking.

## Project Structure
* `/src/pages/` - Core application views: `Index`, `TripPlan`, `TripDashboard`, `MicrositeCreate`, `MicrositeView`, `IntentPreview`, etc.
* `/src/components/` - Extensive Shadcn UI components, reusable layout blocks (Header, Footer), mapping views, and complex orchestrators (`TripSearchOverlay`, `VoiceOrb`).
* `/src/hooks/` - Contains custom hooks (e.g., `useAudioLevel` for mic activity detection).
* `/src/services/` - External API abstractions, such as `weatherService`.
* `/src/lib/` - Utility functions, `zod` schemas, and mock data definitions for initial development.

## Available Scripts

In the project directory, you can run:

### `npm run dev`
Runs the app in development mode using Vite. Open [http://localhost:5173](http://localhost:5173).

### `npm run build`
Builds the app for production to the `dist` folder. Automatically bundles and optimizes the React environment context.

### `npm run lint`
Runs ESLint over the directory to ensure code quality.

### `npm run test`
Launches the Vitest test runner.

## Setup Requirements
The Voice AI integration relies on backend environment constants. Copy the `.env.example` file to create a `.env` configuring needed keys (like your LiveKit URL and backend endpoint).
