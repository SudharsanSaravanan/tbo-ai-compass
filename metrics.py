from googleapiclient.discovery import build
from urllib.parse import urlparse, parse_qs
from datetime import datetime, timezone
import isodate
import os
from dotenv import load_dotenv
load_dotenv()

# ─────────────────────────────────────────────
# CONFIG — paste your API key here directly
# (No credentials.json needed for public data)
# ─────────────────────────────────────────────
API_KEY = os.getenv("GOOGLE_API_KEY")


def extract_video_id(url: str) -> str:
    """Extracts video ID from any standard YouTube URL format."""
    parsed = urlparse(url)

    # Handle youtu.be short links
    if parsed.netloc == "youtu.be":
        return parsed.path.lstrip("/")

    # Handle youtube.com/watch?v= links
    if parsed.netloc in ("www.youtube.com", "youtube.com"):
        qs = parse_qs(parsed.query)
        if "v" in qs:
            return qs["v"][0]

    raise ValueError(f"Could not extract video ID from URL: {url}")


def parse_duration(iso_duration: str) -> str:
    """Converts ISO 8601 duration (e.g. PT12M34S) to readable format."""
    duration = isodate.parse_duration(iso_duration)
    total_seconds = int(duration.total_seconds())
    hours, remainder = divmod(total_seconds, 3600)
    minutes, seconds = divmod(remainder, 60)
    if hours > 0:
        return f"{hours}h {minutes}m {seconds}s"
    return f"{minutes}m {seconds}s"


def compute_engagement_score(view_count: int, like_count: int,
                              comment_count: int, published_at: str) -> float:
    """
    Computes a normalized engagement score (0.0 to 1.0).
    Factors:
      - Like rate       : likes / views
      - Comment rate    : comments / views
      - Recency boost   : decays over years (older = lower weight)
    """
    if view_count == 0:
        return 0.0

    like_rate    = like_count    / view_count   # typically 0.01 – 0.10
    comment_rate = comment_count / view_count   # typically 0.001 – 0.01

    # Recency: videos < 1 year old get boost, older ones decay
    published_dt = datetime.fromisoformat(published_at.replace("Z", "+00:00"))
    age_days     = (datetime.now(timezone.utc) - published_dt).days
    recency      = 1 / (1 + age_days / 365)    # 1 year old → 0.5, 3 years → 0.25

    # Normalize each component to 0–1 range using soft caps
    like_score    = min(like_rate    / 0.10, 1.0)   # 10% like rate = perfect
    comment_score = min(comment_rate / 0.01, 1.0)   # 1% comment rate = perfect

    final = (0.50 * like_score) + (0.30 * comment_score) + (0.20 * recency)
    return round(final, 4)


def get_video_engagement(youtube_url: str):
    """Main function: takes a YouTube URL and prints full engagement info."""

    video_id = extract_video_id(youtube_url)

    youtube = build("youtube", "v3", developerKey=API_KEY)

    response = youtube.videos().list(
        id=video_id,
        part="snippet,statistics,contentDetails"
    ).execute()

    if not response["items"]:
        print("No video found for this URL. Check if it's public.")
        return

    item            = response["items"][0]
    snippet         = item["snippet"]
    stats           = item["statistics"]
    content_details = item["contentDetails"]

    # ── Extract fields ──────────────────────────────────
    title         = snippet["title"]
    channel       = snippet["channelTitle"]
    published_at  = snippet["publishedAt"]
    description   = snippet.get("description", "")[:200]   # first 200 chars
    tags          = snippet.get("tags", [])
    duration_raw  = content_details["duration"]

    view_count    = int(stats.get("viewCount",    0))
    like_count    = int(stats.get("likeCount",    0))
    comment_count = int(stats.get("commentCount", 0))

    # ── Derived metrics ─────────────────────────────────
    like_rate         = round((like_count    / view_count * 100), 2) if view_count else 0
    comment_rate      = round((comment_count / view_count * 100), 3) if view_count else 0
    duration_readable = parse_duration(duration_raw)
    engagement_score  = compute_engagement_score(
        view_count, like_count, comment_count, published_at
    )

    # ── Print output ────────────────────────────────────
    print("\n" + "="*55)
    print("  VIDEO ENGAGEMENT REPORT")
    print("="*55)
    print(f"  Title        : {title}")
    print(f"  Channel      : {channel}")
    print(f"  Published    : {published_at[:10]}")
    print(f"  Duration     : {duration_readable}")
    print(f"  Tags         : {', '.join(tags[:5]) if tags else 'None'}")
    print("-"*55)
    print(f"  Views        : {view_count:,}")
    print(f"  Likes        : {like_count:,}  ({like_rate}% of views)")
    print(f"  Comments     : {comment_count:,}  ({comment_rate}% of views)")
    print("-"*55)
    print(f"  Engagement Score : {engagement_score} / 1.0")
    print("="*55)
    print(f"\n  Description preview:\n  {description}...\n")


# ─────────────────────────────────────────────
# ENTRY POINT
# ─────────────────────────────────────────────
if __name__ == "__main__":
    url = input("Enter YouTube video URL: ").strip()
    get_video_engagement(url)
