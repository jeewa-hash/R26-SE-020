import re

from text_service.service_taxonomy import SERVICE_TAXONOMY


class EntityExtractor:

    def __init__(self):

        # -------------------------
        # ISSUE PATTERNS
        # -------------------------
        self.issue_patterns = [

            "not working",
            "broken",
            "leaking",
            "damaged",
            "making noise",
            "slow",
            "blocked",
            "no power",
            "water leaking",
            "dirty",
            "bad smell",
            "clogged"
        ]

        # -------------------------
        # URGENCY WORDS
        # -------------------------
        self.urgency_words = [
            "urgent",
            "asap",
            "immediately",
            "today",
            "quickly"
        ]

    # =========================
    # MAIN EXTRACT FUNCTION
    # =========================
    def extract(self, text):

        text_l = text.lower()

        entities = {}

        # =========================
        # SERVICE + CATEGORY + ITEM
        # =========================
        for service, categories in SERVICE_TAXONOMY.items():

            for category, items in categories.items():

                for item in items:

                    if item.lower() in text_l:

                        entities["service"] = service

                        entities["category"] = category

                        entities["item"] = item

                        break

        # =========================
        # ISSUE EXTRACTION
        # =========================
        for issue in self.issue_patterns:

            if issue in text_l:

                entities["issue"] = issue
                break

        # =========================
        # LOCATION EXTRACTION
        # =========================
        location_patterns = [

            r"in ([a-zA-Z\s]+)",

            r"at ([a-zA-Z\s]+)",

            r"from ([a-zA-Z\s]+)"
        ]

        for pattern in location_patterns:

            match = re.search(pattern, text_l)

            if match:

                location = match.group(1).strip()

                # cleanup extra words
                location = location.replace(
                    "today",
                    ""
                ).replace(
                    "tomorrow",
                    ""
                ).strip()

                entities["location"] = location

                break

        # =========================
        # SCHEDULE EXTRACTION
        # =========================
        if "today" in text_l:

            entities["schedule"] = "today"

        elif "tomorrow" in text_l:

            entities["schedule"] = "tomorrow"

        elif "next week" in text_l:

            entities["schedule"] = "next week"

        # =========================
        # URGENCY
        # =========================
        if any(
            word in text_l
            for word in self.urgency_words
        ):

            entities["urgency"] = "high"

        # =========================
        # CLEANING SPECIAL CASES
        # =========================
        if "kitchen" in text_l:

            entities["cleaning_area"] = "kitchen"

        elif "bathroom" in text_l:

            entities["cleaning_area"] = "bathroom"

        elif "office" in text_l:

            entities["cleaning_area"] = "office"

        # =========================
        # CARE SUPPORT SPECIAL CASES
        # =========================
        if "child" in text_l or "baby" in text_l:

            entities["care_type"] = "child care"

        elif "elderly" in text_l:

            entities["care_type"] = "elderly care"

        elif "pet" in text_l:

            entities["care_type"] = "pet care"

        return entities