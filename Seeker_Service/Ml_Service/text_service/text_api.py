from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import os
import uuid
import jwt
from text_service.handler import TextHandler
from text_service.question_engine import QuestionEngine
from text_service.entity_extractor import EntityExtractor
from api.db_adapter import db_manager
from api.translations import (
    translate_payload,
    translate_answer_to_english
)

app = Flask(__name__)
CORS(app)

# =========================
# JWT CONFIG
# =========================
JWT_SECRET = os.getenv("JWT_SECRET", "cd67e4bf-7f39-456a-80c5-1561bf665671")
ALGORITHM = os.getenv("ALGORITHM", "HS256")

# =========================
# INIT
# =========================
handler = TextHandler()
engine = QuestionEngine()
extractor = EntityExtractor()

TEXT_SESSION_LANGUAGE = {}

# =========================
# PROVIDER MATCHING (ENHANCED)
# =========================

PROVIDER_SERVICE_URL = "http://localhost:5000/portfolio/all-providers"
INQUIRY_SERVICE_URL = os.getenv("INQUIRY_SERVICE_URL", "http://localhost:5001")


def is_provider_restricted(provider_id):
    """Return whether a provider must not be suggested because of missed bookings."""
    if not provider_id:
        return False

    try:
        response = requests.get(
            f"{INQUIRY_SERVICE_URL}/api/inquiries/missed-bookings/{provider_id}",
            timeout=5,
        )
        if response.status_code != 200:
            return False

        data = response.json()
        return bool(
            data.get("isRestricted", False)
            or data.get("provider", {}).get("isBlocked", False)
        )
    except (requests.RequestException, ValueError):
        # Keep matching available if the inquiry service is temporarily unavailable.
        return False

def normalize_service_category(value):
    if not value:
        return ""
    value = str(value).lower().strip()
    value = value.replace("&", "and").replace("-", " ").replace("_", " ")
    return " ".join(value.split())

def get_provider_keywords(provider, portfolio):
    keywords = set()
    if provider.get("category"):
        keywords.add(normalize_service_category(provider["category"]))
    for cat in portfolio.get("categories", []):
        if cat:
            keywords.add(normalize_service_category(cat))
    for label in portfolio.get("labels", []):
        if label:
            keywords.add(normalize_service_category(label))
    for spec in portfolio.get("specific_labels", []):
        if spec:
            keywords.add(normalize_service_category(spec))
    for tag in portfolio.get("tags", []):
        if tag:
            keywords.add(normalize_service_category(tag))
    return keywords

def category_matches(requested_category, provider, portfolio):
    requested = normalize_service_category(requested_category)
    if not requested:
        return False

    keywords = get_provider_keywords(provider, portfolio)
    if not keywords:
        provider_cat = normalize_service_category(provider.get("category", ""))
        return requested in provider_cat or provider_cat in requested

    # --- Existing categories ---
    if requested == "electrical":
        electrical_keywords = [
            "electrical", "electrician", "electrical repair", "electrical repairs",
            "electric repair", "appliance repair", "electric"
        ]
        return any(kw in kw_set for kw_set in keywords for kw in electrical_keywords)

    elif requested == "plumbing":
        plumbing_keywords = ["plumbing", "plumber", "plumbing repair", "pipe repair"]
        return any(kw in kw_set for kw_set in keywords for kw in plumbing_keywords)

    elif requested == "furniture":
        furniture_keywords = [
            "furniture", "carpentry", "carpenter", "woodwork", "wood working",
            "upholstery", "furniture repair"
        ]
        return any(kw in kw_set for kw_set in keywords for kw in furniture_keywords)

    elif requested == "cleaning":
        cleaning_keywords = ["cleaning", "house cleaning", "home cleaning", "cleaner"]
        return any(kw in kw_set for kw_set in keywords for kw in cleaning_keywords)

    # 🆕 Gardening
    elif "garden" in requested or "grass" in requested or "lawn" in requested or "mow" in requested:
        gardening_keywords = [
            "gardening", "garden", "grass", "lawn", "mowing", "cutting grass",
            "landscaping", "planting", "maintenance", "yard", "tree"
        ]
        return any(kw in kw_set for kw_set in keywords for kw in gardening_keywords)

    # 🆕 Child care
    elif "child" in requested or "baby" in requested or "kid" in requested or "nanny" in requested:
        childcare_keywords = [
            "child care", "childcare", "child", "children", "baby", "babysitting",
            "nanny", "daycare", "day care", "toddler", "infant", "kid", "kids"
        ]
        return any(kw in kw_set for kw_set in keywords for kw in childcare_keywords)

    # 🆕 Repairing – matches any provider with repair‑related keywords
    elif "repair" in requested or "fix" in requested:
        repair_keywords = [
            "repair", "fix", "maintenance", "service", 
            "electrical", "furniture", "appliance"
        ]
        return any(kw in kw_set for kw_set in keywords for kw in repair_keywords)

    # General fallback
    for kw in keywords:
        if requested in kw or kw in requested:
            return True
    return False

def get_all_providers():
    try:
        response = requests.get(PROVIDER_SERVICE_URL, timeout=10)
        if response.status_code != 200:
            return []
        data = response.json()
        return data.get("providers", [])
    except Exception:
        return []

def filter_matching_providers(category, providers, district=None):
    matching = []
    requested_category = normalize_service_category(category)
    requested_district = normalize_service_category(district) if district else None

    for item in providers:
        provider = item.get("provider", {})
        if provider.get("isBlocked", False):
            continue

        # Do not suggest providers restricted for active missed bookings.
        provider_id = provider.get("_id") or provider.get("id") or provider.get("providerId")
        if is_provider_restricted(provider_id):
            continue

        portfolio = item.get("portfolio", {})
        if not category_matches(requested_category, provider, portfolio):
            continue

        provider_district = normalize_service_category(provider.get("district", ""))
        district_match = True
        if requested_district:
            district_match = (requested_district == provider_district)

        matching.append({
            "provider": provider,
            "portfolio": portfolio,
            "match": {
                "category_match": True,
                "district_match": district_match,
                "priority": "HIGH" if district_match else "NORMAL"
            }
        })

    matching.sort(key=lambda x: 0 if x["match"]["priority"] == "HIGH" else 1)
    return matching

def find_matching_providers(category, answers):
    all_providers = get_all_providers()
    if not all_providers:
        return {
            "success": False,
            "total": 0,
            "providers": [],
            "message": "Unable to retrieve providers."
        }

    address = None
    for key in ["step_7", "step_6", "step_5"]:
        if answers.get(key):
            address = answers[key]
            break

    district = None
    if address:
        known_districts = [
            "Colombo", "Gampaha", "Kalutara", "Kandy", "Galle", "Matara",
            "Jaffna", "Kurunegala", "Puttalam", "Anuradhapura", "Polonnaruwa",
            "Badulla", "Monaragala", "Ratnapura", "Kegalle", "Matale",
            "Nuwara Eliya", "Hambantota", "Batticaloa", "Ampara", "Trincomalee",
            "Mannar", "Mullaitivu", "Kilinochchi", "Vavuniya"
        ]
        address_normalized = normalize_service_category(address)
        for d in known_districts:
            if normalize_service_category(d) in address_normalized:
                district = d
                break

    matching = filter_matching_providers(category, all_providers, district)

    if district:
        exact_district = [p for p in matching if p["match"]["district_match"]]
        if exact_district:
            matching = exact_district

    return {
        "success": True,
        "total": len(matching),
        "providers": matching,
        "district_used": district
    }

# =========================
# BUILDER CRITERIA
# =========================
def build_provider_criteria(category, answers, urgency_level):
    address = None
    for step_key in ["step_7", "step_6", "step_5"]:
        if answers.get(step_key):
            address = answers[step_key]
            break

    is_urgent = any(word in urgency_level.lower() for word in ["urgent", "critical", "emergency", "high"])

    criteria = {
        "service_category": category,
        "urgency_level": urgency_level,
        "is_urgent": is_urgent,
        "service_location": address,
        "provider_tags": [],
        "match_priority": "HIGH" if is_urgent else "NORMAL"
    }

    # Add category-specific tags
    if category == "electrical":
        appliance = answers.get("step_1", "").lower()
        risk = answers.get("step_4", "").lower()
        criteria["provider_tags"].append("electrician")
        if "fridge" in appliance or "washing" in appliance:
            criteria["provider_tags"].append("appliance_repair")
        if any(x in risk for x in ["sparks", "burning", "trip"]):
            criteria["provider_tags"].append("electrical_safety")
            criteria["match_priority"] = "HIGH"

    elif category == "furniture":
        ftype = answers.get("step_1", "").lower()
        material = answers.get("step_4", "").lower()
        criteria["provider_tags"].append("furniture_repair")
        if "upholstered" in ftype or "sofa" in ftype:
            criteria["provider_tags"].append("upholstery")
        if "wood" in material or "woodwork" in ftype:
            criteria["provider_tags"].append("carpentry")
        if "outdoor" in ftype:
            criteria["provider_tags"].append("outdoor_repair")

    elif category == "plumbing":
        area = answers.get("step_1", "").lower()
        criteria["provider_tags"].append("plumber")
        if "burst" in answers.get("step_2", "").lower():
            criteria["provider_tags"].append("emergency_plumbing")
            criteria["match_priority"] = "HIGH"
        if "drain" in area or "blocked" in area:
            criteria["provider_tags"].append("drain_specialist")

    return criteria


# =========================
# JWT HELPER
# =========================
def decode_jwt_token(auth_header):
    if not auth_header:
        return None
    parts = auth_header.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        return None
    token = parts[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM])
        user_data = payload.get("user", {})
        return user_data.get("id")
    except Exception:
        return None


# =========================
# LANGUAGE HELPERS
# =========================
def _is_sinhala_language(language_value):
    return (language_value or "").strip().lower() in {"sinhala", "si", "sinh"}

def _translate_question_for_language(question_payload, language):
    target = "sinhala" if _is_sinhala_language(language) else "english"
    return translate_payload(question_payload, target)


# =========================
# BUILD SUMMARY (aligned with FastAPI)
# =========================
def build_summary_from_session(session_data):
    category = session_data.get("service", "unknown")
    answers = session_data.get("answers", {})
    detected_object = session_data.get("sub_service", "")

    step_breakdown = []
    for key, val in answers.items():
        if key.startswith("step_"):
            step_num = int(key.replace("step_", ""))
            step_breakdown.append({
                "step": step_num,
                "label": f"Step {step_num}",
                "answer": val
            })
    step_breakdown.sort(key=lambda x: x["step"])

    brief_description = f"A {category} service request has been submitted."

    urgency_level = "Normal"
    for val in answers.values():
        if "urgent" in val.lower():
            urgency_level = "High — Urgent"
            break
        elif "flexible" in val.lower():
            urgency_level = "Low — Flexible scheduling"

    # 🔥 Use sub_service for provider matching if it's a known category
    known_sub_categories = ["plumbing", "electrical", "furniture", "cleaning", "gardening", "childcare"]
    matching_category = detected_object if detected_object in known_sub_categories else category

    provider_matching_result = find_matching_providers(matching_category, answers)
    provider_criteria = build_provider_criteria(category, answers, urgency_level)

    # Build provider_matching object identical to FastAPI
    provider_matching = {
        "status": "READY",
        "criteria": provider_criteria,
        "total_matched_providers": provider_matching_result.get("total", 0),
        "district_used": provider_matching_result.get("district_used"),
        "providers": provider_matching_result.get("providers", []),
        "message": (
            f"Found {provider_matching_result.get('total', 0)} matching provider(s) for {matching_category}."
            if provider_matching_result.get("success", False)
            else "Unable to retrieve providers."
        )
    }

    return {
        "seekerId": session_data.get("seekerId"),
        "session_id": session_data.get("id"),
        "language": session_data.get("app_lan", "en"),
        "detected_category": category,
        "detected_object": detected_object,
        "model_confidence": session_data.get("confidence", "N/A"),
        "step_breakdown": step_breakdown,
        "brief_description": brief_description,
        "urgency_level": urgency_level,
        "provider_matching": provider_matching
    }


# =========================
# TEXT PREDICT – Requires authentication
# =========================
@app.route("/text-predict", methods=["POST"])
def text_predict():
    data = request.json or {}
    text = (data.get("text") or "").strip()
    app_lan = data.get("app_lan", "english")

    auth_header = request.headers.get("Authorization")
    seeker_id = decode_jwt_token(auth_header)
    if not seeker_id:
        seeker_id = data.get("seekerId")

    if not seeker_id:
        return jsonify({"error": "Authentication required. Please provide a valid token."}), 401

    if not text:
        return jsonify({"error": "text is required"}), 400

    is_sinhala = _is_sinhala_language(app_lan)

    input_text_for_model = (
        translate_answer_to_english(text)
        if is_sinhala else text
    )

    def force_route(text):
        text = text.lower()
        if any(k in text for k in ["grass", "lawn", "garden", "cutting grass", "mowing"]):
            return {"service": "gardening", "sub_service": "maintenance", "confidence_score": 0.95}
        if any(k in text for k in ["clean", "dust", "sofa", "bathroom"]):
            return {"service": "cleaning", "sub_service": "general", "confidence_score": 0.90}
        if any(k in text for k in ["child", "baby", "kid", "infant", "toddler", "nanny", "babysit", "daycare"]):
            return {"service": "childcare", "sub_service": "general", "confidence_score": 0.88}
        if any(k in text for k in ["repair", "fix", "broken", "not working", "fan", "light"]):
            return {"service": "repairing", "sub_service": "general", "confidence_score": 0.85}
        return None

    forced = force_route(input_text_for_model)

    if forced:
        service = forced["service"]
        sub_service = forced["sub_service"]
        confidence = forced["confidence_score"]
        entities = extractor.extract(input_text_for_model)
    else:
        entities = extractor.extract(input_text_for_model)
        ml_result = handler.predict(input_text_for_model)
        service = ml_result["service"]
        sub_service = ml_result["sub_service"]
        confidence = float(ml_result["confidence_score"])

        if entities.get("service"):
            service = entities["service"]
        if entities.get("category"):
            sub_service = entities["category"]
        if entities:
            confidence = max(confidence, 0.90)
        if confidence < 0.60:
            service = "repairing"
            sub_service = "general"
            confidence = 0.50

    session_id, first_q = engine.start(service, sub_service, entities)
    TEXT_SESSION_LANGUAGE[session_id] = "sinhala" if is_sinhala else "english"

    first_q = _translate_question_for_language(first_q, TEXT_SESSION_LANGUAGE[session_id])

    db_manager.save_session({
        "id": session_id,
        "type": "text",
        "stage": "started",
        "service": service,
        "sub_service": sub_service,
        "confidence": confidence,
        "raw_text": text,
        "raw_text_en": input_text_for_model,
        "entities": entities,
        "app_lan": TEXT_SESSION_LANGUAGE[session_id],
        "seekerId": seeker_id,
        "answers": {}
    })

    return jsonify({
        "session_id": session_id,
        "service": service,
        "sub_service": sub_service,
        "confidence": confidence,
        "extracted_entities": entities,
        "next_question": first_q,
        "seekerId": seeker_id
    })


# =========================
# TEXT CHAT – Requires authentication
# =========================
@app.route("/text-chat", methods=["POST"])
def text_chat():
    data = request.json or {}
    session_id = data.get("session_id")
    answer = (data.get("answer") or "").strip()

    if not session_id:
        return jsonify({"error": "session_id is required"}), 400
    if not answer:
        return jsonify({"error": "answer is required"}), 400

    session_obj = db_manager.get_session(session_id)
    if session_obj is None:
        return jsonify({"error": "Session not found"}), 404

    if hasattr(session_obj, 'data'):
        session_data = session_obj.data
    else:
        session_data = session_obj

    auth_header = request.headers.get("Authorization")
    token_seeker_id = decode_jwt_token(auth_header)
    if token_seeker_id:
        session_data["seekerId"] = token_seeker_id
    elif data.get("seekerId"):
        session_data["seekerId"] = data["seekerId"]

    if not session_data.get("seekerId"):
        return jsonify({"error": "Authentication required. Please provide a valid token."}), 401

    if "answers" not in session_data:
        session_data["answers"] = {}

    session_language = TEXT_SESSION_LANGUAGE.get(
        session_id,
        data.get("app_lan", "english")
    )

    current_question = engine.get_current_question(session_id)
    is_text_input = (
        isinstance(current_question, dict)
        and current_question.get("type") == "text_input"
    )

    normalized_answer = answer
    if _is_sinhala_language(session_language) and not is_text_input:
        normalized_answer = translate_answer_to_english(answer)

    result = engine.answer(session_id, normalized_answer)

    step_num = len(session_data["answers"]) + 1
    session_data["answers"][f"step_{step_num}"] = answer
    db_manager.save_session(session_data)

    # Fallback: if engine returns request_summary directly
    if isinstance(result, dict) and "request_summary" in result:
        summary = build_summary_from_session(session_data)
        return jsonify({
            "success": True,
            "seekerId": session_data.get("seekerId"),
            "summary": summary,
            "message": "Service request completed."
        })

    if isinstance(result, dict) and result.get("finished", False):
        summary = build_summary_from_session(session_data)
        return jsonify({
            "success": True,
            "seekerId": session_data.get("seekerId"),
            "summary": summary,
            "message": "Service request completed."
        })

    if isinstance(result, dict) and "question" in result:
        result["question"] = _translate_question_for_language(
            result["question"],
            session_language
        )

    return jsonify(result)


# =========================
# GET SUMMARY – Requires authentication
# =========================
@app.route("/summary/<session_id>", methods=["GET"])
def get_summary(session_id):
    if not session_id:
        return jsonify({"error": "session_id is required"}), 400

    auth_header = request.headers.get("Authorization")
    seeker_id = decode_jwt_token(auth_header)
    if not seeker_id:
        return jsonify({"error": "Authentication required. Please provide a valid token."}), 401

    session_obj = db_manager.get_session(session_id)
    if session_obj is None:
        return jsonify({"error": "Session not found"}), 404

    if hasattr(session_obj, 'data'):
        session_data = session_obj.data
    else:
        session_data = session_obj

    if session_data.get("seekerId") != seeker_id:
        return jsonify({"error": "You are not authorized to view this session"}), 403

    summary = build_summary_from_session(session_data)

    return jsonify({
        "success": True,
        "seekerId": seeker_id,
        "session_id": session_id,
        "summary": summary
    })


# =========================
# HEALTH – Public
# =========================
@app.route("/", methods=["GET"])
def health():
    return jsonify({
        "status": "running",
        "service": "NLP Question Engine API with Provider Matching (JWT Auth)"
    })


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5002, debug=True)
