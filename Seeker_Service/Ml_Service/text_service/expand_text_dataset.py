import csv
import os
import random

# Base directory setup
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SEED_CSV = os.path.join(BASE_DIR, "data", "text_dataset.csv")
EXPANDED_CSV = os.path.join(BASE_DIR, "data", "text_dataset_expanded.csv")

# Rich domain-specific vocabulary generator for each sub_service
CATEGORY_TEMPLATES = {
    # ── CLEANING SERVICES ──
    ("cleaning", "house cleaning"): [
        "{prefix} full house deep cleaning {suffix}",
        "{prefix} living room and bedroom cleaning {suffix}",
        "{prefix} home floor scrubbing and dust cleaning {suffix}",
        "{prefix} complete home maid cleaning service {suffix}",
        "{prefix} deep clean apartment before party {suffix}",
        "{prefix} ceiling dust cobweb removal home {suffix}",
        "{prefix} house dusting and mopping {suffix}",
        "{prefix} residential cleaning helper {suffix}",
        "{prefix} house disinfection and cleaning {suffix}",
        "{prefix} 3 bedroom house clean {suffix}",
        "my house is very dirty need full clean {suffix}",
        "whole house cleaning needed urgently",
        "need home helper for deep cleaning floor and rooms",
        "dusty house clean up required",
        "full villa deep clean service"
    ],
    ("cleaning", "kitchen cleaning"): [
        "{prefix} kitchen oil grease removal {suffix}",
        "{prefix} stove and exhaust hood cleaning {suffix}",
        "{prefix} kitchen sink and counter deep clean {suffix}",
        "{prefix} refrigerator and oven cleaning inside {suffix}",
        "{prefix} dirty kitchen tile scrubbing {suffix}",
        "{prefix} kitchen cabinet dust clean {suffix}",
        "{prefix} chimney grease cleaning {suffix}",
        "{prefix} commercial kitchen deep wash {suffix}",
        "kitchen is full of grease need wash {suffix}",
        "stovetop and kitchen chimney cleaning required",
        "pantry cleaning and organization service"
    ],
    ("cleaning", "bathroom cleaning"): [
        "{prefix} bathroom tile stain removal {suffix}",
        "{prefix} toilet washroom deep scrubbing {suffix}",
        "{prefix} bathroom bad smell and mold clean {suffix}",
        "{prefix} bath tub and shower glass cleaning {suffix}",
        "{prefix} washroom wall tile wash {suffix}",
        "{prefix} toilet bowl stain clean {suffix}",
        "{prefix} hard water stain removal bathroom {suffix}",
        "washroom very smelly need thorough cleaning {suffix}",
        "toilet clogged tile dirty clean needed",
        "bathroom deep wash and disinfection"
    ],
    ("cleaning", "office cleaning"): [
        "{prefix} office workspace cleaning {suffix}",
        "{prefix} commercial shop area floor clean {suffix}",
        "{prefix} desk and computer dusting office {suffix}",
        "{prefix} office glass window cleaning {suffix}",
        "{prefix} workplace janitorial daily clean {suffix}",
        "{prefix} meeting room carpet and floor cleaning {suffix}",
        "{prefix} corporate office night cleaning {suffix}",
        "small office space needs deep cleaning today",
        "shop front glass and floor cleaning required",
        "office building daily cleaner required"
    ],
    ("cleaning", "post-construction cleaning"): [
        "{prefix} after renovation dust clean {suffix}",
        "{prefix} cement dust and paint stain clean {suffix}",
        "{prefix} post construction house deep cleaning {suffix}",
        "{prefix} new build building site clean up {suffix}",
        "{prefix} newly constructed apartment dust removal {suffix}",
        "{prefix} debris tile mortar cleaning {suffix}",
        "construction work finished need full house cleanup",
        "renovation dust all over house need deep wash",
        "post building site dust clearing helper"
    ],
    ("cleaning", "move-in/move-out cleaning"): [
        "{prefix} move out deep house clean {suffix}",
        "{prefix} tenant handover house cleaning {suffix}",
        "{prefix} move in new home cleaning service {suffix}",
        "{prefix} rental property end of lease clean {suffix}",
        "{prefix} landlord handover inspection cleaning {suffix}",
        "{prefix} empty house clean before moving in {suffix}",
        "vacating house need complete deep cleaning",
        "new tenant coming need house sanitized and cleaned",
        "moving out cleaning to get deposit back"
    ],
    ("cleaning", "sofa/carpet/curtain cleaning"): [
        "{prefix} fabric sofa shampoo wash {suffix}",
        "{prefix} living room carpet steam cleaning {suffix}",
        "{prefix} window curtain hanging wash {suffix}",
        "{prefix} mattress deep stain and dust mite clean {suffix}",
        "{prefix} leather couch polishing and cleaning {suffix}",
        "{prefix} rug washing service {suffix}",
        "sofa set dirty stain removal needed",
        "carpet smelly pet hair cleaning service",
        "heavy curtains vacuum and steam clean"
    ],

    # ── GARDENING SERVICES ──
    ("gardening", "garden maintenance"): [
        "{prefix} grass cutting and lawn mowing {suffix}",
        "{prefix} garden hedge trimming and pruning {suffix}",
        "{prefix} weed removal from garden bed {suffix}",
        "{prefix} yard leaf clearing and garden clean {suffix}",
        "{prefix} watering garden plants {suffix}",
        "{prefix} bush cutting lawn edging {suffix}",
        "overgrown lawn grass needs cutting",
        "backyard garden clearing helper needed",
        "regular gardener for grass cutting"
    ],
    ("gardening", "landscaping"): [
        "{prefix} garden landscape design and layout {suffix}",
        "{prefix} front yard grass turf laying {suffix}",
        "{prefix} garden stone pathway construction {suffix}",
        "{prefix} outdoor garden makeover service {suffix}",
        "{prefix} flower bed landscape setup {suffix}",
        "need gardener to design beautiful backyard landscape",
        "landscaping project for new home yard",
        "courtyard garden setup and turf installation"
    ],
    ("gardening", "planting"): [
        "{prefix} flower planting in home garden {suffix}",
        "{prefix} vegetable patch kitchen garden setup {suffix}",
        "{prefix} tree sapling planting service {suffix}",
        "{prefix} indoor potted plant setup {suffix}",
        "{prefix} fruit tree planting and soil prep {suffix}",
        "want to plant roses and outdoor flowers",
        "backyard organic vegetable garden planting",
        "plant new shrubs and potted flowers"
    ],

    # ── CARE & SUPPORT SERVICES ──
    ("care_support", "child care"): [
        "{prefix} babysitter for toddler {suffix}",
        "{prefix} child care helper at home {suffix}",
        "{prefix} nanny for newborn baby care {suffix}",
        "{prefix} after school kid supervision {suffix}",
        "{prefix} infant baby sitter daytime {suffix}",
        "need trusted babysitter to look after my 2 year old",
        "experienced nanny for infant baby care",
        "child minder for weekend daycare"
    ],
    ("care_support", "elderly care"): [
        "{prefix} home nursing for elderly father {suffix}",
        "{prefix} old age person care taker {suffix}",
        "{prefix} senior citizen mobility assistance {suffix}",
        "{prefix} elderly mother companion helper {suffix}",
        "{prefix} bedridden patient home nurse {suffix}",
        "need nurse helper for elderly grandmother at home",
        "caregiver for senior father medicine and feeding",
        "full time elder care taker required"
    ],
    ("care_support", "pet care"): [
        "{prefix} dog walking and feeding {suffix}",
        "{prefix} pet sitter for cat while away {suffix}",
        "{prefix} dog bath and grooming support {suffix}",
        "{prefix} pet boarding or home visit care {suffix}",
        "{prefix} puppy training and care {suffix}",
        "need dog walker every morning and evening",
        "looking for cat sitter for 3 days",
        "pet caregiver for German Shepherd dog"
    ],
    ("care_support", "disability support"): [
        "{prefix} disability helper for daily routines {suffix}",
        "{prefix} special needs assistance at home {suffix}",
        "{prefix} wheelchair patient daily assistant {suffix}",
        "{prefix} physically challenged person helper {suffix}",
        "support worker for person with disability",
        "care assistant for wheelchair user daily tasks",
        "disability caregiver for home care"
    ],
    ("care_support", "personal assistance"): [
        "{prefix} home personal assistant for daily errands {suffix}",
        "{prefix} domestic helper for household tasks {suffix}",
        "{prefix} grocery shopping and medicine pickup help {suffix}",
        "{prefix} home cooking and house helper {suffix}",
        "need personal assistant to help elderly with chores",
        "daily home helper for cooking and shopping",
        "assistant for home management tasks"
    ],

    # ── REPAIRING SERVICES ──
    ("repairing", "electrical"): [
        "{prefix} ceiling fan repair not spinning {suffix}",
        "{prefix} tube light led bulb replacement {suffix}",
        "{prefix} wall socket switch board spark repair {suffix}",
        "{prefix} circuit breaker fuse trip electrician {suffix}",
        "{prefix} television tv black screen repair {suffix}",
        "{prefix} refrigerator fridge cooling issue fix {suffix}",
        "{prefix} washing machine motor not spinning fix {suffix}",
        "{prefix} air conditioner ac not cooling service {suffix}",
        "{prefix} rice cooker heating element repair {suffix}",
        "{prefix} microwave oven power issue fix {suffix}",
        "ceiling fan speed slow making noise need repair",
        "tv sound working but no picture black screen",
        "fridge leaking water and not freezing ice",
        "main switch box short circuit electrician needed",
        "ac gas refill and compressor repair"
    ],
    ("repairing", "plumbing"): [
        "{prefix} leaking water pipe line fix {suffix}",
        "{prefix} clogged kitchen sink drain unblock {suffix}",
        "{prefix} toilet flush tank leak repair {suffix}",
        "{prefix} bathroom tap water dripping fix {suffix}",
        "{prefix} overhead water tank pipe burst repair {suffix}",
        "{prefix} low water pressure tap plumber {suffix}",
        "{prefix} bathroom floor drain blocked water standing {suffix}",
        "kitchen sink drain pipe completely blocked",
        "plumber needed for leaking shower tap",
        "toilet bowl overflow problem fix"
    ],
    ("repairing", "furniture"): [
        "{prefix} wooden chair leg broken repair {suffix}",
        "{prefix} dining table frame shaking fix {suffix}",
        "{prefix} bed frame slate wood repair {suffix}",
        "{prefix} sofa frame wooden support fix {suffix}",
        "{prefix} cupboard door hinge drawer track repair {suffix}",
        "{prefix} flatpack furniture assembly installer {suffix}",
        "{prefix} wardrobe wooden door realignment {suffix}",
        "chair screw loose shaky chair leg fix",
        "new IKEA bed and wardrobe assembly helper",
        "wooden door lock and hinge repair"
    ],
    ("repairing", "painting_renovation"): [
        "{prefix} house interior wall painting {suffix}",
        "{prefix} roof leak plaster repair painter {suffix}",
        "{prefix} exterior building wall repaint {suffix}",
        "{prefix} wall crack plastering touch up {suffix}",
        "{prefix} tile replacement bathroom floor repair {suffix}",
        "need painter for 2 bedroom house painting",
        "roof water leaking wall dampness repair",
        "living room wall color paint service"
    ]
}

PREFIXES = [
    "i need", "looking for", "can someone", "please send", "want to hire",
    "urgently need", "search for", "find me", "can i get", "help me with",
    "req", "plz", "asap", "need", "urgent", "where to get"
]

SUFFIXES = [
    "today", "asap", "in colombo", "near me", "at my home", "for my house",
    "for my office", "in kandy", "in galle", "urgently", "this weekend",
    "quick service", "at my location", "in negombo", "in kurunegala",
    "for my apartment"
]

TYPO_RULES = [
    ("cleaning", "clening"),
    ("clean", "clen"),
    ("repair", "repai"),
    ("broken", "brokn"),
    ("leaking", "leakng"),
    ("maintenance", "maintainance"),
    ("service", "servis"),
    ("fridge", "frg"),
    ("bathroom", "bathrom"),
    ("kitchen", "kichen"),
    ("garden", "gardan")
]

def apply_typo(text):
    if random.random() < 0.25:
        orig, replacement = random.choice(TYPO_RULES)
        if orig in text:
            text = text.replace(orig, replacement, 1)
    return text

def generate_expanded_dataset(target_per_subservice=300):
    rows = []
    seen = set()

    # 1. Read existing seed items first
    if os.path.exists(SEED_CSV):
        with open(SEED_CSV, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for r in reader:
                t = (r.get("text") or "").strip().lower()
                s = (r.get("service") or "").strip().lower()
                sub = (r.get("sub_service") or "").strip().lower()
                if t and s and sub:
                    key = (t, s, sub)
                    if key not in seen:
                        seen.add(key)
                        rows.append({"text": t, "service": s, "sub_service": sub})

    # Group seed items by (service, sub_service)
    subservice_counts = {}
    for r in rows:
        pair = (r["service"], r["sub_service"])
        subservice_counts[pair] = subservice_counts.get(pair, 0) + 1

    # 2. Expand each category template up to target count
    for (service, sub_service), templates in CATEGORY_TEMPLATES.items():
        current_count = subservice_counts.get((service, sub_service), 0)
        attempts = 0
        max_attempts = 15000

        while current_count < target_per_subservice and attempts < max_attempts:
            attempts += 1
            tmpl = random.choice(templates)
            prefix = random.choice(PREFIXES) if "{prefix}" in tmpl else ""
            suffix = random.choice(SUFFIXES) if "{suffix}" in tmpl else ""

            text_candidate = tmpl.format(prefix=prefix, suffix=suffix).strip()
            # Clean double spaces
            text_candidate = " ".join(text_candidate.split()).lower()
            text_candidate = apply_typo(text_candidate)

            key = (text_candidate, service, sub_service)
            if key not in seen:
                seen.add(key)
                rows.append({"text": text_candidate, "service": service, "sub_service": sub_service})
                current_count += 1

        subservice_counts[(service, sub_service)] = current_count

    # Save to EXPANDED_CSV
    os.makedirs(os.path.dirname(EXPANDED_CSV), exist_ok=True)
    with open(EXPANDED_CSV, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=["text", "service", "sub_service"])
        writer.writeheader()
        writer.writerows(rows)

    print(f"[OK] Generated dataset saved to: {EXPANDED_CSV}")
    print(f"Total dataset size: {len(rows)} samples")
    print("Samples count per sub_service:")
    for pair, count in sorted(subservice_counts.items()):
        print(f" - {pair[0]} -> {pair[1]}: {count}")

if __name__ == "__main__":
    generate_expanded_dataset(target_per_subservice=300)
