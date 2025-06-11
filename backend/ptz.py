import sys
import subprocess
import json
import cv2
import numpy as np
import time

EAST_MODEL_PATH = "models/frozen_east_text_detection.pb"
net = cv2.dnn.readNet(EAST_MODEL_PATH)
CONFIDENCE_THRESHOLD = 0.5

def get_youtube_stream_url(youtube_id):
    full_url = f"https://www.youtube.com/watch?v={youtube_id}"
    try:
        result = subprocess.run(
            ['streamlink', '--default-stream=best', '-j', full_url],
            capture_output=True, text=True, check=True
        )
        stream_info = json.loads(result.stdout)
        return stream_info['url']
    except Exception as e:
        print(f"[ERROR] Streamlink failed: {e}")
        return None

def get_video_source(source_type, stream_id=None):
    if source_type == 'youtube' and stream_id:
        return get_youtube_stream_url(stream_id)
    else:
        return 0  # Webcam

def decode_predictions(scores, geometry):
    rects = []
    confidences = []
    for y in range(0, scores.shape[2]):
        scores_data = scores[0, 0, y]
        x0_data = geometry[0, 0, y]
        x1_data = geometry[0, 1, y]
        x2_data = geometry[0, 2, y]
        x3_data = geometry[0, 3, y]
        angles_data = geometry[0, 4, y]
        for x in range(0, scores.shape[3]):
            if scores_data[x] < CONFIDENCE_THRESHOLD:
                continue
            angle = angles_data[x]
            cos = np.cos(angle)
            sin = np.sin(angle)
            h = x0_data[x] + x2_data[x]
            w = x1_data[x] + x3_data[x]
            offset_x = x * 4.0
            offset_y = y * 4.0
            end_x = int(offset_x + cos * x1_data[x] + sin * x2_data[x])
            end_y = int(offset_y - sin * x1_data[x] + cos * x2_data[x])
            start_x = int(end_x - w)
            start_y = int(end_y - h)
            rects.append((start_x, start_y, end_x, end_y))
            confidences.append(float(scores_data[x]))
    return rects, confidences

def detect_and_aggregate_text_box(frame):
    orig = frame.copy()
    (H, W) = frame.shape[:2]
    newW, newH = 320, 320
    rW, rH = W / float(newW), H / float(newH)

    frame_resized = cv2.resize(frame, (newW, newH))
    blob = cv2.dnn.blobFromImage(frame_resized, 1.0, (newW, newH),
                                 (123.68, 116.78, 103.94), swapRB=True, crop=False)
    net.setInput(blob)
    (scores, geometry) = net.forward([
        "feature_fusion/Conv_7/Sigmoid",
        "feature_fusion/concat_3"
    ])

    (rects, confidences) = decode_predictions(scores, geometry)
    indices = cv2.dnn.NMSBoxes(rects, confidences, 0.5, 0.4)

    if indices is None or len(indices) == 0:
        return None

    x_min, y_min, x_max, y_max = W, H, 0, 0
    for i in indices:
        i = i[0] if isinstance(i, (list, tuple, np.ndarray)) else i
        (startX, startY, endX, endY) = rects[i]
        startX = int(startX * rW)
        startY = int(startY * rH)
        endX = int(endX * rW)
        endY = int(endY * rH)
        x_min, y_min = min(x_min, startX), min(y_min, startY)
        x_max, y_max = max(x_max, endX), max(y_max, endY)

    return (x_min, y_min, x_max, y_max)

def wait_and_aggregate(cap, delay=1.5, max_frames=15):
    """
    Waits a few frames to allow full text to appear before aggregating.
    """
    aggregate_box = None
    start_time = time.time()
    frame_count = 0

    while time.time() - start_time < delay and frame_count < max_frames:
        ret, frame = cap.read()
        if not ret:
            break
        box = detect_and_aggregate_text_box(frame)
        if box:
            if not aggregate_box:
                aggregate_box = box
            else:
                x1 = min(aggregate_box[0], box[0])
                y1 = min(aggregate_box[1], box[1])
                x2 = max(aggregate_box[2], box[2])
                y2 = max(aggregate_box[3], box[3])
                aggregate_box = (x1, y1, x2, y2)
        frame_count += 1
        time.sleep(0.05)  # simulate time for more text to appear
    return aggregate_box

def smooth_zoom(frame, box, steps=20):
    (h, w) = frame.shape[:2]
    (x1, y1, x2, y2) = box
    for step in range(1, steps + 1):
        alpha = step / steps
        ix1 = int((1 - alpha) * 0 + alpha * x1)
        iy1 = int((1 - alpha) * 0 + alpha * y1)
        ix2 = int((1 - alpha) * w + alpha * x2)
        iy2 = int((1 - alpha) * h + alpha * y2)
        cropped = frame[iy1:iy2, ix1:ix2]
        if cropped.size == 0:
            continue
        zoomed = cv2.resize(cropped, (w, h))
        cv2.imshow("Smooth Zoom", zoomed)
        if cv2.waitKey(30) & 0xFF == ord('q'):
            break

def main():
    if len(sys.argv) < 2:
        print("Usage: python ptz.py <source_type> [stream_id]")
        sys.exit(1)

    source_type = sys.argv[1]
    stream_id = sys.argv[2] if len(sys.argv) > 2 else None
    video_source = get_video_source(source_type, stream_id)

    cap = cv2.VideoCapture(video_source)
    if not cap.isOpened():
        print("[ERROR] Failed to open video source.")
        sys.exit(1)

    print("Press 'q' to quit.")
    last_zoom_time = 0
    current_box = None

    while True:
        ret, frame = cap.read()
        if not ret:
            print("[ERROR] Failed to read frame.")
            break

        now = time.time()

        if current_box is None or now - last_zoom_time > 10:
            new_box = wait_and_aggregate(cap)
            if new_box:
                current_box = new_box
                last_zoom_time = now
                print("[INFO] New text detected, zooming in.")
                smooth_zoom(frame, current_box)
            else:
                current_box = None  # No text found, reset

        display = frame if current_box is None else cv2.resize(
            frame[current_box[1]:current_box[3], current_box[0]:current_box[2]], frame.shape[:2][::-1]
        )
        cv2.imshow("PTZ Live", display)

        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    main()
