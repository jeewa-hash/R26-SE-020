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
                "Fan": {
                    "question": "What is happening with your Fan?",
                    "options": ["Not working at all", "Power issue", "Making loud noise", "Spinning too slow", "Burning smell"]
                },
                "TV": {
                    "question": "What's wrong with your TV display?",
                    "options": ["Black screen", "Cracked screen", "No signal", "Power won't turn on", "Sound but no picture"]
                },
                "Fridge": {
                    "question": "What issue do you notice with your Fridge?",
                    "options": ["Not cooling at all", "Ice buildup in freezer", "Water leaking inside", "Making strange noises", "Door seal is broken"]
                },
                "Light": {
                    "question": "What is the problem with the Lighting?",
                    "options": ["Flickering constantly", "Not turning on", "Broken bulb holder", "LED strip malfunction"]
                },
                "Washing Machine": {
                    "question": "What's wrong with the Washing Machine?",
                    "options": ["Drum not spinning", "Water leaking out", "Showing an error code", "Not starting the cycle", "Making loud vibrations"]
                },
                "Rice Cooker": {
                    "question": "How is your Rice Cooker behaving?",
                    "options": ["Not heating at all", "Rice is getting burnt", "Power switch is stuck/broken", "Takes too long to cook", "Burning smell when used"]
                }
            },
            3: {
                "question": "Is this a new problem or has it happened before?",
                "options": ["First time", "Recurring issue", "Previously repaired"]
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
                "Chair": {
                    "question": "What is wrong with your chair?",
                    "options": ["Broken leg", "Wobbly/unstable", "Loose joints", "Missing screws", "Fabric/cushion damage"]
                },
                "Table": {
                    "question": "What is happening with the table?",
                    "options": ["Broken leg", "Cracked surface", "Unstable/shaky", "Scratches/polish issue"]
                },
                "Sofa": {
                    "question": "What issue do you see with the sofa?",
                    "options": ["Torn fabric", "Sagging cushion", "Broken frame", "Stains", "Spring issue"]
                },
                "Needs assembly": {
                    "question": "What assembly service do you need?",
                    "options": ["Full installation", "Parts already available", "Disassembled furniture"]
                }
            },
            3: {
                "question": "Is the item still usable?",
                "options": ["Yes (minor issue)", "No (completely broken)"]
            },
            4: {
                "question": "How urgent is this?",
                "options": ["Low", "Medium", "High"]
            },
            5: {
                "question": "Where is it located?",
                "options": ["Living Room", "Bedroom", "Office", "Outdoor"]
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
