"""
Alternative YouTube search using yt-dlp
This can be used as a fallback or supplement to YouTube API search
"""

import subprocess
import json
from typing import List, Dict


class YtDlpSearcher:
    """Use yt-dlp to search YouTube without API quota limits"""
    
    @staticmethod
    def search_videos(query: str, max_results: int = 20) -> List[str]:
        """
        Search YouTube using yt-dlp and return video IDs
        
        Args:
            query: Search query string
            max_results: Maximum number of results to return
            
        Returns:
            List of video IDs
        """
        try:
            # yt-dlp command to search YouTube
            cmd = [
                'yt-dlp',
                f'ytsearch{max_results}:{query}',
                '--get-id',
                '--no-warnings',
                '--quiet'
            ]
            
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=30
            )
            
            if result.returncode == 0:
                video_ids = [line.strip() for line in result.stdout.strip().split('\n') if line.strip()]
                return video_ids
            else:
                print(f"yt-dlp search failed: {result.stderr}")
                return []
                
        except subprocess.TimeoutExpired:
            print(f"yt-dlp search timed out for query: {query}")
            return []
        except FileNotFoundError:
            print("yt-dlp not found. Install with: pip install yt-dlp")
            return []
        except Exception as e:
            print(f"yt-dlp search error: {e}")
            return []
    
    @staticmethod
    def get_video_info(video_id: str) -> Dict:
        """
        Get basic video information using yt-dlp
        
        Args:
            video_id: YouTube video ID
            
        Returns:
            Dictionary with video metadata
        """
        try:
            cmd = [
                'yt-dlp',
                f'https://www.youtube.com/watch?v={video_id}',
                '--dump-json',
                '--no-warnings',
                '--quiet'
            ]
            
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=15
            )
            
            if result.returncode == 0:
                data = json.loads(result.stdout)
                return {
                    'video_id': video_id,
                    'title': data.get('title', ''),
                    'channel': data.get('uploader', ''),
                    'duration': data.get('duration', 0),
                    'view_count': data.get('view_count', 0),
                    'like_count': data.get('like_count', 0),
                    'upload_date': data.get('upload_date', ''),
                    'description': data.get('description', '')[:500],
                    'url': data.get('webpage_url', f'https://www.youtube.com/watch?v={video_id}')
                }
            else:
                return None
                
        except Exception as e:
            print(f"Error getting video info for {video_id}: {e}")
            return None


def main():
    """Test yt-dlp search functionality"""
    searcher = YtDlpSearcher()
    
    # Test search
    query = input("Enter search query: ").strip() or "goa to kanyakumari road trip"
    print(f"\nSearching for: {query}")
    
    video_ids = searcher.search_videos(query, max_results=10)
    print(f"\nFound {len(video_ids)} videos:")
    
    for i, vid in enumerate(video_ids[:5], 1):
        print(f"\n{i}. Video ID: {vid}")
        info = searcher.get_video_info(vid)
        if info:
            print(f"   Title: {info['title'][:60]}")
            print(f"   Channel: {info['channel']}")
            print(f"   Views: {info['view_count']:,}")
            print(f"   Duration: {info['duration']} seconds")


if __name__ == "__main__":
    main()
