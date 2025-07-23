import subprocess
import json
import cv2

def get_youtube_stream_url(youtube_id):
    full_url = f"https://www.youtube.com/watch?v={youtube_id}"
    try:
        result = subprocess.run(
            ['streamlink', '--default-stream=best', '-j', full_url],
            capture_output=True, text=True, check=True
        )
        stream_info = json.loads(result.stdout)
        return stream_info['streams']['best']['url']  # <-- This is the key fix
    except Exception as e:
        print(f"[ERROR] Streamlink failed: {e}")
        return None

def get_video_capture(source_type, stream_id=None):
    """Returns a cv2.VideoCapture object based on the source type."""
    if source_type == 'youtube' and stream_id:
        video_url = get_youtube_stream_url(stream_id)
        if video_url:
            return cv2.VideoCapture(video_url)
        else:
            return None
    else:
        return cv2.VideoCapture(0)