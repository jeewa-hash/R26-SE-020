"""
predictor.py — Streamlined Multi-Image Service Intelligence Pipeline (~200 lines)

Combines:
  1. ResNet50 + DBSCAN          → Background feature matching & room clustering
  2. YOLOv8                     → Physical object detection
  3. EfficientNetB0             → Service classification & 3-layer rejection gate
  4. CLIP Engine                → Work stage identification (Before / Processing / After)
"""

import json
import os
import numpy as np
import tensorflow as tf
import torch
from PIL import Image
from sklearn.cluster import DBSCAN
from sklearn.metrics.pairwise import cosine_similarity
from torchvision import models, transforms
from ultralytics import YOLO

# ─── Config & Stage Definitions ─────────────────────────────────────────────

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.getenv("MODEL_DIR", os.path.join(BASE_DIR, "saved"))
CONFIDENCE_THRESHOLD = 0.55
ENTROPY_THRESHOLD = 0.80

STAGE_DESCRIPTIONS = [
    "damaged dirty uncleaned surface before service work started",
    "active work in progress with technician tools or cleaning equipment present",
    "clean restored repaired completed service after work finished"
]
STAGE_LABELS = ["before", "processing", "after"]

# ─── 1. Background Feature Extractor ──────────────────────────────────────────

class BackgroundMatcher:
    """Extracts spatial embeddings to cluster images taken in the same room/background."""
    
    def __init__(self):
        resnet = models.resnet50(pretrained=True)
        self.encoder = torch.nn.Sequential(*list(resnet.children())[:-1])
        self.encoder.eval()
        self.transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        ])

    def extract_vector(self, image_path: str) -> np.ndarray:
        img = Image.open(image_path).convert("RGB")
        tensor = self.transform(img).unsqueeze(0)
        with torch.no_grad():
            feat = self.encoder(tensor).flatten().numpy()
        return feat / np.linalg.norm(feat)

    def group_by_background(self, image_paths: list, similarity_threshold: float = 0.82) -> dict:
        if not image_paths:
            return {}
        vectors = np.array([self.extract_vector(p) for p in image_paths])
        sim_matrix = cosine_similarity(vectors)
        distance_matrix = np.clip(1.0 - sim_matrix, 0, None)
        clustering = DBSCAN(eps=1.0 - similarity_threshold, min_samples=1, metric="precomputed").fit(distance_matrix)
        
        groups = {}
        for idx, cluster_id in enumerate(clustering.labels_):
            groups.setdefault(int(cluster_id), []).append(image_paths[idx])
        return groups

# ─── 2. Object & Stage Detector ───────────────────────────────────────────────

class ObjectAndStageDetector:
    """Detects physical objects (YOLO) and predicts work stage (CLIP)."""

    def __init__(self, clip_model=None, clip_processor=None):
        self.yolo = YOLO("yolov8n.pt")
        self.clip_model = clip_model
        self.clip_processor = clip_processor

    def analyze(self, image_path: str) -> dict:
        # YOLO Object Detection
        results = self.yolo(image_path, verbose=False)[0]
        detected_objects = [
            results.names[int(box.cls[0])]
            for box in results.boxes if float(box.conf[0]) > 0.4
        ]

        # CLIP Stage Detection
        stage, stage_conf = "unknown", 0.0
        if self.clip_model and self.clip_processor:
            try:
                img = Image.open(image_path).convert("RGB")
                inputs = self.clip_processor(text=STAGE_DESCRIPTIONS, images=img, return_tensors="pt", padding=True)
                with torch.no_grad():
                    probs = self.clip_model(**inputs).logits_per_image.softmax(dim=1)[0]
                best_idx = int(probs.argmax())
                stage = STAGE_LABELS[best_idx]
                stage_conf = round(float(probs[best_idx]) * 100, 1)
            except Exception as e:
                print(f"⚠️ Stage prediction error: {e}")

        return {
            "detected_objects": list(set(detected_objects)),
            "stage": stage,
            "stage_confidence": stage_conf
        }

# ─── 3. Main Service Predictor ────────────────────────────────────────────────

class ServicePredictor:
    def __init__(self, model_dir: str = MODEL_DIR):
        # Load EfficientNet model
        keras_path = os.path.join(model_dir, "service_classifier.keras")
        self.model = tf.keras.models.load_model(keras_path)

        with open(os.path.join(model_dir, "class_names.json")) as f:
            self.class_names = json.load(f)
        with open(os.path.join(model_dir, "category_map.json")) as f:
            self.category_map = json.load(f)

        # Initialize sub-modules
        self.matcher = BackgroundMatcher()
        
        # Load shared CLIP model
        try:
            from transformers import CLIPModel, CLIPProcessor
            self.clip_model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32")
            self.clip_processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")
        except Exception:
            self.clip_model, self.clip_processor = None, None

        self.detector = ObjectAndStageDetector(self.clip_model, self.clip_processor)

    def _compute_entropy(self, probs: np.ndarray) -> float:
        probs = np.clip(probs, 1e-9, 1.0)
        return float(-np.sum(probs * np.log(probs)) / np.log(len(probs)))

    def predict_single(self, image_path: str) -> dict:
        """Inference & rejection gate for a single image."""
        img = Image.open(image_path).convert("RGB").resize((224, 224))
        arr = np.expand_dims(np.array(img, dtype=np.float32), axis=0)
        probs = self.model.predict(arr, verbose=0)[0]

        top_idx = int(np.argmax(probs))
        top_conf = float(probs[top_idx])
        service = self.class_names[top_idx]
        entropy = self._compute_entropy(probs)
        meta = self.category_map.get(service, {"category": "unknown", "label": service})

        # Rejection Gate
        rejected = service == "other" or top_conf < CONFIDENCE_THRESHOLD or entropy > ENTROPY_THRESHOLD
        reason = None
        if rejected:
            if service == "other": reason = "Irrelevant image."
            elif top_conf < CONFIDENCE_THRESHOLD: reason = "Low confidence prediction."
            else: reason = "Model prediction highly uncertain."

        analysis = self.detector.analyze(image_path)

        return {
            "image_path": image_path,
            "rejected": rejected,
            "rejection_reason": reason,
            "service": service if not rejected else "other",
            "label": meta["label"] if not rejected else "Irrelevant Image",
            "category": meta["category"] if not rejected else "unknown",
            "confidence": round(top_conf * 100, 1),
            "entropy": round(entropy, 3),
            "detected_objects": analysis["detected_objects"],
            "stage": analysis["stage"],
            "stage_confidence": analysis["stage_confidence"]
        }

    def predict_batch(self, image_paths: list) -> dict:
        """Groups batch images by background and orders chronologically."""
        if not image_paths:
            return {"error": "No images provided", "sessions": []}

        clusters = self.matcher.group_by_background(image_paths)
        stage_order = {"before": 0, "processing": 1, "after": 2, "unknown": 3}
        sessions = []

        for cluster_id, paths in clusters.items():
            session_images = [self.predict_single(p) for p in paths]
            session_images.sort(key=lambda x: stage_order.get(x["stage"], 3))

            valid_images = [img for img in session_images if not img["rejected"]]
            primary_label = valid_images[0]["label"] if valid_images else "Irrelevant"
            primary_cat = valid_images[0]["category"] if valid_images else "unknown"

            sessions.append({
                "session_id": f"room_session_{cluster_id + 1}",
                "primary_service": primary_label,
                "category": primary_cat,
                "total_images": len(session_images),
                "valid_images": len(valid_images),
                "sequence": session_images
            })

        return {
            "total_uploaded_images": len(image_paths),
            "total_room_sessions": len(sessions),
            "sessions": sessions
        }