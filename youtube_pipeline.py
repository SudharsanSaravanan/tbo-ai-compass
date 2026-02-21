"""
YouTube Video Analysis Pipeline for Travel Route Planning

COST-OPTIMIZED WORKFLOW:
1. Parse user query -> generate search queries (Groq LLM)
2. Search YouTube with yt-dlp -> collect ~30-50 video IDs (NO API QUOTA!)
3. Enrich videos with YouTube API videos.list -> fetch metrics in bulk (CHEAP - 1 unit)
4. Fetch transcripts for top N videos
5. LLM scoring: Route-match, Actionability, Authenticity
6. Generate final analysis report

KEY OPTIMIZATION: 
- Uses yt-dlp for search (0 quota cost) instead of YouTube API search.list (100 units each)
- Only uses YouTube API for videos.list to get accurate metrics (1 unit per 50 videos)
- This reduces API quota usage by 99% compared to traditional approach!
"""

import os
import re
import json
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Dict, List, Tuple, Optional, Any
from datetime import datetime, timezone
from googleapiclient.discovery import build
from youtube_transcript_api import YouTubeTranscriptApi
import isodate
from groq import Groq
from dotenv import load_dotenv
import config  # Import configuration

load_dotenv()

# Configuration
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
HF_TOKEN = os.getenv("HF_TOKEN")

# Initialize clients
groq_client = Groq(api_key=GROQ_API_KEY)
youtube = build("youtube", "v3", developerKey=GOOGLE_API_KEY)


def _create_hf_client():
    """Create OpenAI-compatible client for Hugging Face inference router."""
    if not HF_TOKEN:
        return None
    try:
        from openai import OpenAI
        return OpenAI(
            base_url="https://router.huggingface.co/v1",
            api_key=HF_TOKEN,
        )
    except Exception:
        return None


class TravelQueryParser:
    """Parse user travel queries into structured intent + constraints"""
    
    @staticmethod
    def parse_query(user_query: str) -> Dict:
        """
        Extract travel intent and constraints from user query
        Returns: {origin, destination, dates, budget, travel_style, raw_query}
        """
        # Use Groq LLM to parse the query
        completion = groq_client.chat.completions.create(
            model=config.GROQ_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": """You are a travel query parser. Extract structured information from user queries.
Return JSON with these fields (use null if not mentioned):
- origin: starting location
- destination: ending location  
- dates: travel dates if mentioned
- budget: budget range if mentioned
- travel_style: road trip, train, flight, budget, luxury, adventure, family, etc.
- raw_query: the original query

Example:
Input: "I want to go from Goa to Kanyakumari on a budget road trip in March"
Output: {"origin": "Goa", "destination": "Kanyakumari", "dates": "March", "budget": "budget", "travel_style": "road trip", "raw_query": "..."}"""
                },
                {
                    "role": "user",
                    "content": user_query
                }
            ],
            temperature=config.PARSE_TEMPERATURE,
            max_completion_tokens=config.MAX_COMPLETION_TOKENS,
            response_format={"type": "json_object"}
        )
        
        result = json.loads(completion.choices[0].message.content)
        result['raw_query'] = user_query
        return result


class SearchQueryGenerator:
    """Generate optimized YouTube search queries"""
    
    @staticmethod
    def generate_queries(parsed_intent: Dict, num_queries: int = None) -> List[str]:
        """
        Generate 3-6 diverse YouTube search queries based on travel intent
        """
        if num_queries is None:
            num_queries = config.NUM_SEARCH_QUERIES
            
        origin = parsed_intent.get('origin', '')
        destination = parsed_intent.get('destination', '')
        travel_style = parsed_intent.get('travel_style', '')
        
        prompt = f"""Generate {num_queries} diverse YouTube search queries for finding travel videos.

Travel Details:
- Origin: {origin}
- Destination: {destination}
- Travel Style: {travel_style}
- Full Query: {parsed_intent.get('raw_query', '')}

Requirements:
1. Mix of specific route queries and general style queries
2. Include variations: "vlog", "guide", "itinerary", "travel tips", "road trip", "journey", "budget travel"
3. Some queries should focus on route/transportation, others on experiences
4. Keep queries concise (4-8 words)

Return ONLY a JSON array of search query strings, nothing else.
Example: ["goa to kanyakumari road trip", "coastal route india vlog", "goa kanyakumari itinerary guide"]"""

        completion = groq_client.chat.completions.create(
            model=config.GROQ_MODEL,
            messages=[
                {"role": "user", "content": prompt}
            ],
            temperature=config.QUERY_GEN_TEMPERATURE,
            max_completion_tokens=config.MAX_COMPLETION_TOKENS
        )
        
        # Extract queries from response
        response_text = completion.choices[0].message.content.strip()
        
        # Try to parse as JSON array
        try:
            queries = json.loads(response_text)
            if isinstance(queries, list):
                return queries[:num_queries]
        except:
            # Fallback: extract quoted strings
            import re
            queries = re.findall(r'"([^"]+)"', response_text)
            return queries[:num_queries]
        
        # Fallback queries if parsing fails
        fallback = [
            f"{origin} to {destination} travel vlog",
            f"{origin} to {destination} itinerary",
            f"{origin} {destination} road trip guide",
            f"best route {origin} to {destination}",
            f"{origin} to {destination} travel tips"
        ]
        return fallback[:num_queries]


class YouTubeVideoCollector:
    """Collect and enrich YouTube video candidates"""
    
    @staticmethod
    def search_videos(search_queries: List[str], max_results_per_query: int = None) -> List[str]:
        """
        Use yt-dlp to search YouTube and collect candidate video IDs
        NO API QUOTA COST - uses yt-dlp instead of YouTube API
        Returns: List of unique video IDs
        """
        if max_results_per_query is None:
            max_results_per_query = config.MAX_RESULTS_PER_QUERY
            
        video_ids = set()
        
        for query in search_queries:
            try:
                # Use yt-dlp to search (no API quota cost)
                import subprocess
                
                # Fast search: no metadata extraction, no download (--flat-playlist --skip-download)
                cmd = [
                    'yt-dlp',
                    f'ytsearch{max_results_per_query}:{query}',
                    '--flat-playlist',
                    '--skip-download',
                    '--get-id',
                    '--no-warnings',
                    '--quiet',
                ]
                
                result = subprocess.run(
                    cmd,
                    capture_output=True,
                    text=True,
                    timeout=getattr(config, "YTDLP_SEARCH_TIMEOUT", 15),
                )
                
                if result.returncode == 0:
                    ids = [line.strip() for line in result.stdout.strip().split('\n') if line.strip()]
                    video_ids.update(ids)
                else:
                    print(f"  ⚠ yt-dlp search failed for '{query}': {result.stderr}")
                
            except subprocess.TimeoutExpired:
                print(f"  ⚠ yt-dlp search timed out for '{query}'")
            except FileNotFoundError:
                print(f"  ✗ yt-dlp not found. Install with: pip install yt-dlp")
                print(f"  Falling back to manual IDs or skipping...")
            except Exception as e:
                print(f"  ⚠ Search error for '{query}': {e}")
                continue
        
        return list(video_ids)
    
    @staticmethod
    def enrich_videos(video_ids: List[str]) -> List[Dict]:
        """
        Use videos.list API to fetch detailed metadata in bulk
        Returns: List of enriched video objects with engagement metrics
        """
        enriched_videos = []
        
        # Process in batches of 50 (API limit)
        batch_size = config.VIDEO_BATCH_SIZE
        for i in range(0, len(video_ids), batch_size):
            batch = video_ids[i:i + batch_size]
            
            try:
                response = youtube.videos().list(
                    id=",".join(batch),
                    part="snippet,statistics,contentDetails"
                ).execute()
                
                for item in response.get("items", []):
                    video_data = YouTubeVideoCollector._parse_video_item(item)
                    
                    # Apply filters
                    if video_data['view_count'] < config.MIN_VIEW_COUNT:
                        continue
                    if video_data['age_days'] > config.MAX_VIDEO_AGE_DAYS:
                        continue
                    if video_data['engagement_score'] < config.MIN_ENGAGEMENT_SCORE:
                        continue
                    
                    enriched_videos.append(video_data)
                    
            except Exception as e:
                print(f"Enrichment error for batch: {e}")
                continue
        
        return enriched_videos
    
    @staticmethod
    def _parse_video_item(item: Dict) -> Dict:
        """Parse YouTube API video item into structured format"""
        snippet = item["snippet"]
        stats = item.get("statistics", {})
        content = item["contentDetails"]
        
        # Parse duration
        duration_iso = content["duration"]
        duration = isodate.parse_duration(duration_iso)
        duration_seconds = int(duration.total_seconds())
        
        # Parse published date
        published_at = snippet["publishedAt"]
        published_dt = datetime.fromisoformat(published_at.replace("Z", "+00:00"))
        age_days = (datetime.now(timezone.utc) - published_dt).days
        
        # Extract stats
        view_count = int(stats.get("viewCount", 0))
        like_count = int(stats.get("likeCount", 0))
        comment_count = int(stats.get("commentCount", 0))
        
        # Calculate engagement score
        engagement_score = YouTubeVideoCollector._calculate_engagement(
            view_count, like_count, comment_count, age_days
        )
        
        return {
            "video_id": item["id"],
            "title": snippet["title"],
            "channel": snippet["channelTitle"],
            "published_at": published_at,
            "age_days": age_days,
            "duration_seconds": duration_seconds,
            "description": snippet.get("description", "")[:500],
            "tags": snippet.get("tags", []),
            "view_count": view_count,
            "like_count": like_count,
            "comment_count": comment_count,
            "engagement_score": engagement_score,
            "url": f"https://www.youtube.com/watch?v={item['id']}"
        }
    
    @staticmethod
    def _calculate_engagement(views: int, likes: int, comments: int, age_days: int) -> float:
        """Calculate normalized engagement score (0.0 to 1.0)"""
        if views == 0:
            return 0.0
        
        like_rate = likes / views
        comment_rate = comments / views
        recency = 1 / (1 + age_days / 365)
        
        like_score = min(like_rate / 0.10, 1.0)
        comment_score = min(comment_rate / 0.01, 1.0)
        
        final = (
            config.ENGAGEMENT_LIKE_WEIGHT * like_score + 
            config.ENGAGEMENT_COMMENT_WEIGHT * comment_score + 
            config.ENGAGEMENT_RECENCY_WEIGHT * recency
        )
        return round(final, 4)


class TranscriptFetcher:
    """
    Fetch YouTube video transcripts.
    Strictly adheres to test1.py: get FIRST available transcript in whatever language.
    No English preference - we translate to English via Sarvam if needed.
    """
    
    @staticmethod
    def fetch_transcript(video_id: str) -> Tuple[Optional[str], Optional[str]]:
        """
        Fetch transcript for a video ID.
        Uses same logic as test1.py: list all, pick first available (any language).
        
        Returns:
            (full_text, language_code) or (None, None) if unavailable
        """
        try:
            # Strictly match test1.py: use API instance and .list(), first available (any language)
            ytt_api = YouTubeTranscriptApi()
            transcript_list = ytt_api.list(video_id)
            
            # Iterate and pick the first available transcript (any language)
            transcript = None
            for t in transcript_list:
                transcript = t
                break
            
            if transcript is None:
                return None, None
            
            fetched = transcript.fetch()
            # FetchedTranscript yields FetchedTranscriptSnippet objects (use .text attribute)
            full_text = " ".join([entry.text for entry in fetched])
            language_code = getattr(transcript, "language_code", None) or getattr(transcript, "language", "")
            return full_text, language_code
            
        except Exception as e:
            print(f"Transcript fetch error for {video_id}: {e}")
            return None, None


class TranscriptTranslator:
    """
    Translate non-English transcripts to English.
    Supports: Hugging Face (Qwen, large context, minimal chunking) or Groq (chunked).
    """
    
    _hf_client = None

    @classmethod
    def _get_hf_client(cls):
        if cls._hf_client is None and HF_TOKEN:
            cls._hf_client = _create_hf_client()
        return cls._hf_client

    @staticmethod
    def translate_to_english(text: str, source_language_code: str = "auto") -> Optional[str]:
        if not text or not text.strip():
            return text

        backend = getattr(config, "TRANSLATION_BACKEND", "groq")
        if backend == "huggingface":
            return TranscriptTranslator._translate_hf(text, source_language_code)
        return TranscriptTranslator._translate_groq(text, source_language_code)

    @staticmethod
    def _translate_hf(text: str, source_language_code: str) -> Optional[str]:
        """Single or few large-chunk requests via Hugging Face (Qwen large context)."""
        client = TranscriptTranslator._get_hf_client()
        if not client:
            print("  ⚠ HF_TOKEN not set; falling back to Groq for translation")
            return TranscriptTranslator._translate_groq(text, source_language_code)

        max_chars = getattr(config, "TRANSLATION_HF_MAX_CHARS", 50000)
        model = getattr(config, "TRANSLATION_MODEL_HF", "Qwen/Qwen3-30B-A3B:novita")

        if len(text) <= max_chars:
            return TranscriptTranslator._translate_hf_chunk(client, model, text, source_language_code)

        # Few large chunks instead of many small ones
        translated = []
        for i in range(0, len(text), max_chars):
            chunk = text[i : i + max_chars]
            out = TranscriptTranslator._translate_hf_chunk(client, model, chunk, source_language_code)
            translated.append(out if out else chunk)
        return " ".join(translated)

    @staticmethod
    def _translate_hf_chunk(client, model: str, chunk: str, source_language_code: str) -> Optional[str]:
        try:
            lang_hint = f" (source language: {source_language_code})" if source_language_code and source_language_code != "auto" else ""
            prompt = f"""Translate the following text to English.{lang_hint}
Output ONLY the English translation, no explanations or quotes.

Text:
{chunk}"""
            completion = client.chat.completions.create(
                model=model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.2,
                max_tokens=min(16384, len(chunk) // 2 + 1000),
            )
            out = (completion.choices[0].message.content or "").strip()
            return out if out else chunk
        except Exception as e:
            print(f"  ⚠ Hugging Face translate error: {e}")
            return chunk

    @staticmethod
    def _translate_groq(text: str, source_language_code: str) -> Optional[str]:
        """Chunked translation via Groq (fallback or when backend=groq)."""
        chunk_size = config.TRANSLATION_CHUNK_SIZE_CHARS
        if len(text) <= chunk_size:
            return TranscriptTranslator._translate_groq_chunk(text, source_language_code)
        chunks = [text[i : i + chunk_size] for i in range(0, len(text), chunk_size)]
        translated = []
        for chunk in chunks:
            out = TranscriptTranslator._translate_groq_chunk(chunk, source_language_code)
            translated.append(out if out else chunk)
        return " ".join(translated)

    @staticmethod
    def _translate_groq_chunk(chunk: str, source_language_code: str) -> Optional[str]:
        try:
            lang_hint = f" (source language: {source_language_code})" if source_language_code and source_language_code != "auto" else ""
            prompt = f"""Translate the following text to English.{lang_hint}
Output ONLY the English translation, no explanations or quotes.

Text:
{chunk}"""
            completion = groq_client.chat.completions.create(
                model=config.TRANSLATION_MODEL_GROQ,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.2,
                max_completion_tokens=min(4096, len(chunk) // 2 + 500),
            )
            out = (completion.choices[0].message.content or "").strip()
            return out if out else chunk
        except Exception as e:
            print(f"  ⚠ Groq translate error: {e}")
            return chunk


class VideoScorer:
    """LLM-based scoring for video quality"""
    
    @staticmethod
    def score_video(video_data: Dict, transcript: str, parsed_intent: Dict) -> Dict:
        """
        Use Groq LLM to score video on 3 dimensions:
        1. Route-match (0-1): Does it cover the actual route?
        2. Actionability (0-1): Practical details (stops, costs, stays, food)
        3. Authenticity (0-1): Real experience vs clickbait/sponsored
        
        Returns: {route_match, actionability, authenticity, reasoning}
        """
        origin = parsed_intent.get('origin', '')
        destination = parsed_intent.get('destination', '')
        
        # Truncate transcript if too long
        words = transcript.split()[:config.MAX_TRANSCRIPT_WORDS]
        transcript_sample = " ".join(words)
        
        prompt = f"""Analyze this YouTube travel video and score it on 3 dimensions (0.0 to 1.0):

TRAVEL INTENT:
- Origin: {origin}
- Destination: {destination}
- Travel Style: {parsed_intent.get('travel_style', 'any')}

VIDEO METADATA:
- Title: {video_data['title']}
- Channel: {video_data['channel']}
- Duration: {video_data['duration_seconds']} seconds
- Views: {video_data['view_count']:,}
- Engagement Score: {video_data['engagement_score']}

TRANSCRIPT (first {config.MAX_TRANSCRIPT_WORDS} words):
{transcript_sample}

SCORING CRITERIA:

1. ROUTE_MATCH (0.0 - 1.0):
   - Does the video actually cover travel from {origin} to {destination}?
   - 1.0 = Full journey coverage with route details
   - 0.7 = Covers significant portions or one of the locations well
   - 0.3 = Only mentions locations, no route coverage
   - 0.0 = Unrelated or misleading

2. ACTIONABILITY (0.0 - 1.0):
   - Count practical details: stops, timings, costs, accommodations, food recommendations
   - 1.0 = 10+ specific actionable details (prices, addresses, timings)
   - 0.7 = 5-9 useful details
   - 0.5 = 2-4 details
   - 0.3 = Vague mentions
   - 0.0 = No practical information

3. AUTHENTICITY (0.0 - 1.0):
   - Is this a genuine travel experience vs clickbait/purely sponsored?
   - 1.0 = Personal journey, realistic pacing, honest review
   - 0.7 = Some promotional content but genuine experience
   - 0.3 = Heavy sponsorship or exaggerated
   - 0.0 = Pure clickbait, fake, or deceptive

Return ONLY valid JSON with no extra text:
{{"route_match": <0.0-1.0>, "actionability": <0.0-1.0>, "authenticity": <0.0-1.0>, "reasoning": "<one short sentence>"}}"""

        try:
            completion = groq_client.chat.completions.create(
                model=config.GROQ_MODEL,
                messages=[
                    {"role": "user", "content": prompt}
                ],
                temperature=config.SCORING_TEMPERATURE,
                max_completion_tokens=config.SCORING_MAX_TOKENS,
                response_format={"type": "json_object"}
            )
            
            raw = completion.choices[0].message.content or ""
            scores = json.loads(raw)
            return scores
            
        except json.JSONDecodeError as e:
            # Try to extract JSON from response (first { to last })
            raw = completion.choices[0].message.content or ""
            start = raw.find("{")
            end = raw.rfind("}")
            if start != -1 and end != -1 and end > start:
                try:
                    return json.loads(raw[start : end + 1])
                except Exception:
                    pass
            print(f"Scoring error for {video_data['video_id']}: JSON parse failed - {e}")
            return {
                "route_match": 0.0,
                "actionability": 0.0,
                "authenticity": 0.0,
                "reasoning": "Scoring response was invalid JSON"
            }
        except Exception as e:
            print(f"Scoring error for {video_data['video_id']}: {e}")
            return {
                "route_match": 0.0,
                "actionability": 0.0,
                "authenticity": 0.0,
                "reasoning": f"Scoring failed: {str(e)}"
            }


class YouTubePipeline:
    """Main pipeline orchestrator"""
    
    def __init__(self):
        self.parser = TravelQueryParser()
        self.query_gen = SearchQueryGenerator()
        self.collector = YouTubeVideoCollector()
        self.transcript_fetcher = TranscriptFetcher()
        self.translator = TranscriptTranslator()
        self.scorer = VideoScorer()

    def _analyze_one_video(self, video: Dict, parsed_intent: Dict) -> Tuple[Dict, Dict[str, float]]:
        """Fetch transcript, translate if needed, score; return (video, timings) for progress."""
        timings = {"transcript_s": 0.0, "translate_s": 0.0, "score_s": 0.0}
        t0 = time.perf_counter()
        transcript_text, language_code = self.transcript_fetcher.fetch_transcript(video["video_id"])
        timings["transcript_s"] = round(time.perf_counter() - t0, 2)
        if transcript_text:
            if (
                language_code
                and language_code not in config.ENGLISH_LANGUAGE_CODES
                and config.TRANSLATE_TO_ENGLISH
            ):
                t0 = time.perf_counter()
                transcript_text = self.translator.translate_to_english(
                    transcript_text, source_language_code=language_code
                ) or transcript_text
                timings["translate_s"] = round(time.perf_counter() - t0, 2)
            t0 = time.perf_counter()
            video["scores"] = self.scorer.score_video(video, transcript_text, parsed_intent)
            timings["score_s"] = round(time.perf_counter() - t0, 2)
            video["has_transcript"] = True
        else:
            video["scores"] = {
                "route_match": 0.0,
                "actionability": 0.0,
                "authenticity": 0.0,
                "reasoning": "No transcript",
            }
            video["has_transcript"] = False
        video["_timings"] = timings
        return video, timings
    
    def run(self, user_query: str, top_n: int = None) -> Dict:
        """
        Execute full pipeline
        
        Args:
            user_query: Natural language travel query
            top_n: Number of top videos to deeply analyze (fetch transcripts + score)
        
        Returns:
            {
                'intent': parsed intent,
                'search_queries': generated queries,
                'total_candidates': count,
                'analyzed_videos': list of scored videos,
                'report_path': path to generated report
            }
        """
        if top_n is None:
            top_n = config.TOP_N_FOR_ANALYSIS
            
        print("\n" + "="*70)
        print("YOUTUBE TRAVEL VIDEO ANALYSIS PIPELINE")
        print("Using yt-dlp for search (0 API quota) + YouTube API for metrics")
        print("="*70)
        
        # Step 1: Parse query
        print(f"\n[1/6] Parsing user query...")
        parsed_intent = self.parser.parse_query(user_query)
        print(f"  ✓ Origin: {parsed_intent.get('origin')}")
        print(f"  ✓ Destination: {parsed_intent.get('destination')}")
        print(f"  ✓ Travel Style: {parsed_intent.get('travel_style')}")
        
        # Step 2: Generate search queries
        print(f"\n[2/6] Generating YouTube search queries...")
        search_queries = self.query_gen.generate_queries(parsed_intent)
        print(f"  ✓ Generated {len(search_queries)} search queries:")
        for i, q in enumerate(search_queries, 1):
            print(f"    {i}. \"{q}\"")
        
        # Step 3: Search YouTube
        print(f"\n[3/6] Searching YouTube using yt-dlp (NO API QUOTA!)...")
        video_ids = self.collector.search_videos(search_queries)
        print(f"  ✓ Found {len(video_ids)} unique videos (0 quota units used)")
        
        # Step 4: Enrich with metadata
        print(f"\n[4/6] Enriching videos with YouTube API (videos.list - cheap!)...")
        enriched_videos = self.collector.enrich_videos(video_ids)
        quota_used = max(1, len(video_ids) // config.VIDEO_BATCH_SIZE)
        print(f"  ✓ Enriched {len(enriched_videos)} videos (after filtering)")
        print(f"  ✓ API quota used: ~{quota_used} units (vs 600+ with search.list!)")
        
        # Sort by engagement score and select top N
        enriched_videos.sort(key=lambda x: x['engagement_score'], reverse=True)
        top_videos = enriched_videos[:top_n]
        
        print(f"  ✓ Selected top {len(top_videos)} for deep analysis")
        
        # Step 5: Fetch transcripts and score (parallel per-video)
        total_videos = len(top_videos)
        max_workers = getattr(config, "ANALYSIS_MAX_WORKERS", 5)
        step5_start = time.perf_counter()
        print(f"\n[5/6] Analyzing {total_videos} videos (workers={max_workers})...")
        print(f"       Progress: [completed/{total_videos}] | transcript | translate | score | total time")
        print(f"       " + "-" * 60)
        analyzed_videos = []
        completed = 0
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            futures = {
                executor.submit(self._analyze_one_video, video, parsed_intent): video
                for video in top_videos
            }
            for future in as_completed(futures):
                completed += 1
                elapsed_total = time.perf_counter() - step5_start
                try:
                    video, timings = future.result()
                    analyzed_videos.append(video)
                    t = timings
                    total_s = t.get("transcript_s", 0) + t.get("translate_s", 0) + t.get("score_s", 0)
                    title = (video.get("title") or "")[:42]
                    if video.get("has_transcript"):
                        s = video.get("scores", {})
                        print(f"  [{completed}/{total_videos}] {title}... | "
                              f"transcript {t.get('transcript_s', 0):.1f}s | translate {t.get('translate_s', 0):.1f}s | score {t.get('score_s', 0):.1f}s | total {total_s:.1f}s | "
                              f"R:{s.get('route_match', 0):.2f} A:{s.get('actionability', 0):.2f} Auth:{s.get('authenticity', 0):.2f} ✓")
                    else:
                        print(f"  [{completed}/{total_videos}] {title}... | transcript {t.get('transcript_s', 0):.1f}s | no transcript | — | {total_s:.1f}s ✗")
                except Exception as e:
                    orig = futures[future]
                    orig["scores"] = {"route_match": 0.0, "actionability": 0.0, "authenticity": 0.0, "reasoning": str(e)}
                    orig["has_transcript"] = False
                    orig["_timings"] = {"transcript_s": 0, "translate_s": 0, "score_s": 0}
                    analyzed_videos.append(orig)
                    print(f"  [{completed}/{total_videos}] {orig.get('title', '')[:42]}... ⚠ Failed: {e}")
        step5_elapsed = time.perf_counter() - step5_start
        # Restore original order (by position in top_videos)
        order = {v["video_id"]: i for i, v in enumerate(top_videos)}
        analyzed_videos.sort(key=lambda v: order[v["video_id"]])
        print(f"       " + "-" * 60)
        print(f"  Step 5 completed in {step5_elapsed:.1f}s ({total_videos} videos, {max_workers} workers)")
        for v in analyzed_videos:
            v.pop("_timings", None)
        
        # Step 6: Generate report
        print(f"\n[6/6] Generating analysis report...")
        report_path = self._generate_report(parsed_intent, search_queries, enriched_videos, analyzed_videos)
        print(f"  ✓ Report saved to: {report_path}")
        
        print("\n" + "="*70)
        print("PIPELINE COMPLETE")
        print("="*70 + "\n")
        
        return {
            'intent': parsed_intent,
            'search_queries': search_queries,
            'total_candidates': len(enriched_videos),
            'analyzed_videos': analyzed_videos,
            'report_path': report_path
        }
    
    def _generate_report(self, intent: Dict, queries: List[str], 
                        all_videos: List[Dict], analyzed: List[Dict]) -> str:
        """Generate comprehensive text report"""
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        origin = intent.get('origin', 'unknown').replace(' ', '_')
        dest = intent.get('destination', 'unknown').replace(' ', '_')
        filename = f"analysis_{origin}_to_{dest}_{timestamp}.txt"
        
        # Sort analyzed videos by combined score
        analyzed_scored = [v for v in analyzed if v['has_transcript']]
        analyzed_scored.sort(
            key=lambda x: (
                x['scores']['route_match'] * config.WEIGHT_ROUTE_MATCH + 
                x['scores']['actionability'] * config.WEIGHT_ACTIONABILITY + 
                x['scores']['authenticity'] * config.WEIGHT_AUTHENTICITY +
                x['engagement_score'] * config.WEIGHT_ENGAGEMENT
            ),
            reverse=True
        )
        
        with open(filename, 'w', encoding='utf-8') as f:
            f.write("="*80 + "\n")
            f.write("YOUTUBE TRAVEL VIDEO ANALYSIS REPORT\n")
            f.write("="*80 + "\n\n")
            
            # Travel Intent
            f.write("TRAVEL INTENT\n")
            f.write("-"*80 + "\n")
            f.write(f"Origin:        {intent.get('origin', 'N/A')}\n")
            f.write(f"Destination:   {intent.get('destination', 'N/A')}\n")
            f.write(f"Dates:         {intent.get('dates', 'N/A')}\n")
            f.write(f"Budget:        {intent.get('budget', 'N/A')}\n")
            f.write(f"Travel Style:  {intent.get('travel_style', 'N/A')}\n")
            f.write(f"Query:         {intent.get('raw_query', 'N/A')}\n")
            f.write("\n")
            
            # Search Queries
            f.write("SEARCH QUERIES USED\n")
            f.write("-"*80 + "\n")
            for i, q in enumerate(queries, 1):
                f.write(f"{i}. {q}\n")
            f.write("\n")
            
            # Summary Stats
            f.write("SUMMARY STATISTICS\n")
            f.write("-"*80 + "\n")
            f.write(f"Total Candidates Found:    {len(all_videos)}\n")
            f.write(f"Videos Analyzed (w/ transcript): {len(analyzed_scored)}\n")
            f.write(f"Videos Without Transcript: {len([v for v in analyzed if not v['has_transcript']])}\n")
            f.write("\n")
            
            # Scoring weights used
            f.write("SCORING WEIGHTS USED\n")
            f.write("-"*80 + "\n")
            f.write(f"Route Match:    {config.WEIGHT_ROUTE_MATCH:.0%}\n")
            f.write(f"Actionability:  {config.WEIGHT_ACTIONABILITY:.0%}\n")
            f.write(f"Authenticity:   {config.WEIGHT_AUTHENTICITY:.0%}\n")
            f.write(f"Engagement:     {config.WEIGHT_ENGAGEMENT:.0%}\n")
            f.write("\n")
            
            # Top Recommendations
            f.write("TOP RECOMMENDED VIDEOS\n")
            f.write("="*80 + "\n\n")
            
            report_top = min(config.REPORT_TOP_N, len(analyzed_scored))
            for rank, video in enumerate(analyzed_scored[:report_top], 1):
                combined_score = (
                    video['scores']['route_match'] * config.WEIGHT_ROUTE_MATCH + 
                    video['scores']['actionability'] * config.WEIGHT_ACTIONABILITY + 
                    video['scores']['authenticity'] * config.WEIGHT_AUTHENTICITY +
                    video['engagement_score'] * config.WEIGHT_ENGAGEMENT
                )
                
                f.write(f"#{rank} - {video['title']}\n")
                f.write("-"*80 + "\n")
                f.write(f"URL:           {video['url']}\n")
                f.write(f"Channel:       {video['channel']}\n")
                f.write(f"Published:     {video['published_at'][:10]} ({video['age_days']} days ago)\n")
                f.write(f"Duration:      {video['duration_seconds']//60}m {video['duration_seconds']%60}s\n")
                f.write(f"Views:         {video['view_count']:,}\n")
                f.write(f"Likes:         {video['like_count']:,}\n")
                f.write(f"Comments:      {video['comment_count']:,}\n")
                f.write(f"Engagement:    {video['engagement_score']:.3f}\n")
                f.write("\n")
                f.write("SCORES:\n")
                f.write(f"  Route Match:    {video['scores']['route_match']:.2f} / 1.0\n")
                f.write(f"  Actionability:  {video['scores']['actionability']:.2f} / 1.0\n")
                f.write(f"  Authenticity:   {video['scores']['authenticity']:.2f} / 1.0\n")
                f.write(f"  Combined Score: {combined_score:.3f} / 1.0\n")
                f.write(f"\n  Reasoning: {video['scores']['reasoning']}\n")
                f.write("\n\n")
            
            # All Candidates (sorted by engagement)
            if config.REPORT_INCLUDE_ALL_CANDIDATES:
                f.write("\n" + "="*80 + "\n")
                f.write("ALL CANDIDATE VIDEOS (by engagement)\n")
                f.write("="*80 + "\n\n")
                
                all_videos.sort(key=lambda x: x['engagement_score'], reverse=True)
                max_candidates = min(config.REPORT_MAX_CANDIDATES, len(all_videos))
                for i, video in enumerate(all_videos[:max_candidates], 1):
                    f.write(f"{i:2d}. [{video['engagement_score']:.3f}] {video['title'][:60]}\n")
                    f.write(f"    {video['url']}\n")
                    f.write(f"    {video['view_count']:,} views | {video['like_count']:,} likes | {video['channel']}\n\n")
        
        return filename


def main():
    """Example usage"""
    # Get user query
    print("YouTube Travel Video Analysis Pipeline")
    print("="*70)
    user_query = input("\nEnter your travel query: ").strip()
    
    if not user_query:
        user_query = "I want to travel from Goa to Kanyakumari on a budget road trip"
        print(f"Using example query: {user_query}")
    
    # Run pipeline
    pipeline = YouTubePipeline()
    results = pipeline.run(user_query)
    
    # Print summary
    print(f"\n✓ Analysis complete!")
    print(f"  - Analyzed {len(results['analyzed_videos'])} videos")
    print(f"  - Report: {results['report_path']}")
    
    # Show top 3 recommendations with combined scores
    top_3 = [v for v in results['analyzed_videos'] if v['has_transcript']][:3]
    if top_3:
        print(f"\n🎥 TOP 3 RECOMMENDATIONS:")
        for i, video in enumerate(top_3, 1):
            scores = video['scores']
            combined = (
                scores['route_match'] * config.WEIGHT_ROUTE_MATCH +
                scores['actionability'] * config.WEIGHT_ACTIONABILITY +
                scores['authenticity'] * config.WEIGHT_AUTHENTICITY +
                video['engagement_score'] * config.WEIGHT_ENGAGEMENT
            )
            print(f"\n  {i}. {video['title'][:60]}")
            print(f"     {video['url']}")
            print(f"     Combined: {combined:.3f} | Route: {scores['route_match']:.2f} | Action: {scores['actionability']:.2f} | Auth: {scores['authenticity']:.2f}")


if __name__ == "__main__":
    main()
