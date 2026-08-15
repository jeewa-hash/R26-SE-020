"""
predictor.py — Service classifier + CLIP object detection + irrelevant image rejection

Flow:
    1. EfficientNetB0  → detects service category (or "other" for irrelevant images)
    2. Rejection gate  → rejects if "other" class OR low confidence OR high entropy
    3. CLIP            → auto-detects specific work (e.g. "ceiling fan repair")
    4. Combined output → specific_label + auto tags
"""

import json
import os
import numpy as np
import tensorflow as tf
from PIL import Image

# ─── Config ───────────────────────────────────────────────────────────────────

MODEL_DIR            = r"E:\4th year\semester 1\Research\R26-SE-020\Provider_Service\ML_Engine\src\saved"
CONFIDENCE_THRESHOLD = 0.55     # Below this → rejected even if not "other"
ENTROPY_THRESHOLD    = 0.80     # Above this (normalised) → rejected (model confused)

QUALITY_INDICATORS = {
    "high":   {"label": "High Quality",  "color": "green", "min_conf": 0.80},
    "medium": {"label": "Good Quality",  "color": "amber", "min_conf": 0.55},
    "low":    {"label": "Needs Review",  "color": "red",   "min_conf": 0.00},
}

# ─── CLIP Descriptions per service ────────────────────────────────────────────

CLIP_DESCRIPTIONS = {
    "electrical_repair": [
        "ceiling fan repair or installation",
        "light fixture repair or installation",
        "electrical switch or socket repair",
        "electrical wiring or cable work",
        "circuit breaker or fuse box repair",
        "air conditioner electrical repair",
        "appliance electrical repair",
        "outdoor electrical work",
        "electrical panel installation",
        "general electrical repair work",
    ],
    "plumbing_repair": [
        "kitchen sink repair or installation",
        "bathroom toilet repair",
        "bathtub or shower repair",
        "tap or faucet repair",
        "pipe leak repair",
        "drain cleaning or repair",
        "water heater repair",
        "bathroom plumbing work",
        "outdoor pipe repair",
        "general plumbing repair work",
    ],
    "furniture_repair": [
        "chair repair or restoration",
        "sofa or couch repair",
        "bed frame repair",
        "table or desk repair",
        "cabinet or drawer repair",
        "door hinge or lock repair",
        "wood surface refinishing",
        "upholstery repair",
        "shelf repair or installation",
        "general furniture repair work",
    ],
    "roofing_repair": [
        "roof tile replacement or repair",
        "roof leak sealing",
        "gutter cleaning or repair",
        "roof waterproofing",
        "flat roof repair",
        "ridge or fascia repair",
        "roof inspection work",
        "storm damage roof repair",
        "roof panel installation",
        "general roofing repair work",
    ],
    "painting_renovation": [
        "interior wall painting",
        "exterior house painting",
        "ceiling painting",
        "door or window frame painting",
        "decorative painting or finishing",
        "surface preparation for painting",
        "primer coat application",
        "fence or gate painting",
        "floor painting or coating",
        "general painting renovation work",
    ],
    "house_cleaning": [
        "kitchen deep cleaning",
        "bathroom cleaning and sanitising",
        "floor mopping and vacuuming",
        "window cleaning",
        "bedroom cleaning",
        "living room cleaning",
        "appliance cleaning",
        "cupboard and shelf cleaning",
        "general house cleaning service",
        "full home deep cleaning",
    ],
    "post_construction_cleaning": [
        "construction dust and debris removal",
        "cement or paint splatter cleaning",
        "new bathroom post construction cleaning",
        "window cleaning after construction",
        "floor cleaning after renovation",
        "wall cleaning after construction",
        "handover cleaning after renovation",
        "tile and grout post construction cleaning",
        "general post construction cleaning",
        "after renovation full property clean",
    ],
    "move_in_out_cleaning": [
        "empty house move out cleaning",
        "kitchen move out deep clean",
        "bathroom move out cleaning",
        "bedroom move out cleaning",
        "appliance cleaning for move out",
        "carpet cleaning for move out",
        "wall washing for move out",
        "end of tenancy cleaning",
        "move in property cleaning",
        "vacant property full clean",
    ],
    "sofa_carpet_curtain_cleaning": [
        "sofa steam cleaning",
        "carpet steam cleaning or shampooing",
        "curtain cleaning and pressing",
        "upholstery stain removal",
        "fabric sofa deep cleaning",
        "rug or mat cleaning",
        "mattress cleaning",
        "chair upholstery cleaning",
        "fabric cleaning service",
        "general sofa carpet curtain cleaning",
    ],
    "garden_cleaning": [
        "garden leaf and debris clearing",
        "weed removal from garden",
        "pathway cleaning and clearing",
        "garden waste removal",
        "outdoor area cleaning",
        "lawn edge clearing",
        "hedge trimming and cleanup",
        "garden rubbish removal",
        "outdoor furniture cleaning",
        "general garden cleaning service",
    ],
    "garden_maintenance": [
        "lawn mowing service",
        "hedge and bush trimming",
        "garden watering and care",
        "plant pruning and shaping",
        "weed control and removal",
        "lawn edging and bordering",
        "garden bed maintenance",
        "tree branch trimming",
        "regular garden upkeep",
        "general garden maintenance service",
    ],
    "landscaping_design": [
        "garden design and layout",
        "lawn turf installation",
        "garden pathway or patio installation",
        "outdoor garden transformation",
        "garden border and bed design",
        "water feature installation",
        "garden lighting installation",
        "retaining wall or edging installation",
        "garden makeover project",
        "general landscaping design work",
    ],
    "planting": [
        "flower bed planting",
        "vegetable garden planting",
        "tree or shrub planting",
        "potted plant arrangement",
        "seedling and sapling planting",
        "garden bed soil preparation",
        "seasonal flower planting",
        "herb garden planting",
        "indoor plant arrangement",
        "general planting service",
    ],
}


# ─── Rejection Helper ─────────────────────────────────────────────────────────

def _compute_entropy(probs: np.ndarray) -> float:
    """
    Returns normalised Shannon entropy [0, 1].
    0 = perfectly certain (one class = 1.0)
    1 = completely uniform (all classes equally likely)
    High entropy means the model is confused → likely irrelevant image.
    """
    probs    = np.clip(probs, 1e-9, 1.0)   # avoid log(0)
    entropy  = -np.sum(probs * np.log(probs))
    max_entr = np.log(len(probs))
    return float(entropy / max_entr)


def _rejection_response(image_path: str, reason: str, confidence: float, top3: list) -> dict:
    """Standard rejection payload returned to the API."""
    return {
        "image_path": image_path,
        "rejected":   True,
        "service":    "other",
        "label":      "Irrelevant Image",
        "category":   "unknown",
        "confidence": round(confidence * 100, 1),
        "reason":     reason,
        "quality":    {"key": "low", "label": "Needs Review", "color": "red", "min_conf": 0.0},
        "tags":       [],
        "top3":       top3,
        "clip_matches": [],
    }


# ─── CLIP Detector ────────────────────────────────────────────────────────────

class CLIPDetector:
    def __init__(self):
        self.model     = None
        self.processor = None
        self._load()

    def _load(self):
        try:
            from transformers import CLIPProcessor, CLIPModel
            print("Loading CLIP model (first run downloads ~600MB)...")
            self.model     = CLIPModel.from_pretrained("openai/clip-vit-base-patch32")
            self.processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")
            print("✅ CLIP model loaded")
        except ImportError:
            print("⚠️  CLIP not installed. Run: pip install transformers torch torchvision")
        except Exception as e:
            print(f"⚠️  CLIP load error: {e}")

    def detect(self, image_path: str, service: str) -> dict:
        if self.model is None or self.processor is None:
            return {"specific_label": None, "clip_confidence": 0.0}

        try:
            import torch

            descriptions = CLIP_DESCRIPTIONS.get(service, [])
            if not descriptions:
                return {"specific_label": None, "clip_confidence": 0.0}

            image  = Image.open(image_path).convert("RGB")
            inputs = self.processor(
                text=descriptions,
                images=image,
                return_tensors="pt",
                padding=True,
            )

            with torch.no_grad():
                outputs = self.model(**inputs)
                probs   = outputs.logits_per_image.softmax(dim=1)[0]

            best_idx   = int(probs.argmax())
            best_prob  = float(probs[best_idx])
            best_desc  = descriptions[best_idx]
            spec_label = _to_title(best_desc)

            top3 = [
                {
                    "description": descriptions[i],
                    "confidence":  round(float(probs[i]) * 100, 1),
                }
                for i in probs.argsort(descending=True)[:3]
            ]

            return {
                "specific_label":  spec_label,
                "clip_confidence": round(best_prob * 100, 1),
                "top3_matches":    top3,
            }

        except Exception as e:
            print(f"  ⚠️  CLIP detection error: {e}")
            return {"specific_label": None, "clip_confidence": 0.0}


def _to_title(description: str) -> str:
    label = description
    for r in [" or ", " and "]:
        label = label.replace(r, "/")
    return label.title()


# ─── Tag Generator ────────────────────────────────────────────────────────────

class TagGenerator:
    def __init__(self):
        self.model     = None
        self.processor = None
        self._load()

    def _load(self):
        try:
            from transformers import CLIPProcessor, CLIPModel
            self.model     = CLIPModel.from_pretrained("openai/clip-vit-base-patch32")
            self.processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")
        except Exception:
            pass

    def generate(self, image_path: str, service: str, specific_label: str, confidence: float) -> list:
        if self.model is None:
            return self._simple_fallback(service)

        try:
            import torch

            n_tags = 6 if confidence >= 0.80 else 5 if confidence >= 0.55 else 4

            candidates = [
                "professional quality work", "high quality finish", "neat and tidy work",
                "clean workmanship", "expert installation", "skilled repair work",
                "repair completed", "installation done", "cleaning completed",
                "maintenance performed", "renovation finished", "service delivered",
                "parts replaced", "surface restored", "leak fixed",
                "wiring connected", "pipes sealed", "tiles replaced",
                "walls painted", "floors cleaned", "garden trimmed",
                "furniture restored", "fabric cleaned", "plants arranged",
                "fully functional", "like new condition", "damage repaired",
                "stain removed", "blockage cleared", "fault diagnosed",
                "safety checked", "waterproofed", "sanitised", "deodorised",
                "before and after", "service completed", "satisfied customer",
                "same day service", "emergency repair", "routine maintenance",
            ]

            image  = Image.open(image_path).convert("RGB")
            inputs = self.processor(
                text=candidates,
                images=image,
                return_tensors="pt",
                padding=True,
            )

            with torch.no_grad():
                outputs = self.model(**inputs)
                probs   = outputs.logits_per_image.softmax(dim=1)[0]

            top_indices = probs.argsort(descending=True)[:n_tags]
            return [candidates[i] for i in top_indices]

        except Exception as e:
            print(f"  ⚠️  Tag generation error: {e}")
            return self._simple_fallback(service)

    def _simple_fallback(self, service: str) -> list:
        defaults = {
            "electrical_repair":            ["wiring", "electrical fix", "certified work"],
            "plumbing_repair":              ["pipe repair", "leak fixed", "plumbing work"],
            "furniture_repair":             ["restored", "structural fix", "refinished"],
            "roofing_repair":               ["waterproofed", "tiles replaced", "leak sealed"],
            "painting_renovation":          ["painted", "smooth finish", "surface prep"],
            "house_cleaning":               ["deep clean", "sanitised", "streak-free"],
            "post_construction_cleaning":   ["debris removed", "dust cleared", "handover ready"],
            "move_in_out_cleaning":         ["full clean", "end-of-tenancy", "deposit protected"],
            "sofa_carpet_curtain_cleaning": ["steam cleaned", "stain removed", "deodorised"],
            "garden_cleaning":              ["cleared", "weeds removed", "tidy finish"],
            "garden_maintenance":           ["lawn mowed", "trimmed", "maintained"],
            "landscaping_design":           ["designed", "transformed", "landscaped"],
            "planting":                     ["planted", "garden setup", "seasonal planting"],
        }
        return defaults.get(service, ["professional service", "quality work", "completed"])


# ─── Main Predictor ───────────────────────────────────────────────────────────

class ServicePredictor:
    def __init__(self, model_dir: str = MODEL_DIR):
        keras_path = os.path.join(model_dir, "service_classifier.keras")
        h5_path    = os.path.join(model_dir, "service_classifier.h5")

        if os.path.exists(keras_path):
            self.model = tf.keras.models.load_model(keras_path)
            print("✅ Loaded classifier: service_classifier.keras")
        elif os.path.exists(h5_path):
            self.model = tf.keras.models.load_model(h5_path)
            print("✅ Loaded classifier: service_classifier.h5")
        else:
            raise FileNotFoundError(f"No model found in {model_dir}. Run train.py first.")

        classes_path  = os.path.join(model_dir, "class_names.json")
        category_path = os.path.join(model_dir, "category_map.json")

        with open(classes_path)  as f: self.class_names  = json.load(f)
        with open(category_path) as f: self.category_map = json.load(f)

        self.clip_detector = CLIPDetector()
        self.tag_generator = TagGenerator()

    # ─── Single image ──────────────────────────────────────────────────────────

    def predict(self, image_path: str) -> dict:
        # ── Step 1: EfficientNetB0 inference ─────────────────────────────────
        img   = self._load_image(image_path)
        probs = self.model.predict(img, verbose=0)[0]

        top_idx  = int(np.argmax(probs))
        top_conf = float(probs[top_idx])
        service  = self.class_names[top_idx]
        entropy  = _compute_entropy(probs)

        # Top-3 for transparency (included even in rejections)
        top3 = [
            {
                "service":    self.class_names[i],
                "label":      self.category_map.get(self.class_names[i], {}).get("label", self.class_names[i]),
                "confidence": round(float(probs[i]) * 100, 1),
            }
            for i in np.argsort(probs)[::-1][:3]
        ]

        # ── Step 2: Three-layer rejection gate ───────────────────────────────

        # Layer 1 — Model explicitly predicted "other" class
        if service == "other":
            return _rejection_response(
                image_path,
                reason="Image was classified as irrelevant by the model.",
                confidence=top_conf,
                top3=top3,
            )

        # Layer 2 — Low confidence (model unsure which service)
        if top_conf < CONFIDENCE_THRESHOLD:
            return _rejection_response(
                image_path,
                reason=(
                    f"Model confidence too low ({top_conf*100:.1f}%). "
                    "Image may not clearly show a supported home service."
                ),
                confidence=top_conf,
                top3=top3,
            )

        # Layer 3 — High entropy (probability spread across many classes)
        if entropy > ENTROPY_THRESHOLD:
            return _rejection_response(
                image_path,
                reason=(
                    f"Model is uncertain (entropy={entropy:.2f}). "
                    "Image may be ambiguous or unrelated to any service."
                ),
                confidence=top_conf,
                top3=top3,
            )

        # ── Step 3: Valid image — proceed with full prediction ────────────────
        meta     = self.category_map.get(service, {"category": "unknown", "label": service})
        conf_pct = round(top_conf * 100, 1)
        quality  = self._quality(top_conf)

        # CLIP — specific work detection
        clip_result    = self.clip_detector.detect(image_path, service)
        specific_label = clip_result.get("specific_label") or meta["label"]
        clip_conf      = clip_result.get("clip_confidence", 0.0)

        # CLIP — auto-generate tags
        tags = self.tag_generator.generate(image_path, service, specific_label, top_conf)

        return {
            "image_path":      image_path,
            "rejected":        False,
            "service":         service,
            "label":           meta["label"],
            "specific_label":  specific_label,
            "clip_confidence": clip_conf,
            "category":        meta["category"],
            "confidence":      conf_pct,
            "entropy":         round(entropy, 3),
            "quality":         quality,
            "tags":            tags,
            "top3":            top3,
            "clip_matches":    clip_result.get("top3_matches", []),
        }

    # ─── Batch images ──────────────────────────────────────────────────────────

    def predict_batch(self, image_paths: list) -> dict:
        results  = [self.predict(p) for p in image_paths[:5]]
        valid    = [r for r in results if not r.get("rejected")]
        rejected = [r for r in results if r.get("rejected")]

        # All images rejected
        if not valid:
            return {
                "images":          results,
                "rejected":        True,
                "reason":          "All uploaded images were irrelevant or unrecognised.",
                "portfolio_summary": None,
            }

        unique_labels   = list({r["label"]          for r in valid})
        specific_labels = list({r["specific_label"] for r in valid})
        categories      = list({r["category"]       for r in valid})
        all_tags        = list({tag for r in valid for tag in r["tags"]})
        avg_conf        = round(sum(r["confidence"] for r in valid) / len(valid), 1)

        return {
            "images": results,
            "rejected": False,
            "portfolio_summary": {
                "services_detected":  unique_labels,
                "specific_services":  specific_labels,
                "categories":         categories,
                "portfolio_tags":     all_tags,
                "image_count":        len(valid),
                "rejected_count":     len(rejected),
                "avg_confidence":     avg_conf,
                "overall_quality":    self._quality(avg_conf / 100),
            },
        }

    # ─── Helpers ───────────────────────────────────────────────────────────────

    def _load_image(self, path: str) -> np.ndarray:
        img = Image.open(path).convert("RGB").resize((224, 224))
        arr = np.array(img, dtype=np.float32)
        arr = tf.keras.applications.efficientnet.preprocess_input(arr)
        return np.expand_dims(arr, axis=0)

    def _quality(self, confidence: float) -> dict:
        for key, val in QUALITY_INDICATORS.items():
            if confidence >= val["min_conf"]:
                return {"key": key, **val}
        return {"key": "low", **QUALITY_INDICATORS["low"]}