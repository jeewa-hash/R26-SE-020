from flask import Flask, request, jsonify
from flask_cors import CORS

from text_service.handler import TextHandler
from text_service.question_engine import QuestionEngine

# ✅ MongoDB connection
from api.db_adapter import db_manager   # change to "from db_adapter import db_manager" if needed

app = Flask(__name__)
CORS(app)

handler = TextHandler()
engine = QuestionEngine()


# ❌ REMOVED: SESSIONS (this was breaking MongoDB flow)


@app.route("/text-predict", methods=["POST"])
def text_predict():
    data = request.json or {}
    text = (data.get("text") or "").strip()

    if not text:
        return jsonify({"error": "text is required"}), 400

    # 🔵 ML prediction
    result = handler.predict(text)

    # 🔵 start session
    session_id, first_q = engine.start(
        result["service"],
        result["sub_service"]
    )

    # 🟢 SAVE TO MONGODB
    db_manager.save_session({
        "id": session_id,
        "type": "text",
        "stage": "started",
        "service": result["service"],
        "sub_service": result["sub_service"],
        "confidence": result["confidence_score"]
    })

    return jsonify({
        "session_id": session_id,
        "service": result["service"],
        "sub_service": result["sub_service"],
        "confidence": result["confidence_score"],
        "next_question": first_q
    })


@app.route("/text-chat", methods=["POST"])
def text_chat():
    data = request.json or {}

    session_id = data.get("session_id")
    answer = (data.get("answer") or "").strip()

    # ❌ REMOVED invalid session check (this was blocking MongoDB updates)
    if not session_id:
        return jsonify({"error": "session_id is required"}), 400

    # 🔵 process answer
    result = engine.answer(session_id, answer)

    # 🟢 UPDATE MONGODB
    db_manager.save_session({
        "id": session_id,
        "type": "text",
        "stage": "in_progress",
        "answer": answer,
        "engine_result": result
    })

    return jsonify(result)


if __name__ == "__main__":
    app.run(port=5002, debug=True)