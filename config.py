"""
Configuration file for YouTube Pipeline
Adjust these parameters to customize pipeline behavior
"""

# ============================================================================
# API CONFIGURATION
# ============================================================================

# YouTube API quota limits (daily: 10,000 units)
# search.list = 100 units per request
# videos.list = 1 unit per request
YOUTUBE_QUOTA_BUDGET = 1000  # Max quota units to use per run

# Groq Model Selection
GROQ_MODEL = "llama-3.1-8b-instant"  # Fast, high-TPD Groq model for pipeline LLM calls


# ============================================================================
# SEARCH CONFIGURATION
# ============================================================================

# Number of search queries to generate per user query
NUM_SEARCH_QUERIES = 6

# Results per search query (yt-dlp - NO API QUOTA COST!)
MAX_RESULTS_PER_QUERY = 10

# Note: yt-dlp is used for searching, so there's no API quota cost for search!
# Only videos.list is used for enrichment (1 unit per request)


# ============================================================================
# ANALYSIS CONFIGURATION
# ============================================================================

# Number of top videos to analyze deeply (fetch transcript + LLM score)
TOP_N_FOR_ANALYSIS = 7

# Minimum engagement score threshold (0.0 - 1.0)
MIN_ENGAGEMENT_SCORE = 0.1

# Maximum video age in days (filter out very old videos)
MAX_VIDEO_AGE_DAYS = 365 * 3  # 3 years

# Minimum video views (filter spam/low-quality)
MIN_VIEW_COUNT = 1000


# ============================================================================
# SCORING WEIGHTS
# ============================================================================

# Final ranking weights (must sum to 1.0)
WEIGHT_ROUTE_MATCH = 0.40      # How well does it cover the route?
WEIGHT_ACTIONABILITY = 0.30     # Practical details?
WEIGHT_AUTHENTICITY = 0.20      # Genuine vs clickbait?
WEIGHT_ENGAGEMENT = 0.10        # Social engagement metrics?

# Engagement score calculation weights (must sum to 1.0)
ENGAGEMENT_LIKE_WEIGHT = 0.50
ENGAGEMENT_COMMENT_WEIGHT = 0.30
ENGAGEMENT_RECENCY_WEIGHT = 0.20


# ============================================================================
# TRANSCRIPT CONFIGURATION
# ============================================================================

# Maximum transcript words to send to LLM (shorter = more room for JSON response, fewer cutoffs)
MAX_TRANSCRIPT_WORDS = 500  # Keep scoring payload under Groq free-tier TPM limit (~6k)

# Take first available transcript (any language) - match test1.py behavior
# Non-English transcripts are translated to English via Groq (TRANSLATION_MODEL_GROQ)
USE_FIRST_AVAILABLE_TRANSCRIPT = True

# Skip videos without transcripts?
SKIP_NO_TRANSCRIPT = False

# ============================================================================
# TRANSLATION CONFIGURATION
# ============================================================================

# Translate non-English transcripts to English for LLM scoring
TRANSLATE_TO_ENGLISH = True

# Backend: "huggingface" (Qwen, large context, fewer requests) or "groq" (chunked)
TRANSLATION_BACKEND = "huggingface"

# Hugging Face inference (Qwen large context - minimal chunking)
# Uses OpenAI-compatible API at router.huggingface.co; set HF_TOKEN in env
TRANSLATION_MODEL_HF = "Qwen/Qwen3-30B-A3B:novita"

# Max chars to send in one request for HF (Qwen has 128k+ context; safe single-request size)
TRANSLATION_HF_MAX_CHARS = 50000

# Groq fallback (used when TRANSLATION_BACKEND == "groq")
TRANSLATION_MODEL_GROQ = "llama-3.1-8b-instant"
TRANSLATION_CHUNK_SIZE_CHARS = 2000

# Language codes considered "English" (no translation needed)
ENGLISH_LANGUAGE_CODES = frozenset({"en", "en-US", "en-GB", "en-IN"})


# ============================================================================
# LLM CONFIGURATION
# ============================================================================

# Temperature for query parsing (lower = more deterministic)
PARSE_TEMPERATURE = 0.3

# Temperature for search query generation (higher = more diverse)
QUERY_GEN_TEMPERATURE = 0.7

# Temperature for video scoring (lower = more consistent)
SCORING_TEMPERATURE = 0.3

# Max tokens for LLM responses
MAX_COMPLETION_TOKENS = 500
SCORING_MAX_TOKENS = 1500


# ============================================================================
# OUTPUT CONFIGURATION
# ============================================================================

# Report format
REPORT_FORMAT = "txt"  # "txt", "json", "both"

# Number of top videos to include in report
REPORT_TOP_N = 10

# Include all candidates in report?
REPORT_INCLUDE_ALL_CANDIDATES = True

# Max candidates to list in report
REPORT_MAX_CANDIDATES = 30

# Output directory for reports
OUTPUT_DIR = "."  # Current directory


# ============================================================================
# PERFORMANCE CONFIGURATION
# ============================================================================

# Enable caching of search results?
ENABLE_CACHE = False
CACHE_EXPIRY_HOURS = 24

# Batch size for video enrichment
VIDEO_BATCH_SIZE = 50  # YouTube API supports up to 50

# yt-dlp search timeout (seconds); faster with --flat-playlist
YTDLP_SEARCH_TIMEOUT = 15

# Parallel video analysis: max concurrent workers (transcript + translate + score)
ANALYSIS_MAX_WORKERS = 7

# Timeout for external API calls (seconds)
API_TIMEOUT = 30

# Retry configuration
MAX_RETRIES = 3
RETRY_DELAY = 2  # seconds


# ============================================================================
# FALLBACK CONFIGURATION
# ============================================================================

# yt-dlp is now the PRIMARY search method (no quota cost)
# These settings are kept for backwards compatibility

USE_YTDLP_FALLBACK = True   # Always true now (it's the primary method)
PREFER_YTDLP_SEARCH = True   # Always true now


# ============================================================================
# VALIDATION
# ============================================================================

def validate_config():
    """Validate configuration values"""
    errors = []
    
    # Check weights sum to 1.0
    ranking_sum = (WEIGHT_ROUTE_MATCH + WEIGHT_ACTIONABILITY + 
                   WEIGHT_AUTHENTICITY + WEIGHT_ENGAGEMENT)
    if abs(ranking_sum - 1.0) > 0.01:
        errors.append(f"Ranking weights must sum to 1.0 (currently {ranking_sum})")
    
    engagement_sum = (ENGAGEMENT_LIKE_WEIGHT + ENGAGEMENT_COMMENT_WEIGHT + 
                      ENGAGEMENT_RECENCY_WEIGHT)
    if abs(engagement_sum - 1.0) > 0.01:
        errors.append(f"Engagement weights must sum to 1.0 (currently {engagement_sum})")
    
    # Check valid ranges
    if not (0 < TOP_N_FOR_ANALYSIS <= 50):
        errors.append("TOP_N_FOR_ANALYSIS must be between 1 and 50")
    
    if not (0.0 <= MIN_ENGAGEMENT_SCORE <= 1.0):
        errors.append("MIN_ENGAGEMENT_SCORE must be between 0.0 and 1.0")
    
    if VIDEO_DURATION_FILTER not in ["short", "medium", "long", "any"]:
        errors.append("VIDEO_DURATION_FILTER must be 'short', 'medium', 'long', or 'any'")
    
    if REPORT_FORMAT not in ["txt", "json", "both"]:
        errors.append("REPORT_FORMAT must be 'txt', 'json', or 'both'")
    
    return errors


if __name__ == "__main__":
    # Validate configuration when run directly
    print("YouTube Pipeline Configuration Validator")
    print("=" * 60)
    
    errors = validate_config()
    
    if errors:
        print("\n❌ Configuration Errors Found:\n")
        for error in errors:
            print(f"  - {error}")
        print("\nPlease fix these errors in config.py")
    else:
        print("\n✅ Configuration is valid!")
        print("\nCurrent Settings:")
        print(f"  Search Queries: {NUM_SEARCH_QUERIES}")
        print(f"  Results per Query: {MAX_RESULTS_PER_QUERY}")
        print(f"  Deep Analysis: Top {TOP_N_FOR_ANALYSIS} videos")
        print(f"  Ranking Weights: Route={WEIGHT_ROUTE_MATCH}, Action={WEIGHT_ACTIONABILITY}, Auth={WEIGHT_AUTHENTICITY}, Engage={WEIGHT_ENGAGEMENT}")
