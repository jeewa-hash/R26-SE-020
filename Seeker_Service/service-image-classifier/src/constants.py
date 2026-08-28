ISSUE_MAPPING = {
    # ELECTRICAL
    
    "electrical": {

        "steps": {

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

            3: {

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

            4: {
                "question": "Is there any electrical risk?",
                "options": [
                    "No risk",
                    "Burning smell",
                    "Sparks visible",
                    "Power trips happening"
                ]
            },

            5: {
                "question": "When do you need this service?",
                "options": [
                    "Flexible",
                    "Within 24 hours",
                    "Urgent"
                ]
            },

            6: {
                "question": "What is your address?",
                "options": []
            }
        }
    },


    # ========================================================
    # FURNITURE
    # ========================================================

    "furniture": {

        "steps": {

            1: {
                "question": "What type of furniture needs repair?",
                "options": [
                    "Woodwork",
                    "Upholstered Furniture",
                    "Cabinets & Doors",
                    "Outdoor Furniture"
                ]
            },

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

            3: {

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

            5: {
                "question": "Is on-site work possible?",
                "options": [
                    "Yes",
                    "Pickup needed",
                    "Not sure"
                ]
            },

            6: {
                "question": "When do you need this service?",
                "options": [
                    "Flexible",
                    "Within 24 hours",
                    "Urgent"
                ]
            },

            7: {
                "question": "What is your address?",
                "options": []
            }
        }
    },

    # PLUMBING
    "plumbing": {

        "steps": {

            1: {
                "question": "What plumbing issue do you need help with?",
                "options": [
                    "Leaks",
                    "Pipes",
                    "Blocked Drains",
                    "Taps & Toilets"
                ]
            },

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

            3: {

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

            4: {
                "question": "Is water still flowing normally in your home?",
                "options": [
                    "Yes, flowing normally",
                    "Partially",
                    "No water at all",
                    "Not sure"
                ]
            },

            5: {
                "question": "Is there any immediate risk?",
                "options": [
                    "No immediate risk",
                    "Flooding occurring",
                    "Bad smell present",
                    "Water spreading fast"
                ]
            },

            6: {
                "question": "When do you need this service?",
                "options": [
                    "Flexible",
                    "Within 24 hours",
                    "Urgent"
                ]
            },

            7: {
                "question": "What is your address?",
                "options": []
            }
        }
    }
}
