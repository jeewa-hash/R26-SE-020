"""
app.py — Flask API for Service Image Classifier

Structure:
    provider_service/
    ├── dataset/
    │   ├── electrical_repair/
    │   ├── ...
    │   ├── planting/
    │   └── other/              ← NEW: irrelevant images (100–200 mixed)
    ├── ml_model/
    │   ├── train.py
    │   ├── predictor.py
    │   ├── app.py
    │   ├── requirements.txt
    │   └── saved/
    └── backend/

Run:
    cd ml_model
    python app.py

Endpoints:
    POST /predict       — analyze 1–5 images (rejects irrelevant ones)
    GET  /health        — check server is running
    GET  /services      — list all supported service classes

Rejection Responses (HTTP 422):
    - Image predicted as "other" class
    - Model confidence < 55%
    - Model entropy > 80% of maximum (confused/ambiguous)
    - All uploaded images rejected
"""

import os
from flask import Flask, request, jsonify
from werkzeug.utils import secure_filename
from predictor import ServicePredictor

app = Flask(__name__)

# ─── Config ───────────────────────────────────────────────────────────────────

UPLOAD_FOLDER = "temp_uploads"
ALLOWED_EXTS  = {".jpg", ".jpeg", ".png", ".webp"}
MAX_IMAGES    = 5
MAX_SIZE_MB   = 10

os.makedirs(UPLOAD_FOLDER, exist_ok=True)

try:
    predictor = ServicePredictor()
    print("✅ Model loaded successfully")
except FileNotFoundError as e:
    predictor = None
    print(f"⚠️  Model not found: {e}")
    print("    Run train.py first to generate saved/service_classifier.keras")


# ─── Routes ───────────────────────────────────────────────────────────────────

@app.route("/health", methods=["GET"])
def health():
    """Quick check that the server and model are ready."""
    return jsonify({
        "status":       "ok",
        "model_loaded": predictor is not None,
    })


@app.route("/services", methods=["GET"])
def services():
    """List all supported service classes (excluding 'other')."""
    return jsonify({
        "classes": [
            {"id": 0,  "key": "electrical_repair",            "label": "Electrical Repair",            "category": "repairing"},
            {"id": 1,  "key": "plumbing_repair",              "label": "Plumbing Repair",              "category": "repairing"},
            {"id": 2,  "key": "furniture_repair",             "label": "Furniture Repair",             "category": "repairing"},
            {"id": 3,  "key": "roofing_repair",               "label": "Roofing Repair",               "category": "repairing"},
            {"id": 4,  "key": "painting_renovation",          "label": "Painting & Renovation",        "category": "repairing"},
            {"id": 5,  "key": "house_cleaning",               "label": "House Cleaning",               "category": "cleaning"},
            {"id": 6,  "key": "post_construction_cleaning",   "label": "Post-Construction Cleaning",   "category": "cleaning"},
            {"id": 7,  "key": "move_in_out_cleaning",         "label": "Move In/Out Cleaning",         "category": "cleaning"},
            {"id": 8,  "key": "sofa_carpet_curtain_cleaning", "label": "Sofa/Carpet/Curtain Cleaning", "category": "cleaning"},
            {"id": 9,  "key": "garden_cleaning",              "label": "Garden Cleaning",              "category": "gardening"},
            {"id": 10, "key": "garden_maintenance",           "label": "Garden Maintenance",           "category": "gardening"},
            {"id": 11, "key": "landscaping_design",           "label": "Landscaping & Design",         "category": "gardening"},
            {"id": 12, "key": "planting",                     "label": "Planting Services",            "category": "gardening"},
        ]
    })


@app.route("/predict", methods=["POST"])
def predict():
    """
    Accepts: multipart/form-data
    Field:   images (1–5 image files, JPG / PNG / WEBP)

    Success response (HTTP 200):
    {
        "rejected": false,
        "images": [ { per-image results } ],
        "portfolio_summary": { ... }
    }

    Partial rejection (HTTP 200 — some valid, some rejected):
    {
        "rejected": false,
        "images": [ { results including rejected ones } ],
        "portfolio_summary": { "rejected_count": N, ... }
    }

    Full rejection (HTTP 422 — all images irrelevant):
    {
        "rejected": true,
        "error": "No valid service images detected.",
        "detail": "Please upload images that clearly show a home service.",
        "images": [ { rejected image results } ]
    }

    Error responses:
        400 — missing/invalid input
        422 — all images rejected as irrelevant
        500 — internal server error
        503 — model not loaded
    """
    if predictor is None:
        return jsonify({
            "error": "Model not loaded. Run train.py first.",
        }), 503

    # ── Validate input ────────────────────────────────────────────────────────
    if "images" not in request.files:
        return jsonify({
            "error": "No 'images' field in request. Send files with key 'images'.",
        }), 400

    files = request.files.getlist("images")

    if len(files) == 0:
        return jsonify({"error": "No images provided."}), 400

    if len(files) > MAX_IMAGES:
        return jsonify({
            "error": f"Maximum {MAX_IMAGES} images allowed. You sent {len(files)}.",
        }), 400

    # ── Save uploaded files temporarily ───────────────────────────────────────
    saved_paths = []
    errors      = []

    for file in files:
        ext = os.path.splitext(file.filename)[1].lower()

        if ext not in ALLOWED_EXTS:
            errors.append(f"'{file.filename}' — unsupported type. Use JPG, PNG, or WEBP.")
            continue

        filename  = secure_filename(file.filename)
        save_path = os.path.join(UPLOAD_FOLDER, filename)
        file.save(save_path)
        saved_paths.append(save_path)

    if errors:
        _cleanup(saved_paths)
        return jsonify({"error": "Invalid files", "details": errors}), 400

    # ── Run prediction ────────────────────────────────────────────────────────
    try:
        result = predictor.predict_batch(saved_paths)

        # All images were rejected as irrelevant
        if result.get("rejected"):
            return jsonify({
                "rejected": True,
                "error":    "No valid service images detected.",
                "detail":   (
                    "Please upload images that clearly show a home service being performed "
                    "(e.g. cleaning, electrical work, gardening, repairs)."
                ),
                "images":   result.get("images", []),
            }), 422

        # Partial or full success — include rejected_count in summary
        return jsonify(result), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

    finally:
        _cleanup(saved_paths)


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _cleanup(paths: list):
    """Remove temp uploaded files after prediction."""
    for p in paths:
        try:
            os.remove(p)
        except OSError:
            pass


# ─── Run ──────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)