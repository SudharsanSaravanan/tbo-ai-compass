"""IST (India Standard Time) utilities for date/time operations."""

from datetime import datetime, timezone, timedelta

IST = timezone(timedelta(hours=5, minutes=30))


def get_ist_now() -> datetime:
    return datetime.now(IST)


def get_ist_date_str() -> str:
    return get_ist_now().strftime("%Y-%m-%d")


def get_ist_datetime_str() -> str:
    return get_ist_now().strftime("%Y-%m-%d %H:%M:%S IST")


def get_ist_context_for_llm() -> str:
    """Return a string the LLM can use to resolve relative dates."""
    now = get_ist_now()
    return (
        f"Current IST date/time: {now.strftime('%A, %B %d, %Y %I:%M %p IST')}. "
        f"Today is {now.strftime('%Y-%m-%d')}."
    )
