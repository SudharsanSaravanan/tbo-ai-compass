<img width="951" height="262" alt="tbo-logo-2-removebg-preview" src="https://github.com/user-attachments/assets/1cbbb68c-5527-439a-a523-a3f1829f8322" />

<br>
<br>

<h1 align="center">Made as part of</h1>

<br>

<p align="center">
  <img 
    width="150" 
    height="150" 
    alt="tbo-hack" 
    src="https://github.com/user-attachments/assets/95df478d-15bd-4f5e-907a-05269a498910" 
  />
</p>


<br>

![Python 3](https://img.shields.io/badge/Python3-3776AB?style=for-the-badge&logo=python&logoColor=white)
![Flask](https://img.shields.io/badge/Flask-000000?style=for-the-badge&logo=flask&logoColor=white)
![Nginx](https://img.shields.io/badge/Nginx-009639?style=for-the-badge&logo=nginx&logoColor=white)
![Tavily](https://img.shields.io/badge/Tavily-FF5500?style=for-the-badge&logo=search&logoColor=white)
![Firecrawl](https://img.shields.io/badge/Firecrawl-7C3AED?style=for-the-badge&logo=apache-couchdb&logoColor=white)

<br />
<h1 align="center">
  <font size="7">TBO AI Compass </font>
</h1>
  <p align="center">
    An Iternary voice agent-driven platform to optimize travel planning and booking. The system intelligently that finds, ranks, and scores travel videos based on route coverage, actionability, and authenticity.
    <br />
    </p>
</p>

<br>

<img width="689" height="86" alt="image" src="https://github.com/user-attachments/assets/f943d093-9cbe-48ae-b8f9-331c5f8cbf3a" />

<br>

<img width="1156" height="658" alt="Screenshot from 2026-03-02 21-10-42" src="https://github.com/user-attachments/assets/66a98b2b-d0ce-4e1f-be5c-e27c4c30eec4" />

<br>
<br>

<img width="666" height="375" alt="Copy_of_mohan-review__6___1_-removebg-preview" src="https://github.com/user-attachments/assets/cec1f8d7-3652-427d-ac0a-294d3e1f293d" />


[![tbo hack Prototype Launch](https://github.com/user-attachments/assets/b7036ec6-c2c6-4f90-a326-043802d25fa4)](https://www.youtube.com/watch?v=0gf3DK1YHXY)


<br>

<img width="691" height="73" alt="image" src="https://github.com/user-attachments/assets/79c56e79-f725-4847-b60f-8cea07d184ef" />

<img width="1185" height="595" alt="image" src="https://github.com/user-attachments/assets/4ef5d260-12f1-4a56-b199-04f04b6ad780" />
<img width="1184" height="380" alt="image" src="https://github.com/user-attachments/assets/9256c6f5-a35b-476b-9a6e-606dcfa6a6ae" />
<img width="1193" height="643" alt="image" src="https://github.com/user-attachments/assets/43b13513-54c3-4169-a9de-faf096bae7cf" />


<br>

# Features

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

<br>


------

![Material wave loading](https://github.com/user-attachments/assets/a08255eb-9647-471d-9881-61871332249f)



### Developed with ❤️ by [Sai Nivedh](https://github.com/SaiNIvedh26) ,  [Swetha](https://github.com/SWETHACS17) and  [Sudharshan Saravanan](https://github.com/SudharsanSaravanan)

