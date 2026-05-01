# tensorflow and image imports moved to local methods for performance
import numpy as np
import os
import json
from constants import ISSUE_MAPPING, ELECTRICAL_PREFIXES, PLUMBING_PREFIXES, FURNITURE_PREFIXES, SUB_CATEGORY_MAPPING

class MLHandler:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(MLHandler, cls).__new__(cls)
            print("Initializing MLHandler instance (Lazy Loading Enabled)...")
            cls._instance.model = None
            cls._instance.class_names = {}
            # cls._instance.load_model_and_classes() # Moved to on-demand
        return cls._instance

    def load_model_and_classes(self):
        import tensorflow as tf
        model_path = os.path.join(os.path.dirname(__file__), "../models/service_model.h5")
        indices_path = os.path.join(os.path.dirname(__file__), "../models/class_indices.json")

        print(f"Loading model from: {model_path}")
        if os.path.exists(model_path):
            try:
                self.model = tf.keras.models.load_model(model_path)
                print("✅ Model loaded successfully.")
            except Exception as e:
                print(f"❌ Error loading model: {e}")
                self.model = None
        else:
            print(f"❌ Model file NOT found at: {model_path}")
        
        if os.path.exists(indices_path):
            with open(indices_path, "r") as f:
                indices = json.load(f)
                self.class_names = {v: k for k, v in indices.items()}
            print("Class indices loaded.")

    def normalize_category(self, class_name):
        if class_name in ISSUE_MAPPING:
            return class_name
        if any(class_name.startswith(prefix) for prefix in ELECTRICAL_PREFIXES):
            return "electrical"
        if any(class_name.startswith(prefix) for prefix in PLUMBING_PREFIXES):
            return "plumbing"
        if any(class_name.startswith(prefix) for prefix in FURNITURE_PREFIXES):
            return "furniture"
        return "electrical"

    def predict(self, img_path):
        """
        🟢 Image Model Implementation
        Input: Preprocessed RGB Image (224x224 tensor)
        Process: Preprocessing -> Feature Extraction -> Prediction
        Output: Object Type, Problem Type, Confidence
        """
        import tensorflow as tf
        from tensorflow.keras.preprocessing import image
        
        if self.model is None:
            print("Model not loaded yet. Loading now...")
            self.load_model_and_classes()
            if self.model is None:
                return {"error": "Model could not be loaded"}

        try:
            # Step 1: Preprocessing
            img = image.load_img(img_path, target_size=(224, 224))
            x = image.img_to_array(img)
            x = np.expand_dims(x, axis=0) / 255.0  # Normalize pixels

            # Step 2: Feature Extraction & Prediction
            predictions = self.model.predict(x)
            idx = np.argmax(predictions)
            confidence = float(np.max(predictions))
            
            raw_class = self.class_names.get(idx, "unknown")
            category = self.normalize_category(raw_class)
            
            # Step 3: Mapping to Service Logic
            identified_sub = None
            for key, value in SUB_CATEGORY_MAPPING.items():
                if key in raw_class.lower():
                    identified_sub = value
                    break

            return {
                "success": True,
                "category": category,
                "detected_object": ISSUE_MAPPING.get(category, ISSUE_MAPPING["electrical"])['object'],
                "problem_type": identified_sub,
                "confidence_score": confidence
            }
        except Exception as e:
            print(f"Prediction error: {e}")
            return {"success": False, "error": str(e)}
