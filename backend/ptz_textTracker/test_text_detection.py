import cv2
from text_detection import load_east_model, get_text_bounding_box

def main():
    print("[INFO] Loading EAST model...")
    net = load_east_model("models/frozen_east_text_detection.pb")

    cap = cv2.VideoCapture(0)  # Change to video file or stream if needed
    if not cap.isOpened():
        print("[ERROR] Could not open webcam.")
        return

    print("[INFO] Press 'q' to quit.")
    while True:
        ret, frame = cap.read()
        if not ret:
            break

        box = get_text_bounding_box(frame, net)
        if box:
            (x1, y1, x2, y2) = box
            cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
            cv2.putText(frame, "Text Detected", (x1, y1 - 10),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)

        cv2.imshow("Text Detection Test", frame)

        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    main()
