"""
Integrated Travel Voice Agent — main entry (reference: new-sales.py style).
Voice agent that collects preferences in order, optionally uses YouTube/blog references,
runs YouTube pipeline for discovery, and updates the itinerary on the frontend.
"""

import asyncio
import json
import logging
import os
import re
from typing import Optional

from dotenv import load_dotenv
from livekit.agents import Agent, AgentSession, JobContext, JobProcess, WorkerOptions, cli, llm
from livekit.plugins import cartesia, groq, silero
from livekit.plugins import openai as lk_openai

from tools.preferences import TripPreferences
from tools.itinerary_state import ItineraryState, ItineraryDay, ItineraryItem
from tools.youtube_transcript import get_youtube_transcript
from tools.blog_extract import extract_blog_content
from tools.pipeline_runner import run_youtube_discovery
from tools.itinerary_state import itinerary_to_dict
from tools.time_utils import get_ist_context_for_llm
from tools.geocode import geocode_location

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Topic for frontend app data (itinerary + transcript updates)
APP_DATA_TOPIC = "tbo-app-data"


INSTRUCTIONS = """You are a warm travel companion helping someone plan a real trip. You speak like a person, not a booking form.

{ist_context}

## Your personality
- Genuinely curious, short sentences, natural flow.
- Never assume anything — if unclear, ask in a natural way.
- Never offer preset option lists (no "A, B, or C"). Ask open questions.
- If an answer is vague, dig in gently before moving on.

## Conversation flow — follow this EXACT order, one question at a time:
1. Where are they coming from? (origin city/place)
2. Where do they want to go? (destination)
3. When are they planning to travel and for how many days? If they say "next month", "next week", etc., use the IST date above to calculate the actual dates.
4. Budget — let them describe it, no tiers.
5. What excites them most about this trip — open question, no categories.
6. Who's joining them — let them say it naturally.
7. Whether they have YouTube videos or blogs for inspiration (if not, you will find great ones).

## Silence on internal actions — CRITICAL
- NEVER say "I've recorded that", "I'll note that", "I've saved that", or any phrase that mentions recording or tool calls.
- NEVER speak tool names, function names, or JSON. Not even once.
- After each answer, silently call record_preference (no announcement), then immediately ask the next question or react naturally.
- The user should never know tools are being called — it must feel like a real conversation.

## After all 7 things are clear:
- Warmly wrap up: "Great, let me pull together a plan for you."
- The system handles discovery and itinerary automatically. Do NOT call run_discovery_pipeline yourself.
- Call add_youtube_reference(url) or add_blog_reference(url) ONLY if the user explicitly shared a real URL in their message.

## Hard rules
- NEVER mention recording, saving, noting, or any internal action to the user.
- NEVER show code, JSON, or function syntax.
- NEVER list preset options.
- Never invent or guess URLs. Never call reference tools with placeholders like "video_id_1".
- Keep replies short — this is a voice call.
- If the user answers multiple things, acknowledge naturally, then move on.

## Tools (silent, never spoken)
- record_preference — call silently after each answer.
- add_youtube_reference(url) / add_blog_reference(url) — only when user shares a link.
- update_itinerary(destination, days_json) — update the panel whenever you have a better plan.
"""


def build_travel_query(prefs: TripPreferences) -> str:
    """Build a single query string for pipeline from preferences."""
    return prefs.to_pipeline_query()


def prewarm(proc: JobProcess) -> None:
    """Pre-load the Silero VAD model before any job arrives.
    This runs in each worker process at startup, so the model is ready
    when a job is accepted and the assignment handshake cannot time out
    waiting for it to download/load."""
    proc.userdata["vad"] = silero.VAD.load()
    logger.info("Silero VAD pre-loaded.")


async def entrypoint(ctx: JobContext) -> None:
    logger.info("Travel agent starting...")
    await ctx.connect()
    room = ctx.room
    logger.info("Connected to room: %s", room.name)

    prefs = TripPreferences()
    itinerary = ItineraryState()
    pipeline_started = False
    _prefs_extract_lock = asyncio.Lock()
    _conversation_history: list[str] = []

    async def publish_app_data(payload: dict) -> None:
        """Publish app data to the frontend over the LiveKit data channel.

        The React app listens with useDataChannel(APP_DATA_TOPIC, ...) which receives
        raw Uint8Array payloads, so we must send bytes via publish_data, not chat text.
        """
        try:
            data = json.dumps(payload).encode("utf-8")
            await room.local_participant.publish_data(
                data,
                topic=APP_DATA_TOPIC,
            )
        except Exception as e:
            logger.warning("Failed to publish app data: %s", e)

    async def _maybe_trigger_pipeline_from_prefs() -> None:
        """Deterministically trigger discovery once enough fields are available."""
        nonlocal pipeline_started
        if pipeline_started:
            return
        # Need at least destination + 2 more fields to be meaningful.
        filled = sum(bool(v) for v in [
            prefs.destination,
            prefs.duration or prefs.dates,
            prefs.budget,
            prefs.experience,
            prefs.travelers,
        ])
        have_enough = bool(prefs.destination) and filled >= 3
        has_valid_ref = bool(prefs.reference_urls and not all(
            str(u).strip().lower() in {"", "no", "none", "n/a"}
            for u in prefs.reference_urls
        ))

        have_enough = bool(prefs.destination) and (filled >= 3 or has_valid_ref)
        
        logger.info(
            "[auto-trigger] filled=%d have_enough=%s has_valid_ref=%s pipeline_started=%s prefs=%s",
            filled, have_enough, has_valid_ref, pipeline_started, prefs.to_dict(),
        )
        if have_enough:
            pipeline_started = True
            travel_query = build_travel_query(prefs)
            asyncio.create_task(_run_pipeline_impl(travel_query))
            logger.info("Auto-started discovery pipeline for: %s", travel_query)

    async def _emit_locations() -> None:
        """Geocode origin/destination and push location_update to frontend."""
        logger.info("_emit_locations called — origin=%s destination=%s", prefs.origin, prefs.destination)
        payload: dict = {"type": "location_update"}
        if prefs.origin:
            geo = await geocode_location(prefs.origin)
            if geo:
                payload["origin"] = geo
                logger.info("Geocoded origin: %s → (%s, %s)", prefs.origin, geo["lat"], geo["lng"])
            else:
                logger.warning("Failed to geocode origin: %s", prefs.origin)
        if prefs.destination:
            geo = await geocode_location(prefs.destination)
            if geo:
                payload["destination"] = geo
                logger.info("Geocoded destination: %s → (%s, %s)", prefs.destination, geo["lat"], geo["lng"])
            else:
                logger.warning("Failed to geocode destination: %s", prefs.destination)
        if "origin" in payload or "destination" in payload:
            logger.info("Publishing location_update to frontend")
            await publish_app_data(payload)
        else:
            logger.warning("No geocoded locations to publish")

    async def _emit_travel_dates() -> None:
        """Parse dates from prefs and send travel_dates to frontend."""
        logger.info("_emit_travel_dates called — dates=%s duration=%s", prefs.dates, prefs.duration)
        if not prefs.dates and not prefs.duration:
            return
        payload: dict = {"type": "travel_dates"}
        if prefs.dates:
            payload["dates_raw"] = prefs.dates
        if prefs.duration:
            payload["duration"] = prefs.duration
        from tools.time_utils import get_ist_datetime_str
        system = (
            "You are a date parser. Parse travel dates and return a JSON object with exactly these keys: "
            '"start_date" (string, YYYY-MM-DD), "end_date" (string, YYYY-MM-DD), "num_days" (integer). '
            "If end_date is unclear and num_days is present, compute it as start_date + num_days. "
            "If num_days or duration is not explicitly mentioned, return null for both num_days and end_date. NEVER guess. Return ONLY the JSON object."
        )
        user = (
            f"Current IST datetime: {get_ist_datetime_str()}\n"
            f"User said dates: {prefs.dates or 'not specified'}\n"
            f"User said duration: {prefs.duration or 'not specified'}"
        )
        raw = await _call_cerebras(system, user, json_mode=True, max_tokens=200)
        logger.info("Cerebras date parse result: %s", (raw or "")[:200])
        if raw:
            try:
                clean = raw.strip().strip("`")
                if clean.startswith("json"):
                    clean = clean[4:].strip()
                parsed = json.loads(clean)
                if isinstance(parsed, dict):
                    payload["start_date"] = parsed.get("start_date", "")
                    payload["end_date"] = parsed.get("end_date", "")
                    payload["num_days"] = parsed.get("num_days", 0)
                    logger.info("Parsed dates: %s to %s (%s days)", payload.get("start_date"), payload.get("end_date"), payload.get("num_days"))
            except Exception as e:
                logger.warning("Failed to parse Cerebras date response: %s", e)
        logger.info("Publishing travel_dates to frontend")
        await publish_app_data(payload)

    @llm.function_tool(
        description="Record a single preference from the user. Call after each question answer.",
    )
    async def record_preference(
        destination: Optional[str] = None,
        origin: Optional[str] = None,
        dates: Optional[str] = None,
        duration: Optional[str] = None,
        budget: Optional[str] = None,
        experience: Optional[str] = None,
        travelers: Optional[str] = None,
        reference_url: Optional[str] = None,
    ) -> str:
        logger.info(
            "[record_preference] CALLED: dest=%s origin=%s dates=%s dur=%s budget=%s exp=%s trav=%s ref=%s",
            destination, origin, dates, duration, budget, experience, travelers, reference_url,
        )
        nonlocal pipeline_started
        location_changed = False
        dates_changed = False

        if destination is not None:
            prefs.destination = destination
            location_changed = True
        if origin is not None:
            prefs.origin = origin
            location_changed = True
        if dates is not None:
            prefs.dates = dates
            dates_changed = True
        if duration is not None:
            prefs.duration = duration
            dates_changed = True
        if budget is not None:
            prefs.budget = budget
        if experience is not None:
            prefs.experience = experience
        if travelers is not None:
            prefs.travelers = travelers
        if reference_url is not None:
            ref_raw = str(reference_url).strip()
            ref_lower = ref_raw.lower()
            looks_like_url = any(
                token in ref_lower
                for token in ["http://", "https://", "www.", "youtu", ".com", ".in", ".net", ".org", ".io"]
            )
            if looks_like_url and ref_raw and ref_raw not in prefs.reference_urls:
                prefs.reference_urls.append(ref_raw)

        if location_changed:
            asyncio.create_task(_emit_locations())
        if dates_changed:
            asyncio.create_task(_emit_travel_dates())

        try:
            await _maybe_trigger_pipeline_from_prefs()
        except Exception as e:
            logger.warning("Auto-start discovery pipeline failed: %s", e)

        return "Preference recorded."

    @llm.function_tool(
        description="Fetch transcript from a YouTube video URL and add it as context for the travel plan. Use when the user pastes a YouTube link.",
    )
    async def add_youtube_reference(url: str) -> str:
        url = (url or "").strip()
        if not re.match(r"^https?://", url) or "youtube" not in url.lower():
            return "Invalid YouTube URL."
        if "video_id_" in url.lower():
            return "Invalid YouTube URL."
        text, lang = get_youtube_transcript(url)
        if not text:
            return "Could not fetch transcript for that YouTube URL."
        prefs.reference_content = (prefs.reference_content or "") + "\n\n[YouTube transcript]\n" + text[:8000]
        return f"Added YouTube transcript ({len(text)} chars). Use this context when suggesting places and tips."

    @llm.function_tool(
        description="Extract content from a blog or article URL and add it as context. Use when the user pastes a blog link.",
    )
    async def add_blog_reference(url: str) -> str:
        url = (url or "").strip()
        if not re.match(r"^https?://", url):
            return "Invalid blog URL."
        content = extract_blog_content(url)
        if not content:
            return "Could not extract content from that URL (check FIRECRAWL_API_KEY or URL)."
        prefs.reference_content = (prefs.reference_content or "") + "\n\n[Blog content]\n" + content[:8000]
        return f"Added blog content ({len(content)} chars). Use this context when suggesting places and tips."

    # ── Cerebras helper (used by pipeline) ────────────────────────────────────
    import httpx as _httpx

    async def _call_cerebras(
        system_prompt: str,
        user_prompt: str,
        *,
        json_mode: bool = False,
        max_tokens: int = 2048,
    ) -> Optional[str]:
        cerebras_key = os.getenv("CEREBRAS_API_KEY")
        if not cerebras_key:
            logger.warning("CEREBRAS_API_KEY not set — skipping Cerebras call.")
            return None
        try:
            body: dict = {
                "model": "llama3.1-8b",
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                "max_tokens": max_tokens,
                "temperature": 0.2,
                "top_p": 1,
                "stream": False,
            }
            if json_mode:
                body["response_format"] = {"type": "json_object"}
            async with _httpx.AsyncClient(timeout=45) as client:
                resp = await client.post(
                    "https://api.cerebras.ai/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {cerebras_key}",
                        "Content-Type": "application/json",
                    },
                    json=body,
                )
                resp.raise_for_status()
                return resp.json()["choices"][0]["message"]["content"]
        except Exception as e:
            logger.warning("Cerebras API call failed: %s", e)
            return None

    async def _push_itinerary(destination: str, raw_json: str, source: str) -> None:
        """Strip markdown fences, parse JSON days array, update state, publish to frontend."""
        try:
            stripped = raw_json.strip()
            if stripped.startswith("```"):
                parts = stripped.split("```")
                stripped = parts[1] if len(parts) > 1 else stripped
                if stripped.startswith("json"):
                    stripped = stripped[4:]
                stripped = stripped.strip()
            days_data = json.loads(stripped)
            itinerary.destination = destination
            itinerary.days.clear()
            for d in days_data:
                items = [
                    ItineraryItem(
                        time=it.get("time", ""),
                        title=it.get("title", ""),
                        type=it.get("type", "place"),
                        note=it.get("note", ""),
                    )
                    for it in d.get("items", [])
                ]
                itinerary.days.append(
                    ItineraryDay(
                        day=int(d.get("day", 0)),
                        title=d.get("title", ""),
                        items=items,
                    )
                )
            await publish_app_data({"type": "itinerary", "payload": itinerary_to_dict(itinerary)})
            logger.info("Itinerary pushed from %s.", source)
        except Exception as e:
            logger.warning("Failed to push itinerary (%s): %s", source, e)

    # ── Core pipeline implementation (plain async fn — safe to create_task) ──
    async def _run_pipeline_impl(travel_query: str) -> str:
        """Run YouTube discovery, generate initial itinerary via Cerebras, then enrich.

        Called both directly (via asyncio.create_task from record_preference) and
        through the @llm.function_tool wrapper below.  Keeping the logic here
        prevents any interaction with the FunctionTool wrapper when background-starting.
        """
        logger.info("Pipeline starting for query: %s", travel_query)

        async def _generate_initial_itinerary() -> None:
            destination = prefs.destination or travel_query.split()[0]
            system = (
                "You are a travel itinerary expert. "
                "Return ONLY a valid JSON array — no markdown fences, no prose, no explanation."
            )
            user = (
                f"Create a detailed day-by-day travel itinerary.\n"
                f"Destination: {destination}\n"
                f"Duration: {prefs.duration or 'a few days'}\n"
                f"Budget: {prefs.budget or 'mid-range'}\n"
                f"Experience: {prefs.experience or 'mixed'}\n"
                f"Travelers: {prefs.travelers or 'solo'}\n\n"
                "Return ONLY a JSON array of days:\n"
                '[\n  {"day": 1, "title": "Day title", "items": [\n'
                '    {"time": "09:00 AM", "title": "Activity", "type": "place", "note": "Details"}\n'
                "  ]}\n]\n"
                "Use real, specific place names. Include 3-5 items per day. "
                "Cover accommodation check-in, key sights, must-try food, and transport."
            )
            raw = await _call_cerebras(system, user)
            if raw:
                await _push_itinerary(destination, raw, "cerebras-initial")

        # Signal the frontend immediately so the loading overlay appears.
        await publish_app_data({"type": "discovery_status", "status": "running", "query": travel_query})

        # Cerebras initial itinerary fires concurrently (2-4 s) while pipeline runs.
        async def _guarded_initial() -> None:
            try:
                await _generate_initial_itinerary()
            except Exception as exc:
                logger.warning("Initial itinerary task failed: %s", exc)

        asyncio.create_task(_guarded_initial())

        # Run the blocking YouTube pipeline in a thread pool.
        pipeline_error: Optional[str] = None
        result: dict = {}
        try:
            result = await asyncio.to_thread(run_youtube_discovery, travel_query, top_n=4)
            pipeline_error = result.get("error")
        except Exception as e:
            pipeline_error = str(e)
            logger.warning("YouTube pipeline raised: %s", e)
        finally:
            # Always close the loading overlay — only one done message sent here.
            await publish_app_data({"type": "discovery_status", "status": "done", "query": travel_query})

        if pipeline_error:
            return f"Pipeline error: {pipeline_error}"

        summary = result.get("summary", "")
        transcript_summary = result.get("transcript_summary", "")
        primary_video = result.get("primary_video")
        context_videos = result.get("context_videos", [])

        # Emit primary video card to frontend.
        if primary_video:
            try:
                await publish_app_data({
                    "type": "top_video",
                    "video_id": primary_video.get("video_id", ""),
                    "title": primary_video.get("title", ""),
                    "url": primary_video.get("url", ""),
                    "channel": primary_video.get("channel", ""),
                    "thumbnail": primary_video.get("thumbnail", ""),
                    "transcript_summary": transcript_summary[:500],
                })
            except Exception as e:
                logger.warning("Failed to publish top_video: %s", e)

        # Emit context videos to frontend.
        if context_videos:
            try:
                await publish_app_data({
                    "type": "context_videos",
                    "videos": [
                        {
                            "video_id": v.get("video_id", ""),
                            "title": v.get("title", ""),
                            "url": v.get("url", ""),
                            "thumbnail": v.get("thumbnail", ""),
                        }
                        for v in context_videos[:5]
                    ],
                })
            except Exception as e:
                logger.warning("Failed to publish context_videos: %s", e)

        # Legacy discovery_result for backward compat.
        try:
            await publish_app_data({
                "type": "discovery_result",
                "query": travel_query,
                "top_videos": result.get("top_videos", []),
                "intent": result.get("intent", {}),
            })
        except Exception:
            pass

        # Enrich itinerary with transcript summary from primary video.
        if transcript_summary:
            destination = prefs.destination or travel_query.split()[0]
            system = (
                "You are a travel itinerary expert. "
                "Return ONLY a valid JSON array — no markdown fences, no prose, no explanation."
            )
            user = (
                f"Create a detailed travel itinerary using real insights from a YouTube travel video.\n\n"
                f"Trip: {travel_query}\n"
                f"Duration: {prefs.duration or 'a few days'}\n"
                f"Budget: {prefs.budget or 'mid-range'}\n"
                f"Experience: {prefs.experience or 'mixed'}\n"
                f"Travelers: {prefs.travelers or 'solo'}\n\n"
                f"Video insights (from real traveler):\n{transcript_summary}\n\n"
                "Return ONLY a JSON array of days. Use SPECIFIC places, foods, and tips from the video:\n"
                '[\n  {"day": 1, "title": "Day title", "items": [\n'
                '    {"time": "09:00 AM", "title": "Specific activity", "type": "place", "note": "From video"}\n'
                "  ]}\n]\n"
            )
            raw = await _call_cerebras(system, user)
            if raw:
                await _push_itinerary(destination, raw, "cerebras-enriched")

        prefs.reference_content = (prefs.reference_content or "") + "\n\n[Discovery from YouTube]\n" + summary
        return (
            f"Discovery complete. {result.get('video_count', 0)} videos found. "
            "The live itinerary has been updated with real trip insights. "
            "Briefly tell the user their plan is ready and mention 1-2 standout experiences from the video."
        )

    async def _extract_and_apply_prefs_from_text(user_text: str) -> None:
        """
        Backend-side preference extraction using cumulative conversation context.
        This doesn't depend on LLM function-calling reliability.
        """
        if not user_text or not user_text.strip():
            return

        text = user_text.strip()
        _conversation_history.append(f"User: {text}")
        logger.info("[extract_prefs] Processing user text: %s", text[:80])

        # Capture explicit URLs directly from user text.
        ref_fetched = False
        for m in re.findall(r"https?://\S+", text):
            url = m.rstrip(".,);]}")
            if url not in prefs.reference_urls:
                prefs.reference_urls.append(url)
                
                if "youtube" in url.lower() or "youtu.be" in url.lower():
                    logger.info("[extract_prefs] Auto-fetching YouTube transcript for %s", url)
                    try:
                        yt_text, _ = get_youtube_transcript(url)
                        if yt_text:
                            prefs.reference_content = (prefs.reference_content or "") + f"\n\n[YouTube transcript for {url}]\n" + yt_text[:8000]
                            ref_fetched = True
                    except Exception as e:
                        logger.warning("Failed to auto-fetch YT transcript: %s", e)
                else:
                    logger.info("[extract_prefs] Auto-fetching blog content for %s", url)
                    try:
                        b_text = extract_blog_content(url)
                        if b_text:
                            prefs.reference_content = (prefs.reference_content or "") + f"\n\n[Blog content for {url}]\n" + b_text[:8000]
                            ref_fetched = True
                    except Exception as e:
                        logger.warning("Failed to auto-fetch Blog content: %s", e)

        location_changed = False
        dates_changed = False
        async with _prefs_extract_lock:
            # Include recent conversation for context (last 10 turns).
            recent = "\n".join(_conversation_history[-10:])
            already_known = json.dumps({
                k: v for k, v in prefs.to_dict().items()
                if v and k != "reference_urls" and k != "raw_query"
            })
            system = (
                "You extract travel preferences from conversation. "
                "Return a JSON object with keys: origin, destination, dates, duration, budget, experience, travelers. "
                "Set a field to the extracted value string if the user clearly stated it in the latest message. "
                "Set a field to null if not mentioned or already known. NEVER guess duration or budget if not explicitly stated. "
                "For origin: where they are coming FROM. "
                "For travelers: solo/just me → \"solo\", friends → \"with friends\", family → \"with family\". "
                "Return ONLY the JSON object, nothing else."
            )
            user_prompt = (
                f"Already known: {already_known}\n\n"
                f"Recent conversation:\n{recent}\n\n"
                f"Latest user message: {text}\n\n"
                "Extract any NEW preferences from the latest message."
            )
            raw = await _call_cerebras(system, user_prompt, json_mode=True, max_tokens=300)
            logger.info("[extract_prefs] Cerebras returned: %s", (raw or "None")[:200])
            if raw:
                try:
                    clean = raw.strip().strip("`")
                    if clean.startswith("json"):
                        clean = clean[4:].strip()
                    data = json.loads(clean)
                    if isinstance(data, dict):
                        if data.get("destination") and not prefs.destination:
                            prefs.destination = str(data["destination"]).strip()
                            location_changed = True
                            logger.info("[extract_prefs] Set destination=%s", prefs.destination)
                        if data.get("origin") and not prefs.origin:
                            prefs.origin = str(data["origin"]).strip()
                            location_changed = True
                            logger.info("[extract_prefs] Set origin=%s", prefs.origin)
                        if data.get("dates") and not prefs.dates:
                            prefs.dates = str(data["dates"]).strip()
                            dates_changed = True
                            logger.info("[extract_prefs] Set dates=%s", prefs.dates)
                        if data.get("duration") and not prefs.duration:
                            prefs.duration = str(data["duration"]).strip()
                            dates_changed = True
                            logger.info("[extract_prefs] Set duration=%s", prefs.duration)
                        if data.get("budget") and not prefs.budget:
                            prefs.budget = str(data["budget"]).strip()
                            logger.info("[extract_prefs] Set budget=%s", prefs.budget)
                        if data.get("experience") and not prefs.experience:
                            prefs.experience = str(data["experience"]).strip()
                            logger.info("[extract_prefs] Set experience=%s", prefs.experience)
                        if data.get("travelers") and not prefs.travelers:
                            prefs.travelers = str(data["travelers"]).strip()
                            logger.info("[extract_prefs] Set travelers=%s", prefs.travelers)
                except Exception as e:
                    logger.warning("[extract_prefs] Parse error: %s (raw=%s)", e, (raw or "")[:100])

        logger.info("[extract_prefs] Current prefs: %s", prefs.to_dict())

        if location_changed:
            logger.info("[extract_prefs] Location changed, emitting locations...")
            asyncio.create_task(_emit_locations())
        if dates_changed:
            logger.info("[extract_prefs] Dates changed, emitting travel_dates...")
            asyncio.create_task(_emit_travel_dates())

        try:
            await _maybe_trigger_pipeline_from_prefs()
        except Exception as e:
            logger.warning("Transcript-based auto-start failed: %s", e)

    @llm.function_tool(
        description="Run the YouTube discovery pipeline to find top travel videos. Only call when the user has no reference URLs. Pass a travel query string.",
    )
    async def run_discovery_pipeline(travel_query: str) -> str:
        return await _run_pipeline_impl(travel_query)

    @llm.function_tool(
        description="Update the itinerary shown on the left panel. Call with destination and a JSON array of days. Each day: day (int), title (string), items (array of {time, title, type, note}). type is one of: place, food, transport, experience.",
    )
    async def update_itinerary(destination: str, days_json: str) -> str:
        try:
            days_data = json.loads(days_json)
        except json.JSONDecodeError as e:
            return f"Invalid JSON for days: {e}"
        itinerary.destination = destination
        itinerary.days.clear()
        for d in days_data:
            items = [
                ItineraryItem(
                    time=it.get("time", ""),
                    title=it.get("title", ""),
                    type=it.get("type", "place"),
                    note=it.get("note", ""),
                )
                for it in d.get("items", [])
            ]
            itinerary.days.append(
                ItineraryDay(day=int(d.get("day", 0)), title=d.get("title", ""), items=items)
            )
        payload = {"type": "itinerary", "payload": itinerary_to_dict(itinerary)}
        await publish_app_data(payload)
        return "Itinerary updated on the left panel."

    # LLM chain: try up to 3 Groq keys, then fall back to Cerebras (OpenAI-compatible).
    # All 3 Groq keys may share the same org TPM bucket, so Cerebras is the real safety net.
    groq_keys = [
        os.getenv("GROQ_API_KEY"),
        os.getenv("GROQ_2_API_KEY"),
        os.getenv("GROQ_3_API_KEY"),
    ]
    llms_chain: list[llm.LLM] = []

    for idx, key in enumerate(groq_keys, start=1):
        if not key:
            continue
        try:
            llms_chain.append(
                groq.LLM(
                    model="llama-3.1-8b-instant",
                    temperature=0.7,
                    api_key=key,
                )
            )
            label = "GROQ_API_KEY" if idx == 1 else f"GROQ_{idx}_API_KEY"
            logger.info("Configured Groq LLM with %s", label)
        except Exception as e:
            logger.warning("Failed to configure Groq LLM for key %d: %s", idx, e)

    # Cerebras as final fallback — kicks in when all Groq keys hit rate limits.
    cerebras_key = os.getenv("CEREBRAS_API_KEY")
    if cerebras_key:
        try:
            llms_chain.append(
                lk_openai.LLM(
                    model="llama3.1-8b",
                    base_url="https://api.cerebras.ai/v1",
                    api_key=cerebras_key,
                    temperature=0.7,
                )
            )
            logger.info("Configured Cerebras LLM as final fallback (via OpenAI-compatible API).")
        except Exception as e:
            logger.warning("Failed to configure Cerebras LLM: %s", e)

    if not llms_chain:
        raise RuntimeError(
            "No LLMs configured. Set at least one of GROQ_API_KEY / GROQ_2_API_KEY / GROQ_3_API_KEY or CEREBRAS_API_KEY."
        )

    if len(llms_chain) == 1:
        primary_llm: llm.LLM = llms_chain[0]
    else:
        primary_llm = llm.FallbackAdapter(
            llm=llms_chain,
            attempt_timeout=20.0,
            max_retry_per_llm=1,
            retry_interval=1.0,
            retry_on_chunk_sent=True,
        )

    resolved_instructions = INSTRUCTIONS.replace("{ist_context}", get_ist_context_for_llm())

    agent = Agent(
        instructions=resolved_instructions,
        stt=groq.STT(model="whisper-large-v3-turbo", language="en"),
        tts=cartesia.TTS(model="sonic-3", voice="f786b574-daa5-4673-aa0c-cbe3e8534c02"),
        llm=primary_llm,
    )

    session = AgentSession(
        vad=ctx.proc.userdata["vad"],
        tools=[
            record_preference,
            add_youtube_reference,
            add_blog_reference,
            run_discovery_pipeline,
            update_itinerary,
        ],
    )

    # --- Transcript forwarding to frontend via room data ---
    # Use conversation_item_added as the single source of truth for both
    # user and agent transcripts (avoids duplicate messages).
    def _push_conversation_item(ev) -> None:
        try:
            chat_msg = getattr(ev, "item", ev)
            role = str(getattr(chat_msg, "role", "")).lower()
            text = None
            content = getattr(chat_msg, "content", None)
            if isinstance(content, list):
                parts = []
                for p in content:
                    if isinstance(p, str):
                        parts.append(p)
                    elif hasattr(p, "text"):
                        parts.append(str(p.text))
                text = " ".join(filter(None, parts))
            elif isinstance(content, str):
                text = content
            if not text:
                text = getattr(chat_msg, "text_content", None) or ""
            if not text:
                return

            logger.info("[conversation_item] role=%s text=%s", role, text[:100])

            if "assistant" in role or "agent" in role:
                cleaned = re.sub(r"<function=[^>]+>.*?</function>", "", text, flags=re.DOTALL)
                cleaned = re.sub(r"\s+", " ", cleaned).strip()
                if not cleaned:
                    return
                _conversation_history.append(f"Agent: {cleaned[:200]}")
                asyncio.create_task(
                    publish_app_data({"type": "agent_transcript", "text": cleaned})
                )
            else:
                asyncio.create_task(_extract_and_apply_prefs_from_text(text))
                asyncio.create_task(publish_app_data({"type": "user_transcript", "text": text}))
        except Exception as e:
            logger.warning("Push conversation item error: %s", e, exc_info=True)

    session.on("conversation_item_added", _push_conversation_item)

    # Start session: agent positional as per reference pattern
    logger.info("Starting agent session...")
    await session.start(agent, room=room)
    logger.info("Session started — sending initial greeting...")

    # Kick off the conversation: agent speaks first
    await session.generate_reply(
        instructions="Greet the user warmly. First ask where they're coming from (their city). Keep it short and natural."
    )
    logger.info("Initial greeting sent. Waiting for session to end...")

    # Keep the entrypoint alive until the session ends
    session_ended = asyncio.Event()

    def _on_close(*args, **kwargs):
        session_ended.set()

    for evt in ("closed", "close", "session_closed"):
        try:
            session.on(evt, _on_close)
        except Exception:
            pass

    # Also close when participant leaves
    def _on_participant_left(participant):
        asyncio.create_task(_delayed_end())

    async def _delayed_end():
        await asyncio.sleep(1.0)
        session_ended.set()

    try:
        room.on("participant_disconnected", _on_participant_left)
    except Exception:
        pass

    # Poll with a max 30-min timeout
    try:
        await asyncio.wait_for(session_ended.wait(), timeout=1800)
    except asyncio.TimeoutError:
        logger.warning("Session 30-min timeout reached.")
    logger.info("Travel agent session completed.")


def main() -> None:
    base_required = ["LIVEKIT_URL", "LIVEKIT_API_KEY", "LIVEKIT_API_SECRET"]
    missing = [v for v in base_required if not os.getenv(v)]
    if missing:
        logger.error("Missing env: %s", ", ".join(missing))
        return

    if not any(os.getenv(v) for v in ["GROQ_API_KEY", "GROQ_2_API_KEY", "GROQ_3_API_KEY"]):
        logger.error(
            "Missing LLM env: set at least one of GROQ_API_KEY, GROQ_2_API_KEY, or GROQ_3_API_KEY."
        )
        return

    logger.info(
        "Starting integrated travel voice agent (Groq STT + Groq key-rotation LLM + Cartesia TTS)..."
    )
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint, prewarm_fnc=prewarm))


if __name__ == "__main__":
    main()
