"""
Fetch transcript from a single YouTube URL (same logic as project test1.py).
Returns plain text for agent context.
"""

import re
from typing import Tuple, Optional


def extract_video_id(url: str) -> str:
    match = re.search(r"(?:v=|\/)([0-9A-Za-z_-]{11}).*", url)
    if match:
        return match.group(1)
    raise ValueError("Invalid YouTube URL")


def get_youtube_transcript(url: str) -> Tuple[Optional[str], Optional[str]]:
    """
    Get transcript for a YouTube video URL.
    Returns (full_text, language_code) or (None, None) if unavailable.
    Uses first available transcript (any language), matching test1.py behavior.
    """
    try:
        from youtube_transcript_api import YouTubeTranscriptApi

        video_id = extract_video_id(url)
        ytt_api = YouTubeTranscriptApi()
        transcript_list = ytt_api.list(video_id)

        transcript = None
        for t in transcript_list:
            transcript = t
            break

        if transcript is None:
            return None, None

        fetched = transcript.fetch()
        full_text = " ".join(entry.text for entry in fetched)
        language_code = getattr(transcript, "language_code", None) or getattr(transcript, "language", "")
        return full_text, language_code

    except Exception:
        return None, None
