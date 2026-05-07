import os
import io
import uuid
import numpy as np
import tensorflow as tf
from PIL import Image
from fastapi import FastAPI, UploadFile, File, Body, Query
from fastapi.middleware.cors import CORSMiddleware
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

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------
# DATA MAPPINGS (Keep in English for Logic)
# ---------------------------------------------------

ISSUE_MAPPING = {
    "electrical": {
        "object": "Electrical device",
        "intro": "I've detected an electrical issue. Let's get some details.",
        "steps": {
            1: {"question": "Which electrical item needs service?", "options": ["Fan", "TV", "Fridge", "Washing Machine", "Light", "Rice Cooker", "Other appliance"]},
            2: {
                "Fan": {"question": "What issue does the fan show right now?", "options": ["Not working at all", "No power", "Loud noise", "Slow spinning", "Burning smell"]},
                "TV": {"question": "What is the main TV problem?", "options": ["Black screen", "Cracked screen", "No signal", "Power not turning on", "Sound but no picture"]},
                "Fridge": {"question": "What is the fridge issue you need fixed?", "options": ["Not cooling", "Ice buildup", "Water leakage", "Unusual noise", "Door seal broken"]},
                "Light": {"question": "What lighting problem do you have?", "options": ["Flickering", "Not turning on", "Broken holder", "LED strip issue"]},
                "Washing Machine": {"question": "What issue does the washing machine show?", "options": ["Drum not spinning", "Water leaking", "Error code shown", "Cycle not starting", "Loud vibration"]},
                "Rice Cooker": {"question": "What issue does the rice cooker have?", "options": ["Not heating", "Food getting burnt", "Power switch broken", "Very slow cooking", "Burning smell"]},
                "Other appliance": {"question": "What is the issue with the appliance?", "options": ["No power", "Sparking/smoke", "Noise/vibration", "Overheating", "Other fault"]}
            },
            3: {"question": "Is there any immediate electrical risk?", "options": ["No immediate risk", "Sparking/smoke noticed", "Burning smell", "Power trips repeatedly"]},
            4: {"question": "When do you need this service?", "options": ["Flexible (within 2-3 days)", "Soon (within 24 hours)", "Urgent (as soon as possible)"]},
            5: {"question": "Where is the electrical item located?", "options": ["Living Room", "Kitchen", "Bedroom", "Bathroom", "Outdoor", "Office/Shop"]}
        }
    },
    "plumbing": {
        "object": "Plumbing system",
        "intro": "I see a plumbing issue. I'll help you diagnose the problem.",
        "steps": {
            1: {"question": "What plumbing issue do you need help with?", "options": ["Leakage", "Blockage", "Low water pressure", "Overflow", "Pipe damage"]},
            2: {"question": "Where exactly is the plumbing issue?", "options": ["Kitchen sink", "Bathroom", "Toilet", "Wall/pipe line", "Water tank", "Outdoor line"]},
            3: {
                "Leakage": {"question": "How severe is the leakage right now?", "options": ["Small drip", "Continuous leak", "Heavy water flow"]},
                "Blockage": {"question": "How bad is the blockage?", "options": ["Fully blocked", "Slow drainage", "Dirty water backup"]},
                "Toilet": {"question": "What toilet issue do you see?", "options": ["Flush not working", "Overflowing", "Water keeps running"]},
                "Low water pressure": {"question": "How does the low water pressure issue appear?", "options": ["Only one tap affected", "Multiple taps affected", "No water at times", "Pressure drops at peak hours"]},
                "Overflow": {"question": "Where is overflow happening?", "options": ["Toilet tank", "Water tank", "Sink", "Drain line"]},
                "Pipe damage": {"question": "What pipe damage do you observe?", "options": ["Visible crack", "Burst pipe", "Joint loosened", "Rust/corrosion leak"]}
            },
            4: {"question": "How urgent is the plumbing service?", "options": ["Low (can wait)", "Medium (today)", "High (immediate)"]},
            5: {"question": "Please share service address details:", "options": ["Enter location manually", "Use current location"]}
        }
    },
    "furniture": {
        "object": "Furniture",
        "intro": "I've identified a furniture item. Let's see what needs fixing.",
        "steps": {
            1: {"question": "Which furniture item needs work?", "options": ["Chair", "Table", "Sofa", "Bed", "Wardrobe/Cabinet", "Needs assembly", "Other"]},
            2: {
                "Chair": {"question": "What is the chair problem?", "options": ["Broken leg", "Wobbly/unstable", "Loose joints", "Missing screws", "Seat/back damage"]},
                "Table": {"question": "What is the table issue?", "options": ["Broken leg", "Cracked surface", "Unstable/shaky", "Top surface damage"]},
                "Sofa": {"question": "What issue does the sofa have?", "options": ["Torn fabric", "Sagging cushion", "Broken frame", "Stain/deep cleaning needed", "Spring issue"]},
                "Bed": {"question": "What issue does the bed have?", "options": ["Broken frame", "Noisy joints", "Support slats damaged", "Headboard issue"]},
                "Wardrobe/Cabinet": {"question": "What is the wardrobe/cabinet issue?", "options": ["Door misaligned", "Hinge broken", "Drawer jammed", "Panel damage"]},
                "Needs assembly": {"question": "What assembly service do you need?", "options": ["Full installation", "Parts already available", "Disassembled furniture"]},
                "Other": {"question": "What type of furniture service is needed?", "options": ["Repair", "Assembly", "Polish/refinish", "Part replacement"]}
            },
            3: {
                "Sofa": {"question": "For sofa fabric work, what support do you need?", "options": ["Patch/repair fabric", "Replace upholstery", "Deep cleaning", "Need inspection first"]},
                "Chair": {"question": "What should the technician prepare?", "options": ["Wood/glue fixing", "Tightening joints", "Seat cushion repair", "Need inspection first"]},
                "Table": {"question": "What service outcome do you need?", "options": ["Structural repair", "Surface crack repair", "Polish/refinish", "Need inspection first"]},
                "Bed": {"question": "What bed repair support is needed?", "options": ["Frame reinforcement", "Noise fixing", "Slat replacement", "Need inspection first"]},
                "Wardrobe/Cabinet": {"question": "What cabinet support is needed?", "options": ["Hinge alignment", "Drawer track repair", "Panel replacement", "Need inspection first"]},
                "Other": {"question": "What help do you need?", "options": ["Repair", "Assembly", "Refinishing", "Inspection visit"]}
            },
            4: {"question": "How urgent is the furniture service?", "options": ["Low (scheduled)", "Medium (this week)", "High (urgent)"]},
            5: {"question": "Is on-site work possible?", "options": ["Yes, on-site possible", "No, pickup needed", "Not sure"]},
            6: {"question": "Where is the furniture located?", "options": ["Living Room", "Bedroom", "Office", "Outdoor", "Commercial space"]}
        }
    }
}

SUB_CATEGORY_MAPPING = {
    "lighting": "Light", "fan": "Fan", "tv": "TV", "fridge": "Fridge",
    "oven": "Rice Cooker", "washer": "Washing Machine", "chair": "Chair",
    "table": "Table", "sofa": "Sofa", "bed": "Bed", "desk": "Table", "couch": "Sofa"
}

# --- AI MODEL SETUP ---
MODEL_PATH = "models/repair_model_v1.h5"
model = tf.keras.models.load_model(MODEL_PATH)
CLASSES = ["electrical", "furniture", "plumbing"]
visual_identifier = MobileNetV2(weights='imagenet')

# IMPROVEMENT: Shared preprocessing function to avoid redundant Image.open calls
def get_shared_tensor(image_bytes):
    img = Image.open(io.BytesIO(image_bytes)).convert('RGB')
    img = img.resize((224, 224))
    return np.expand_dims(np.array(img), axis=0)

# ---------------------------------------------------
# ENDPOINTS
# ---------------------------------------------------

@app.post("/predict")
async def start_service_flow(file: UploadFile = File(...), language: str = Query("en")):
    contents = await file.read()
    
    # IMPROVEMENT: Use shared tensor for both models
    base_tensor = get_shared_tensor(contents)
    
    # 1. Prediction Logic (Domain Model)
    domain_input = base_tensor / 255.0
    preds = model.predict(domain_input)
    best_idx = np.argmax(preds[0])
    conf_score = float(preds[0][best_idx])
    category = CLASSES[best_idx]
    confidence_str = f"{round(conf_score * 100, 2)}%"

    # 2. Object Identification (MobileNetV2)
    # Use copy() to prevent MobileNet preprocessing from affecting subsequent logic
    mobile_x = preprocess_input(base_tensor.copy())
    mobile_preds = visual_identifier.predict(mobile_x)
    top_5 = decode_predictions(mobile_preds, top=5)[0]

    identified_item = None
    for _, label, _ in top_5:
        label = label.lower().replace('_', ' ')
        for key, formal_name in SUB_CATEGORY_MAPPING.items():
            if key in label:
                identified_item = formal_name
                break
        if identified_item: break

    session_id = f"REPAIR-{uuid.uuid4().hex[:4].upper()}"

    # IMPROVEMENT: Confidence Gate Logic
    # If confidence is too low, we set step to 0 to ask the user to manually verify the category
    is_low_confidence = conf_score < 0.65
    current_step = 0 if is_low_confidence else (2 if identified_item else 1)

    # 3. Save Session with Language
    session_data = {
        "id": session_id,
        "category": category if not is_low_confidence else category,
        "confidence": confidence_str,
        "object": identified_item,
        "language": language,
        "answers": {},
        "current_step": current_step
    }
    db_manager.save_session(session_data)

    # Determine Question
    if is_low_confidence:
        next_q = {
            "question": "I'm not completely sure. Please select the correct service category:",
            "options": ["Electrical", "Plumbing", "Furniture"]
        }
    else:
        flow = ISSUE_MAPPING[category]
        if current_step == 2 and identified_item:
            next_q = flow["steps"][2].get(identified_item, flow["steps"][1])
        else:
            next_q = flow["steps"][1]

    # Translate Initial Response
    agent_text = "I've analyzed the photo." if is_low_confidence else f"I've identified a {category} issue."
    if language == "si":
        agent_text = get_sinhala_translation(agent_text)

    return {
        "session_id": session_id,
        "confidence": confidence_str, # Added confidence here
        "agent_speech": agent_text,
        "next_question": translate_payload(next_q, language)
    }

@app.post("/flow/next")
async def get_next_step(body: dict = Body(...)):
    session_id = body.get("session_id")
    raw_answer = body.get("answer") 

    session = db_manager.get_session(session_id)
    if not session:
        return {"success": False, "message": "Invalid session"}

    language = getattr(session, "language", "en")
    answer = translate_answer_to_english(raw_answer) if language == "si" else raw_answer
    
    # IMPROVEMENT: Handle Low Confidence Step 0
    if session.current_step == 0:
        session.category = answer.lower()
        session.current_step = 1
        next_q = ISSUE_MAPPING[session.category]["steps"][1]
        db_manager.save_session(session)
        return {
            "session_id": session_id,
            "next_question": translate_payload(next_q, language)
        }

    cat = session.category
    step = session.current_step

    if step == 1:
        session.object = answer

    # Update Answers
    key_map = {1: "object", 2: "specific_issue", 3: "usability", 4: "repair_history", 5: "urgency", 6: "room"}
    ans_dict = session.data.get("answers", {})
    ans_dict[key_map.get(step, f"step_{step}")] = answer
    session.answers = ans_dict

    next_idx = step + 1
    flow_steps = ISSUE_MAPPING[cat]["steps"]

    # Check for Next Step
    if next_idx in flow_steps:
        session.current_step = next_idx
        next_q = flow_steps[next_idx]
        current_obj = session.object

        if isinstance(next_q, dict) and current_obj and current_obj in next_q:
            next_q = next_q[current_obj]
        elif isinstance(next_q, dict) and "question" not in next_q:
            session.current_step = next_idx + 1
            next_q = flow_steps.get(session.current_step, {"question": "Provide more details."})

        db_manager.save_session(session)
        return {
            "session_id": session_id,
            "next_question": translate_payload(next_q, language)
        }

    # Final Summary Construction
    db_manager.save_session(session)
    obj = session.object or "Appliance"
    issue = session.answers.get("specific_issue", "")
    usability = session.answers.get("usability", "")
    urgency = session.answers.get("urgency", "")
    room = session.answers.get("room", "")

    summary_en = f"{obj} | {issue} | {usability} | {urgency} in {room}".strip(" | ")
    final_summary = get_sinhala_translation(summary_en) if language == "si" else summary_en

    return {
        "details": {
            "category": get_sinhala_translation(cat) if language == "si" else cat,
            "object": get_sinhala_translation(obj) if language == "si" else obj,
            "specific_issue": get_sinhala_translation(issue) if language == "si" else issue,
            "urgency": get_sinhala_translation(urgency) if language == "si" else urgency,
            "confidence": session.confidence, # IMPROVEMENT: Added confidence to final details
            "session_id": session_id,
        },
        "final_decision": {
            "issue_summary": final_summary,
            "service_category": get_sinhala_translation(cat) if language == "si" else cat,
            "confidence_level": session.confidence, # IMPROVEMENT: Added confidence to summary
            "provider_search_ready": True
        },
        "success": True
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)