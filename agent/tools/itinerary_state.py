"""
Itinerary state for the agent: days and items.
Serializable for sending to frontend via LiveKit data.
"""

from dataclasses import dataclass, field
from typing import List, Literal


@dataclass
class ItineraryItem:
    time: str
    title: str
    type: Literal["place", "food", "transport", "experience"]
    note: str = ""


@dataclass
class ItineraryDay:
    day: int
    title: str
    items: List[ItineraryItem] = field(default_factory=list)


@dataclass
class ItineraryState:
    destination: str = ""
    days: List[ItineraryDay] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "destination": self.destination,
            "days": [
                {
                    "day": d.day,
                    "title": d.title,
                    "items": [
                        {
                            "time": i.time,
                            "title": i.title,
                            "type": i.type,
                            "note": i.note or "",
                        }
                        for i in d.items
                    ],
                }
                for d in self.days
            ],
        }


def itinerary_to_dict(itinerary: ItineraryState) -> dict:
    return itinerary.to_dict()
