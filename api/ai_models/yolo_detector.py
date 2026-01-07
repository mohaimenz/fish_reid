import os
from pathlib import Path
from ultralytics import YOLO
from PIL import Image
import yaml

def get_predictions(image_paths):
    try:
        #load config from yaml
        config_path = Path(__file__).parent / "config.yaml"
        with open(config_path, 'r') as file:
            config = yaml.safe_load(file)   
        model_path = config.get('model_path', 'yolo-v11-n-4.pt')
        model_path = os.path.abspath(os.path.join('ai_models', model_path))
        conf_threshold = config.get('conf_threshold', 0.5)  
        return detect(image_paths, model_path, conf_threshold)
    except Exception as e:
        print(f"Error loading configuration or detecting objects: {e}")
        return []

def detect(image_paths, model_path, conf_threshold=0.5):
    """
    Perform YOLO object detection on a single image. 
    Args:
        image_path (str): Path to the input image.
        model_path (str): Path to the YOLO model file.
        conf_threshold (float): Confidence threshold for filtering detections.
        yolo_model: Pre-loaded YOLO model to use for detection (optional).
    Returns:
        List of detections with bounding box coordinates, class names, and confidence scores.
    """
    #Check image extension
    image_extensions = ['.jpg', '.jpeg', '.png', '.bmp', '.tiff']
    valid_images = []
    for image_path in image_paths:
        if any(image_path.lower().endswith(ext) for ext in image_extensions):
            valid_images.append(image_path)
        else:
            print(f"Warning: {image_path} is not a valid image file and will be skipped.")

    if len(valid_images)>0:
        #Load model once and use for all images
         # Check if model exists
        if not os.path.exists(model_path):
            print(f"Error: Model file not found at {model_path}")
            return []

        # Load YOLO model
        model = YOLO(model_path) # Load model only once if provided to prevent reloading

        # Load all images and get predictions   
        pil_images = [Image.open(img_path).convert("RGB") for img_path in valid_images]
        all_predictions = []
        results = model(pil_images, verbose=False)
        for img_idx, result in enumerate(results):
            detections = []
            for box in result.boxes.data.tolist():
                x1, y1, x2, y2, score, cls = box
                if score >= conf_threshold:
                    # appending x_min, y_min, height, width, class, score
                    detections.append({
                        'x_min': int(x1),
                        'y_min': int(y1),
                        'height': int(y2 - y1),
                        'width': int(x2 - x1),
                        'class_name': int(cls),
                        'confidence': float(score)
                    })
            all_predictions.append({
                'image_path': valid_images[img_idx],
                'detections': detections
            })
        return all_predictions
    else:
        return []
    
if __name__ == "__main__":
    print("Access is restricted. This module is intended to be used as part of a larger application.")
    exit()