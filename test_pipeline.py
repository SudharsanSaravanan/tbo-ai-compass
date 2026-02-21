"""
Quick demo/test script for YouTube Pipeline
Tests individual components before running full pipeline
"""

import os
from dotenv import load_dotenv

load_dotenv()

def check_environment():
    """Check if API keys are configured"""
    print("🔍 Checking environment configuration...\n")
    
    google_key = os.getenv("GOOGLE_API_KEY")
    groq_key = os.getenv("GROQ_API_KEY")
    
    if google_key and google_key != "your_google_api_key_here":
        print("✓ GOOGLE_API_KEY is set")
    else:
        print("✗ GOOGLE_API_KEY is missing or not configured")
        print("  Add to .env file: GOOGLE_API_KEY=your_key_here")
    
    if groq_key and groq_key != "your_groq_api_key_here":
        print("✓ GROQ_API_KEY is set")
    else:
        print("✗ GROQ_API_KEY is missing or not configured")
        print("  Add to .env file: GROQ_API_KEY=your_key_here")
    
    return bool(google_key and groq_key)


def test_query_parser():
    """Test query parsing with Groq"""
    print("\n" + "="*70)
    print("TEST: Query Parsing")
    print("="*70)
    
    try:
        from youtube_pipeline import TravelQueryParser
        
        parser = TravelQueryParser()
        test_query = "I want to go from Mumbai to Goa on a budget road trip in March"
        
        print(f"\nInput: {test_query}")
        result = parser.parse_query(test_query)
        
        print("\nParsed Intent:")
        for key, value in result.items():
            print(f"  {key}: {value}")
        
        return True
        
    except Exception as e:
        print(f"\n✗ Error: {e}")
        return False


def test_search_query_generation():
    """Test search query generation"""
    print("\n" + "="*70)
    print("TEST: Search Query Generation")
    print("="*70)
    
    try:
        from youtube_pipeline import SearchQueryGenerator
        
        generator = SearchQueryGenerator()
        
        mock_intent = {
            'origin': 'Mumbai',
            'destination': 'Goa',
            'travel_style': 'road trip',
            'raw_query': 'Mumbai to Goa road trip'
        }
        
        queries = generator.generate_queries(mock_intent, num_queries=5)
        
        print(f"\nGenerated {len(queries)} search queries:")
        for i, q in enumerate(queries, 1):
            print(f"  {i}. {q}")
        
        return True
        
    except Exception as e:
        print(f"\n✗ Error: {e}")
        return False


def test_youtube_search():
    """Test YouTube API search"""
    print("\n" + "="*70)
    print("TEST: YouTube Search")
    print("="*70)
    
    try:
        from youtube_pipeline import YouTubeVideoCollector
        
        collector = YouTubeVideoCollector()
        
        test_queries = ["mumbai to goa road trip vlog"]
        print(f"\nSearching for: {test_queries[0]}")
        
        video_ids = collector.search_videos(test_queries, max_results_per_query=5)
        
        print(f"\nFound {len(video_ids)} videos:")
        for i, vid in enumerate(video_ids[:3], 1):
            print(f"  {i}. {vid}")
        
        if video_ids:
            print(f"\nEnriching first video...")
            enriched = collector.enrich_videos([video_ids[0]])
            
            if enriched:
                video = enriched[0]
                print(f"\nTitle: {video['title']}")
                print(f"Channel: {video['channel']}")
                print(f"Views: {video['view_count']:,}")
                print(f"Engagement: {video['engagement_score']}")
        
        return True
        
    except Exception as e:
        print(f"\n✗ Error: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_transcript_fetch():
    """Test transcript fetching"""
    print("\n" + "="*70)
    print("TEST: Transcript Fetching")
    print("="*70)
    
    try:
        from youtube_pipeline import TranscriptFetcher
        
        fetcher = TranscriptFetcher()
        
        # Use a known video with transcript (example)
        test_video_id = "dQw4w9WgXcQ"  # Replace with actual travel video
        
        print(f"\nFetching transcript for video: {test_video_id}")
        transcript = fetcher.fetch_transcript(test_video_id)
        
        if transcript:
            print(f"\n✓ Transcript fetched: {len(transcript)} characters")
            print(f"  Preview: {transcript[:200]}...")
        else:
            print("\n⚠ No transcript available for this video")
        
        return True
        
    except Exception as e:
        print(f"\n✗ Error: {e}")
        return False


def run_mini_pipeline():
    """Run a minimal version of the pipeline"""
    print("\n" + "="*70)
    print("MINI PIPELINE TEST")
    print("="*70)
    
    try:
        from youtube_pipeline import YouTubePipeline
        
        pipeline = YouTubePipeline()
        
        test_query = "Mumbai to Goa road trip"
        print(f"\nQuery: {test_query}")
        print("\nRunning mini pipeline (top 3 videos only)...\n")
        
        results = pipeline.run(test_query, top_n=3)
        
        print("\n✓ Mini pipeline completed successfully!")
        print(f"  Report: {results['report_path']}")
        
        return True
        
    except Exception as e:
        print(f"\n✗ Error: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    print("\n" + "="*70)
    print("YOUTUBE PIPELINE - COMPONENT TESTS")
    print("="*70 + "\n")
    
    # Check environment
    if not check_environment():
        print("\n⚠ Please configure API keys in .env file before running tests")
        return
    
    print("\nChoose test to run:")
    print("1. Query Parsing (Groq)")
    print("2. Search Query Generation (Groq)")
    print("3. YouTube Search & Enrichment")
    print("4. Transcript Fetching")
    print("5. Run Mini Pipeline (3 videos)")
    print("6. Run All Tests")
    print("0. Exit")
    
    choice = input("\nEnter choice (0-6): ").strip()
    
    tests = {
        '1': test_query_parser,
        '2': test_search_query_generation,
        '3': test_youtube_search,
        '4': test_transcript_fetch,
        '5': run_mini_pipeline,
    }
    
    if choice == '6':
        # Run all tests
        for i in range(1, 6):
            if not tests[str(i)]():
                print(f"\n⚠ Test {i} failed, stopping...")
                break
    elif choice in tests:
        tests[choice]()
    elif choice == '0':
        print("Exiting...")
    else:
        print("Invalid choice")
    
    print("\n" + "="*70)
    print("TESTS COMPLETE")
    print("="*70 + "\n")


if __name__ == "__main__":
    main()
