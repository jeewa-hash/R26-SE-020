from text_service.questions import TEXT_QUESTION_FLOW


class QuestionEngine:

    def __init__(self):
        self.sessions = {}

    # -------------------------
    # Normalize flow keys
    # -------------------------
    def _normalize_flow(self, flow):
        new_flow = {}
        for k, v in flow.items():
            try:
                new_key = int(k)
            except:
                new_key = k
            new_flow[new_key] = v
        return new_flow

    # -------------------------
    # START SESSION
    # -------------------------
    def start(self, service, sub_service=None):
        session_id = f"Q-{len(self.sessions) + 1:04d}"

        flow = TEXT_QUESTION_FLOW.get(service)
        if not flow:
            raise ValueError(f"No flow found for service: {service}")

        flow = self._normalize_flow(flow)

        # Default start
        start_step = 1

        # OPTIONAL: cleaning shortcut routing
        if service == "cleaning" and sub_service:
            start_map = {
                "kitchen cleaning": "kitchen_q1",
                "bathroom cleaning": "bathroom_q1",
                "office cleaning": "office_q1",
                "post-construction cleaning": "postconstruction_q1",
                "move-in/move-out cleaning": "moveinout_q1",
                "sofa/carpet/curtain cleaning": "sofa_q1"
            }
            start_step = start_map.get(sub_service, 1)

        q = flow.get(start_step)

        if not q:
            raise ValueError(f"Invalid start step {start_step}")

        self.sessions[session_id] = {
            "service": service,
            "current_q": start_step,
            "answers": {}
        }

        return session_id, self._format_question(start_step, q)

    # -------------------------
    # FORMAT QUESTION
    # -------------------------
    def _format_question(self, step, q):
        return {
            "step": step,
            "question": q["question"],
            "options": q.get("options", []),
            "type": q.get("type", "standard"),
            "answer_key": q.get("answer_key")
        }

    # -------------------------
    # ANSWER FLOW
    # -------------------------
    def answer(self, session_id, answer):
        session = self.sessions.get(session_id)

        if not session:
            return {"error": "Invalid session"}

        service = session["service"]
        current_q = session["current_q"]

        flow = self._normalize_flow(TEXT_QUESTION_FLOW.get(service))

        q_data = flow.get(current_q)
        if not q_data:
            return {"error": f"Invalid step {current_q}"}

        # -------------------------
        # SAVE ANSWER USING KEY
        # -------------------------
        answer_key = q_data.get("answer_key", str(current_q))
        session["answers"][answer_key] = answer

        # -------------------------
        # NEXT STEP LOGIC
        # -------------------------
        next_q = q_data.get("next")

        if isinstance(next_q, dict):
            next_step = next_q.get(answer, next_q.get("default"))
        else:
            next_step = next_q

        # -------------------------
        # END FLOW
        # -------------------------
        if next_step is None:
            return self._build_final_output(session_id)

        session["current_q"] = next_step
        next_data = flow.get(next_step)

        if not next_data:
            return self._build_final_output(session_id)

        return {
            "done": False,
            "question": self._format_question(next_step, next_data)
        }

    # -------------------------
    # FINAL OUTPUT BUILDER
    # -------------------------
    def _build_final_output(self, session_id):
        session = self.sessions[session_id]
        service = session["service"]
        answers = session["answers"]

        location = answers.get("location", "not provided")
        schedule = answers.get("schedule") or answers.get("schedule_start")

        urgency = self._map_urgency(schedule)
        issue_summary = self._build_summary(service, answers)

        confidence = f"{75 + len(answers)*2:.2f}%"

        return {
            "success": True,
            "message": "Your issue has been identified and structured. This payload is ready for provider matching.",

            "details": {
                "category": service,
                "confidence": confidence,
                "session_id": session_id,
                "answers": answers,
                "location": location,
                "urgency": urgency
            },

            "final_decision": {
                "service_category": service,
                "issue_summary": issue_summary,
                "location_summary": location,
                "urgency": urgency,
                "provider_search_ready": True,
                "confidence": confidence
            },

            "summary": f"Final decision prepared for {service} service."
        }

    # -------------------------
    # SUMMARY BUILDER
    # -------------------------
    def _build_summary(self, service, answers):
        if service == "cleaning":
            return f"{answers.get('service_type')} | {answers.get('main_issue', '')}"

        if service == "gardening":
            return f"{answers.get('service_type')} | {answers.get('maintenance_type') or answers.get('planting_type') or answers.get('landscaping_type')}"

        if service == "care_support":
            return f"{answers.get('care_for')} | {answers.get('support_type')}"

        return "General service request"

    # -------------------------
    # URGENCY MAPPER
    # -------------------------
    def _map_urgency(self, schedule):
        if not schedule:
            return "Normal"

        s = schedule.lower()

        if "today" in s or "as soon" in s:
            return "High"

        if "tomorrow" in s or "within" in s:
            return "Medium"

        return "Low"