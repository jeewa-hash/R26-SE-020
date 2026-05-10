from flask import Flask, request, jsonify
from flask_cors import CORS

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
# INIT
# =========================
handler = TextHandler()
engine = QuestionEngine()
extractor = EntityExtractor()

TEXT_SESSION_LANGUAGE = {}

# =========================
# LANGUAGE HELPERS
# =========================
def _is_sinhala_language(language_value):
    return (language_value or "").strip().lower() in {
        "sinhala", "si", "sinh"
    }


def _translate_question_for_language(question_payload, language):
    target = "sinhala" if _is_sinhala_language(language) else "english"
    return translate_payload(question_payload, target)


# =========================
# 🔥 INTENT OVERRIDE (MOST IMPORTANT FIX)
# =========================
def force_route(text):
    text = text.lower()

    # 🌿 GARDENING FIRST PRIORITY
    if any(k in text for k in ["grass", "lawn", "garden", "cutting grass", "mowing"]):
        return {
            "service": "gardening",
            "sub_service": "maintenance",
            "confidence_score": 0.95
        }

    # 🧹 CLEANING
    if any(k in text for k in ["clean", "dust", "sofa", "bathroom"]):
        return {
            "service": "cleaning",
            "sub_service": "general",
            "confidence_score": 0.90
        }

    # 🔧 REPAIRING
    if any(k in text for k in ["repair", "fix", "broken", "not working", "fan", "light"]):
        return {
            "service": "repairing",
            "sub_service": "general",
            "confidence_score": 0.85
        }

    return None


# =========================
# TEXT PREDICT
# =========================
@app.route("/text-predict", methods=["POST"])
def text_predict():

    data = request.json or {}
    text = (data.get("text") or "").strip()
    app_lan = data.get("app_lan", "english")

    if not text:
        return jsonify({"error": "text is required"}), 400

    is_sinhala = _is_sinhala_language(app_lan)

    # =========================
    # TRANSLATE INPUT
    # =========================
    input_text_for_model = (
        translate_answer_to_english(text)
        if is_sinhala else text
    )

    # =========================
    # 🚨 1. FORCE ROUTING FIRST (CRITICAL FIX)
    # =========================
    forced = force_route(input_text_for_model)

    if forced:
        service = forced["service"]
        sub_service = forced["sub_service"]
        confidence = forced["confidence_score"]
        entities = extractor.extract(input_text_for_model)

    else:
        # =========================
        # 2. ENTITY EXTRACTION
        # =========================
        entities = extractor.extract(input_text_for_model)

        # =========================
        # 3. ML PREDICTION
        # =========================
        ml_result = handler.predict(input_text_for_model)

        service = ml_result["service"]
        sub_service = ml_result["sub_service"]
        confidence = float(ml_result["confidence_score"])

        # =========================
        # ENTITY OVERRIDE (SAFE)
        # =========================
        if entities.get("service"):
            service = entities["service"]

        if entities.get("category"):
            sub_service = entities["category"]

        if entities:
            confidence = max(confidence, 0.90)

        # =========================
        # FALLBACK
        # =========================
        if confidence < 0.60:
            service = "repairing"
            sub_service = "general"
            confidence = 0.50

    # =========================
    # RESULT
    # =========================
    result = {
        "service": service,
        "sub_service": sub_service,
        "confidence_score": confidence,
        "extracted_entities": entities
    }

    # =========================
    # START SESSION
    # =========================
    session_id, first_q = engine.start(
        service,
        sub_service,
        entities
    )

    TEXT_SESSION_LANGUAGE[session_id] = (
        "sinhala" if is_sinhala else "english"
    )

    first_q = _translate_question_for_language(
        first_q,
        TEXT_SESSION_LANGUAGE[session_id]
    )

    # =========================
    # SAVE DB
    # =========================
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
        "app_lan": TEXT_SESSION_LANGUAGE[session_id]
    })

    return jsonify({
        "session_id": session_id,
        "service": service,
        "sub_service": sub_service,
        "confidence": confidence,
        "extracted_entities": entities,
        "next_question": first_q
    })


# =========================
# TEXT CHAT
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

    if isinstance(result, dict) and "question" in result:
        result["question"] = _translate_question_for_language(
            result["question"],
            session_language
        )

    db_manager.save_session({
        "id": session_id,
        "type": "text",
        "stage": "in_progress",
        "answer": answer,
        "answer_en": normalized_answer,
        "app_lan": session_language,
        "engine_result": result
    })

    return jsonify(result)


# =========================
# HEALTH
# =========================
@app.route("/", methods=["GET"])
def health():
    return jsonify({
        "status": "running",
        "service": "NLP Question Engine API"
    })


# =========================
# RUN
# =========================
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5002, debug=True)