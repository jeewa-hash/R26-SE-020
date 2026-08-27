import os
import io
import uuid
import requests
import numpy as np
import tensorflow as tf
import jwt

from PIL import Image
from fastapi import FastAPI, UploadFile, File, Body, Query, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from db_manager import db_manager

# --- Translator ---
from translator import (
    translate_payload,
    translate_answer_to_english,
    get_sinhala_translation
)

# --- MobileNet ---
from tensorflow.keras.applications.mobilenet_v2 import (
    MobileNetV2,
    preprocess_input,
    decode_predictions
)


# FASTAPI

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# PROVIDER SERVICE CONFIGURATION

PROVIDER_SERVICE_URL = "http://localhost:5000/portfolio/all-providers"

# --- JWT Configuration (read from .env) ---
JWT_SECRET = os.getenv("JWT_SECRET")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
if not JWT_SECRET:
    raise ValueError("JWT_SECRET not set in environment!")

# --- Security scheme for Swagger UI ---
security = HTTPBearer()

# DATA MAPPINGS

from constants import ISSUE_MAPPING

# OBJECT GROUP MAPPING
OBJECT_FLOW_MAP = {

    "Fan": "Fan",
    "TV": "TV",
    "Fridge": "Fridge",
    "Washing Machine": "Washing Machine",
    "Light": "Light",
    "Rice Cooker": "Rice Cooker",

    "Chair or stool": "Woodwork",
    "Dining table": "Woodwork",
    "Bed frame": "Woodwork",
    "Wardrobe / cupboard": "Cabinets & Doors",
    "Sofa / couch": "Upholstered Furniture",

    "Pipe": "Pipes",
    "Drain": "Blocked Drains",
    "Tap": "Taps & Toilets"
}


# MODEL SETUP

MODEL_PATH = "../models/repair_model_v1.h5"

model = tf.keras.models.load_model(MODEL_PATH)

CLASSES = [
    "electrical",
    "furniture",
    "other",
    "plumbing"
]

visual_identifier = MobileNetV2(weights="imagenet")

# IMAGE HELPER

def get_shared_tensor(image_bytes):

    img = Image.open(
        io.BytesIO(image_bytes)
    ).convert("RGB")

    img = img.resize((224, 224))

    arr = np.array(img)

    return np.expand_dims(arr, axis=0)


# SMART FLOW MATCHER

def get_matching_question_group(category, detected_object):

    if not detected_object:
        return None

    if category not in ISSUE_MAPPING:
        return None

    mapped_group = OBJECT_FLOW_MAP.get(
        detected_object
    )

    if not mapped_group:
        return None

    step2 = ISSUE_MAPPING[category]["steps"].get(
        2,
        {}
    )

    if "question" in step2:
        return None

    if detected_object in step2:
        return detected_object

    if mapped_group in step2:
        return mapped_group

    return None


# OBJECT DETECTION

def detect_object(base_tensor):

    mobile_x = preprocess_input(
        base_tensor.copy()
    )

    preds = visual_identifier.predict(
        mobile_x,
        verbose=0
    )

    top_10 = decode_predictions(
        preds,
        top=10
    )[0]

    for _, label, score in top_10:

        label = label.lower().replace(
            "_",
            " "
        )

        print(
            "Detected:",
            label,
            score
        )

        if any(
            x in label
            for x in ["fan", "blower"]
        ):
            return "Fan"

        elif any(
            x in label
            for x in ["television", "tv", "monitor"]
        ):
            return "TV"

        elif any(
            x in label
            for x in ["refrigerator", "fridge"]
        ):
            return "Fridge"

        elif any(
            x in label
            for x in ["washer", "washing machine"]
        ):
            return "Washing Machine"

        elif any(
            x in label
            for x in ["lamp", "light"]
        ):
            return "Light"

        elif any(
            x in label
            for x in ["oven", "microwave", "cooker"]
        ):
            return "Rice Cooker"

        elif any(
            x in label
            for x in ["chair", "seat", "stool"]
        ):
            return "Chair or stool"

        elif any(
            x in label
            for x in ["table", "desk"]
        ):
            return "Dining table"

        elif any(
            x in label
            for x in ["sofa", "couch"]
        ):
            return "Sofa / couch"

        elif "bed" in label:
            return "Bed frame"

        elif any(
            x in label
            for x in ["cabinet", "wardrobe", "cupboard"]
        ):
            return "Wardrobe / cupboard"

        elif any(
            x in label
            for x in ["pipe", "pipeline"]
        ):
            return "Pipe"

        elif "drain" in label:
            return "Drain"

        elif any(
            x in label
            for x in ["tap", "faucet"]
        ):
            return "Tap"

    return None


# -------------------------------------------------------------------
# PROVIDER MATCHING (UPDATED)
# -------------------------------------------------------------------

def normalize_service_category(value):
    """Normalize a category string for matching."""
    if not value:
        return ""
    value = str(value).lower().strip()
    value = value.replace("&", "and").replace("-", " ").replace("_", " ")
    return " ".join(value.split())

def get_provider_keywords(provider, portfolio):
    """Extract all service-related keywords from provider and portfolio."""
    keywords = set()
    
    # 1. Provider category
    if provider.get("category"):
        keywords.add(normalize_service_category(provider["category"]))
    
    # 2. Portfolio categories
    for cat in portfolio.get("categories", []):
        if cat:
            keywords.add(normalize_service_category(cat))
    
    # 3. Portfolio labels
    for label in portfolio.get("labels", []):
        if label:
            keywords.add(normalize_service_category(label))
    
    # 4. Specific labels
    for spec in portfolio.get("specific_labels", []):
        if spec:
            keywords.add(normalize_service_category(spec))
    
    # 5. Tags
    for tag in portfolio.get("tags", []):
        if tag:
            keywords.add(normalize_service_category(tag))
    
    return keywords

# GET ALL PROVIDERS
def get_all_providers():
    try:
        response = requests.get(PROVIDER_SERVICE_URL, timeout=10)
        print("[Provider Service]", response.status_code)
        if response.status_code != 200:
            return []
        data = response.json()
        providers = data.get("providers", [])
        return providers
    except Exception as err:
        print("[Provider Service] Error:", str(err))
        return []

# CATEGORY MATCHING (UPDATED)
def category_matches(requested_category, provider, portfolio):
    """
    Check if a provider matches the requested category.
    Considers provider.category, portfolio.categories, labels, specific_labels, and tags.
    """
    requested = normalize_service_category(requested_category)
    if not requested:
        return False

    # Build a set of normalized keywords from provider and portfolio
    keywords = get_provider_keywords(provider, portfolio)
    if not keywords:
        # Fallback: only provider.category (old behavior)
        provider_cat = normalize_service_category(provider.get("category", ""))
        return requested in provider_cat or provider_cat in requested

    # Define keyword lists per category
    if requested == "electrical":
        electrical_keywords = [
            "electrical", "electrician", "electrical repair", "electrical repairs",
            "electric repair", "appliance repair", "electric"
        ]
        for kw in keywords:
            if any(ek in kw for ek in electrical_keywords):
                return True
        return False

    elif requested == "plumbing":
        plumbing_keywords = ["plumbing", "plumber", "plumbing repair", "pipe repair"]
        for kw in keywords:
            if any(pk in kw for pk in plumbing_keywords):
                return True
        return False

    elif requested == "furniture":
        furniture_keywords = [
            "furniture", "carpentry", "carpenter", "woodwork", "wood working",
            "upholstery", "furniture repair"
        ]
        for kw in keywords:
            if any(fk in kw for fk in furniture_keywords):
                return True
        return False

    elif requested == "cleaning":
        cleaning_keywords = ["cleaning", "house cleaning", "home cleaning", "cleaner"]
        for kw in keywords:
            if any(ck in kw for ck in cleaning_keywords):
                return True
        return False

    else:
        # General match: check if requested is contained in any keyword
        for kw in keywords:
            if requested in kw or kw in requested:
                return True
        return False

# FILTER PROVIDERS (UPDATED)
def filter_matching_providers(category, providers, district=None):
    matching = []
    requested_category = normalize_service_category(category)
    requested_district = normalize_service_category(district) if district else None

    for item in providers:
        provider = item.get("provider", {})
        portfolio = item.get("portfolio", {})

        # Skip blocked
        if provider.get("isBlocked", False):
            continue

        # Category match (using new logic)
        if not category_matches(requested_category, provider, portfolio):
            continue

        # District match
        provider_district = normalize_service_category(provider.get("district", ""))
        district_match = True
        if requested_district:
            district_match = (requested_district == provider_district)

        provider_result = {
            "provider": provider,
            "portfolio": portfolio,
            "match": {
                "category_match": True,
                "district_match": district_match,
                "priority": "HIGH" if district_match else "NORMAL"
            }
        }
        matching.append(provider_result)

    # Sort: HIGH priority first
    matching.sort(key=lambda x: 0 if x["match"]["priority"] == "HIGH" else 1)
    return matching

# FIND PROVIDERS FOR REQUEST (updated to use new matching)
def find_matching_providers(category, answers):
    all_providers = get_all_providers()
    if not all_providers:
        return {
            "success": False,
            "total": 0,
            "providers": [],
            "message": "Unable to retrieve providers from provider service."
        }

    # Extract address and district
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
    
    # If district was found, keep only those with district match
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


# ============================================================
#  START FLOW – WITH JWT VALIDATION
# ============================================================

@app.post("/predict")
async def start_service_flow(
    file: UploadFile = File(...),
    seekerId: str = Query(None),
    language: str = Query("en"),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):

    # Extract token from credentials
    token = credentials.credentials

    # --------------------------------------------------------
    # 1. Validate JWT token and extract user ID
    # --------------------------------------------------------
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM])
        user_data = payload.get("user", {})
        token_seeker_id = user_data.get("id")
        if not token_seeker_id:
            return {
                "success": False,
                "message": "User ID not found in token payload"
            }
    except jwt.ExpiredSignatureError:
        return {
            "success": False,
            "message": "Token has expired. Please log in again."
        }
    except jwt.InvalidTokenError as e:
        return {
            "success": False,
            "message": f"Invalid token: {str(e)}"
        }

    # If seekerId was provided in query, verify it matches the token
    if seekerId and seekerId != token_seeker_id:
        return {
            "success": False,
            "message": "Provided seekerId does not match the authenticated user."
        }

    # Use the ID from the token
    seekerId = token_seeker_id

    # --------------------------------------------------------
    # 2. Process the image as before
    # --------------------------------------------------------
    contents = await file.read()
    base_tensor = get_shared_tensor(contents)

    # CATEGORY PREDICTION
    domain_input = base_tensor / 255.0
    preds = model.predict(domain_input, verbose=0)
    best_idx = np.argmax(preds[0])
    conf_score = float(preds[0][best_idx])
    category = CLASSES[best_idx]
    confidence_str = f"{round(conf_score * 100, 2)}%"

    # OTHER category
    if category == "other":
        session_id = f"REPAIR-{uuid.uuid4().hex[:4].upper()}"
        agent_text = "Sorry, we can't identify a valid repair category for this issue."
        if language == "si":
            agent_text = get_sinhala_translation(agent_text)

        session_data = {
            "id": session_id,
            "seekerId": seekerId,
            "category": category,
            "object": None,
            "flow_group": None,
            "confidence": confidence_str,
            "language": language,
            "answers": {},
            "step2_answer": None,
            "current_step": 0
        }
        db_manager.save_session(session_data)

        return {
            "session_id": session_id,
            "seekerId": seekerId,
            "confidence": confidence_str,
            "detected_object": None,
            "detected_group": None,
            "agent_speech": agent_text,
            "next_question": {
                "question": agent_text,
                "options": []
            }
        }

    # OBJECT DETECTION
    identified_item = detect_object(base_tensor)
    matched_group = get_matching_question_group(category, identified_item)

    session_id = f"REPAIR-{uuid.uuid4().hex[:4].upper()}"
    current_step = 2 if matched_group else 1

    # Save session
    session_data = {
        "id": session_id,
        "seekerId": seekerId,
        "category": category,
        "object": identified_item,
        "flow_group": matched_group,
        "confidence": confidence_str,
        "language": language,
        "answers": {},
        "step2_answer": None,
        "current_step": current_step
    }
    db_manager.save_session(session_data)

    flow = ISSUE_MAPPING[category]
    if matched_group:
        raw_q = flow["steps"][2][matched_group]
        next_q = {"question": raw_q["question"], "options": raw_q["options"]}
    else:
        next_q = flow["steps"][1]

    agent_text = f"I've identified a {category} issue."
    if language == "si":
        agent_text = get_sinhala_translation(agent_text)

    return {
        "session_id": session_id,
        "seekerId": seekerId,
        "confidence": confidence_str,
        "detected_object": identified_item,
        "detected_group": matched_group,
        "agent_speech": agent_text,
        "next_question": translate_payload(next_q, language)
    }


# ============================================================
# NEXT FLOW STEP
# ============================================================

@app.post("/flow/next")
async def get_next_step(
    body: dict = Body(...)
):

    session_id = body.get("session_id")
    raw_answer = body.get("answer")

    if not session_id:
        return {
            "success": False,
            "message": "Session ID is required."
        }

    if raw_answer is None:
        return {
            "success": False,
            "message": "Answer is required."
        }

    session = db_manager.get_session(session_id)

    if not session:
        return {
            "success": False,
            "message": "Invalid session"
        }

    seeker_id = getattr(session, "seekerId", None)
    if not seeker_id:
        return {
            "success": False,
            "message": "Seeker ID not found in session."
        }

    language = getattr(session, "language", "en")

    answer = (
        translate_answer_to_english(raw_answer)
        if language == "si"
        else raw_answer
    )

    cat = session.category
    step = session.current_step
    answers = session.answers or {}
    answers[f"step_{step}"] = answer
    session.answers = answers

    if step == 1:
        session.object = answer
        session.flow_group = answer

    if step == 2:
        session.step2_answer = answer

    db_manager.save_session(session)

    next_step = step + 1
    flow_steps = ISSUE_MAPPING[cat]["steps"]

    if next_step not in flow_steps:
        summary = build_summary(session, answers)
        return {
            "success": True,
            "seekerId": seeker_id,
            "summary": summary
        }

    raw_next = flow_steps[next_step]
    flow_group = getattr(session, "flow_group", None)
    step2_ans = getattr(session, "step2_answer", None)

    def resolve_question(q_node):
        if "question" in q_node:
            return q_node
        if answer and answer in q_node:
            return resolve_question(q_node[answer])
        if step2_ans and step2_ans in q_node:
            return resolve_question(q_node[step2_ans])
        if flow_group and flow_group in q_node:
            return resolve_question(q_node[flow_group])
        if "default" in q_node:
            return resolve_question(q_node["default"])
        return resolve_question(next(iter(q_node.values())))

    next_q = resolve_question(raw_next)
    session.current_step = next_step
    db_manager.save_session(session)

    return {
        "session_id": session_id,
        "seekerId": seeker_id,
        "next_question": translate_payload(next_q, language)
    }


# ============================================================
# STEP LABELS
# ============================================================

STEP_LABELS = {

    "electrical": {
        1: "Appliance",
        2: "Symptom",
        3: "Symptom Detail",
        4: "Safety Risk",
        5: "Urgency",
        6: "Address"
    },

    "furniture": {
        1: "Furniture Type",
        2: "Problem",
        3: "Problem Detail",
        4: "Material",
        5: "On-Site Possible",
        6: "Urgency",
        7: "Address"
    },

    "plumbing": {
        1: "Issue Area",
        2: "Specific Issue",
        3: "Issue Detail",
        4: "Water Flow Status",
        5: "Immediate Risk",
        6: "Urgency",
        7: "Address"
    }
}


# ============================================================
# URGENCY
# ============================================================

def resolve_urgency(
    answers: dict
) -> str:

    urgency_map = {

        "flexible":
            "Low — Flexible scheduling",

        "within 24 hours":
            "Medium — Within 24 hours",

        "urgent":
            "High — Urgent, needs immediate attention",

        "emergency":
            "Critical — Emergency service required",

        "flooding occurring":
            "Critical — Emergency (flooding)",

        "water spreading fast":
            "Critical — Emergency (water spreading)",

        "sparks visible":
            "Critical — Emergency (electrical sparks)",

        "no immediate risk":
            "Low — No immediate risk",

        "bad smell present":
            "Medium — Needs prompt attention (odour)",

        "burning smell":
            "High — Urgent (burning smell detected)",

        "power trips happening":
            "High — Urgent (power tripping)"
    }

    for val in answers.values():

        if val:

            normalized = val.strip().lower()

            for key, label in urgency_map.items():

                if key in normalized:

                    return label

    return "Unknown"


# ============================================================
# DESCRIPTION
# ============================================================

def generate_brief_description(
    category,
    answers,
    detected_object
):

    vals = [
        v
        for v in answers.values()
        if v
    ]

    if category == "electrical":

        appliance = (
            answers.get("step_1")
            or detected_object
            or "an electrical appliance"
        )

        symptom = answers.get(
            "step_2",
            "an issue"
        )

        detail = answers.get(
            "step_3",
            ""
        )

        risk = answers.get(
            "step_4",
            "no known risk"
        )

        urgency = answers.get(
            "step_5",
            "flexible timing"
        )

        address = answers.get(
            "step_6",
            "address not provided"
        )

        return (
            f"The customer has reported a problem "
            f"with their {appliance}. "
            f"The appliance is experiencing "
            f"'{symptom}'"
            f"{f', specifically described as: {detail}' if detail else ''}. "
            f"Safety assessment indicates: {risk}. "
            f"Service is requested with {urgency} "
            f"and the job location is {address}."
        )

    elif category == "furniture":

        ftype = answers.get(
            "step_1",
            "furniture"
        )

        problem = answers.get(
            "step_2",
            "a problem"
        )

        detail = answers.get(
            "step_3",
            ""
        )

        material = answers.get(
            "step_4",
            "unknown material"
        )

        onsite = answers.get(
            "step_5",
            "not specified"
        )

        urgency = answers.get(
            "step_6",
            "flexible"
        )

        address = answers.get(
            "step_7",
            "address not provided"
        )

        return (
            f"The customer requires repair "
            f"for their {ftype}. "
            f"The reported problem is '{problem}'"
            f"{f', with further detail: {detail}' if detail else ''}. "
            f"The furniture material is {material}. "
            f"On-site work: {onsite}. "
            f"Service is needed with {urgency} "
            f"scheduling at {address}."
        )

    elif category == "plumbing":

        area = answers.get(
            "step_1",
            "a plumbing area"
        )

        issue = answers.get(
            "step_2",
            "an issue"
        )

        detail = answers.get(
            "step_3",
            ""
        )

        flow = answers.get(
            "step_4",
            "unknown"
        )

        risk = answers.get(
            "step_5",
            "no known risk"
        )

        urgency = answers.get(
            "step_6",
            "flexible"
        )

        address = answers.get(
            "step_7",
            "address not provided"
        )

        return (
            f"A plumbing issue has been reported "
            f"in the {area} area. "
            f"The specific problem is '{issue}'"
            f"{f', described further as: {detail}' if detail else ''}. "
            f"Current water flow status: {flow}. "
            f"Immediate risk level: {risk}. "
            f"Service urgency is {urgency} "
            f"and the address is {address}."
        )

    return (
        f"A {category} service request has been submitted. "
        f"Details collected: {', '.join(vals)}."
    )


# ============================================================
# PROVIDER MATCHING CRITERIA
# ============================================================

def build_provider_criteria(
    category,
    answers,
    urgency_level
):

    address = None

    for step_key in [
        "step_6",
        "step_7",
        "step_5"
    ]:

        if answers.get(step_key):

            address = answers[
                step_key
            ]

            break

    is_urgent = any(
        word in urgency_level.lower()
        for word in [
            "urgent",
            "critical",
            "emergency",
            "high"
        ]
    )

    criteria = {

        "service_category":
            category,

        "urgency_level":
            urgency_level,

        "is_urgent":
            is_urgent,

        "service_location":
            address,

        "provider_tags":
            [],

        "match_priority":
            "HIGH"
            if is_urgent
            else "NORMAL"
    }

    if category == "electrical":

        appliance = answers.get(
            "step_1",
            ""
        ).lower()

        risk = answers.get(
            "step_4",
            ""
        ).lower()

        criteria[
            "provider_tags"
        ].append(
            "electrician"
        )

        if (
            "fridge" in appliance
            or "washing" in appliance
        ):

            criteria[
                "provider_tags"
            ].append(
                "appliance_repair"
            )

        if any(
            x in risk
            for x in [
                "sparks",
                "burning",
                "trip"
            ]
        ):

            criteria[
                "provider_tags"
            ].append(
                "electrical_safety"
            )

            criteria[
                "match_priority"
            ] = "HIGH"

    elif category == "furniture":

        ftype = answers.get(
            "step_1",
            ""
        ).lower()

        material = answers.get(
            "step_4",
            ""
        ).lower()

        criteria[
            "provider_tags"
        ].append(
            "furniture_repair"
        )

        if (
            "upholstered" in ftype
            or "sofa" in ftype
        ):

            criteria[
                "provider_tags"
            ].append(
                "upholstery"
            )

        if (
            "wood" in material
            or "woodwork" in ftype
        ):

            criteria[
                "provider_tags"
            ].append(
                "carpentry"
            )

        if "outdoor" in ftype:

            criteria[
                "provider_tags"
            ].append(
                "outdoor_repair"
            )

    elif category == "plumbing":

        area = answers.get(
            "step_1",
            ""
        ).lower()

        criteria[
            "provider_tags"
        ].append(
            "plumber"
        )

        if "burst" in answers.get(
            "step_2",
            ""
        ).lower():

            criteria[
                "provider_tags"
            ].append(
                "emergency_plumbing"
            )

            criteria[
                "match_priority"
            ] = "HIGH"

        if (
            "drain" in area
            or "blocked" in area
        ):

            criteria[
                "provider_tags"
            ].append(
                "drain_specialist"
            )

    return criteria


# ============================================================
# MASTER SUMMARY
# ============================================================

def build_summary(
    session,
    answers
):

    category = session.category

    # IMPORTANT:
    # Get seeker ID from the saved session
    seeker_id = getattr(
        session,
        "seekerId",
        None
    )

    detected_obj = getattr(
        session,
        "object",
        None
    )

    confidence = getattr(
        session,
        "confidence",
        "N/A"
    )

    session_id = getattr(
        session,
        "id",
        "N/A"
    )

    language = getattr(
        session,
        "language",
        "en"
    )

    labels = STEP_LABELS.get(
        category,
        {}
    )

    step_breakdown = []

    for step_key, raw_answer in answers.items():

        try:

            step_num = int(
                step_key.replace(
                    "step_",
                    ""
                )
            )

        except ValueError:

            continue

        label = labels.get(
            step_num,
            f"Step {step_num}"
        )

        step_breakdown.append({
            "step": step_num,
            "label": label,
            "answer": raw_answer
        })

    step_breakdown.sort(
        key=lambda x: x["step"]
    )

    # --------------------------------------------------------
    # URGENCY
    # --------------------------------------------------------

    urgency_level = resolve_urgency(
        answers
    )

    # --------------------------------------------------------
    # DESCRIPTION
    # --------------------------------------------------------

    brief_description = generate_brief_description(
        category,
        answers,
        detected_obj
    )

    # --------------------------------------------------------
    # MATCHING CRITERIA
    # --------------------------------------------------------

    provider_criteria = build_provider_criteria(
        category,
        answers,
        urgency_level
    )

    # --------------------------------------------------------
    # ACTUAL PROVIDER MATCHING
    # --------------------------------------------------------

    provider_matching = find_matching_providers(
        category,
        answers
    )

    # --------------------------------------------------------
    # RETURN
    # --------------------------------------------------------

    return {

        # IMPORTANT
        "seekerId":
            seeker_id,

        "session_id":
            session_id,

        "language":
            language,

        "detected_category":
            category,

        "detected_object":
            detected_obj,

        "model_confidence":
            confidence,

        "step_breakdown":
            step_breakdown,

        "brief_description":
            brief_description,

        "urgency_level":
            urgency_level,

        "provider_matching": {

            "status":
                "READY",

            "criteria":
                provider_criteria,

            "total_matched_providers":
                provider_matching["total"],

            "district_used":
                provider_matching.get(
                    "district_used"
                ),

            "providers":
                provider_matching["providers"],

            "message":
                (
                    f"Found "
                    f"{provider_matching['total']} "
                    f"matching provider(s) for "
                    f"{category}."
                )
        }
    }


# ============================================================
# SUMMARY ENDPOINT
# ============================================================

@app.get("/summary/{session_id}")
async def get_summary(
    session_id: str
):

    session = db_manager.get_session(
        session_id
    )

    if not session:

        return {
            "success": False,
            "message": "Session not found"
        }

    answers = (
        getattr(
            session,
            "answers",
            {}
        )
        or {}
    )

    seeker_id = getattr(
        session,
        "seekerId",
        None
    )

    summary = build_summary(
        session,
        answers
    )

    return {

        "success": True,

        "seekerId": seeker_id,

        "summary": summary
    }


# ============================================================
# MAIN
# ============================================================

if __name__ == "__main__":

    import uvicorn

    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000
    )