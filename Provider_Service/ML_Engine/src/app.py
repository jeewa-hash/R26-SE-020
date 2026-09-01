"""
app.py — Flask API for Service Image Classifier (updated with MongoDB + JWT + Static Upload Serving)
"""

import os
import shutil
import time
from datetime import datetime, timezone

from dotenv import load_dotenv
load_dotenv()

from flask import Flask, request, jsonify, send_from_directory
from werkzeug.utils import secure_filename

from predictor import ServicePredictor
from db import get_db
from routes.portfolio_routes import portfolio_bp
from auth_service import get_current_user

app = Flask(__name__)
app.register_blueprint(portfolio_bp)

# ─── Config ───────────────────────────────────────────────────────────────────

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
TEMP_UPLOAD_FOLDER = os.path.join(BASE_DIR, "temp_uploads")
PERMANENT_UPLOAD_FOLDER = os.path.join(BASE_DIR, "uploads")
ALLOWED_EXTS = {".jpg", ".jpeg", ".png", ".webp"}
MAX_IMAGES = 5

os.makedirs(TEMP_UPLOAD_FOLDER, exist_ok=True)
os.makedirs(PERMANENT_UPLOAD_FOLDER, exist_ok=True)

# ─── Load ML model ────────────────────────────────────────────────────────────

try:
    predictor = ServicePredictor()
    print("✅ ML model loaded")
except FileNotFoundError as e:
    predictor = None
    print(f"⚠️  Model not found: {e}")
    print("    Run train.py first to generate saved/service_classifier.keras")

# ─── Connect MongoDB ──────────────────────────────────────────────────────────

try:
    get_db()
except Exception as e:
    print(f"⚠️  MongoDB not connected on startup: {e}")


# ─── Routes ───────────────────────────────────────────────────────────────────

@app.route("/uploads/<path:filename>", methods=["GET"])
def serve_upload(filename):
    """Serve uploaded portfolio images statically."""
    return send_from_directory(PERMANENT_UPLOAD_FOLDER, filename)


@app.route("/health", methods=["GET"])
def health():
    """Reports model, DB status, and health."""
    db_ok = False
    try:
        get_db().command("ping")
        db_ok = True
    except Exception:
        pass

    return jsonify({
        "status": "ok",
        "model_loaded": predictor is not None,
        "db_connected": db_ok,
    })


@app.route("/services", methods=["GET"])
def services():
    """List all supported service classes."""
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
    # ── Step 1: verify token by calling auth profile API ────────────
    token = request.headers.get("Authorization", "").replace("Bearer ", "").strip()
    if not token:
        return jsonify({"error": "Authorization token required."}), 401

    try:
        current_user = get_current_user(token)
    except Exception as e:
        return jsonify({"error": str(e)}), 401

    user_id = str(current_user["_id"])

    # ── Step 2: check predictor & files ─────────────────────────────
    if predictor is None:
        return jsonify({"error": "Model not loaded."}), 503

    if "images" not in request.files:
        return jsonify({"error": "No images provided."}), 400

    files = request.files.getlist("images")
    if len(files) > MAX_IMAGES:
        return jsonify({"error": f"Maximum {MAX_IMAGES} images allowed."}), 400

    saved_paths = []
    original_names = []
    for file in files:
        ext = os.path.splitext(file.filename)[1].lower()
        if ext not in ALLOWED_EXTS:
            return jsonify({"error": f"Unsupported file type: {file.filename}"}), 400
        sec_name = secure_filename(file.filename)
        path = os.path.join(TEMP_UPLOAD_FOLDER, f"{int(time.time() * 1000)}_{sec_name}")
        file.save(path)
        saved_paths.append(path)
        original_names.append(sec_name)

    try:
        result = predictor.predict_batch(saved_paths)

        if result.get("rejected"):
            return jsonify({
                "rejected": True,
                "error": "No valid service images detected.",
                "images": result.get("images", []),
            }), 422

        # ── Step 3: persist valid images and save to MongoDB ─────────
        db = get_db()
        docs = []
        valid_indices = []

        for idx, img in enumerate(result.get("images", [])):
            if img.get("rejected"):
                continue

            temp_path = saved_paths[idx]
            ext = os.path.splitext(temp_path)[1].lower()
            perm_filename = f"portfolio_{user_id}_{int(time.time())}_{idx}{ext}"
            perm_path = os.path.join(PERMANENT_UPLOAD_FOLDER, perm_filename)

            # Copy image to permanent uploads
            if os.path.exists(temp_path):
                shutil.copy2(temp_path, perm_path)

            rel_url = f"/uploads/{perm_filename}"
            img["image_url"] = rel_url

            docs.append({
                "user_id": user_id,
                "service_key": img.get("service"),
                "label": img.get("label"),
                "specific_label": img.get("specific_label"),
                "category_group": img.get("category"),
                "confidence": float(img.get("confidence", 0)),
                "clip_confidence": float(img.get("clip_confidence", 0)),
                "quality": img.get("quality", {}),
                "tags": img.get("tags", []),
                "clip_matches": img.get("clip_matches", []),
                "image_url": rel_url,
                "created_at": datetime.now(timezone.utc),
            })
            valid_indices.append(idx)

        saved_ids = []
        if docs:
            insert = db.portfolio_items.insert_many(docs)
            saved_ids = [str(i) for i in insert.inserted_ids]

            for i, valid_idx in enumerate(valid_indices):
                result["images"][valid_idx]["id"] = saved_ids[i]

        result["saved_to_db"] = len(saved_ids)
        result["saved_ids"] = saved_ids
        result["user_id"] = user_id

        return jsonify(result), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

    finally:
        for p in saved_paths:
            try:
                if os.path.exists(p):
                    os.remove(p)
            except Exception:
                pass


# ─── Run ──────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)