import os
from datetime import datetime, timezone
from bson import ObjectId
from flask import Blueprint, request, jsonify
from db import get_db
from auth_service import get_current_user, get_all_providers
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


# ── PUT /portfolio/items/<item_id> ───────────────────────────────────────────

@portfolio_bp.route("/portfolio/items/<item_id>", methods=["PUT"])
def update_item(item_id):
    """
    Header: Authorization: Bearer <token>
    Updates tags, label, or specific_label of a portfolio item.
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

    data = request.get_json() or {}
    update_fields = {}
    if "tags" in data and isinstance(data["tags"], list):
        update_fields["tags"] = [str(t).strip() for t in data["tags"] if str(t).strip()]
    if "label" in data:
        update_fields["label"] = str(data["label"]).strip()
    if "specific_label" in data:
        update_fields["specific_label"] = str(data["specific_label"]).strip()

    if not update_fields:
        return jsonify({"error": "No update fields provided."}), 400

    result = db.portfolio_items.find_one_and_update(
        {"_id": oid, "user_id": user_id},
        {"$set": update_fields},
        return_document=True
    )

    if not result:
        return jsonify({"error": "Item not found or does not belong to you."}), 404

    return jsonify({"message": "Portfolio item updated.", "item": _serialize(result)}), 200


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

    item = db.portfolio_items.find_one({"_id": oid, "user_id": user_id})
    if not item:
        return jsonify({"error": "Item not found or does not belong to you."}), 404

    # Remove file from uploads folder if it exists
    image_url = item.get("image_url", "")
    if image_url and image_url.startswith("/uploads/"):
        filename = image_url.replace("/uploads/", "")
        file_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads", filename)
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except Exception:
                pass

    db.portfolio_items.delete_one({"_id": oid, "user_id": user_id})

    return jsonify({"message": "Portfolio item deleted.", "id": item_id}), 200
@portfolio_bp.route("/portfolio/all-providers", methods=["GET"])
def get_all_providers_with_portfolio():
    try:
        providers_from_auth = get_all_providers()

        if not providers_from_auth:
            return jsonify({
                "success": True,
                "totalProviders": 0,
                "providers": []
            }), 200

        db = get_db()

        portfolio_items = list(
            db.portfolio_items.find({})
        )

        portfolio_by_provider = {}

        for item in portfolio_items:
            user_id = str(
                item.get("user_id", "")
            ).strip()

            if not user_id:
                continue

            portfolio_by_provider.setdefault(
                user_id, []
            ).append(item)

        final_providers = []

        for provider in providers_from_auth:

            provider_id = str(
                provider.get("_id")
                or provider.get("id")
                or ""
            ).strip()

            if not provider_id:
                continue

            provider_portfolio = portfolio_by_provider.get(
                provider_id,
                []
            )

            categories = set()
            labels = set()
            specific_labels = set()
            tags = set()

            for item in provider_portfolio:

                category_group = str(
                    item.get("category_group", "")
                ).strip()

                service_key = str(
                    item.get("service_key", "")
                ).strip()

                label = str(
                    item.get("label", "")
                ).strip()

                specific_label = str(
                    item.get("specific_label", "")
                ).strip()

                if category_group:
                    categories.add(category_group)

                if service_key:
                    categories.add(service_key)

                if label:
                    labels.add(label)

                if specific_label:
                    specific_labels.add(specific_label)

                item_tags = item.get("tags", [])

                if isinstance(item_tags, list):
                    for tag in item_tags:
                        if tag:
                            tags.add(str(tag).strip())

            specialization = {
                "awarded": False
            }

            specialization_counts = {}

            for item in provider_portfolio:

                specific_label = item.get("specific_label")

                if specific_label:
                    specific_label = str(
                        specific_label
                    ).strip()

                    specialization_counts[
                        specific_label
                    ] = specialization_counts.get(
                        specific_label, 0
                    ) + 1

            if specialization_counts:

                top_label = max(
                    specialization_counts,
                    key=specialization_counts.get
                )

                top_count = specialization_counts[
                    top_label
                ]

                if top_count >= SPECIALIZATION_MIN:

                    matching_item = next(
                        (
                            item
                            for item in provider_portfolio
                            if str(
                                item.get(
                                    "specific_label",
                                    ""
                                )
                            ).strip() == top_label
                        ),
                        {}
                    )

                    specialization = {
                        "awarded": True,
                        "badge": "Better Version",
                        "specific_label": top_label,
                        "label": matching_item.get(
                            "label",
                            ""
                        ),
                        "count": top_count
                    }

            name = (
                provider.get("name")
                or provider.get("fullName")
                or (
                    f"{provider.get('firstName', '')} "
                    f"{provider.get('lastName', '')}"
                ).strip()
                or provider.get(
                    "email",
                    ""
                ).split("@")[0]
            )

            final_providers.append({
                "provider": {
                    "id": provider_id,
                    "name": name,
                    "email": provider.get("email", ""),
                    "category": provider.get("category", ""),
                    "district": provider.get("district", ""),
                    "profileImage": provider.get("profileImage", ""),
                    "isVerified": provider.get("isVerified", False),
                    "isBlocked": provider.get("isBlocked", False)
                },
                "portfolio": {
                    "total_images": len(provider_portfolio),
                    "categories": sorted(categories),
                    "labels": sorted(labels),
                    "specific_labels": sorted(specific_labels),
                    "tags": sorted(tags),
                    "specialization": specialization
                }
            })

        return jsonify({
            "success": True,
            "totalProviders": len(final_providers),
            "providers": final_providers
        }), 200

    except Exception as e:

        print(
            "[Get All Providers] Error:",
            str(e)
        )

        return jsonify({
            "success": False,
            "message": "Failed to get all providers",
            "error": str(e)
        }), 500