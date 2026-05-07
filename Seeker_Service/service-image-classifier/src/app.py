import os
import io
import uuid
import numpy as np
import tensorflow as tf
from PIL import Image
from fastapi import FastAPI, UploadFile, File, Body
from fastapi.middleware.cors import CORSMiddleware
from db_manager import db_manager

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- DATA MAPPINGS ---
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
    "lighting": "Light", "fan": "Fan", "tv": "TV", "fridge": "Fridge", "kitchen": "Rice Cooker", "washing": "Washing Machine",
    "chair": "Chair", "table": "Table", "sofa": "Sofa", "bed": "Bed"
}

# --- AI MODEL SETUP ---
MODEL_PATH = "models/repair_model_v1.h5"
model = tf.keras.models.load_model(MODEL_PATH)
CLASSES = ["electrical", "furniture", "plumbing"]

def preprocess_image(image_bytes):
    img = Image.open(io.BytesIO(image_bytes)).convert('RGB')
    img = img.resize((224, 224))
    return np.expand_dims(np.array(img) / 255.0, axis=0)

# --- ENDPOINTS ---

@app.post("/predict")
async def start_service_flow(file: UploadFile = File(...)):
    contents = await file.read()
    img_array = preprocess_image(contents)
    preds = model.predict(img_array)
    
    idx = np.argmax(preds[0])
    category = CLASSES[idx]
    confidence = f"{round(float(preds[0][idx]) * 100, 2)}%"
    
    session_id = f"REPAIR-{uuid.uuid4().hex[:4].upper()}"
    
    identified_item = None
    for key, formal_name in SUB_CATEGORY_MAPPING.items():
        if key in file.filename.lower():
            identified_item = formal_name
            break

    # Save to MongoDB
    session_data = {
        "id": session_id,
        "category": category,
        "confidence": confidence,
        "object": identified_item,
        "answers": {},
        "current_step": 2 if identified_item else 1
    }
    db_manager.save_session(session_data)

    flow = ISSUE_MAPPING[category]
    step = session_data["current_step"]
    
    if step == 2 and identified_item:
        next_q = flow["steps"][2].get(identified_item, flow["steps"][1])
    else:
        next_q = flow["steps"][1]

    return {
        "session_id": session_id,
        "agent_speech": f"I've identified a {category} issue.",
        "next_question": next_q
    }

@app.post("/flow/next")
async def get_next_step(body: dict = Body(...)):
    session_id = body.get("session_id")
    answer = body.get("answer")
    
    session = db_manager.get_session(session_id)
    if not session:
        return {"success": False, "message": "Invalid session"}
    
    cat = session.category
    step = session.current_step
    
    if step == 1:
        session.object = answer

    # Update session answers
    key_map = {1: "object", 2: "specific_issue", 3: "prep", 4: "urgency", 5: "usability", 6: "room"}
    ans_dict = session.data.get("answers", {})
    ans_dict[key_map.get(step, f"step_{step}")] = answer
    session.answers = ans_dict

    next_idx = step + 1
    flow_steps = ISSUE_MAPPING[cat]["steps"]
    
    if next_idx in flow_steps:
        session.current_step = next_idx
        next_q = flow_steps[next_idx]
        current_obj = session.object
        
        # Drill down logic
        if isinstance(next_q, dict) and current_obj and current_obj in next_q:
            next_q = next_q[current_obj]
        elif isinstance(next_q, dict) and "question" not in next_q:
            session.current_step = next_idx + 1
            next_q = flow_steps.get(session.current_step, {"question": "Please provide more details."})
            
        db_manager.save_session(session)
        return {"session_id": session_id, "next_question": next_q}

    # Final Payload logic
    db_manager.save_session(session)
    obj = session.object or "Appliance"
    issue = session.answers.get("specific_issue", "")
    prep = session.answers.get("prep", "")
    
    return {
        "details": {
            "category": cat,
            "confidence": session.confidence,
            "object": obj,
            "room": session.answers.get("room", ""),
            "session_id": session_id,
            "specific_issue": prep if prep else issue,
            "urgency": session.answers.get("urgency", ""),
        },
        "final_decision": {
            "issue_summary": f"{obj} | {issue} | {prep}".strip(" | "),
            "service_category": cat,
            "provider_search_ready": True
        },
        "success": True
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)