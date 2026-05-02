# tensorflow and image imports moved to local methods for performance
import numpy as np
import os
import json
from constants import ISSUE_MAPPING, ELECTRICAL_PREFIXES, PLUMBING_PREFIXES, FURNITURE_PREFIXES, SUB_CATEGORY_MAPPING

GENERIC_CLASSES = {"Electrical_Repair", "Furniture_Repair", "Plumbing"}


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

    def _infer_category_from_label(self, class_name):
        if class_name == "Electrical_Repair" or any(class_name.startswith(prefix) for prefix in ELECTRICAL_PREFIXES):
            return "electrical"
        if class_name == "Plumbing" or any(class_name.startswith(prefix) for prefix in PLUMBING_PREFIXES):
            return "plumbing"
        if class_name == "Furniture_Repair" or any(class_name.startswith(prefix) for prefix in FURNITURE_PREFIXES):
            return "furniture"
        return None

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
            probs = predictions[0]

            ranked_indices = np.argsort(probs)[::-1]
            top_idx = int(ranked_indices[0])
            top_class = self.class_names.get(top_idx, "unknown")
            top_prob = float(probs[top_idx])

            # Category-first selection:
            # 1) Sum probabilities by service category.
            # 2) Choose the best category.
            # 3) Pick the best class from that category, preferring specific labels.
            category_scores = {"electrical": 0.0, "plumbing": 0.0, "furniture": 0.0}
            for idx, prob in enumerate(probs):
                class_name = self.class_names.get(int(idx), "unknown")
                cat = self._infer_category_from_label(class_name)
                if cat in category_scores:
                    category_scores[cat] += float(prob)

            category = max(category_scores, key=category_scores.get)

            selected_idx = top_idx
            selected_class = top_class
            selected_prob = top_prob

            best_specific_idx = None
            best_specific_prob = -1.0
            best_generic_idx = None
            best_generic_prob = -1.0

            for idx in ranked_indices:
                class_name = self.class_names.get(int(idx), "unknown")
                prob = float(probs[int(idx)])
                class_cat = self._infer_category_from_label(class_name)
                if class_cat != category:
                    continue

                if class_name in GENERIC_CLASSES:
                    if prob > best_generic_prob:
                        best_generic_prob = prob
                        best_generic_idx = int(idx)
                else:
                    if prob > best_specific_prob:
                        best_specific_prob = prob
                        best_specific_idx = int(idx)

            if best_specific_idx is not None:
                selected_idx = best_specific_idx
                selected_class = self.class_names.get(best_specific_idx, "unknown")
                selected_prob = float(probs[best_specific_idx])
            elif best_generic_idx is not None:
                selected_idx = best_generic_idx
                selected_class = self.class_names.get(best_generic_idx, "unknown")
                selected_prob = float(probs[best_generic_idx])

            raw_class = selected_class
            confidence = selected_prob
            
            # Step 3: Mapping to Service Logic
            identified_sub = None
            for key, value in SUB_CATEGORY_MAPPING.items():
                if key in raw_class.lower():
                    identified_sub = value
                    break

            return {
                "success": True,
                "category": category,
                "detected_object": identified_sub if identified_sub else ISSUE_MAPPING.get(category, {}).get('object', 'Item'),
                "problem_type": identified_sub,
                "confidence_score": confidence,
                "raw_class": raw_class,
                "category_scores": category_scores
            }
        except Exception as e:
            print(f"Prediction error: {e}")
            return {"success": False, "error": str(e)}
