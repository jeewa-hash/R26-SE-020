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
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None, (jsonify({"error": "Authorization header missing."}), 401)
    token = auth_header.split(" ", 1)[1].strip()
    try:
        user = get_current_user(token)
        return str(user["_id"]), None
    except Exception as e:
        return None, (jsonify({"error": str(e)}), 401)


@portfolio_bp.route("/portfolio/categories", methods=["GET"])
def get_categories():
    user_id, err = get_user_from_request()
    if err:
        return err
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
        avg_conf  = round(sum(r["confidences"]) / len(r["confidences"]), 1) if r["confidences"] else 0
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
    category_groups = {}
    for c in categories:
        g = c["category_group"]
        category_groups[g] = category_groups.get(g, 0) + c["image_count"]
    total_images = sum(c["image_count"] for c in categories)
    specialization = {"awarded": False}
    spec_result = list(db.portfolio_items.aggregate([
        {"$match": {"user_id": user_id, "specific_label": {"$ne": None}}},
        {"$group": {"_id": "$specific_label", "count": {"$sum": 1}, "label": {"$first": "$label"}}},
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
    return jsonify({
        "categories":      categories,
        "total_images":    total_images,
        "category_groups": category_groups,
        "specialization":  specialization,
    }), 200


@portfolio_bp.route("/portfolio/items", methods=["GET"])
def get_items():
    user_id, err = get_user_from_request()
    if err:
        return err
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
    return jsonify({"items": [_serialize(i) for i in items], "total": total}), 200


@portfolio_bp.route("/portfolio/items/<item_id>", methods=["DELETE"])
def delete_item(item_id):
    user_id, err = get_user_from_request()
    if err:
        return err
    db = get_db()
    try:
        oid = ObjectId(item_id)
    except Exception:
        return jsonify({"error": "Invalid item ID format."}), 400
    result = db.portfolio_items.delete_one({"_id": oid, "user_id": user_id})
    if result.deleted_count == 0:
        return jsonify({"error": "Item not found or does not belong to you."}), 404
    return jsonify({"message": "Portfolio item deleted.", "id": item_id}), 200