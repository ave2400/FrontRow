# tester file to ensure the connection from JS to Python is working
# PTZvision.py
# will also contain the main logic for imitiating PTZ based on image/video recognition cues through smooth zooming 
import sys

def main():
    if len(sys.argv) < 3:
        print("[PTZvision] Error: Missing streamId or streamType")
        return

    stream_id = sys.argv[1]
    stream_type = sys.argv[2]

    print(f"[PTZvision] Stream ID received: {stream_id}")
    print(f"[PTZvision] Stream Type received: {stream_type}")

    if stream_type.lower() == "youtube":
        full_url = f"https://www.youtube.com/watch?v={stream_id}"
        print(f"[PTZvision] Full YouTube URL: {full_url}")
    elif stream_type.lower() == "zoom":
        print("[PTZvision] Zoom stream detected – using local camera logic")
    else:
        print(f"[PTZvision] Unknown stream type: {stream_type}")

    print("[PTZvision] Supabase -> JS -> Python pipeline test: SUCCESS")

if __name__ == "__main__":
    main()
