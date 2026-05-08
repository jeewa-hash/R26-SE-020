"""
predictor.py — Inference engine for the service image classifier.

Usage:
    from model.predictor import ServicePredictor
    predictor = ServicePredictor()
    results = predictor.predict_batch(["img1.jpg", "img2.jpg"])
"""

import json
import os
import numpy as np
import tensorflow as tf
from PIL import Image

MODEL_DIR = r"E:\4th year\semester 1\Research\R26-SE-020\Provider_Service\ML_Engine\src\saved"

# ─── Service Tag Library ────────────────────────────────────────────────────────
# Descriptive quality/portfolio tags generated per service type

SERVICE_TAGS = {
    "electrical_repair": [
        "wiring", "circuit work", "electrical panel", "fixture installation",
        "fault diagnosis", "safety compliance", "indoor electrics",
    ],
    "plumbing_repair": [
        "pipe fitting", "leak repair", "drainage", "water pressure fix",
        "tap replacement", "bathroom plumbing", "pipe insulation",
    ],
    "furniture_repair": [
        "wood restoration", "upholstery", "hinge replacement", "refinishing",
        "scratch repair", "assembly", "structural fix",
    ],
    "roofing_repair": [
        "tile replacement", "leak sealing", "gutter work", "waterproofing",
        "ridge repair", "flat roof", "storm damage repair",
    ],
    "painting_renovation": [
        "interior painting", "exterior painting", "surface prep", "wall finishing",
        "colour consultation", "primer coat", "decorative finish",
    ],
    "house_cleaning": [
        "deep clean", "kitchen cleaning", "bathroom sanitation", "floor mopping",
        "dusting", "window cleaning", "odour removal",
    ],
    "post_construction_cleaning": [
        "debris removal", "dust clearance", "window wipe-down", "grout cleaning",
        "paint splatter removal", "final polish", "handover-ready finish",
    ],
    "move_in_out_cleaning": [
        "end-of-tenancy clean", "appliance clean", "wall washing", "carpet cleaning",
        "full property clean", "key-handover standard", "deposit protection",
    ],
    "sofa_carpet_curtain_cleaning": [
        "steam cleaning", "stain removal", "fabric care", "deodorising",
        "upholstery cleaning", "dry clean method", "allergen removal",
    ],
    "garden_cleaning": [
        "lawn mowing", "weed removal", "hedge trimming", "leaf clearing",
        "garden tidying", "outdoor cleaning", "pathway clearing",
    ],
}

QUALITY_INDICATORS = {
    "high":   {"label": "High Quality",   "color": "green",  "min_conf": 0.80},
    "medium": {"label": "Good Quality",   "color": "amber",  "min_conf": 0.55},
    "low":    {"label": "Needs Review",   "color": "red",    "min_conf": 0.00},
}


class ServicePredictor:
    def __init__(self, model_dir: str = MODEL_DIR):
        model_path    = os.path.join(model_dir, "service_classifier.h5")
        classes_path  = os.path.join(model_dir, "class_names.json")
        category_path = os.path.join(model_dir, "category_map.json")

        if not os.path.exists(model_path):
            raise FileNotFoundError(
                f"Model not found at {model_path}. Run model/train.py first."
            )

        self.model = tf.keras.models.load_model(model_path)

        with open(classes_path)  as f: self.class_names  = json.load(f)
        with open(category_path) as f: self.category_map = json.load(f)

    # ─── Single image ───────────────────────────────────────────────────────────

    def predict(self, image_path: str) -> dict:
        """
        Returns a rich result dict for a single image:
        {
            service, category, label, confidence, quality,
            tags, top3, image_path
        }
        """
        img = self._load_image(image_path)
        probs = self.model.predict(img, verbose=0)[0]

        top_idx  = int(np.argmax(probs))
        top_conf = float(probs[top_idx])
        service  = self.class_names[top_idx]
        meta     = self.category_map[service]
        quality  = self._quality(top_conf)

        top3 = [
            {
                "service":    self.class_names[i],
                "label":      self.category_map[self.class_names[i]]["label"],
                "confidence": round(float(probs[i]) * 100, 1),
            }
            for i in np.argsort(probs)[::-1][:3]
        ]

        return {
            "image_path": image_path,
            "service":    service,
            "label":      meta["label"],
            "category":   meta["category"],
            "confidence": round(top_conf * 100, 1),
            "quality":    quality,
            "tags":       self._select_tags(service, top_conf),
            "top3":       top3,
        }

    # ─── Batch images ───────────────────────────────────────────────────────────

    def predict_batch(self, image_paths: list[str]) -> dict:
        """
        Analyse up to 5 images and return:
        - per-image results
        - portfolio summary (unique services, categories, all tags)
        """
        results = [self.predict(p) for p in image_paths[:5]]

        unique_services = list({r["service"] for r in results})
        unique_labels   = list({r["label"]   for r in results})
        categories      = list({r["category"] for r in results})
        all_tags        = list({
            tag
            for r in results
            for tag in r["tags"]
        })
        avg_conf = round(sum(r["confidence"] for r in results) / len(results), 1)

        return {
            "images":           results,
            "portfolio_summary": {
                "services_detected":  unique_labels,
                "categories":         categories,
                "portfolio_tags":     all_tags,
                "image_count":        len(results),
                "avg_confidence":     avg_conf,
                "overall_quality":    self._quality(avg_conf / 100),
            },
        }

    # ─── Helpers ────────────────────────────────────────────────────────────────

    def _load_image(self, path: str) -> np.ndarray:
        img = Image.open(path).convert("RGB").resize((224, 224))
        arr = np.array(img, dtype=np.float32) / 255.0
        return np.expand_dims(arr, axis=0)

    def _select_tags(self, service: str, confidence: float) -> list[str]:
        all_tags = SERVICE_TAGS.get(service, [])
        # Return more tags for higher confidence predictions
        n = 5 if confidence >= 0.80 else 4 if confidence >= 0.55 else 3
        return all_tags[:n]

    def _quality(self, confidence: float) -> dict:
        for key, val in QUALITY_INDICATORS.items():
            if confidence >= val["min_conf"]:
                return {"key": key, **val}
        return {"key": "low", **QUALITY_INDICATORS["low"]}