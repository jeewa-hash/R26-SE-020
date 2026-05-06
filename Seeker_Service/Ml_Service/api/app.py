from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import uuid
from datetime import datetime
from werkzeug.utils import secure_filename

# Modular Imports
from constants import ISSUE_MAPPING
from ml_handler import MLHandler
from db_adapter import db_manager, SessionProxy 
from engine import ConversationEngine
from translations import translate_payload, translate_answer_to_english, get_sinhala_translation

app = Flask(__name__)
CORS(app)
print("Flask app and CORS initialized.")

# Configuration
base_dir = os.path.dirname(os.path.abspath(__file__))
app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{os.path.join(base_dir, "../service_discovery.db")}'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['UPLOAD_FOLDER'] = os.path.join(base_dir, '../uploads')

# Ensure upload directory exists
print(f"Ensuring upload folder exists: {app.config['UPLOAD_FOLDER']}")
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# Initialize Database
print("Initializing stable database...")
# db_manager handles initialization in its constructor
print("Database initialized.")

# Initialize ML Handler
print("Initializing ML Handler...")
ml_handler = MLHandler()
print("ML Handler initialized.")
print("ML Handler initialized.")

HIGH_CONFIDENCE_THRESHOLD = 0.70
MEDIUM_CONFIDENCE_THRESHOLD = 0.35


def _is_sinhala_language(language_value):
    normalized = (language_value or "").strip().lower()
    return normalized in {"sinhala", "si", "sinh"}


def _translate_for_session(session, payload):
    if not payload:
        return payload
    app_lan = getattr(session, "app_lan", "english")
    language = "sinhala" if _is_sinhala_language(app_lan) else "english"
    return translate_payload(payload, language)


def _translate_text_for_session(session, text):
    if _is_sinhala_language(getattr(session, "app_lan", "english")):
        return get_sinhala_translation(text)
    return text


def _get_step_config(category, step):
    category_cfg = ISSUE_MAPPING.get(category, {})
    return category_cfg.get("steps", {}).get(step)


def _save_answer_for_current_step(session, answer):
    """Store answer consistently for current category + step."""
    category = session.category
    step = session.step
    step_cfg = _get_step_config(category, step)

    if step_cfg is None:
        return

    # Standard question block contains direct "question"/"options"
    is_standard = isinstance(step_cfg, dict) and "question" in step_cfg

    if category == "electrical":
        if step == 1:
            session.service_type = answer
        elif step == 2:
            session.details = answer
        elif step == 3:
            session.sub_service_type = answer
        elif step == 4:
            session.urgency = answer
        elif step == 5:
            session.room_location = answer
        return

    if category == "plumbing":
        if step == 1:
            session.details = answer
        elif step == 2:
            session.room_location = answer
        elif step == 3:
            session.sub_service_type = answer
        elif step == 4:
            session.urgency = answer
        elif step == 5:
            session.location_address = answer
        return

    if category == "furniture":
        # Step 2 in furniture is conditional based on selected furniture type.
        if step == 1:
            session.service_type = answer
        elif step == 2:
            session.details = answer
        elif step == 3:
            # Step 3 is conditional for furniture; always persist the selected support detail.
            session.sub_service_type = answer
        elif step == 4:
            session.urgency = answer
        elif step == 5:
            # Store on-site/pickup preference in existing field.
            session.usability = answer
        elif step == 6:
            session.room_location = answer


def _build_final_decision(session):
    """Create final decision payload for downstream provider matching."""
    issue_parts = [session.service_type, session.details, session.sub_service_type]
    issue_parts = [part for part in issue_parts if part]
    issue_summary = " | ".join(issue_parts) if issue_parts else "General inspection needed"

    location_parts = [session.room_location, session.location_address]
    location_parts = [part for part in location_parts if part]
    location_summary = ", ".join(location_parts) if location_parts else "Location not provided"

    decision = {
        "service_category": session.category,
        "detected_object": session.object_name,
        "confidence": session.confidence,
        "issue_summary": issue_summary,
        "urgency": session.urgency or "Not specified",
        "location_summary": location_summary,
        "provider_search_ready": True
    }

    if session.latitude and session.longitude:
        decision["gps"] = {
            "lat": session.latitude,
            "lng": session.longitude
        }

    return decision


def _set_identified_item_for_step1(session, category, identified_item):
    """Store inferred Step 1 answer in the correct field."""
    if category == "plumbing":
        session.details = identified_item
    else:
        session.service_type = identified_item


def _build_step1_question_for_category(category):
    """Return Step-1 question/options for a chosen category with manual fallback."""
    step1_cfg = _get_step_config(category, 1) or {}
    options = list(step1_cfg.get("options", []))
    if "Other (type manually)" not in options:
        options.append("Other (type manually)")
    return {
        "step": 1,
        "type": "standard",
        "question": step1_cfg.get("question", "Please choose the item/problem type."),
        "options": options
    }

@app.route('/predict', methods=['POST'])
def predict():
    if 'image' not in request.files:
        return jsonify({'error': 'No image provided'}), 400
    
    file = request.files['image']
    if file.filename == '':
        return jsonify({'error': 'Empty filename'}), 400

    filename = secure_filename(f"{uuid.uuid4()}_{file.filename}")
    temp_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    file.save(temp_path)

    try:
        result = ml_handler.predict(temp_path)
        if not result.get('success'):
            return jsonify({'error': result.get('error', 'Unknown ML error')}), 500

        category = result['category']
        identified_item = result['problem_type'] # e.g. "Fan", "Chair"
        confidence = result['confidence_score']
        object_name = result['detected_object']
        
        confidence_str = f"{confidence*100:.2f}%"

        # Create Persistent Session with readable ID (e.g. REPAIR-A7B2)
        session_id = f"REPAIR-{str(uuid.uuid4().hex[:4].upper())}"
        app_lan_raw = request.form.get('app_lan', 'english')
        app_lan = 'sinhala' if _is_sinhala_language(app_lan_raw) else 'english'
        print(f"DEBUG: /predict app_lan parsed as: {app_lan}")
        session = SessionProxy({
            "id": session_id,
            "app_lan": app_lan,
            "step": 1,
            "category": category,
            "object_name": object_name,
            "service_type": None,
            "sub_service_type": None,
            "confidence": confidence_str,
            "details": None,
            "room_location": None,
            "urgency": None,
            "usability": None,
            "location_address": None,
            "latitude": None,
            "longitude": None,
            "pending_identified_item": None,
            "manual_category_selection": False,
            "manual_item_selection": False,
            "created_at": datetime.utcnow().isoformat()
        })

        # High confidence: skip Step 1 and go straight to next practical question.
        if confidence >= HIGH_CONFIDENCE_THRESHOLD and identified_item:
            session.step = 2
            _set_identified_item_for_step1(session, category, identified_item)
            session.pending_identified_item = None
            db_manager.save_session(session)
            
            next_question = ConversationEngine.get_next_question(session)
            return jsonify({
                'session_id': session.id,
                'object': session.object_name,
                'confidence': confidence_str,
                'detected_item': identified_item,
                'next_question': _translate_for_session(session, next_question)
            })

        # Default Step 1
        session.step = 1
        session.pending_identified_item = None

        # Medium confidence: ask confirmation instead of showing same item in options.
        if confidence >= MEDIUM_CONFIDENCE_THRESHOLD and identified_item:
            session.pending_identified_item = identified_item
            session.manual_category_selection = False
            session.manual_item_selection = False
            db_manager.save_session(session)
            confirmation_question = {
                'step': 1,
                'type': 'confirmation',
                'question': f"Does your issue involve a {identified_item}?",
                'options': ["Yes", "No, choose category"]
            }
            return jsonify({
                'session_id': session.id,
                'object': session.object_name,
                'confidence': confidence_str,
                'detected_item': identified_item,
                'next_question': _translate_for_session(session, confirmation_question)
            })

        db_manager.save_session(session)

        next_q = _translate_for_session(session, ConversationEngine.get_next_question(session))

        return jsonify({
            'session_id': session.id,
            'object': session.object_name,
            'confidence': confidence_str,
            'next_question': next_q
        })

    except Exception as e:
        if os.path.exists(temp_path): os.remove(temp_path)
        return jsonify({'error': str(e)}), 500

@app.route('/chat', methods=['POST'])
def chat():
    data = request.json
    session_id = data.get('session_id')
    answer = data.get('answer')

    session = db_manager.get_session(session_id)
    if not session:
        return jsonify({'error': 'Invalid session ID'}), 400

    normalized_answer = answer
    if _is_sinhala_language(getattr(session, "app_lan", "english")) and isinstance(answer, str):
        normalized_answer = translate_answer_to_english(answer)

    # Handle optional Step 1 confirmation flow.
    pending_item = getattr(session, "pending_identified_item", None)
    if session.step == 1 and pending_item:
        normalized = (normalized_answer or "").strip().lower()
        if normalized == "yes":
            _set_identified_item_for_step1(session, session.category, pending_item)
            session.pending_identified_item = None
            session.manual_category_selection = False
            session.manual_item_selection = False
            session.step = 2
            db_manager.save_session(session)
            return jsonify({
                'session_id': session.id,
                'next_question': _translate_for_session(session, ConversationEngine.get_next_question(session))
            })

        if normalized.startswith("no"):
            session.pending_identified_item = None
            session.manual_category_selection = True
            session.manual_item_selection = False
            db_manager.save_session(session)
            category_question = {
                'step': 1,
                'type': 'category_selection',
                'question': "Please choose the correct service category first:",
                'options': ["Electrical", "Plumbing", "Furniture"]
            }
            return jsonify({
                'session_id': session.id,
                'next_question': _translate_for_session(session, category_question)
            })

        return jsonify({
            'error': "Please answer Step 1 confirmation with 'Yes' or 'No, choose category'."
        }), 400

    # If user rejected AI hint, enforce category selection first.
    if session.step == 1 and getattr(session, "manual_category_selection", False):
        category_map = {
            "electrical": "electrical",
            "plumbing": "plumbing",
            "furniture": "furniture"
        }
        selected = (normalized_answer or "").strip().lower()
        if selected not in category_map:
            return jsonify({
                'error': _translate_text_for_session(session, "Please choose one category: Electrical, Plumbing, or Furniture.")
            }), 400

        session.category = category_map[selected]
        session.manual_category_selection = False
        session.manual_item_selection = True
        # Clear old step-1 values from AI hint path.
        session.service_type = None
        session.details = None
        db_manager.save_session(session)
        return jsonify({
            'session_id': session.id,
            'next_question': _translate_for_session(session, _build_step1_question_for_category(session.category))
        })

    # Manual item selection path after category is chosen.
    if session.step == 1 and getattr(session, "manual_item_selection", False):
        selected = (normalized_answer or "").strip()
        if not selected:
            return jsonify({'error': _translate_text_for_session(session, 'Please provide a valid answer.')}), 400

        if selected == "Other (type manually)":
            # Keep manual item mode ON; next user message should carry typed value.
            text_input_question = {
                'step': 1,
                'type': 'text_input',
                'question': "Please type the exact item/problem you need help with:"
            }
            return jsonify({
                'session_id': session.id,
                'next_question': _translate_for_session(session, text_input_question)
            })

        _set_identified_item_for_step1(session, session.category, selected)
        session.manual_item_selection = False
        session.step = 2
        db_manager.save_session(session)
        return jsonify({
            'session_id': session.id,
            'next_question': _translate_for_session(session, ConversationEngine.get_next_question(session))
        })

    # Persist answer for the current step in a category-safe way
    _save_answer_for_current_step(session, normalized_answer)

    # Move to next step
    session.step += 1
    db_manager.save_session(session)

    next_q = _translate_for_session(session, ConversationEngine.get_next_question(session))

    if next_q:
        return jsonify({
            'session_id': session.id,
            'next_question': next_q
        })
    else:
        # End of conversation
        # If it was plumbing or the last step of others, handle final summary
        lat = data.get('lat')
        lng = data.get('lng')
        if lat and lng:
            session.latitude = lat
            session.longitude = lng
            db_manager.save_session(session)

        final_decision = _build_final_decision(session)

        return jsonify({
            'success': True,
            'summary': f"Final decision prepared for {session.category} service.",
            'final_decision': final_decision,
            'details': session.to_dict(),
            'message': "Your issue has been identified and structured. This payload is ready for provider matching."
        })

if __name__ == '__main__':
    app.run(port=5000, debug=True, use_reloader=False)