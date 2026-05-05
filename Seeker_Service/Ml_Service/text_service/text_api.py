from flask import Flask, request, jsonify
from flask_cors import CORS

from text_service.handler import TextHandler
from text_service.question_engine import QuestionEngine
from api.db_adapter import db_manager
from api.translations import translate_payload, translate_answer_to_english

app = Flask(__name__)
CORS(app)

handler = TextHandler()
engine = QuestionEngine()
TEXT_SESSION_LANGUAGE = {}


def _is_sinhala_language(language_value):
    normalized = (language_value or "").strip().lower()
    return normalized in {"sinhala", "si", "sinh"}


def _translate_question_for_language(question_payload, language):
    target = "sinhala" if _is_sinhala_language(language) else "english"
    return translate_payload(question_payload, target)


# =========================
# 🔥 SMART INTENT ROUTER (FIXED)
# =========================
def keyword_router(text):
    text = text.lower()

    # 🔧 REPAIR INTENT STRONG SIGNALS
    repair_keywords = [
        "repair", "repiar", "fix", "broken", "not working",
        "fan", "switch", "light", "motor", "electric"
    ]

    # 🧹 CLEANING INTENT
    cleaning_keywords = [
        "clean", "cleaning", "dust", "sofa",
        "bathroom", "kitchen", "floor"
    ]

    repair_score = sum(1 for w in repair_keywords if w in text)
    cleaning_score = sum(1 for w in cleaning_keywords if w in text)

    # 🔥 HARD OVERRIDE RULE (IMPORTANT FIX)
    if "fan" in text and any(x in text for x in ["repair", "fix", "broken", "not working"]):
        return {
            "service": "repairing",
            "sub_service": "fan",
            "confidence_score": 0.99
        }

    if repair_score > cleaning_score:
        return {
            "service": "repairing",
            "sub_service": "general",
            "confidence_score": 0.90
        }

    if cleaning_score > repair_score:
        return {
            "service": "cleaning",
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
    is_sinhala = _is_sinhala_language(app_lan)

    if not text:
        return jsonify({"error": "text is required"}), 400

    input_text_for_model = translate_answer_to_english(text) if is_sinhala else text

    # =========================
    # 1. ML PREDICTION (PRIMARY)
    # =========================
    ml_result = handler.predict(input_text_for_model)

    service = ml_result["service"]
    sub_service = ml_result["sub_service"]
    confidence = ml_result["confidence_score"]

    # =========================
    # 2. LOW CONFIDENCE FALLBACK
    # =========================
    if confidence < 0.60:
        text_l = input_text_for_model.lower()

        if any(k in text_l for k in ["clean", "dust", "sofa", "bath"]):
            service = "cleaning"
            sub_service = "general"

        elif any(k in text_l for k in ["repair", "fix", "broken", "not working"]):
            service = "repairing"
            sub_service = "general"

        else:
            service = "repairing"
            sub_service = "general"

    # =========================
    # 3. SMART SUBSERVICE FIX
    # =========================
    text_l = input_text_for_model.lower()

    repair_map = {
        "fan": "fan",
        "light": "light",
        "switch": "electric",
        "tv": "tv",
        "fridge": "fridge",
        "pipe": "pipe",
        "tap": "tap",
        "chair": "chair"
    }

    for k, v in repair_map.items():
        if k in text_l:
            sub_service = v
            break

    result = {
        "service": service,
        "sub_service": sub_service,
        "confidence_score": float(confidence)
    }

    # =========================
    # START SESSION
    # =========================
    session_id, first_q = engine.start(
        result["service"],
        result["sub_service"]
    )
    TEXT_SESSION_LANGUAGE[session_id] = "sinhala" if is_sinhala else "english"
    first_q = _translate_question_for_language(first_q, TEXT_SESSION_LANGUAGE[session_id])

    db_manager.save_session({
        "id": session_id,
        "type": "text",
        "stage": "started",
        "service": result["service"],
        "sub_service": result["sub_service"],
        "confidence": result["confidence_score"],
        "raw_text": text,
        "raw_text_en": input_text_for_model,
        "app_lan": TEXT_SESSION_LANGUAGE[session_id]
    })

    return jsonify({
        "session_id": session_id,
        "service": result["service"],
        "sub_service": result["sub_service"],
        "confidence": result["confidence_score"],
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

    session_language = TEXT_SESSION_LANGUAGE.get(session_id, data.get("app_lan", "english"))
    current_question = engine.get_current_question(session_id)
    is_text_input = (
        isinstance(current_question, dict)
        and current_question.get("type") == "text_input"
    )

    # For option-based routing, convert Sinhala answer to English first.
    normalized_answer = answer
    if _is_sinhala_language(session_language) and not is_text_input:
        normalized_answer = translate_answer_to_english(answer)

    # process answer
    result = engine.answer(session_id, normalized_answer)

    if isinstance(result, dict) and "question" in result:
        result["question"] = _translate_question_for_language(result["question"], session_language)

    # save to DB
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
# RUN APP
# =========================
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5002, debug=True)