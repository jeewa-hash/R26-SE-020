"""
app.py — Flask API for Service Image Classifier (updated with MongoDB + JWT)

Changes from original:
  1. MongoDB connected on startup
  2. JWT required on /predict — user_id extracted from token
  3. Accepted prediction results saved to MongoDB automatically
  4. /portfolio/* routes registered (categories, items, delete)
  5. /health reports model + DB status

Run:
    cd ml_model
    python app.py

Endpoints:
    POST /predict               — analyze 1-5 images, save to DB (JWT required)
    GET  /portfolio/categories  — this user's categories from DB (JWT required)
    GET  /portfolio/items       — this user's items from DB (JWT required)
    DELETE /portfolio/items/<id>— remove one item (JWT required)
    GET  /health                — server + model + DB status
    GET  /services              — list all supported service classes
"""

import os
from datetime import datetime, timezone

from flask import Flask, request, jsonify
from werkzeug.utils import secure_filename

from predictor import ServicePredictor
from db import get_db
from routes.portfolio_routes import portfolio_bp
from auth_service import get_current_user

app = Flask(__name__)
app.register_blueprint(portfolio_bp)

# ─── Config ───────────────────────────────────────────────────────────────────

UPLOAD_FOLDER = "temp_uploads"
ALLOWED_EXTS  = {".jpg", ".jpeg", ".png", ".webp"}
MAX_IMAGES    = 5

os.makedirs(UPLOAD_FOLDER, exist_ok=True)

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

@app.route("/health", methods=["GET"])
def health():
    """Reports model, DB status, and all registered routes."""
    db_ok = False
    try:
        get_db().command("ping")
        db_ok = True
    except Exception:
        pass

    return jsonify({
        "status":       "ok",
        "model_loaded": predictor is not None,
        "db_connected": db_ok,
    })


@app.route("/services", methods=["GET"])
def services():
    """List all supported service classes (unchanged)."""
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


# ml_model/app.py
from dotenv import load_dotenv
load_dotenv()

import os
from flask import Flask, request, jsonify
from werkzeug.utils import secure_filename
from predictor import ServicePredictor
from db import get_db
from auth_service import get_current_user          # ← replaces jwt_required
from routes.portfolio_routes import portfolio_bp

app = Flask(__name__)
app.register_blueprint(portfolio_bp)

# ... multer/predictor setup unchanged ...

@app.route("/predict", methods=["POST"])
def predict():
    # ── Step 1: verify token by calling teammate's API ────────────
    token = request.headers.get("Authorization", "").replace("Bearer ", "").strip()
    if not token:
        return jsonify({"error": "Authorization token required."}), 401

    try:
        current_user = get_current_user(token)
    except Exception as e:
        return jsonify({"error": str(e)}), 401

    user_id = str(current_user["_id"])

    # ── Step 2: rest of your predict logic (unchanged) ────────────
    if predictor is None:
        return jsonify({"error": "Model not loaded."}), 503

    if "images" not in request.files:
        return jsonify({"error": "No images provided."}), 400

    files = request.files.getlist("images")
    if len(files) > 5:
        return jsonify({"error": "Maximum 5 images allowed."}), 400

    saved_paths = []
    for file in files:
        ext = os.path.splitext(file.filename)[1].lower()
        if ext not in {".jpg", ".jpeg", ".png", ".webp"}:
            return jsonify({"error": f"Unsupported file type: {file.filename}"}), 400
        path = os.path.join("temp_uploads", secure_filename(file.filename))
        file.save(path)
        saved_paths.append(path)

    try:
        result = predictor.predict_batch(saved_paths)

        if result.get("rejected"):
            return jsonify({
                "rejected": True,
                "error":    "No valid service images detected.",
                "images":   result.get("images", []),
            }), 422

        # ── Step 3: save to YOUR MongoDB with user_id ─────────────
        from datetime import datetime, timezone
        db   = get_db()
        docs = []

        for img in result.get("images", []):
            if img.get("rejected"):
                continue
            docs.append({
                "user_id":        user_id,
                "service_key":    img.get("service"),
                "label":          img.get("label"),
                "specific_label": img.get("specific_label"),
                "category_group": img.get("category"),
                "confidence":     float(img.get("confidence", 0)),
                "clip_confidence":float(img.get("clip_confidence", 0)),
                "tags":           img.get("tags", []),
                "clip_matches":   img.get("clip_matches", []),
                "image_url":      img.get("image_path", ""),
                "created_at":     datetime.now(timezone.utc),
            })

        saved_ids = []
        if docs:
            insert    = db.portfolio_items.insert_many(docs)
            saved_ids = [str(i) for i in insert.inserted_ids]

        result["saved_to_db"] = len(saved_ids)
        result["saved_ids"]   = saved_ids
        result["user_id"]     = user_id

        return jsonify(result), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

    finally:
        for p in saved_paths:
            try: os.remove(p)
            except: pass

# ─── Helpers ──────────────────────────────────────────────────────────────────

def _cleanup(paths: list):
    for p in paths:
        try:
            os.remove(p)
        except OSError:
            pass


# ─── Run ──────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)