# YouTube Travel Video Analysis Pipeline

A comprehensive AI-powered pipeline that analyzes YouTube videos for travel route planning. The system intelligently finds, ranks, and scores travel videos based on route coverage, actionability, and authenticity.

## Sample Usage

```
======================================================================

Enter your travel query: coimbatore to munaar family trip

======================================================================
YOUTUBE TRAVEL VIDEO ANALYSIS PIPELINE
Using yt-dlp for search (0 API quota) + YouTube API for metrics
======================================================================

[1/6] Parsing user query...
  ✓ Origin: Coimbatore
  ✓ Destination: Munnar
  ✓ Travel Style: family

[2/6] Generating YouTube search queries...
  ✓ Generated 6 search queries:
    1. "coimbatore to munnar family road trip vlog"
    2. "munnar family itinerary guide from coimbatore"
    3. "budget travel coimbatore to munnar journey"
    4. "coimbatore munnar family travel tips vlog"
    5. "scenic route coimbatore to munnar road trip"
    6. "family adventure munnar guide from coimbatore"

[3/6] Searching YouTube using yt-dlp (NO API QUOTA!)...
  ✓ Found 31 unique videos (0 quota units used)

[4/6] Enriching videos with YouTube API (videos.list - cheap!)...
  ✓ Enriched 22 videos (after filtering)
  ✓ API quota used: ~1 units (vs 600+ with search.list!)
  ✓ Selected top 15 for deep analysis

[5/6] Analyzing 15 videos (workers=7)...
       Progress: [completed/15] | transcript | translate | score | total time
       ------------------------------------------------------------
  [1/15] Epic Coimbatore to Munnar Family Road Trip... | transcript 1.2s | translate 0.0s | score 0.7s | total 1.9s | R:0.30 A:0.00 Auth:0.30 ✓
  [2/15] ₹400 ல Munnar + Vattavada - அ one day-ல சு... | transcript 1.3s | translate 0.0s | score 1.2s | total 2.5s | R:0.30 A:0.50 Auth:0.70 ✓
  [3/15] MUNNAR TRAVEL GUIDE | 40+ Places, Cool Bud... | transcript 1.3s | translate 0.0s | score 1.4s | total 2.7s | R:0.30 A:0.70 Auth:1.00 ✓
  [4/15] Coimbatore to Munnar  I  மூணாறு, கேரளா   I... | transcript 1.6s | translate 0.0s | score 1.5s | total 3.1s | R:0.30 A:0.00 Auth:0.70 ✓
  [5/15] Top 20 MUNNAR Tourist places - Ultimate Tr... | transcript 1.9s | translate 0.0s | score 0.6s | total 2.4s | R:0.30 A:0.00 Auth:0.30 ✓
  [6/15] 😍3 Days in Munnar ⛰🍃| Complete Travel Guid... | transcript 3.5s | translate 0.0s | score 1.0s | total 4.5s | R:0.00 A:0.50 Auth:0.70 ✓
  [7/15] 3500ல LUXURY MUNNAR PACKAGEஆ? அதுவும் 2 DA... | transcript 1.7s | translate 0.0s | score 4.5s | total 6.2s | R:0.30 A:0.00 Auth:0.30 ✓
  [8/15] 😍Anakulam 2 Days Travel Guide | Elephant E... | transcript 4.1s | translate 0.0s | score 7.5s | total 11.6s | R:0.00 A:0.00 Auth:0.00 ✓
  [9/15] Munnar Travel Guide 2025  I Munnar Tourist... | transcript 0.9s | translate 19.8s | score 1.4s | total 22.0s | R:0.30 A:0.70 Auth:0.70 ✓
  [10/15] Things To Do In Munnar In Three Days - Tea... | transcript 3.5s | translate 0.0s | score 28.8s | total 32.3s | R:0.00 A:0.00 Auth:0.00 ✓
  [11/15] COIMBATORE TO MUNNAR | BIKE RIDE | DAY 1 |... | transcript 1.5s | translate 42.8s | score 15.2s | total 59.5s | R:0.30 A:0.50 Auth:0.70 ✓
  [12/15] Kerala 7 Nights & 8 Days Itinerary | Kochi... | transcript 1.2s | translate 66.7s | score 16.7s | total 84.6s | R:0.00 A:1.00 Auth:1.00 ✓
  [13/15] மூணார் 3 நாள் டூர் #munnar best tour packa... | transcript 1.2s | translate 72.6s | score 38.9s | total 112.7s | R:0.30 A:1.00 Auth:0.70 ✓
  [14/15] Munnar Budget Trip 2026 | மூணாறு சுற்றுலா ... | transcript 1.0s | translate 121.1s | score 17.6s | total 139.8s | R:0.30 A:0.70 Auth:0.70 ✓
  ⚠ Hugging Face translate error: Error code: 402 - {'error': 'Credit balance is depleted: purchase pre-paid credits to continue using Inference Providers with your account. Alternatively, subscribe to PRO to get 20x more included usage.'}
  [15/15] மூணார் 3 நாள் டூர் #munnar package tamil |... | transcript 0.9s | translate 244.2s | score 2.1s | total 247.2s | R:0.30 A:1.00 Auth:0.70 ✓
       ------------------------------------------------------------
  Step 5 completed in 261.3s (15 videos, 7 workers)

[6/6] Generating analysis report...
  ✓ Report saved to: analysis_Coimbatore_to_Munnar_20260221_235259.txt

======================================================================
PIPELINE COMPLETE
======================================================================


✓ Analysis complete!
  - Analyzed 15 videos
  - Report: analysis_Coimbatore_to_Munnar_20260221_235259.txt

🎥 TOP 3 RECOMMENDATIONS:

  1. Coimbatore to Munnar  I  மூணாறு, கேரளா   I  தமிழ்  I  Tent C
     https://www.youtube.com/watch?v=2mjsh0MFjt0
     Combined: 0.307 | Route: 0.30 | Action: 0.00 | Auth: 0.70

  2. COIMBATORE TO MUNNAR | BIKE RIDE | DAY 1 | MONSOON | TAMIL |
     https://www.youtube.com/watch?v=4rmhFd1AgSk
     Combined: 0.453 | Route: 0.30 | Action: 0.50 | Auth: 0.70

  3. ₹400 ல Munnar + Vattavada - அ one day-ல சுத்திபார்க்க முடியு
     https://www.youtube.com/watch?v=vobsVUdCGa4
     Combined: 0.439 | Route: 0.30 | Action: 0.50 | Auth: 0.70
```

## Features

- **Intelligent Query Parsing**: Uses Groq LLM to extract travel intent (origin, destination, dates, budget, style)
- **Smart Search Query Generation**: Automatically generates 3-6 diverse YouTube search queries
- **Efficient Video Collection**: Uses **yt-dlp** to search YouTube (NO API QUOTA COST!)
- **Cost-Effective Enrichment**: Uses YouTube API `videos.list` only for fetching metrics (very cheap - 1 unit per request)
- **Engagement Metrics**: Analyzes views, likes, comments, and recency to rank videos
- **Transcript Analysis**: Fetches and processes video transcripts
- **AI-Powered Scoring**: Evaluates videos on 3 dimensions:
  - **Route Match** (0-1): Does it cover the actual route?
  - **Actionability** (0-1): Contains practical details (stops, costs, stays, food)?
  - **Authenticity** (0-1): Genuine experience vs clickbait/sponsored?
- **Comprehensive Reports**: Generates detailed analysis reports in text format

## Installation

### Prerequisites

- Python 3.8+
- Google API Key (YouTube Data API v3)
- Groq API Key

### Setup

1. Clone the repository:
```bash
cd tbo-ai-compass
```

2. Create and activate virtual environment (if using):
```bash
python -m venv tbo
source tbo/bin/activate  # Linux/Mac
# or
tbo\Scripts\activate  # Windows
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

**Note**: This will install `yt-dlp` which is required for searching YouTube without API quota costs.

4. Set up environment variables:

Create a `.env` file in the project root:
```bash
GOOGLE_API_KEY=your_google_api_key_here
GROQ_API_KEY=your_groq_api_key_here
```

**Transcripts & translation:** The pipeline takes the **first available transcript** in any language (same as `test1.py`). Non-English transcripts are translated to English before LLM scoring. By default translation uses **Hugging Face** (Qwen, large context) for speed—set `HF_TOKEN` in `.env`. You can set `TRANSLATION_BACKEND=groq` in `config.py` to use Groq instead (chunked, slower).

**Getting API Keys:**

- **Google API Key**: 
  1. Go to [Google Cloud Console](https://console.cloud.google.com/)
  2. Create a new project or select existing
  3. Enable "YouTube Data API v3"
  4. Go to Credentials → Create Credentials → API Key
  
- **Groq API Key** (query parsing, search-query generation, video scoring; optional for translation):
  1. Sign up at [Groq Console](https://console.groq.com/)
  2. Generate API key from dashboard

- **Hugging Face token** (recommended for translation—Qwen large context, fewer requests):
  1. Sign up at [Hugging Face](https://huggingface.co/), go to Settings → Access Tokens
  2. Add `HF_TOKEN=your_token` to `.env`
  3. If not set, translation falls back to Groq (chunked)

### Optional: Install yt-dlp for alternative search

yt-dlp is now a **required** dependency (already included in requirements.txt). It's used for searching YouTube without consuming API quota.

## Usage

### Main Pipeline

Run the complete analysis pipeline:

```bash
python youtube_pipeline.py
```

You'll be prompted to enter a travel query, for example:
- "I want to travel from Goa to Kanyakumari on a budget road trip"
- "Mumbai to Ladakh bike trip in July"
- "Family friendly train journey from Delhi to Kerala"

### Individual Components

#### 1. Check Video Engagement Metrics

```bash
python metrics.py
# Enter YouTube URL when prompted
```

#### 2. Fetch Video Transcript

```bash
python test1.py
# Enter YouTube URL when prompted
```

#### 3. Alternative Search (yt-dlp)

```bash
python ytdlp_search.py
# Enter search query when prompted
```

## Pipeline Workflow

```
User Query
    ↓
[1] Parse Intent (Groq LLM)
    → Extract: origin, destination, dates, budget, travel_style
    ↓
[2] Generate Search Queries (Groq LLM)
    → 3-6 diverse YouTube search queries
    ↓
[3] Search YouTube (yt-dlp - NO API QUOTA!)
    → Collect ~30-50 candidate video IDs
    ↓
[4] Enrich Videos (YouTube API videos.list - CHEAP!)
    → Bulk fetch: views, likes, comments, duration, metadata
    → Calculate engagement scores
    → Only 1 quota unit per request!
    ↓
[5] Deep Analysis (Top N videos)
    → Fetch transcripts (youtube-transcript-api)
    → LLM scoring: route_match, actionability, authenticity
    ↓
[6] Generate Report
    → Comprehensive analysis saved to .txt file
```

## Output

The pipeline generates a timestamped report file:
```
analysis_Goa_to_Kanyakumari_20260221_143022.txt
```

Report includes:
- Parsed travel intent
- Search queries used
- Summary statistics
- Top 10 recommended videos with scores
- All candidate videos ranked by engagement

## Project Structure

```
tbo-ai-compass/
├── youtube_pipeline.py    # Main pipeline orchestrator
├── metrics.py            # Engagement metrics calculator
├── test1.py              # Transcript fetcher
├── ytdlp_search.py       # Alternative search (yt-dlp)
├── requirements.txt      # Python dependencies
├── .env                  # API keys (not in git)
├── instructions.md       # Project overview
└── README.md            # This file
```

## API Quota Considerations

### NEW: Massive Quota Savings with yt-dlp!

This pipeline now uses **yt-dlp for searching** instead of YouTube API, which means:
- **Search cost: 0 quota units** (was 600 units before!)
- **Enrich cost: ~1 unit** (50 videos in bulk)
- **Total per run: ~1-2 units** (was 650+ before!)

You can now run **hundreds of pipelines per day** instead of just 15!

### YouTube Data API v3 Quota
- Daily limit: **10,000 units**
- ~~search.list: **100 units** per request~~ (NOT USED ANYMORE!)
- videos.list: **1 quota unit** per request (ONLY endpoint we use)

### Current Pipeline Cost
```
Search: yt-dlp (0 quota units) ✓
Enrich: 50 videos ÷ 50 batch × 1 = 1 unit ✓
Total: ~1 unit per run (99% quota savings!)
```

You can run **thousands of pipelines per day** with the free quota!

### Why This Works
- `yt-dlp` scrapes YouTube directly (no API needed)
- `videos.list` is extremely cheap (1 unit) and can batch 50 videos
- We only use YouTube API for getting accurate metrics, not searching

### Fallback Options
If yt-dlp fails for any reason:
- Pipeline will warn you and continue with available videos
- You can manually provide video IDs
- Check that yt-dlp is installed: `yt-dlp --version`

## Configuration

Modify these parameters in `youtube_pipeline.py`:

```python
# In YouTubeVideoCollector.search_videos()
max_results_per_query = 10  # Results per search query

# In YouTubePipeline.run()
top_n = 15  # Number of videos to deeply analyze
```

## Example Queries

- "Goa to Kanyakumari road trip in December"
- "Budget travel from Delhi to Manali"
- "Mumbai to Goa coastal route bike trip"
- "Family train journey from Chennai to Bangalore"
- "Solo backpacking trip from Bangalore to Hampi"

## Troubleshooting

**"No transcripts available"**
- Some videos don't have captions/transcripts
- Pipeline will skip scoring for these videos

**"API quota exceeded"**
- Wait for quota reset (daily at midnight Pacific Time)
- Use `ytdlp_search.py` as alternative

**"yt-dlp not found"**
```bash
pip install yt-dlp
```

**"Groq API error"**
- Check GROQ_API_KEY in .env
- Verify Groq account has credits

## Future Enhancements

- [ ] Add support for multiple languages
- [ ] Integrate with weather APIs
- [ ] Extract specific route waypoints
- [ ] Generate visual route maps
- [ ] Export to JSON/CSV formats
- [ ] Web interface (FastAPI backend)
- [ ] Caching layer for search results
- [ ] Multi-modal analysis (thumbnails, video frames)

## License

MIT License

## Contributing

Contributions welcome! Please open an issue or PR.

## Contact

For questions or support, please open an issue on GitHub.
