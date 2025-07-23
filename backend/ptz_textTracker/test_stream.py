from stream_utils import get_video_capture
import cv2
import sys

if len(sys.argv) < 3:
    print("Usage: python test_stream.py <stream_type> <stream_id>")
    sys.exit(1)

stream_type = sys.argv[1]   # e.g., "youtube" or "webcam"
stream_id = sys.argv[2] if stream_type == "youtube" else None

cap = get_video_capture(stream_type, stream_id)

if not cap or not cap.isOpened():
    print("[ERROR] Failed to open video stream.")
    sys.exit(1)

print("Press 'q' to quit.")
while True:
    ret, frame = cap.read()
    if not ret:
        print("[ERROR] Failed to read frame.")
        break

    cv2.imshow("StreamUtils Test", frame)
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()
