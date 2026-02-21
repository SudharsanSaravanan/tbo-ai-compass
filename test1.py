from youtube_transcript_api import YouTubeTranscriptApi
import re
import sys

def extract_video_id(url):
    match = re.search(r'(?:v=|\/)([0-9A-Za-z_-]{11}).*', url)
    if match:
        return match.group(1)
    raise ValueError("Invalid YouTube URL")

def format_time(seconds):
    mins = int(seconds) // 60
    secs = seconds % 60
    return f"{mins:02d}:{secs:05.2f}"

def main():
    if len(sys.argv) > 1:
        url = sys.argv[1]
    else:
        url = input("Enter YouTube URL: ").strip()

    try:
        video_id = extract_video_id(url)
        ytt_api = YouTubeTranscriptApi()

        # List all available transcripts
        transcript_list = ytt_api.list(video_id)

        # Iterate and pick the first available transcript (any language)
        transcript = None
        for t in transcript_list:
            transcript = t
            break

        if transcript is None:
            raise ValueError("No transcripts available for this video.")

        fetched = transcript.fetch()

        print(f"\nTranscript for: {url}")
        print(f"Language : {transcript.language} [{transcript.language_code}]")
        print(f"Generated: {transcript.is_generated}")
        print(f"Snippets : {len(fetched)}\n")
        print(f"{'Timestamp':<12} {'Duration':<10} Text")
        print("-" * 70)
        for snippet in fetched:
            print(f"{format_time(snippet.start):<12} {snippet.duration:<10.2f} {snippet.text}")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()
