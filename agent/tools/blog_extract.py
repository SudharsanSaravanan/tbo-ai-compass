"""
Extract main content from a blog/article URL using Firecrawl (see project firecrawl.md).
Returns markdown text for agent context.
"""

import os
from typing import Optional


def extract_blog_content(url: str) -> Optional[str]:
    """
    Scrape a single URL with Firecrawl and return markdown content.
    Requires FIRECRAWL_API_KEY in env. Returns None on failure.
    """
    api_key = os.getenv("FIRECRAWL_API_KEY")
    if not api_key:
        return None
    try:
        from firecrawl import Firecrawl

        firecrawl = Firecrawl(api_key=api_key)
        result = firecrawl.scrape(url, formats=["markdown"])
        if not result:
            return None
        # Firecrawl SDK may return dict with 'markdown' or object with .markdown
        if isinstance(result, dict):
            return result.get("markdown") or result.get("content")
        return getattr(result, "markdown", None) or getattr(result, "content", None)
    except Exception:
        return None
