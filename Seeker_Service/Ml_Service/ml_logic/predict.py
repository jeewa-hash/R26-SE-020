import tensorflow as tf
import numpy as np
from tensorflow.keras.preprocessing import image
import os
import json

# Paths relative to Backend/ml_logic/
base_dir = os.path.dirname(os.path.abspath(__file__)) + "/.."
model_path = os.path.join(base_dir, "models/service_model.h5")
class_indices_path = os.path.join(base_dir, "models/class_indices.json")

def predict_service(img_path):
    if not os.path.exists(model_path):
        print(f"Error: Model not found at {model_path}")
        return

    # Load Model
    model = tf.keras.models.load_model(model_path)
    
    # Load Class Names
    if os.path.exists(class_indices_path):
        with open(class_indices_path, 'r') as f:
            indices = json.load(f)
            class_names = {v: k for k, v in indices.items()}
    else:
        print("Error: class_indices.json not found.")
        return

    # Load and Preprocess Image
    try:
        img = image.load_img(img_path, target_size=(224, 224))
        img_array = image.img_to_array(img)
        img_array = np.expand_dims(img_array, axis=0) / 255.0

        # Prediction
        predictions = model.predict(img_array)
        idx = np.argmax(predictions)
        confidence = np.max(predictions)
        
        class_name = class_names.get(idx, "Unknown")
        
        print("Target AI PREDICTION RESULT")
        print("="*30)
        print(f"Class Name: {class_name}")
        print(f"Confidence: {confidence*100:.2f}%")
        print("="*30 + "\n")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        predict_service(sys.argv[1])
    else:
        print("Usage: python predict.py <path_to_image>")