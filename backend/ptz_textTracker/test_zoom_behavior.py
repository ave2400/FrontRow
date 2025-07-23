import cv2
from zoom_behavior import smooth_zoom
from text_detection import get_text_bounding_box, load_east_model

net = load_east_model()
cap = cv2.VideoCapture(0)

detected = False

while True:
    ret, frame = cap.read()
    if not ret:
        print("[ERROR] Failed to grab frame.")
        break

    if not detected:
        box = get_text_bounding_box(frame, net)
        if box:
            print("[INFO] Text detected, starting zoom.")
            # Draw box on frame for debugging
            (x1, y1, x2, y2) = box
            cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
            cv2.imshow("Detected Box", frame)
            cv2.waitKey(1000)  # Pause 1 sec to view box
    
            smooth_zoom(frame, box)
            detected = True


    # Just show the normal feed while waiting
    cv2.imshow("Live Feed", frame)

    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()
