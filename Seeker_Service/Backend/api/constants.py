# Updated Category and Issue Mappings for Service Discovery

ISSUE_MAPPING = {
    "electrical": {
        "object": "Electrical device",
        "steps": {
            1: {
                "question": "What device has the issue?",
                "options": ["Fan", "TV", "Fridge", "Washing Machine", "Light", "Rice Cooker"]
            },
            2: {
                "question": "What is the main issue?",
                "options": ["Not working", "Power issue", "Noise / vibration", "Burning smell / smoke", "Physical damage"]
            },
            3: {
                "Fan": {
                    "question": "What exactly is wrong?",
                    "options": ["Not spinning", "Spinning slowly", "Making noise", "Wiring issue", "Smoke from motor"]
                },
                "TV": {
                    "question": "What issue do you see?",
                    "options": ["Black screen", "Cracked screen", "No signal", "Power not turning on", "Sound but no display"]
                },
                "Fridge": {
                    "question": "What issue do you notice?",
                    "options": ["Not cooling", "Ice buildup", "Water leakage", "Door not closing properly"]
                },
                "Light": {
                    "question": "What is the problem?",
                    "options": ["Flickering", "Not turning on", "Broken holder", "LED strip issue"]
                },
                "Washing Machine": {
                    "question": "What issue do you see?",
                    "options": ["Drum not spinning", "Water leaking", "Error display", "Not starting"]
                },
                "Rice Cooker": {
                    "question": "What issue do you notice?",
                    "options": ["Not heating", "Burnt plate", "Broken switch"]
                }
            },
            4: {
                "question": "How urgent is this?",
                "options": ["Low (can wait)", "Medium (need soon)", "High (urgent repair)"]
            },
            5: {
                "question": "Where is the issue located?",
                "options": ["Living Room", "Kitchen", "Bedroom", "Bathroom", "Outdoor"]
            }
        }
    },
    "plumbing": {
        "object": "Plumbing system",
        "steps": {
            1: {
                "question": "What is the problem type?",
                "options": ["Leakage", "Blockage", "Low water pressure", "Overflow"]
            },
            2: {
                "question": "Where is the issue located?",
                "options": ["Kitchen sink", "Bathroom", "Toilet", "Pipe / wall", "Water tank"]
            },
            3: {
                "Leakage": {
                    "question": "What is the specific leakage issue?",
                    "options": ["Small drip", "Continuous leak", "Heavy water flow"]
                },
                "Blockage": {
                    "question": "What is the specific blockage issue?",
                    "options": ["Fully blocked", "Slow drainage", "Dirty water backup"]
                },
                "Toilet": {
                    "question": "What is the toilet issue?",
                    "options": ["Flush not working", "Overflowing", "Water keeps running"]
                }
            },
            4: {
                "question": "How urgent is this?",
                "options": ["Low", "Medium", "High"]
            },
            5: {
                "question": "Please provide your location:",
                "type": "location_picker",
                "options": ["Enter location manually", "Use current location"]
            }
        }
    },
    "furniture": {
        "object": "Furniture",
        "steps": {
            1: {
                "question": "What type of furniture?",
                "options": ["Chair", "Table", "Sofa", "Bed", "Other"]
            },
            2: {
                "question": "What is the problem type?",
                "options": ["Broken", "Loose", "Cracked", "Needs assembly", "Fabric damage"]
            },
            3: {
                "Chair": {
                    "question": "What is the specific chair issue?",
                    "options": ["Broken leg", "Wobbly", "Loose joints", "Missing screws"]
                },
                "Table": {
                    "question": "What is the specific table issue?",
                    "options": ["Broken leg", "Cracked surface", "Unstable"]
                },
                "Sofa": {
                    "question": "What is the specific sofa issue?",
                    "options": ["Torn fabric", "Sagging cushion", "Broken frame", "Stains"]
                },
                "Needs assembly": {
                    "question": "What assembly service do you need?",
                    "options": ["Need installation", "Parts already available", "Disassembled furniture"]
                }
            },
            4: {
                "question": "Can it still be used?",
                "options": ["Yes (minor issue)", "No (completely broken)"]
            },
            5: {
                "question": "How urgent is this?",
                "options": ["Low", "Medium", "High"]
            },
            6: {
                "question": "Where is it located?",
                "options": ["Living Room", "Bedroom", "Office", "Outdoor use"]
            }
        }
    }
}

# Prefix mappings for ML classification
ELECTRICAL_PREFIXES = ["lighting_", "fan_", "tv_", "fridge_", "kitchen_", "washing_machine_", "Electrical_Repair"]
PLUMBING_PREFIXES = ["plumbing_", "Plumbing"]
FURNITURE_PREFIXES = ["furniture_", "Furniture_Repair"]

# SUB_CATEGORY_MAPPING translates ML classes to Step 1 options
SUB_CATEGORY_MAPPING = {
    "lighting": "Light",
    "fan": "Fan",
    "tv": "TV",
    "fridge": "Fridge",
    "kitchen": "Rice Cooker",
    "washing": "Washing Machine",
    "leakage": "Leakage",
    "blockage": "Blockage",
    "toilet": "Toilet",
    "chair": "Chair",
    "table": "Table",
    "sofa": "Sofa",
    "bed": "Bed"
}
