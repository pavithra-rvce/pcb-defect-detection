import sys
import json
from ultralytics import YOLO

# Ensure image path is provided
if len(sys.argv) < 2:
    print(json.dumps({"error": "No image path provided"}))
    sys.exit(1)

image_path = sys.argv[1]

# Load trained YOLOv8 model (assume model is in same directory)
model = YOLO("best.pt")  # Make sure 'best.pt' is in the same folder as this script

# Run prediction
results = model(image_path)

# Extract predictions
predictions = []

for result in results:
    for box in result.boxes:
        class_id = int(box.cls[0])
        confidence = float(box.conf[0])
        label = model.names[class_id]
        bbox = box.xyxy[0].tolist()  # [x1, y1, x2, y2]

        predictions.append({
            "class": label,
            "confidence": round(confidence, 3),
            "bbox": [round(coord, 2) for coord in bbox]
        })

# Output JSON string
print(json.dumps({"defects": predictions}))
