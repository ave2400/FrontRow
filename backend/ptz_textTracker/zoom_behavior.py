import cv2
import numpy as np

def smooth_zoom(frame, box, steps=50):
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
        cv2.waitKey(100)  # Slow down to see effect


def apply_zoom_effect(display_window, frames):
    """
    Displays zoom transition frames in a smooth sequence.
    """
    for f in frames:
        cv2.imshow(display_window, f)
        if cv2.waitKey(30) & 0xFF == ord('q'):
            break