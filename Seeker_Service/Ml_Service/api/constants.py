# Updated Category and Issue Mappings for Service Discovery

ISSUE_MAPPING = {
    "electrical": {
        "object": "Electrical device",
        "steps": {
            1: {
                "question": "Which electrical item needs service?",
                "options": ["Fan", "TV", "Fridge", "Washing Machine", "Light", "Rice Cooker", "Other appliance"]
            },
            2: {
                "Fan": {
                    "question": "What issue does the fan show right now?",
                    "options": ["Not working at all", "No power", "Loud noise", "Slow spinning", "Burning smell"]
                },
                "TV": {
                    "question": "What is the main TV problem?",
                    "options": ["Black screen", "Cracked screen", "No signal", "Power not turning on", "Sound but no picture"]
                },
                "Fridge": {
                    "question": "What is the fridge issue you need fixed?",
                    "options": ["Not cooling", "Ice buildup", "Water leakage", "Unusual noise", "Door seal broken"]
                },
                "Light": {
                    "question": "What lighting problem do you have?",
                    "options": ["Flickering", "Not turning on", "Broken holder", "LED strip issue"]
                },
                "Washing Machine": {
                    "question": "What issue does the washing machine show?",
                    "options": ["Drum not spinning", "Water leaking", "Error code shown", "Cycle not starting", "Loud vibration"]
                },
                "Rice Cooker": {
                    "question": "What issue does the rice cooker have?",
                    "options": ["Not heating", "Food getting burnt", "Power switch broken", "Very slow cooking", "Burning smell"]
                },
                "Other appliance": {
                    "question": "What is the issue with the appliance?",
                    "options": ["No power", "Sparking/smoke", "Noise/vibration", "Overheating", "Other fault"]
                }
            },
            3: {
                "question": "Is there any immediate electrical risk?",
                "options": ["No immediate risk", "Sparking/smoke noticed", "Burning smell", "Power trips repeatedly"]
            },
            4: {
                "question": "When do you need this service?",
                "options": ["Flexible (within 2-3 days)", "Soon (within 24 hours)", "Urgent (as soon as possible)"]
            },
            5: {
                "question": "Where is the electrical item located?",
                "options": ["Living Room", "Kitchen", "Bedroom", "Bathroom", "Outdoor", "Office/Shop"]
            }
        }
    },
    "plumbing": {
        "object": "Plumbing system",
        "steps": {
            1: {
                "question": "What plumbing issue do you need help with?",
                "options": ["Leakage", "Blockage", "Low water pressure", "Overflow", "Pipe damage"]
            },
            2: {
                "question": "Where exactly is the plumbing issue?",
                "options": ["Kitchen sink", "Bathroom", "Toilet", "Wall/pipe line", "Water tank", "Outdoor line"]
            },
            3: {
                "Leakage": {
                    "question": "How severe is the leakage right now?",
                    "options": ["Small drip", "Continuous leak", "Heavy water flow"]
                },
                "Blockage": {
                    "question": "How bad is the blockage?",
                    "options": ["Fully blocked", "Slow drainage", "Dirty water backup"]
                },
                "Toilet": {
                    "question": "What toilet issue do you see?",
                    "options": ["Flush not working", "Overflowing", "Water keeps running"]
                },
                "Low water pressure": {
                    "question": "How does the low water pressure issue appear?",
                    "options": ["Only one tap affected", "Multiple taps affected", "No water at times", "Pressure drops at peak hours"]
                },
                "Overflow": {
                    "question": "Where is overflow happening?",
                    "options": ["Toilet tank", "Water tank", "Sink", "Drain line"]
                },
                "Pipe damage": {
                    "question": "What pipe damage do you observe?",
                    "options": ["Visible crack", "Burst pipe", "Joint loosened", "Rust/corrosion leak"]
                }
            },
            4: {
                "question": "How urgent is the plumbing service?",
                "options": ["Low (can wait)", "Medium (today)", "High (immediate)"]
            },
            5: {
                "question": "Please share service address details for plumber visit:",
                "type": "location_picker",
                "options": ["Enter location manually", "Use current location"]
            }
        }
    },
    "furniture": {
        "object": "Furniture",
        "steps": {
            1: {
                "question": "Which furniture item needs work?",
                "options": ["Chair", "Table", "Sofa", "Bed", "Wardrobe/Cabinet", "Needs assembly", "Other"]
            },
            2: {
                "Chair": {
                    "question": "What is the chair problem?",
                    "options": ["Broken leg", "Wobbly/unstable", "Loose joints", "Missing screws", "Seat/back damage"]
                },
                "Table": {
                    "question": "What is the table issue?",
                    "options": ["Broken leg", "Cracked surface", "Unstable/shaky", "Top surface damage"]
                },
                "Sofa": {
                    "question": "What issue does the sofa have?",
                    "options": ["Torn fabric", "Sagging cushion", "Broken frame", "Stain/deep cleaning needed", "Spring issue"]
                },
                "Bed": {
                    "question": "What issue does the bed have?",
                    "options": ["Broken frame", "Noisy joints", "Support slats damaged", "Headboard issue"]
                },
                "Wardrobe/Cabinet": {
                    "question": "What is the wardrobe/cabinet issue?",
                    "options": ["Door misaligned", "Hinge broken", "Drawer jammed", "Panel damage"]
                },
                "Needs assembly": {
                    "question": "What assembly service do you need?",
                    "options": ["Full installation", "Parts already available", "Disassembled furniture"]
                },
                "Other": {
                    "question": "What type of furniture service is needed?",
                    "options": ["Repair", "Assembly", "Polish/refinish", "Part replacement"]
                }
            },
            3: {
                "Sofa": {
                    "question": "For sofa fabric work, what support do you need?",
                    "options": ["Patch/repair fabric", "Replace upholstery", "Deep cleaning + stain treatment", "Need technician inspection first"]
                },
                "Chair": {
                    "question": "What should the technician prepare for chair repair?",
                    "options": ["Wood/glue fixing", "Tightening joints/screws", "Seat cushion repair", "Need inspection first"]
                },
                "Table": {
                    "question": "What service outcome do you need for the table?",
                    "options": ["Structural repair", "Surface crack repair", "Polish/refinish", "Need inspection first"]
                },
                "Bed": {
                    "question": "What bed repair support is needed?",
                    "options": ["Frame reinforcement", "Noise/joint fixing", "Slat replacement", "Need inspection first"]
                },
                "Wardrobe/Cabinet": {
                    "question": "What cabinet/wardrobe support is needed?",
                    "options": ["Hinge/door alignment", "Drawer track repair", "Panel replacement", "Need inspection first"]
                },
                "Other": {
                    "question": "What type of help do you need for this furniture?",
                    "options": ["Repair", "Assembly", "Refinishing", "Inspection visit"]
                }
            },
            4: {
                "question": "How urgent is the furniture service?",
                "options": ["Low (scheduled)", "Medium (this week)", "High (urgent)"]
            },
            5: {
                "question": "Is on-site work possible at your place?",
                "options": ["Yes, on-site possible", "No, pickup needed", "Not sure"]
            },
            6: {
                "question": "Where is the furniture located?",
                "options": ["Living Room", "Bedroom", "Office", "Outdoor", "Commercial space"]
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
