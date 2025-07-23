import cv2
import numpy as np

CONFIDENCE_THRESHOLD = 0.5
WIDTH, HEIGHT = 320, 320  # EAST model input dimensions


def load_east_model(model_path="models/frozen_east_text_detection.pb"):
    net = cv2.dnn.readNet(model_path)
    return net


def decode_predictions(scores, geometry):
    rects = []
    confidences = []
    for y in range(scores.shape[2]):
        scores_data = scores[0, 0, y]
        x0 = geometry[0, 0, y]
        x1 = geometry[0, 1, y]
        x2 = geometry[0, 2, y]
        x3 = geometry[0, 3, y]
        angles = geometry[0, 4, y]

        for x in range(scores.shape[3]):
            if scores_data[x] < CONFIDENCE_THRESHOLD:
                continue

            angle = angles[x]
            cos = np.cos(angle)
            sin = np.sin(angle)

            h = x0[x] + x2[x]
            w = x1[x] + x3[x]
            offset_x = x * 4.0
            offset_y = y * 4.0

            end_x = int(offset_x + cos * x1[x] + sin * x2[x])
            end_y = int(offset_y - sin * x1[x] + cos * x2[x])
            start_x = int(end_x - w)
            start_y = int(end_y - h)

            rects.append((start_x, start_y, end_x, end_y))
            confidences.append(float(scores_data[x]))

    return rects, confidences


def aggregate_boxes(boxes):
    if not boxes:
        return None

    x_min = min([box[0] for box in boxes])
    y_min = min([box[1] for box in boxes])
    x_max = max([box[2] for box in boxes])
    y_max = max([box[3] for box in boxes])

    return (x_min, y_min, x_max, y_max)


def get_text_bounding_box(frame, net):
    orig = frame.copy()
    (H, W) = orig.shape[:2]

    rW, rH = W / float(WIDTH), H / float(HEIGHT)
    resized = cv2.resize(orig, (WIDTH, HEIGHT))
    blob = cv2.dnn.blobFromImage(resized, 1.0, (WIDTH, HEIGHT),
                                 (123.68, 116.78, 103.94), swapRB=True, crop=False)

    net.setInput(blob)
    (scores, geometry) = net.forward([
        "feature_fusion/Conv_7/Sigmoid",
        "feature_fusion/concat_3"
    ])

    rects, confidences = decode_predictions(scores, geometry)
    indices = cv2.dnn.NMSBoxes(rects, confidences, 0.5, 0.4)

    if indices is None or len(indices) == 0:
        return None

    filtered_boxes = []
    for i in indices:
        idx = i[0] if isinstance(i, (list, tuple, np.ndarray)) else i
        (startX, startY, endX, endY) = rects[idx]
        # Scale back to original frame size
        filtered_boxes.append((
            int(startX * rW), int(startY * rH),
            int(endX * rW), int(endY * rH)
        ))

    return aggregate_boxes(filtered_boxes)
