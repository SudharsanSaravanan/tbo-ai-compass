"""
Run the project's youtube_pipeline to get top videos and transcripts for the agent.
Top-1 transcript mode: only the highest-ranked video gets a transcript + summary.
"""

import re
import sys
from pathlib import Path
from typing import Dict, Any, List

_PROJECT_ROOT = str(Path(__file__).resolve().parents[2])
if _PROJECT_ROOT not in sys.path:
    sys.path.insert(0, _PROJECT_ROOT)


def _extract_video_id(url: str) -> str:
    m = re.search(r"(?:v=|youtu\.be/)([0-9A-Za-z_-]{11})", url or "")
    return m.group(1) if m else ""


def run_youtube_discovery(user_query: str, top_n: int = 5) -> Dict[str, Any]:
    """
    Run YouTube pipeline. Returns the primary video (with transcript summary)
    plus metadata-only context videos.
    """
    try:
        import config
        from youtube_pipeline import YouTubePipeline

        pipeline = YouTubePipeline()
        results = pipeline.run(user_query, top_n=top_n)

        intent = results.get("intent", {})
        primary = results.get("primary_video")
        ctx = results.get("context_videos", [])
        transcript_summary = results.get("transcript_summary", "")

        primary_out = None
        if primary:
            vid = primary.get("video_id") or _extract_video_id(primary.get("url", ""))
            primary_out = {
                "video_id": vid,
                "title": primary.get("title", ""),
                "url": primary.get("url", ""),
                "channel": primary.get("channel_title", ""),
                "thumbnail": f"https://img.youtube.com/vi/{vid}/maxresdefault.jpg" if vid else "",
                "transcript_summary": transcript_summary,
                "view_count": primary.get("view_count", 0),
                "engagement_score": primary.get("engagement_score", 0),
            }

        context_out: List[Dict] = []
        for v in ctx[:top_n]:
            vid = v.get("video_id") or _extract_video_id(v.get("url", ""))
            context_out.append({
                "video_id": vid,
                "title": v.get("title", ""),
                "url": v.get("url", ""),
                "channel": v.get("channel_title", ""),
                "thumbnail": f"https://img.youtube.com/vi/{vid}/maxresdefault.jpg" if vid else "",
                "view_count": v.get("view_count", 0),
                "engagement_score": v.get("engagement_score", 0),
            })

        summary_block = ""
        if primary_out:
            summary_block = (
                f"PRIMARY VIDEO (used for planning):\n"
                f"  {primary_out['title']} | {primary_out['url']}\n"
                f"  Transcript summary:\n{transcript_summary}\n\n"
            )
        if context_out:
            summary_block += "ADDITIONAL CONTEXT VIDEOS (by engagement):\n"
            for cv in context_out:
                summary_block += f"  - {cv['title']} | {cv['url']}\n"

        return {
            "intent": intent,
            "summary": summary_block or "No videos found.",
            "video_count": len(ctx) + (1 if primary else 0),
            "primary_video": primary_out,
            "context_videos": context_out,
            "transcript_summary": transcript_summary,
            "top_videos": [primary_out] + context_out if primary_out else context_out,
        }
    except Exception as e:
        return {
            "intent": {},
            "summary": f"Pipeline error: {str(e)}",
            "video_count": 0,
            "primary_video": None,
            "context_videos": [],
            "transcript_summary": "",
            "top_videos": [],
            "error": str(e),
        }
