"""
Structured trip preferences collected from the voice conversation.
Used by the agent to run pipeline and build itinerary.
"""

from dataclasses import dataclass, field
from typing import List, Optional


@dataclass
class TripPreferences:
    """Collected travel preferences from user (voice or options)."""

    destination: str = ""
    origin: Optional[str] = None
    dates: Optional[str] = None
    duration: Optional[str] = None  # e.g. "3-5 days", "1 week"
    budget: Optional[str] = None  # Budget-friendly, Mid-range, Luxury, No limit
    experience: Optional[str] = None  # Relaxed, Adventure, Food & culture, Mix
    travelers: Optional[str] = None  # Solo, Couple, Family (3-5), Group (6+)
    reference_urls: List[str] = field(default_factory=list)  # YouTube or blog URLs
    reference_content: Optional[str] = None  # Extracted transcript/blog text for context
    raw_query: str = ""

    def to_pipeline_query(self) -> str:
        """Build a natural-language query for youtube_pipeline from preferences."""
        parts = []
        if self.origin:
            parts.append(f"from {self.origin}")
        if self.destination:
            parts.append(f"to {self.destination}")
        if self.duration:
            parts.append(f"for {self.duration}")
        if self.budget:
            parts.append(f"on a {self.budget.lower()} budget")
        if self.experience:
            parts.append(f"looking for {self.experience.lower()} experience")
        if self.travelers:
            parts.append(f"traveling {self.travelers.lower()}")
        if self.raw_query:
            return self.raw_query
        return " ".join(parts) if parts else "general travel"

    def to_dict(self) -> dict:
        return {
            "destination": self.destination,
            "origin": self.origin,
            "dates": self.dates,
            "duration": self.duration,
            "budget": self.budget,
            "experience": self.experience,
            "travelers": self.travelers,
            "reference_urls": self.reference_urls,
            "raw_query": self.raw_query,
        }
