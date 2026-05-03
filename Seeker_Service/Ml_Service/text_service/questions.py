TEXT_QUESTION_FLOW = {

    # ═══════════════════════════════════════════
    # 1. CLEANING
    # ═══════════════════════════════════════════
    "cleaning": {

        1: {
            "question": "What type of cleaning service do you need?",
            "answer_key": "service_type",
            "options": [
                "full house cleaning",
                "kitchen cleaning",
                "bathroom cleaning",
                "office cleaning",
                "post-construction cleaning",
                "move-in/move-out cleaning",
                "sofa/carpet/curtain cleaning"
            ],
            "next": {
                "full house cleaning":        "full_house_q1",
                "kitchen cleaning":           "kitchen_q1",
                "bathroom cleaning":          "bathroom_q1",
                "office cleaning":            "office_q1",
                "post-construction cleaning": "postconstruction_q1",
                "move-in/move-out cleaning":  "moveinout_q1",
                "sofa/carpet/curtain cleaning": "sofa_q1"
            }
        },

        # ─── FULL HOUSE ───────────────────────
        "full_house_q1": {
            "question": "Do you need a deep clean or a regular maintenance clean?",
            "answer_key": "clean_type",
            "options": [
                "deep clean - not cleaned in a long time",
                "regular maintenance clean",
                "not sure"
            ],
            "next": "full_house_q2"
        },
        "full_house_q2": {
            "question": "How many bedrooms does the house have?",
            "answer_key": "house_size",
            "options": [
                "1 bedroom",
                "2 bedrooms",
                "3 bedrooms",
                "4+ bedrooms"
            ],
            "next": "full_house_q3"
        },
        "full_house_q3": {
            "question": "Which areas need special attention?",
            "answer_key": "focus_areas",
            "options": [
                "kitchen and appliances",
                "bathrooms",
                "windows and glass",
                "floors and carpets",
                "all areas equally"
            ],
            "next": "common_schedule"
        },

        # ─── KITCHEN ──────────────────────────
        "kitchen_q1": {
            "question": "What is the main issue in your kitchen?",
            "answer_key": "main_issue",
            "options": [
                "heavy oil/grease buildup on stove or hood",
                "burnt-on food residue in oven",
                "inside appliances need cleaning (fridge/microwave)",
                "general dirt and surface cleaning",
                "bad smell/odour",
                "all of the above"
            ],
            "next": "kitchen_q2"
        },
        "kitchen_q2": {
            "question": "Which specific areas of the kitchen need cleaning?",
            "answer_key": "kitchen_areas",
            "options": [
                "stovetop and hood only",
                "oven and appliances only",
                "countertops and cabinets",
                "sink and tiles",
                "full kitchen - everything"
            ],
            "next": "kitchen_q3"
        },
        "kitchen_q3": {
            "question": "How large is your kitchen?",
            "answer_key": "area_size",
            "options": [
                "small - compact/studio kitchen",
                "medium - standard kitchen",
                "large - open plan or commercial kitchen"
            ],
            "next": "common_schedule"
        },

        # ─── BATHROOM ─────────────────────────
        "bathroom_q1": {
            "question": "What is the main issue in your bathroom?",
            "answer_key": "main_issue",
            "options": [
                "mold or mildew on tiles/grout",
                "limescale on taps/showerhead/glass",
                "tough stains on toilet or bathtub",
                "blocked or slow drain",
                "bad smell/odour",
                "general cleaning"
            ],
            "next": "bathroom_q2"
        },
        "bathroom_q2": {
            "question": "How many bathrooms need cleaning?",
            "answer_key": "bathroom_count",
            "options": [
                "1 bathroom",
                "2 bathrooms",
                "3 bathrooms",
                "4+ bathrooms"
            ],
            "next": "bathroom_q3"
        },
        "bathroom_q3": {
            "question": "What type of shower or bath do you have?",
            "answer_key": "bath_type",
            "options": [
                "walk-in shower only",
                "bathtub only",
                "both shower and bathtub",
                "shower over bath"
            ],
            "next": "common_schedule"
        },

        # ─── OFFICE ───────────────────────────
        "office_q1": {
            "question": "How large is the office space?",
            "answer_key": "office_size",
            "options": [
                "small - 1 to 5 desks",
                "medium - 6 to 20 desks",
                "large - 21 to 50 desks",
                "very large - 50+ desks"
            ],
            "next": "office_q2"
        },
        "office_q2": {
            "question": "Which office areas need cleaning?",
            "answer_key": "office_areas",
            "options": [
                "workstations and desks only",
                "workstations + restrooms",
                "workstations + kitchen/pantry",
                "full office - all areas"
            ],
            "next": "office_q3"
        },
        "office_q3": {
            "question": "How often do you need office cleaning?",
            "answer_key": "cleaning_frequency",
            "options": [
                "one-time clean",
                "daily cleaning",
                "weekly cleaning",
                "bi-weekly cleaning"
            ],
            "next": "common_schedule"
        },

        # ─── POST-CONSTRUCTION ────────────────
        "postconstruction_q1": {
            "question": "What type of construction work was completed?",
            "answer_key": "construction_type",
            "options": [
                "full new build",
                "full renovation",
                "painting only",
                "tiling or flooring work",
                "mixed works"
            ],
            "next": "postconstruction_q2"
        },
        "postconstruction_q2": {
            "question": "What best describes the current condition?",
            "answer_key": "construction_condition",
            "options": [
                "heavy dust and debris - full clearout needed",
                "moderate dust - no major debris",
                "paint/grout residue on surfaces only",
                "light dust - mostly fine clean needed"
            ],
            "next": "postconstruction_q3"
        },
        "postconstruction_q3": {
            "question": "How large is the area to be cleaned?",
            "answer_key": "area_size",
            "options": [
                "small - under 500 sq ft",
                "medium - 500 to 1000 sq ft",
                "large - 1000 to 2000 sq ft",
                "very large - 2000+ sq ft"
            ],
            "next": "common_schedule"
        },

        # ─── MOVE-IN / MOVE-OUT ───────────────
        "moveinout_q1": {
            "question": "Is this a move-in, move-out, or full handover clean?",
            "answer_key": "move_type",
            "options": [
                "move-in clean",
                "move-out clean",
                "full handover - both move-out and move-in"
            ],
            "next": "moveinout_q2"
        },
        "moveinout_q2": {
            "question": "Is the property fully empty of furniture?",
            "answer_key": "property_status",
            "options": [
                "yes - fully empty",
                "partially empty",
                "still has furniture"
            ],
            "next": "moveinout_q3"
        },
        "moveinout_q3": {
            "question": "What needs to be included in the clean?",
            "answer_key": "move_clean_scope",
            "options": [
                "full clean including appliances and wardrobes",
                "general clean only - no appliances",
                "landlord checklist clean",
                "not sure - need full assessment"
            ],
            "next": "common_schedule"
        },

        # ─── SOFA / CARPET / CURTAIN ──────────
        "sofa_q1": {
            "question": "What item(s) need cleaning?",
            "answer_key": "items_to_clean",
            "options": [
                "sofa only",
                "carpet / rug only",
                "curtains only",
                "sofa + carpet",
                "all - sofa, carpet and curtains"
            ],
            "next": "sofa_q2"
        },
        "sofa_q2": {
            "question": "What is the material?",
            "answer_key": "material_type",
            "options": [
                "fabric / cotton",
                "leather",
                "velvet",
                "wool / synthetic",
                "not sure"
            ],
            "next": "sofa_q3"
        },
        "sofa_q3": {
            "question": "What is the current condition of the item(s)?",
            "answer_key": "item_condition",
            "options": [
                "light dirt - just a refresh needed",
                "moderate - visible marks and dullness",
                "heavy stains or pet odour",
                "very bad - not cleaned in a long time"
            ],
            "next": "common_schedule"
        },

        # ─── COMMON ENDING ────────────────────
        "common_schedule": {
            "question": "When do you need the service?",
            "answer_key": "schedule",
            "options": [
                "today",
                "tomorrow",
                "within 2-3 days",
                "this weekend",
                "flexible - anytime this week"
            ],
            "next": "common_location"
        },
        "common_location": {
            "question": "Where is the service needed? Please enter your address or area.",
            "answer_key": "location",
            "type": "text_input",
            "next": None
        }
    },

    # ═══════════════════════════════════════════
    # 2. GARDENING
    # ═══════════════════════════════════════════
    "gardening": {

        1: {
            "question": "What type of gardening service do you need?",
            "answer_key": "service_type",
            "options": [
                "garden maintenance (mowing, trimming, weeding)",
                "landscaping / garden design",
                "planting (flowers, vegetables, trees)"
            ],
            "next": {
                "garden maintenance (mowing, trimming, weeding)": "maintenance_q1",
                "landscaping / garden design":                    "landscaping_q1",
                "planting (flowers, vegetables, trees)":          "planting_q1"
            }
        },

        # ─── MAINTENANCE ──────────────────────
        "maintenance_q1": {
            "question": "What maintenance does your garden need?",
            "answer_key": "maintenance_type",
            "options": [
                "grass cutting only",
                "lawn mowing and edging",
                "hedge and shrub trimming",
                "weeding and clearing overgrowth",
                "watering and plant care",
                "leaf and waste removal",
                "all of the above"
            ],
            "next": "maintenance_q2"
        },
        "maintenance_q2": {
            "question": "How often do you need maintenance?",
            "answer_key": "maintenance_frequency",
            "options": [
                "one-time visit",
                "weekly",
                "bi-weekly",
                "monthly",
                "flexible / as needed"
            ],
            "next": "common_garden_size"
        },

        # ─── LANDSCAPING ──────────────────────
        "landscaping_q1": {
            "question": "What does your landscaping project involve?",
            "answer_key": "landscaping_type",
            "options": [
                "full garden redesign from scratch",
                "lawn laying or turf installation",
                "pathway or paving work",
                "adding garden beds or borders",
                "fencing or garden structure",
                "not sure - need a consultation"
            ],
            "next": "landscaping_q2"
        },
        "landscaping_q2": {
            "question": "What is the current state of the garden?",
            "answer_key": "garden_current_state",
            "options": [
                "completely bare - starting fresh",
                "overgrown - needs clearing first",
                "partially done - needs finishing touches",
                "well maintained - small changes only"
            ],
            "next": "common_garden_size"
        },

        # ─── PLANTING ─────────────────────────
        "planting_q1": {
            "question": "What would you like to plant?",
            "answer_key": "planting_type",
            "options": [
                "flowers and ornamental plants",
                "vegetables and herbs",
                "trees and shrubs",
                "fruit plants",
                "mixed - flowers and vegetables",
                "not sure - need suggestions"
            ],
            "next": "planting_q2"
        },
        "planting_q2": {
            "question": "What is the current condition of the planting area?",
            "answer_key": "soil_condition",
            "options": [
                "ready to plant - soil is prepared",
                "needs weeding and clearing first",
                "hard or compacted soil - needs digging",
                "completely bare - no preparation done",
                "raised bed or pots - no ground work needed"
            ],
            "next": "common_garden_size"
        },

        # ─── COMMON ENDING ────────────────────
        "common_garden_size": {
            "question": "How large is your garden or outdoor area?",
            "answer_key": "garden_size",
            "options": [
                "small - balcony or small yard (under 20 sq m)",
                "medium - standard garden (20-60 sq m)",
                "large - big garden (60-150 sq m)",
                "very large - estate or commercial (150+ sq m)",
                "not sure - need a site visit"
            ],
            "next": "common_garden_schedule"
        },
        "common_garden_schedule": {
            "question": "When do you need the service?",
            "answer_key": "schedule",
            "options": [
                "today",
                "tomorrow",
                "within 2-3 days",
                "this weekend",
                "flexible - anytime this week",
                "regular / ongoing schedule"
            ],
            "next": "common_garden_location"
        },
        "common_garden_location": {
            "question": "Where is the service needed? Please enter your address or area.",
            "answer_key": "location",
            "type": "text_input",
            "next": None
        }
    },

    # ═══════════════════════════════════════════
    # 3. CARE & PERSONAL SUPPORT
    # ═══════════════════════════════════════════
    "care_support": {

        1: {
            "question": "Who needs care and support?",
            "answer_key": "care_for",
            "options": [
                "an elderly person",
                "a child or baby",
                "a person with a disability",
                "someone recovering from surgery or illness",
                "a pet"
            ],
            "next": {
                "an elderly person":                            "elderly_q1",
                "a child or baby":                             "child_q1",
                "a person with a disability":                  "disability_q1",
                "someone recovering from surgery or illness":  "recovery_q1",
                "a pet":                                       "pet_q1"
            }
        },

        # ─── ELDERLY ──────────────────────────
        "elderly_q1": {
            "question": "What is the current condition of the elderly person?",
            "answer_key": "care_level",
            "options": [
                "independent but needs light supervision",
                "needs help with some daily tasks",
                "needs help with most daily tasks",
                "bedridden - fully dependent on care"
            ],
            "next": "elderly_q2"
        },
        "elderly_q2": {
            "question": "What kind of support does the elderly person need?",
            "answer_key": "support_type",
            "options": [
                "companionship and social interaction",
                "help with daily tasks (cooking, cleaning, errands)",
                "personal hygiene assistance (bathing, dressing)",
                "medication reminders and health monitoring",
                "mobility assistance and fall prevention",
                "all of the above"
            ],
            "next": "elderly_q3"
        },
        "elderly_q3": {
            "question": "Does the elderly person have any medical conditions we should know about?",
            "answer_key": "medical_condition",
            "options": [
                "diabetes",
                "heart condition",
                "dementia or memory issues",
                "mobility or joint problems",
                "no known conditions",
                "prefer to discuss with caregiver"
            ],
            "next": "common_care_schedule"
        },

        # ─── CHILD ────────────────────────────
        "child_q1": {
            "question": "What is the child's age group?",
            "answer_key": "child_age_group",
            "options": [
                "newborn / infant (0-1 year)",
                "toddler (1-3 years)",
                "preschool (3-5 years)",
                "school-age (6+ years)"
            ],
            "next": "child_q2"
        },
        "child_q2": {
            "question": "What kind of child care do you need?",
            "answer_key": "support_type",
            "options": [
                "full-time babysitting / nanny",
                "after-school care",
                "overnight care",
                "weekend or occasional babysitting",
                "newborn / infant care",
                "help with homework and activities"
            ],
            "next": "child_q3"
        },
        "child_q3": {
            "question": "Are there any special needs or allergies for the child?",
            "answer_key": "child_special_needs",
            "options": [
                "food allergies",
                "medical condition",
                "special learning needs",
                "no special needs",
                "prefer to discuss with caregiver"
            ],
            "next": "common_care_schedule"
        },

        # ─── DISABILITY ───────────────────────
        "disability_q1": {
            "question": "What type of disability does the person have?",
            "answer_key": "disability_type",
            "options": [
                "physical disability",
                "intellectual / cognitive disability",
                "visual or hearing impairment",
                "multiple disabilities",
                "not sure - need assessment"
            ],
            "next": "disability_q2"
        },
        "disability_q2": {
            "question": "What type of disability support is needed?",
            "answer_key": "support_type",
            "options": [
                "physical assistance (mobility, wheelchair support)",
                "personal hygiene and daily routine help",
                "communication support",
                "assistance with errands and appointments",
                "emotional and social support",
                "all of the above"
            ],
            "next": "disability_q3"
        },
        "disability_q3": {
            "question": "Does the person use any assistive equipment?",
            "answer_key": "assistive_equipment",
            "options": [
                "wheelchair",
                "walking frame / crutches",
                "hearing aid",
                "visual aid",
                "no assistive equipment",
                "prefer to discuss with caregiver"
            ],
            "next": "common_care_schedule"
        },

        # ─── RECOVERY ─────────────────────────
        "recovery_q1": {
            "question": "What type of recovery support is needed?",
            "answer_key": "support_type",
            "options": [
                "post-surgery wound care and monitoring",
                "medication management and reminders",
                "help with movement and physiotherapy exercises",
                "meal preparation and nutrition support",
                "companionship during recovery",
                "all of the above"
            ],
            "next": "recovery_q2"
        },
        "recovery_q2": {
            "question": "How long is the expected recovery period?",
            "answer_key": "recovery_duration",
            "options": [
                "a few days only",
                "1 to 2 weeks",
                "1 month or more",
                "ongoing / not sure yet"
            ],
            "next": "recovery_q3"
        },
        "recovery_q3": {
            "question": "What was the surgery or illness?",
            "answer_key": "recovery_reason",
            "options": [
                "orthopaedic surgery (hip, knee, bone)",
                "cardiac or chest surgery",
                "abdominal surgery",
                "stroke or neurological condition",
                "general illness / infection",
                "prefer not to say"
            ],
            "next": "common_care_schedule"
        },

        # ─── PET ──────────────────────────────
        "pet_q1": {
            "question": "What type of pet needs care?",
            "answer_key": "pet_type",
            "options": [
                "dog",
                "cat",
                "bird",
                "other"
            ],
            "next": "pet_q2"
        },
        "pet_q2": {
            "question": "What pet care service do you need?",
            "answer_key": "support_type",
            "options": [
                "feeding and basic care",
                "dog walking",
                "grooming",
                "overnight / full-time pet sitting",
                "vet visit accompaniment"
            ],
            "next": "pet_q3"
        },
        "pet_q3": {
            "question": "Does your pet have any special needs or health conditions?",
            "answer_key": "pet_special_needs",
            "options": [
                "on medication",
                "dietary restrictions",
                "anxious or aggressive behaviour",
                "elderly or mobility issues",
                "no special needs"
            ],
            "next": "common_care_schedule"
        },

        # ─── COMMON ENDING ────────────────────
        "common_care_schedule": {
            "question": "How often do you need the caregiver?",
            "answer_key": "schedule",
            "options": [
                "one-time visit",
                "daily - part time (up to 4 hours)",
                "daily - full day (8+ hours)",
                "live-in caregiver (24/7)",
                "a few days per week",
                "weekends only"
            ],
            "next": "common_care_pref"
        },
        "common_care_pref": {
            "question": "Do you have any preference for the caregiver?",
            "answer_key": "caregiver_preference",
            "options": [
                "experienced and certified caregiver",
                "female caregiver only",
                "male caregiver only",
                "sinhala speaking",
                "tamil speaking",
                "english speaking",
                "no preference"
            ],
            "next": "common_care_urgency"
        },
        "common_care_urgency": {
            "question": "When do you need the caregiver to start?",
            "answer_key": "schedule_start",
            "options": [
                "as soon as possible - today or tomorrow",
                "within this week",
                "within 2 weeks",
                "next month",
                "flexible - still planning"
            ],
            "next": "common_care_location"
        },
        "common_care_location": {
            "question": "Where will the care be provided? Please enter your address or area.",
            "answer_key": "location",
            "type": "text_input",
            "next": "common_care_notes"
        },
        "common_care_notes": {
            "question": "Any special medical conditions, allergies, or important instructions?",
            "answer_key": "special_notes",
            "type": "text_input",
            "next": None
        }
    }
}