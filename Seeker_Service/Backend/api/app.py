from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import uuid
from datetime import datetime
from werkzeug.utils import secure_filename

# Modular Imports
from constants import ISSUE_MAPPING
from ml_handler import MLHandler
from db_adapter import db_manager, SessionProxy # Replaced SQLAlchemy with stable adapter
from engine import ConversationEngine

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

        # Create Persistent Session
        session = SessionProxy({
            "id": str(uuid.uuid4()),
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
            "created_at": datetime.utcnow().isoformat()
        })

        # Smart Logic: If high confidence and specific object identified, skip Step 1
        if confidence > 0.70 and identified_item:
            session.step = 2
            session.service_type = identified_item
            db_manager.save_session(session)
            
            return jsonify({
                'session_id': session.id,
                'object': session.object_name,
                'confidence': confidence_str,
                'detected_item': identified_item,
                'next_question': ConversationEngine.get_next_question(session)
            })

        # Default Step 1
        session.step = 1
        db_manager.save_session(session)

        return jsonify({
            'session_id': session.id,
            'object': session.object_name,
            'confidence': confidence_str,
            'next_question': ConversationEngine.get_next_question(session)
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

    category = session.category
    step = session.step

    # Mapping logic: decide where to store the answer based on category and step
    if category == "electrical":
        if step == 1: session.service_type = answer
        elif step == 2: session.details = answer
        elif step == 3: session.sub_service_type = answer
        elif step == 4: session.urgency = answer
        elif step == 5: session.room_location = answer

    elif category == "plumbing":
        if step == 1: session.details = answer # Problem type
        elif step == 2: session.room_location = answer # Specific location
        elif step == 3: session.sub_service_type = answer
        elif step == 4: session.urgency = answer

    elif category == "furniture":
        if step == 1: session.service_type = answer
        elif step == 2: session.details = answer # Problem type
        elif step == 3: session.sub_service_type = answer
        elif step == 4: session.usability = answer
        elif step == 5: session.urgency = answer
        elif step == 6: session.room_location = answer

    # Move to next step
    session.step += 1
    db_manager.save_session(session)

    next_q = ConversationEngine.get_next_question(session)

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

        location_str = f"{session.room_location or ''} {session.location_address or ''}"
        if lat and lng: location_str += f" (GPS: {lat}, {lng})"

        return jsonify({
            'success': True,
            'summary': f"Request for {session.object_name} at {location_str} received.",
            'details': session.to_dict(),
            'message': "We have received your details. We are matching you with the best provider now!"
        })

if __name__ == '__main__':
    app.run(port=5000, debug=True, use_reloader=False)