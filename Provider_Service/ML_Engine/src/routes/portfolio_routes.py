from datetime import datetime, timezone
from bson import ObjectId
from flask import Blueprint, request, jsonify
from db import get_db
from auth_service import get_current_user

portfolio_bp = Blueprint("portfolio", __name__)
SPECIALIZATION_MIN = 3


def _serialize(doc):
    doc["_id"] = str(doc["_id"])
    return doc


def get_user_from_request():
    """Verifies token via auth API. Returns (user_object, error_response)."""
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None, (jsonify({"error": "Authorization header missing."}), 401)
    token = auth_header.split(" ", 1)[1].strip()
    try:
        user = get_current_user(token)   # calls teammate's /api/auth/profile
        return user, None
    except Exception as e:
        return None, (jsonify({"error": str(e)}), 401)


# ── GET /portfolio/categories ─────────────────────────────────────────────────
# Returns provider name + all their service categories from MongoDB.

@portfolio_bp.route("/portfolio/categories", methods=["GET"])
def get_categories():
    """
    Header: Authorization: Bearer <token>

    Response:
    {
        "provider": {
            "id":       "64abc...",
            "name":     "Kasun Perera",         ← from auth API
            "email":    "kasun@email.com",       ← from auth API
            "category": "Plumbing",             ← provider's registered service
            "district": "Colombo",
            "profileImage": "uploads/photo.jpg"
        },
        "categories": [
            {
                "label":           "House Cleaning",
                "service_key":     "house_cleaning",
                "category_group":  "cleaning",
                "image_count":     5,
                "latest_image":    "temp_uploads/photo.jpg",
                "specific_labels": ["Kitchen Deep Cleaning", "Bathroom Sanitising"],
                "all_tags":        ["deep clean", "sanitised", ...],
                "avg_confidence":  88.4
            },
            ...
        ],
        "total_images":    8,
        "category_groups": { "cleaning": 5, "repairing": 3 },
        "specialization": {
            "awarded":        true,
            "badge":          "Better Version",
            "specific_label": "Kitchen Deep Cleaning",
            "label":          "House Cleaning",
            "count":          3
        }
    }
    """
    # ── Step 1: verify token + get provider details from auth API ─────────────
    user, err = get_user_from_request()
    if err:
        return err

    user_id = str(user["_id"])

    # ── Step 2: build provider info from auth API response ────────────────────
    # Handles both "name" field and separate "firstName"/"lastName" fields
    name = (
        user.get("name") or
        user.get("fullName") or
        f"{user.get('firstName', '')} {user.get('lastName', '')}".strip() or
        user.get("email", "").split("@")[0]   # fallback: use email prefix
    )

    provider_info = {
        "id":           user_id,
        "name":         name,
        "email":        user.get("email", ""),
        "category":     user.get("category", ""),    # registered service category
        "district":     user.get("district", ""),
        "profileImage": user.get("profileImage", ""),
        "isVerified":   user.get("isVerified", False),
    }

    # ── Step 3: fetch portfolio categories from YOUR MongoDB ──────────────────
    db = get_db()

    pipeline = [
        {"$match": {"user_id": user_id}},
        {"$sort":  {"created_at": -1}},
        {"$group": {
            "_id":             "$label",
            "service_key":     {"$first": "$service_key"},
            "category_group":  {"$first": "$category_group"},
            "image_count":     {"$sum": 1},
            "latest_image":    {"$first": "$image_url"},
            "specific_labels": {"$addToSet": "$specific_label"},
            "all_tags":        {"$push": "$tags"},
            "confidences":     {"$push": "$confidence"},
        }},
        {"$sort": {"image_count": -1}},
    ]

    results = list(db.portfolio_items.aggregate(pipeline))

    categories = []
    for r in results:
        flat_tags = list({tag for sublist in r["all_tags"] for tag in sublist})
        avg_conf  = (
            round(sum(r["confidences"]) / len(r["confidences"]), 1)
            if r["confidences"] else 0
        )
        categories.append({
            "label":           r["_id"],
            "service_key":     r.get("service_key", ""),
            "category_group":  r.get("category_group", "unknown"),
            "image_count":     r["image_count"],
            "latest_image":    r.get("latest_image", ""),
            "specific_labels": [s for s in r["specific_labels"] if s],
            "all_tags":        flat_tags,
            "avg_confidence":  avg_conf,
        })

    # ── Step 4: broad group counts ────────────────────────────────────────────
    category_groups: dict = {}
    for c in categories:
        g = c["category_group"]
        category_groups[g] = category_groups.get(g, 0) + c["image_count"]

    total_images = sum(c["image_count"] for c in categories)

    # ── Step 5: specialization badge ─────────────────────────────────────────
    specialization = {"awarded": False}
    spec_result = list(db.portfolio_items.aggregate([
        {"$match": {"user_id": user_id, "specific_label": {"$ne": None}}},
        {"$group": {
            "_id":   "$specific_label",
            "count": {"$sum": 1},
            "label": {"$first": "$label"},
        }},
        {"$sort":  {"count": -1}},
        {"$limit": 1},
    ]))
    if spec_result and spec_result[0]["count"] >= SPECIALIZATION_MIN:
        top = spec_result[0]
        specialization = {
            "awarded":        True,
            "badge":          "Better Version",
            "specific_label": top["_id"],
            "label":          top["label"],
            "count":          top["count"],
        }

    # ── Step 6: combined response ─────────────────────────────────────────────
    return jsonify({
        "provider":        provider_info,    # name + details from auth API
        "categories":      categories,       # ML-detected categories from MongoDB
        "total_images":    total_images,
        "category_groups": category_groups,
        "specialization":  specialization,
    }), 200


# ── GET /portfolio/items ──────────────────────────────────────────────────────

@portfolio_bp.route("/portfolio/items", methods=["GET"])
def get_items():
    """
    Header: Authorization: Bearer <token>

    Query params (all optional):
        service_key    — e.g. house_cleaning
        label          — e.g. "House Cleaning"
        category_group — e.g. cleaning / repairing / gardening
        limit          — default 50
        skip           — default 0  (for pagination)
    """
    user, err = get_user_from_request()
    if err:
        return err

    user_id        = str(user["_id"])
    db             = get_db()
    query          = {"user_id": user_id}
    service_key    = request.args.get("service_key")
    label          = request.args.get("label")
    category_group = request.args.get("category_group")
    limit          = int(request.args.get("limit", 50))
    skip           = int(request.args.get("skip", 0))

    if service_key:    query["service_key"]    = service_key
    if label:          query["label"]          = label
    if category_group: query["category_group"] = category_group

    items = list(
        db.portfolio_items
          .find(query)
          .sort("created_at", -1)
          .skip(skip)
          .limit(limit)
    )
    total = db.portfolio_items.count_documents(query)

    return jsonify({
        "items": [_serialize(i) for i in items],
        "total": total,
    }), 200


# ── DELETE /portfolio/items/<item_id> ─────────────────────────────────────────

@portfolio_bp.route("/portfolio/items/<item_id>", methods=["DELETE"])
def delete_item(item_id):
    """
    Header: Authorization: Bearer <token>
    Deletes one item — only if it belongs to the current user.
    """
    user, err = get_user_from_request()
    if err:
        return err

    user_id = str(user["_id"])
    db = get_db()

    try:
        oid = ObjectId(item_id)
    except Exception:
        return jsonify({"error": "Invalid item ID format."}), 400

    result = db.portfolio_items.delete_one({
        "_id":     oid,
        "user_id": user_id,
    })

    if result.deleted_count == 0:
        return jsonify({"error": "Item not found or does not belong to you."}), 404

    return jsonify({"message": "Portfolio item deleted.", "id": item_id}), 200