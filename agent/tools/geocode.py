"""Geocode place names to lat/lng using Nominatim (free, no API key)."""

import logging
import httpx as _httpx
from typing import Optional, Dict

logger = logging.getLogger(__name__)


async def geocode_location(place_name: str) -> Optional[Dict]:
    """Return {name, lat, lng, display_name} or None."""
    if not place_name or not place_name.strip():
        return None
    clean = place_name.strip()
    # Append ",India" for better Nominatim results on Indian places
    query = f"{clean},India" if "india" not in clean.lower() else clean
    try:
        async with _httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                "https://nominatim.openstreetmap.org/search",
                params={"q": query, "format": "json", "limit": 1},
                headers={"User-Agent": "TBO-AI-Compass/1.0"},
            )
            resp.raise_for_status()
            results = resp.json()
            if results:
                geo = {
                    "name": clean,
                    "lat": float(results[0]["lat"]),
                    "lng": float(results[0]["lon"]),
                    "display_name": results[0].get("display_name", clean),
                }
                logger.info("Geocoded '%s' → %s, %s", clean, geo["lat"], geo["lng"])
                return geo
            logger.warning("Nominatim returned no results for '%s'", query)
    except Exception as e:
        logger.warning("Geocode failed for '%s': %s", clean, e)
    return None
