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
# DATA MAPPINGS — FULLY DYNAMIC BRANCHED QUESTION FLOW
# ---------------------------------------------------

ISSUE_MAPPING = {

    # =================================================
    # ELECTRICAL
    # =================================================
    "electrical": {

        "steps": {

            # STEP 1
            1: {
                "question": "Which electrical item needs service?",
                "options": [
                    "Fan",
                    "TV",
                    "Fridge",
                    "Washing Machine",
                    "Light",
                    "Rice Cooker",
                    "Other appliance"
                ]
            },

            # STEP 2 — Branches based on Step 1 answer (which appliance)
            2: {
                "Fan": {
                    "question": "What is the fan doing?",
                    "options": [
                        "Not running",
                        "Running slowly",
                        "Making noise",
                        "Stops after some time"
                    ]
                },
                "TV": {
                    "question": "What is the TV issue?",
                    "options": [
                        "No picture",
                        "No sound",
                        "Not turning on",
                        "Screen flickering"
                    ]
                },
                "Fridge": {
                    "question": "What is the fridge issue?",
                    "options": [
                        "Not cooling",
                        "Overcooling",
                        "Water leaking",
                        "Making noise"
                    ]
                },
                "Washing Machine": {
                    "question": "What is the washing machine issue?",
                    "options": [
                        "Won't start",
                        "Won't spin",
                        "Won't drain",
                        "Stops mid-cycle"
                    ]
                },
                "Light": {
                    "question": "Which lights are affected?",
                    "options": [
                        "Single light",
                        "Entire room",
                        "Multiple rooms"
                    ]
                },
                "Rice Cooker": {
                    "question": "What is the rice cooker issue?",
                    "options": [
                        "Not heating",
                        "Burning rice",
                        "Stops too early"
                    ]
                },
                "Other appliance": {
                    "question": "What is the issue?",
                    "options": [
                        "No power",
                        "Noise",
                        "Overheating"
                    ]
                }
            },

            # STEP 3 — Branches based on Step 2 answer (specific symptom)
            3: {

                # --- Fan branches ---
                "Not running": {
                    "question": "Did the fan stop suddenly or did it never start?",
                    "options": [
                        "Stopped suddenly",
                        "Never started after repair",
                        "Never worked at all"
                    ]
                },
                "Running slowly": {
                    "question": "Is the speed issue constant or intermittent?",
                    "options": [
                        "Always slow",
                        "Slow only sometimes",
                        "Gets slower over time"
                    ]
                },
                "Making noise": {
                    "question": "What type of noise is the fan making?",
                    "options": [
                        "Grinding",
                        "Rattling",
                        "Humming",
                        "Clicking"
                    ]
                },
                "Stops after some time": {
                    "question": "How long does the fan run before stopping?",
                    "options": [
                        "Less than 5 minutes",
                        "5–15 minutes",
                        "More than 15 minutes"
                    ]
                },

                # --- TV branches ---
                "No picture": {
                    "question": "Is the screen completely black or showing something?",
                    "options": [
                        "Completely black",
                        "Distorted or lines visible",
                        "Flickering on and off"
                    ]
                },
                "No sound": {
                    "question": "Is the sound completely gone or just very low?",
                    "options": [
                        "Completely silent",
                        "Very low volume",
                        "Crackling or distorted"
                    ]
                },
                "Not turning on": {
                    "question": "Does the power indicator light come on?",
                    "options": [
                        "No light at all",
                        "Light blinks but won't start",
                        "Light is on but no picture"
                    ]
                },
                "Screen flickering": {
                    "question": "When does the screen flicker?",
                    "options": [
                        "All the time",
                        "Only on certain channels",
                        "When switching input"
                    ]
                },

                # --- Fridge branches ---
                "Not cooling": {
                    "question": "Is the fridge motor running?",
                    "options": [
                        "Yes, I can hear it running",
                        "No sound at all",
                        "Runs but stops quickly"
                    ]
                },
                "Overcooling": {
                    "question": "Is everything freezing or just certain items?",
                    "options": [
                        "Everything is freezing",
                        "Only certain shelves affected",
                        "Ice forming inside"
                    ]
                },
                "Water leaking": {
                    "question": "Where is the water coming from?",
                    "options": [
                        "Inside the fridge",
                        "Below the fridge",
                        "Behind the fridge"
                    ]
                },

                # --- Washing Machine branches ---
                "Won't start": {
                    "question": "Is there any display or light on the machine?",
                    "options": [
                        "No display at all",
                        "Display on but won't start",
                        "Shows an error code"
                    ]
                },
                "Won't spin": {
                    "question": "Does the machine fill with water normally?",
                    "options": [
                        "Yes, fills normally",
                        "Partially fills only",
                        "Doesn't fill at all"
                    ]
                },
                "Won't drain": {
                    "question": "Is the drain hose blocked or kinked?",
                    "options": [
                        "Hose looks fine",
                        "Hose is kinked or bent",
                        "Not sure"
                    ]
                },
                "Stops mid-cycle": {
                    "question": "At which point does it stop?",
                    "options": [
                        "During washing",
                        "During rinsing",
                        "During spinning",
                        "Random points"
                    ]
                },

                # --- Light branches ---
                "Single light": {
                    "question": "What type of light is it?",
                    "options": [
                        "LED",
                        "Fluorescent",
                        "Incandescent bulb",
                        "Not sure"
                    ]
                },
                "Entire room": {
                    "question": "Did the room lights go off suddenly?",
                    "options": [
                        "Yes, went off suddenly",
                        "Flickered then went off",
                        "Gradually getting dimmer"
                    ]
                },
                "Multiple rooms": {
                    "question": "Did a power trip occur at the same time?",
                    "options": [
                        "Yes, trip happened",
                        "No trip occurred",
                        "Not sure"
                    ]
                },

                # --- Rice Cooker branches ---
                "Not heating": {
                    "question": "Does the power light come on when switched on?",
                    "options": [
                        "Yes, light comes on",
                        "No light at all",
                        "Light flickers"
                    ]
                },
                "Burning rice": {
                    "question": "Has this started happening recently or always?",
                    "options": [
                        "Started recently",
                        "Always burned",
                        "Only with certain rice types"
                    ]
                },
                "Stops too early": {
                    "question": "Does it switch to 'warm' mode too soon?",
                    "options": [
                        "Yes, switches to warm early",
                        "Completely shuts off",
                        "Not sure"
                    ]
                },

                # --- Other appliance branches ---
                "No power": {
                    "question": "Have you checked the plug and socket?",
                    "options": [
                        "Yes, both seem fine",
                        "Socket may be faulty",
                        "Fuse might be blown"
                    ]
                },
                "Noise": {
                    "question": "What type of noise is the appliance making?",
                    "options": [
                        "Buzzing",
                        "Clicking",
                        "Rattling",
                        "High-pitched sound"
                    ]
                },
                "Overheating": {
                    "question": "Does it overheat immediately or after some time?",
                    "options": [
                        "Immediately on start",
                        "After a few minutes",
                        "After extended use"
                    ]
                },

                # --- Fallback ---
                "default": {
                    "question": "How long has this issue been happening?",
                    "options": [
                        "Just started today",
                        "A few days",
                        "More than a week",
                        "More than a month"
                    ]
                }
            },

            # STEP 4
            4: {
                "question": "Is there any electrical risk?",
                "options": [
                    "No risk",
                    "Burning smell",
                    "Sparks visible",
                    "Power trips happening"
                ]
            },

            # STEP 5
            5: {
                "question": "When do you need this service?",
                "options": [
                    "Flexible",
                    "Within 24 hours",
                    "Urgent"
                ]
            },

            # STEP 6
            6: {
                "question": "What is your address?",
                "options": []
            }
        }
    },

    # =================================================
    # FURNITURE
    # =================================================
    "furniture": {

        "steps": {

            # STEP 1
            1: {
                "question": "What type of furniture needs repair?",
                "options": [
                    "Woodwork",
                    "Upholstered Furniture",
                    "Cabinets & Doors",
                    "Outdoor Furniture"
                ]
            },

            # STEP 2 — Branches based on furniture type
            2: {
                "Woodwork": {
                    "question": "What is the main problem?",
                    "options": [
                        "Broken joint",
                        "Cracked wood",
                        "Wobbly structure",
                        "Termite damage"
                    ]
                },
                "Upholstered Furniture": {
                    "question": "What is the main problem?",
                    "options": [
                        "Torn fabric",
                        "Sagging cushion",
                        "Broken frame",
                        "Foam worn out"
                    ]
                },
                "Cabinets & Doors": {
                    "question": "What is the problem?",
                    "options": [
                        "Door won't close",
                        "Broken hinge",
                        "Drawer stuck",
                        "Surface peeling"
                    ]
                },
                "Outdoor Furniture": {
                    "question": "What is the main problem?",
                    "options": [
                        "Rotting wood",
                        "Broken planks",
                        "Rust",
                        "Loose joints"
                    ]
                }
            },

            # STEP 3 — Branches based on Step 2 answer
            3: {

                # --- Woodwork branches ---
                "Broken joint": {
                    "question": "Which part of the furniture has the broken joint?",
                    "options": [
                        "Chair leg",
                        "Table leg",
                        "Bed frame corner",
                        "Other joint"
                    ]
                },
                "Cracked wood": {
                    "question": "How severe is the crack?",
                    "options": [
                        "Small surface crack",
                        "Deep crack through the wood",
                        "Wood is splitting apart"
                    ]
                },
                "Wobbly structure": {
                    "question": "Which furniture is wobbly?",
                    "options": [
                        "Chair or stool",
                        "Table",
                        "Bed frame",
                        "Shelf or rack"
                    ]
                },
                "Termite damage": {
                    "question": "How widespread is the termite damage?",
                    "options": [
                        "Small area only",
                        "Half the furniture",
                        "Entire piece affected",
                        "Not sure"
                    ]
                },

                # --- Upholstered Furniture branches ---
                "Torn fabric": {
                    "question": "How large is the tear?",
                    "options": [
                        "Small tear or hole",
                        "Large rip",
                        "Multiple tears",
                        "Completely worn out"
                    ]
                },
                "Sagging cushion": {
                    "question": "Which cushion is sagging?",
                    "options": [
                        "Seat cushion",
                        "Back cushion",
                        "All cushions",
                        "Armrest"
                    ]
                },
                "Broken frame": {
                    "question": "Is the frame visibly cracked or just weak?",
                    "options": [
                        "Visibly cracked",
                        "Just feels weak",
                        "Completely broken",
                        "Not sure"
                    ]
                },
                "Foam worn out": {
                    "question": "Do you want the foam replaced or the entire cover too?",
                    "options": [
                        "Foam only",
                        "Foam and cover",
                        "Not sure yet"
                    ]
                },

                # --- Cabinets & Doors branches ---
                "Door won't close": {
                    "question": "Why does the door not close properly?",
                    "options": [
                        "Hinge is bent",
                        "Door is warped",
                        "Latch not catching",
                        "Not sure"
                    ]
                },
                "Broken hinge": {
                    "question": "How many hinges are broken?",
                    "options": [
                        "One hinge",
                        "Multiple hinges",
                        "All hinges on this door"
                    ]
                },
                "Drawer stuck": {
                    "question": "Is the drawer stuck or completely jammed?",
                    "options": [
                        "Hard to open but moves",
                        "Completely jammed",
                        "Came off its track"
                    ]
                },
                "Surface peeling": {
                    "question": "What surface is peeling?",
                    "options": [
                        "Laminate peeling",
                        "Paint peeling",
                        "Veneer coming off",
                        "Not sure"
                    ]
                },

                # --- Outdoor Furniture branches ---
                "Rotting wood": {
                    "question": "How much of the wood is rotting?",
                    "options": [
                        "One or two planks",
                        "Most of the structure",
                        "Entire piece"
                    ]
                },
                "Broken planks": {
                    "question": "How many planks are broken?",
                    "options": [
                        "One plank",
                        "Two to three planks",
                        "More than three"
                    ]
                },
                "Rust": {
                    "question": "How severe is the rust?",
                    "options": [
                        "Surface rust only",
                        "Deep rust with holes",
                        "Structural rust — weakening the frame"
                    ]
                },
                "Loose joints": {
                    "question": "Are the joints loose or completely detached?",
                    "options": [
                        "Slightly loose",
                        "Very loose but holding",
                        "Completely detached"
                    ]
                },

                # --- Fallback ---
                "default": {
                    "question": "How severe is the damage?",
                    "options": [
                        "Minor",
                        "Moderate",
                        "Severe",
                        "Completely broken"
                    ]
                }
            },

            # STEP 4
            4: {
                "question": "What material is the furniture made of?",
                "options": [
                    "Wood",
                    "Metal",
                    "Plastic",
                    "Mixed materials",
                    "Not sure"
                ]
            },

            # STEP 5
            5: {
                "question": "Is on-site work possible?",
                "options": [
                    "Yes",
                    "Pickup needed",
                    "Not sure"
                ]
            },

            # STEP 6
            6: {
                "question": "When do you need this service?",
                "options": [
                    "Flexible",
                    "Within 24 hours",
                    "Urgent"
                ]
            },

            # STEP 7
            7: {
                "question": "What is your address?",
                "options": []
            }
        }
    },

    # =================================================
    # PLUMBING
    # =================================================
    "plumbing": {

        "steps": {

            # STEP 1
            1: {
                "question": "What plumbing issue do you need help with?",
                "options": [
                    "Leaks",
                    "Pipes",
                    "Blocked Drains",
                    "Taps & Toilets"
                ]
            },

            # STEP 2 — Branches based on plumbing category
            2: {
                "Leaks": {
                    "question": "Where is the leak?",
                    "options": [
                        "Under sink",
                        "Wall",
                        "Ceiling",
                        "Toilet"
                    ]
                },
                "Pipes": {
                    "question": "What is the pipe issue?",
                    "options": [
                        "Burst pipe",
                        "Blocked pipe",
                        "Noise",
                        "Rust"
                    ]
                },
                "Blocked Drains": {
                    "question": "Which drain is blocked?",
                    "options": [
                        "Kitchen sink",
                        "Bathroom sink",
                        "Toilet",
                        "Floor drain"
                    ]
                },
                "Taps & Toilets": {
                    "question": "What is the problem?",
                    "options": [
                        "Dripping tap",
                        "Toilet won't flush",
                        "Low pressure"
                    ]
                }
            },

            # STEP 3 — Branches based on Step 2 answer
            3: {

                # --- Leaks branches ---
                "Under sink": {
                    "question": "Is the leak coming from the pipe or the tap?",
                    "options": [
                        "From the pipe joint",
                        "From the tap base",
                        "From the cabinet bottom",
                        "Not sure"
                    ]
                },
                "Wall": {
                    "question": "Is there visible water seeping or just a damp stain?",
                    "options": [
                        "Visible water seeping through",
                        "Just a damp stain",
                        "Paint bubbling up",
                        "Mold forming"
                    ]
                },
                "Ceiling": {
                    "question": "Is there a bathroom or kitchen directly above the leak?",
                    "options": [
                        "Yes, bathroom above",
                        "Yes, kitchen above",
                        "No room above",
                        "Top floor or roof"
                    ]
                },
                "Toilet": {
                    "question": "Where exactly is the toilet leaking from?",
                    "options": [
                        "Base of the toilet",
                        "Water tank",
                        "Connection pipe",
                        "Not sure"
                    ]
                },

                # --- Pipes branches ---
                "Burst pipe": {
                    "question": "Is water still gushing or has it slowed down?",
                    "options": [
                        "Still gushing fast",
                        "Slow drip now",
                        "Already shut off the water",
                        "Not sure"
                    ]
                },
                "Blocked pipe": {
                    "question": "Which area has the blocked pipe?",
                    "options": [
                        "Kitchen",
                        "Bathroom",
                        "Outside or garden",
                        "Not sure"
                    ]
                },
                "Noise": {
                    "question": "What type of noise are the pipes making?",
                    "options": [
                        "Banging",
                        "Gurgling",
                        "Whistling",
                        "Rattling"
                    ]
                },
                "Rust": {
                    "question": "Is there visible rust or just discoloured water?",
                    "options": [
                        "Visible rust on the pipe",
                        "Rusty or brown water",
                        "Both rust and discolouration",
                        "Not sure"
                    ]
                },

                # --- Blocked Drains branches ---
                "Kitchen sink": {
                    "question": "Is it completely blocked or draining slowly?",
                    "options": [
                        "Completely blocked",
                        "Draining very slowly",
                        "Bad smell but still draining",
                        "Water backing up"
                    ]
                },
                "Bathroom sink": {
                    "question": "What seems to be causing the blockage?",
                    "options": [
                        "Hair buildup",
                        "Soap scum",
                        "Foreign object dropped in",
                        "Not sure"
                    ]
                },
                "Floor drain": {
                    "question": "Which floor drain is affected?",
                    "options": [
                        "Bathroom floor",
                        "Kitchen floor",
                        "Garage or outdoor",
                        "Not sure"
                    ]
                },

                # --- Taps & Toilets branches ---
                "Dripping tap": {
                    "question": "Which tap is dripping?",
                    "options": [
                        "Kitchen tap",
                        "Bathroom tap",
                        "Outdoor tap",
                        "Multiple taps"
                    ]
                },
                "Toilet won't flush": {
                    "question": "Is the flush handle working or broken?",
                    "options": [
                        "Handle works but no flush",
                        "Handle is broken",
                        "Flush is very weak",
                        "Tank not filling up"
                    ]
                },
                "Low pressure": {
                    "question": "Is the low pressure happening in one tap or everywhere?",
                    "options": [
                        "Only one tap",
                        "Entire house",
                        "Only hot water",
                        "Only cold water"
                    ]
                },

                # --- Fallback ---
                "default": {
                    "question": "How severe is the issue?",
                    "options": [
                        "Minor",
                        "Moderate",
                        "Severe",
                        "Emergency"
                    ]
                }
            },

            # STEP 4
            4: {
                "question": "Is water still flowing normally in your home?",
                "options": [
                    "Yes, flowing normally",
                    "Partially",
                    "No water at all",
                    "Not sure"
                ]
            },

            # STEP 5
            5: {
                "question": "Is there any immediate risk?",
                "options": [
                    "No immediate risk",
                    "Flooding occurring",
                    "Bad smell present",
                    "Water spreading fast"
                ]
            },

            # STEP 6
            6: {
                "question": "When do you need this service?",
                "options": [
                    "Flexible",
                    "Within 24 hours",
                    "Urgent"
                ]
            },

            # STEP 7
            7: {
                "question": "What is your address?",
                "options": []
            }
        }
    },

    # =================================================
    # OTHER  ✅ FIXED — was missing, caused KeyError
    # =================================================
    "other": {

        "steps": {

            # STEP 1
            1: {
                "question": "What type of service do you need?",
                "options": [
                    "Cleaning",
                    "Painting",
                    "General Maintenance",
                    "Other"
                ]
            },

            # STEP 2 — Branches based on service type
            2: {
                "Cleaning": {
                    "question": "What area needs cleaning?",
                    "options": [
                        "Entire house",
                        "Kitchen only",
                        "Bathroom only",
                        "Specific room"
                    ]
                },
                "Painting": {
                    "question": "What needs to be painted?",
                    "options": [
                        "Interior walls",
                        "Exterior walls",
                        "Ceiling",
                        "Furniture or fixtures"
                    ]
                },
                "General Maintenance": {
                    "question": "What type of maintenance is needed?",
                    "options": [
                        "Routine checkup",
                        "Minor repairs",
                        "Inspection only",
                        "Not sure"
                    ]
                },
                "Other": {
                    "question": "Can you describe the type of work needed?",
                    "options": [
                        "Installation",
                        "Removal or disposal",
                        "Repair",
                        "Not sure"
                    ]
                }
            },

            # STEP 3 — Branches based on Step 2 answer
            3: {

                # --- Cleaning branches ---
                "Entire house": {
                    "question": "How many rooms does the house have?",
                    "options": [
                        "1 to 2 rooms",
                        "3 to 4 rooms",
                        "5 or more rooms"
                    ]
                },
                "Kitchen only": {
                    "question": "What level of cleaning is needed?",
                    "options": [
                        "Light cleaning",
                        "Deep cleaning",
                        "Appliance cleaning included"
                    ]
                },
                "Bathroom only": {
                    "question": "How many bathrooms need cleaning?",
                    "options": [
                        "One bathroom",
                        "Two bathrooms",
                        "Three or more"
                    ]
                },
                "Specific room": {
                    "question": "Which room needs cleaning?",
                    "options": [
                        "Bedroom",
                        "Living room",
                        "Dining room",
                        "Other"
                    ]
                },

                # --- Painting branches ---
                "Interior walls": {
                    "question": "How many rooms need painting?",
                    "options": [
                        "One room",
                        "Multiple rooms",
                        "Entire house interior"
                    ]
                },
                "Exterior walls": {
                    "question": "What is the size of the exterior area?",
                    "options": [
                        "Small — single wall",
                        "Medium — two to three walls",
                        "Large — entire exterior"
                    ]
                },
                "Ceiling": {
                    "question": "Is it just the ceiling or walls included too?",
                    "options": [
                        "Ceiling only",
                        "Ceiling and walls",
                        "Not sure"
                    ]
                },
                "Furniture or fixtures": {
                    "question": "What item needs painting?",
                    "options": [
                        "Door or window frame",
                        "Cabinet or wardrobe",
                        "Garden gate or fence",
                        "Other"
                    ]
                },

                # --- General Maintenance branches ---
                "Routine checkup": {
                    "question": "Which systems need checking?",
                    "options": [
                        "Electrical",
                        "Plumbing",
                        "Structural",
                        "All systems"
                    ]
                },
                "Minor repairs": {
                    "question": "What type of minor repair is needed?",
                    "options": [
                        "Wall cracks or holes",
                        "Broken fixtures",
                        "Loose fittings",
                        "Not sure"
                    ]
                },
                "Inspection only": {
                    "question": "What do you want inspected?",
                    "options": [
                        "Roof",
                        "Foundation",
                        "General property",
                        "Not sure"
                    ]
                },

                # --- Other branches ---
                "Installation": {
                    "question": "What needs to be installed?",
                    "options": [
                        "Fixtures or fittings",
                        "Appliances",
                        "Shelving or storage",
                        "Not sure"
                    ]
                },
                "Removal or disposal": {
                    "question": "What needs to be removed?",
                    "options": [
                        "Old furniture",
                        "Debris or waste",
                        "Old appliances",
                        "Not sure"
                    ]
                },
                "Repair": {
                    "question": "What is the item that needs repair?",
                    "options": [
                        "Structural element",
                        "Fixture or fitting",
                        "Not sure"
                    ]
                },

                # --- Fallback ---
                "default": {
                    "question": "How urgent is this service?",
                    "options": [
                        "Not urgent",
                        "Needed soon",
                        "Urgent"
                    ]
                }
            },

            # STEP 4
            4: {
                "question": "When do you need this service?",
                "options": [
                    "Flexible",
                    "Within 24 hours",
                    "Urgent"
                ]
            },

            # STEP 5
            5: {
                "question": "What is your address?",
                "options": []
            }
        }
    }
}

# ---------------------------------------------------
# SMART OBJECT GROUP MAPPING
# ---------------------------------------------------

OBJECT_FLOW_MAP = {

    # ELECTRICAL
    "Fan": "Fan",
    "TV": "TV",
    "Fridge": "Fridge",
    "Washing Machine": "Washing Machine",
    "Light": "Light",
    "Rice Cooker": "Rice Cooker",

    # FURNITURE
    "Chair or stool": "Woodwork",
    "Dining table": "Woodwork",
    "Bed frame": "Woodwork",
    "Wardrobe / cupboard": "Cabinets & Doors",
    "Sofa / couch": "Upholstered Furniture",

    # PLUMBING
    "Pipe": "Pipes",
    "Drain": "Blocked Drains",
    "Tap": "Taps & Toilets"
}

# ---------------------------------------------------
# MODEL SETUP
# ---------------------------------------------------

MODEL_PATH = "models/repair_model_v1.h5"
#MODEL_PATH = "models/efficientnet_repair_v1.h5"

model = tf.keras.models.load_model(MODEL_PATH)

# Updated to match your 4-class dataset
CLASSES = ["electrical", "furniture", "other", "plumbing"]
visual_identifier = MobileNetV2(weights='imagenet')

# ---------------------------------------------------
# IMAGE HELPER
# ---------------------------------------------------

def get_shared_tensor(image_bytes):

    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")

    img = img.resize((224, 224))

    arr = np.array(img)

    return np.expand_dims(arr, axis=0)

# ---------------------------------------------------
# SMART FLOW MATCHER  ✅ FIXED — guards against missing category or step
# ---------------------------------------------------

def get_matching_question_group(category, detected_object):

    if not detected_object:
        return None

    # ✅ Guard: category must exist in ISSUE_MAPPING
    if category not in ISSUE_MAPPING:
        return None

    mapped_group = OBJECT_FLOW_MAP.get(detected_object)

    if not mapped_group:
        return None

    # ✅ Guard: step 2 may not be a branching dict (e.g. "other" category)
    step2 = ISSUE_MAPPING[category]["steps"].get(2, {})

    # Step 2 must be a branching dict (not a plain question node)
    if "question" in step2:
        return None

    if detected_object in step2:
        return detected_object

    if mapped_group in step2:
        return mapped_group

    return None

# ---------------------------------------------------
# OBJECT DETECTION
# ---------------------------------------------------

def detect_object(base_tensor):

    mobile_x = preprocess_input(base_tensor.copy())

    preds = visual_identifier.predict(mobile_x)

    top_10 = decode_predictions(preds, top=10)[0]

    for _, label, score in top_10:

        label = label.lower().replace("_", " ")

        print("Detected:", label, score)

        # ELECTRICAL
        if any(x in label for x in ["fan", "blower"]):
            return "Fan"

        elif any(x in label for x in ["television", "tv", "monitor"]):
            return "TV"

        elif any(x in label for x in ["refrigerator", "fridge"]):
            return "Fridge"

        elif any(x in label for x in ["washer", "washing machine"]):
            return "Washing Machine"

        elif any(x in label for x in ["lamp", "light"]):
            return "Light"

        elif any(x in label for x in ["oven", "microwave", "cooker"]):
            return "Rice Cooker"

        # FURNITURE
        elif any(x in label for x in ["chair", "seat", "stool"]):
            return "Chair or stool"

        elif any(x in label for x in ["table", "desk"]):
            return "Dining table"

        elif any(x in label for x in ["sofa", "couch"]):
            return "Sofa / couch"

        elif "bed" in label:
            return "Bed frame"

        elif any(x in label for x in ["cabinet", "wardrobe", "cupboard"]):
            return "Wardrobe / cupboard"

        # PLUMBING
        elif any(x in label for x in ["pipe", "pipeline"]):
            return "Pipe"

        elif "drain" in label:
            return "Drain"

        elif any(x in label for x in ["tap", "faucet"]):
            return "Tap"

    return None

# ---------------------------------------------------
# START FLOW
# ---------------------------------------------------

@app.post("/predict")
async def start_service_flow(
    file: UploadFile = File(...),
    language: str = Query("en")
):

    contents = await file.read()

    base_tensor = get_shared_tensor(contents)

    # CATEGORY PREDICTION
    domain_input = base_tensor / 255.0

    preds = model.predict(domain_input)

    best_idx = np.argmax(preds[0])

    conf_score = float(preds[0][best_idx])

    category = CLASSES[best_idx]

    confidence_str = f"{round(conf_score * 100, 2)}%"

    # ✅ FIXED: "other" category — skip object detection branching,
    # go straight to step 1 of the "other" flow
    if category == "other":
        identified_item = None
        matched_group   = None
        session_id      = f"REPAIR-{uuid.uuid4().hex[:4].upper()}"
        current_step    = 1

        session_data = {
            "id":           session_id,
            "category":     category,
            "object":       None,
            "flow_group":   None,
            "confidence":   confidence_str,
            "language":     language,
            "answers":      {},
            "step2_answer": None,
            "current_step": current_step
        }

        db_manager.save_session(session_data)

        flow  = ISSUE_MAPPING[category]
        next_q = flow["steps"][1]

        agent_text = "I couldn't clearly identify a specific category. Let me ask you a few questions to understand what you need."

        if language == "si":
            agent_text = get_sinhala_translation(agent_text)

        return {
            "session_id":      session_id,
            "confidence":      confidence_str,
            "detected_object": None,
            "detected_group":  None,
            "agent_speech":    agent_text,
            "next_question":   translate_payload(next_q, language)
        }

    # OBJECT DETECTION (only for non-"other" categories)
    identified_item = detect_object(base_tensor)

    # FLOW GROUP
    matched_group = get_matching_question_group(
        category,
        identified_item
    )

    session_id = f"REPAIR-{uuid.uuid4().hex[:4].upper()}"

    current_step = 2 if matched_group else 1

    session_data = {
        "id":           session_id,
        "category":     category,
        "object":       identified_item,
        "flow_group":   matched_group,
        "confidence":   confidence_str,
        "language":     language,
        "answers":      {},
        "step2_answer": None,
        "current_step": current_step
    }

    db_manager.save_session(session_data)

    flow = ISSUE_MAPPING[category]

    # SMART QUESTION
    if matched_group:

        raw_q = flow["steps"][2][matched_group]

        next_q = {
            "question": raw_q["question"],
            "options":  raw_q["options"]
        }

    else:

        next_q = flow["steps"][1]

    # AGENT SPEECH
    agent_text = f"I've identified a {category} issue."

    if language == "si":
        agent_text = get_sinhala_translation(agent_text)

    return {
        "session_id":      session_id,
        "confidence":      confidence_str,
        "detected_object": identified_item,
        "detected_group":  matched_group,
        "agent_speech":    agent_text,
        "next_question":   translate_payload(next_q, language)
    }

# ---------------------------------------------------
# NEXT FLOW STEP — FULLY DYNAMIC BRANCHING
# ---------------------------------------------------

@app.post("/flow/next")
async def get_next_step(body: dict = Body(...)):

    session_id = body.get("session_id")

    raw_answer = body.get("answer")

    session = db_manager.get_session(session_id)

    if not session:
        return {
            "success": False,
            "message": "Invalid session"
        }

    language = getattr(session, "language", "en")

    answer = (
        translate_answer_to_english(raw_answer)
        if language == "si"
        else raw_answer
    )

    cat  = session.category
    step = session.current_step

    # SAVE ANSWER
    answers = session.answers or {}

    answers[f"step_{step}"] = answer

    session.answers = answers

    # ✅ Step 1 answer = flow_group (appliance / plumbing type / furniture type / other type)
    if step == 1:
        session.object     = answer
        session.flow_group = answer

    # ✅ Step 2 answer = used to branch Step 3
    if step == 2:
        session.step2_answer = answer

    # Persist BEFORE reading back, so getattr reflects latest values
    db_manager.save_session(session)

    next_step  = step + 1
    flow_steps = ISSUE_MAPPING[cat]["steps"]

    # FLOW FINISHED — build rich summary
    if next_step not in flow_steps:
        summary = build_summary(session, answers)
        return {
            "success":  True,
            "summary":  summary
        }

    # -------------------------------------------------------
    # RESOLVE: always return exactly ONE {question, options}
    # -------------------------------------------------------
    raw_next = flow_steps[next_step]

    # Read back the freshly-saved values
    flow_group = getattr(session, "flow_group",   None)
    step2_ans  = getattr(session, "step2_answer", None)

    def resolve_question(q_node):
        """
        Recursively resolve a potentially-branched node to a single
        {question, options} dict.

        Priority:
          1. Already a plain question  → return as-is
          2. Current answer            → direct branch key (step 1→2, step 2→3)
          3. step2_answer              → branch key saved from step 2
          4. flow_group                → branch key saved from step 1
          5. "default"                 → safe fallback
          6. First value               → absolute last resort
        """
        # Already resolved — plain question node
        if "question" in q_node:
            return q_node

        # 1. The answer the user JUST gave is the most direct branch key
        if answer and answer in q_node:
            return resolve_question(q_node[answer])

        # 2. Step 2 answer (resolves step 3 onwards)
        if step2_ans and step2_ans in q_node:
            return resolve_question(q_node[step2_ans])

        # 3. flow_group / step 1 answer
        if flow_group and flow_group in q_node:
            return resolve_question(q_node[flow_group])

        # 4. Explicit default key
        if "default" in q_node:
            return resolve_question(q_node["default"])

        # 5. Absolute last resort — first child
        return resolve_question(next(iter(q_node.values())))

    next_q = resolve_question(raw_next)

    session.current_step = next_step

    db_manager.save_session(session)

    return {
        "session_id":    session_id,
        "next_question": translate_payload(next_q, language)
    }

# ---------------------------------------------------
# STEP LABEL MAPS — human-readable question labels per category
# ---------------------------------------------------

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
    },

    "other": {
        1: "Service Type",
        2: "Sub-Type",
        3: "Detail",
        4: "Urgency",
        5: "Address"
    }
}

# ---------------------------------------------------
# URGENCY RESOLVER — reads the urgency answer from answers
# ---------------------------------------------------

def resolve_urgency(answers: dict) -> str:
    """
    Scan all step answers to find the urgency level.
    Works across all categories regardless of which step urgency falls on.
    """
    urgency_map = {
        "flexible":        "Low — Flexible scheduling",
        "within 24 hours": "Medium — Within 24 hours",
        "urgent":          "High — Urgent, needs immediate attention",
        "emergency":       "Critical — Emergency service required",
        "flooding occurring":     "Critical — Emergency (flooding)",
        "water spreading fast":   "Critical — Emergency (water spreading)",
        "sparks visible":         "Critical — Emergency (electrical sparks)",
        "no immediate risk":      "Low — No immediate risk",
        "bad smell present":      "Medium — Needs prompt attention (odour)",
        "burning smell":          "High — Urgent (burning smell detected)",
        "power trips happening":  "High — Urgent (power tripping)"
    }
    for val in answers.values():
        if val:
            normalized = val.strip().lower()
            for key, label in urgency_map.items():
                if key in normalized:
                    return label
    return "Unknown"

# ---------------------------------------------------
# BRIEF DESCRIPTION GENERATOR
# ---------------------------------------------------

def generate_brief_description(category: str, answers: dict, detected_object: str) -> str:
    """
    Builds a human-readable, meaningful one-paragraph description of the
    service request based on category and all collected answers.
    """

    vals = [v for v in answers.values() if v]

    if category == "electrical":
        appliance  = answers.get("step_1") or detected_object or "an electrical appliance"
        symptom    = answers.get("step_2", "an issue")
        detail     = answers.get("step_3", "")
        risk       = answers.get("step_4", "no known risk")
        urgency    = answers.get("step_5", "flexible timing")
        address    = answers.get("step_6", "address not provided")

        desc = (
            f"The customer has reported a problem with their {appliance}. "
            f"The appliance is experiencing '{symptom}'"
            f"{f', specifically described as: {detail}' if detail else ''}. "
            f"Safety assessment indicates: {risk}. "
            f"Service is requested with {urgency} and the job location is {address}."
        )

    elif category == "furniture":
        ftype   = answers.get("step_1", "furniture")
        problem = answers.get("step_2", "a problem")
        detail  = answers.get("step_3", "")
        material= answers.get("step_4", "unknown material")
        onsite  = answers.get("step_5", "not specified")
        urgency = answers.get("step_6", "flexible")
        address = answers.get("step_7", "address not provided")

        desc = (
            f"The customer requires repair for their {ftype}. "
            f"The reported problem is '{problem}'"
            f"{f', with further detail: {detail}' if detail else ''}. "
            f"The furniture material is {material}. "
            f"On-site work: {onsite}. "
            f"Service is needed with {urgency} scheduling at {address}."
        )

    elif category == "plumbing":
        area    = answers.get("step_1", "a plumbing area")
        issue   = answers.get("step_2", "an issue")
        detail  = answers.get("step_3", "")
        flow    = answers.get("step_4", "unknown")
        risk    = answers.get("step_5", "no known risk")
        urgency = answers.get("step_6", "flexible")
        address = answers.get("step_7", "address not provided")

        desc = (
            f"A plumbing issue has been reported in the {area} area. "
            f"The specific problem is '{issue}'"
            f"{f', described further as: {detail}' if detail else ''}. "
            f"Current water flow status: {flow}. "
            f"Immediate risk level: {risk}. "
            f"Service urgency is {urgency} and the address is {address}."
        )

    elif category == "other":
        stype   = answers.get("step_1", "a general service")
        subtype = answers.get("step_2", "")
        detail  = answers.get("step_3", "")
        urgency = answers.get("step_4", "flexible")
        address = answers.get("step_5", "address not provided")

        desc = (
            f"The customer has requested {stype} services"
            f"{f', specifically {subtype}' if subtype else ''}. "
            f"{f'Additional detail: {detail}. ' if detail else ''}"
            f"Service is needed with {urgency} scheduling at {address}."
        )

    else:
        desc = (
            f"A {category} service request has been submitted. "
            f"Details collected: {', '.join(vals)}."
        )

    return desc

# ---------------------------------------------------
# PROVIDER MATCHING CRITERIA BUILDER
# ---------------------------------------------------

def build_provider_criteria(category: str, answers: dict, urgency_level: str) -> dict:
    """
    Extracts structured criteria that can be used to match
    the right service provider from the database.
    """

    address = None
    for step_key in ["step_6", "step_7", "step_5"]:
        if answers.get(step_key):
            address = answers[step_key]
            break

    is_urgent = any(
        word in urgency_level.lower()
        for word in ["urgent", "critical", "emergency", "high"]
    )

    criteria = {
        "service_category":   category,
        "urgency_level":      urgency_level,
        "is_urgent":          is_urgent,
        "service_location":   address,
        "provider_tags":      [],
        "match_priority":     "HIGH" if is_urgent else "NORMAL"
    }

    # Build provider skill tags based on category + answers
    if category == "electrical":
        appliance = answers.get("step_1", "").lower()
        risk      = answers.get("step_4", "").lower()
        criteria["provider_tags"].append("electrician")
        if "fridge" in appliance or "washing" in appliance:
            criteria["provider_tags"].append("appliance_repair")
        if "sparks" in risk or "burning" in risk or "trip" in risk:
            criteria["provider_tags"].append("electrical_safety")
            criteria["match_priority"] = "HIGH"

    elif category == "furniture":
        ftype    = answers.get("step_1", "").lower()
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
        risk = answers.get("step_5", "").lower()
        criteria["provider_tags"].append("plumber")
        if "burst" in answers.get("step_2", "").lower():
            criteria["provider_tags"].append("emergency_plumbing")
            criteria["match_priority"] = "HIGH"
        if "drain" in area or "blocked" in area:
            criteria["provider_tags"].append("drain_specialist")

    elif category == "other":
        stype = answers.get("step_1", "").lower()
        if "cleaning" in stype:
            criteria["provider_tags"].append("cleaning_service")
        if "painting" in stype:
            criteria["provider_tags"].append("painter")
        if "maintenance" in stype:
            criteria["provider_tags"].append("handyman")

    return criteria

# ---------------------------------------------------
# MASTER SUMMARY BUILDER
# ---------------------------------------------------

def build_summary(session, answers: dict) -> dict:
    """
    Builds the complete, meaningful service request summary
    ready for provider matching.
    """

    category       = session.category
    detected_obj   = getattr(session, "object",     None)
    confidence     = getattr(session, "confidence", "N/A")
    session_id     = getattr(session, "id",         "N/A")
    language       = getattr(session, "language",   "en")

    # Step label map for this category
    labels = STEP_LABELS.get(category, {})

    # Build structured step-by-step breakdown
    step_breakdown = []
    for step_key, raw_answer in answers.items():
        try:
            step_num = int(step_key.replace("step_", ""))
        except ValueError:
            continue
        label = labels.get(step_num, f"Step {step_num}")
        step_breakdown.append({
            "step":     step_num,
            "label":    label,
            "answer":   raw_answer
        })

    step_breakdown.sort(key=lambda x: x["step"])

    # Resolve urgency
    urgency_level = resolve_urgency(answers)

    # Generate human-readable description
    brief_description = generate_brief_description(category, answers, detected_obj)

    # Build provider matching criteria
    provider_criteria = build_provider_criteria(category, answers, urgency_level)

    return {

        # ── Identity ──────────────────────────────────────────
        "session_id":          session_id,
        "language":            language,

        # ── Detection ─────────────────────────────────────────
        "detected_category":   category,
        "detected_object":     detected_obj,
        "model_confidence":    confidence,

        # ── Step-by-Step Answers ───────────────────────────────
        "step_breakdown":      step_breakdown,

        # ── Human-Readable Summary ────────────────────────────
        "brief_description":   brief_description,

        # ── Urgency ───────────────────────────────────────────
        "urgency_level":       urgency_level,

        # ── Provider Matching ─────────────────────────────────
        "provider_matching": {
            "status":          "READY",
            "criteria":        provider_criteria,
            "message":         (
                f"Service request is ready for provider matching. "
                f"Looking for a {', '.join(provider_criteria['provider_tags']) or category} "
                f"provider near {provider_criteria['service_location'] or 'the specified location'} "
                f"with match priority: {provider_criteria['match_priority']}."
            )
        }
    }

# ---------------------------------------------------
# /summary — fetch summary for any completed session
# ---------------------------------------------------

@app.get("/summary/{session_id}")
async def get_summary(session_id: str):

    session = db_manager.get_session(session_id)

    if not session:
        return {
            "success": False,
            "message": "Session not found"
        }

    answers = getattr(session, "answers", {}) or {}

    summary = build_summary(session, answers)

    return {
        "success": True,
        "summary": summary
    }

# ---------------------------------------------------
# MAIN
# ---------------------------------------------------

if __name__ == "__main__":

    import uvicorn

    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000
    )