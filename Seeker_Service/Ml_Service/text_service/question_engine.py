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
                k = int(k)
            except:
                pass
            new_flow[k] = v

        return new_flow

    # -------------------------
    # Normalize answer
    # -------------------------
    def _normalize_answer(self, ans):
        if not isinstance(ans, str):
            return ans
        return ans.strip().lower()

    # -------------------------
    # Resolve router nodes safely
    # -------------------------
    def _resolve_step(self, flow, step, answers):

        answers = answers or {}

        visited = set()

        while step is not None:

            if step in visited:
                return None  # prevent infinite loop

            visited.add(step)

            node = flow.get(step)

            if not node:
                return None

            # ✅ real question node
            if isinstance(node, dict) and "question" in node:
                return step

            # 🔥 router node (auto_route / next dict)
            if isinstance(node, dict) and "next" in node:

                nxt = node["next"]

                if isinstance(nxt, dict):

                    resolved = None

                    for k, v in nxt.items():
                        if k == "default":
                            continue

                        if k in answers.values():
                            resolved = v
                            break

                    step = resolved or nxt.get("default")

                else:
                    step = nxt

            else:
                return None

        return None

    # -------------------------
    # AUTO SKIP ANSWERED QUESTIONS
    # -------------------------
    def _auto_skip_answered(self, flow, current_step, answers):

        while True:

            q_data = flow.get(current_step)

            if not q_data:
                return current_step

            # skip only real question nodes
            if not isinstance(q_data, dict) or "answer_key" not in q_data:
                return current_step

            answer_key = q_data.get("answer_key")

            if answer_key in answers:

                next_q = q_data.get("next")

                if isinstance(next_q, dict):

                    saved = self._normalize_answer(
                        answers[answer_key]
                    )

                    current_step = next_q.get(
                        saved,
                        next_q.get("default")
                    )
                else:
                    current_step = next_q

                if current_step is None:
                    return None
            else:
                return current_step

    # -------------------------
    # START SESSION
    # -------------------------
    def start(self, service, sub_service=None, extracted=None):

        session_id = f"Q-{len(self.sessions) + 1:04d}"

        flow = self._normalize_flow(TEXT_QUESTION_FLOW.get(service))

        start_step = 1
        extracted = extracted or {}

        # smart routing by sub_service
        if sub_service:
            sub_key = sub_service.lower().strip()
            
            if service == "repairing":
                sub_map = {
                    "fan": "electrical_q2",
                    "tv": "electrical_q2",
                    "fridge": "electrical_q2",
                    "light": "electrical_q2",
                    "electrical": "electrical_q2",
                    "pipe": "plumbing_q1",
                    "tap": "plumbing_q1",
                    "plumbing": "plumbing_q1",
                    "chair": "furniture_q2",
                    "sofa": "furniture_q2",
                    "furniture": "furniture_q2",
                    "painting_renovation": "electrical_q2"
                }
                start_step = sub_map.get(sub_key, 1)

            elif service == "cleaning":
                sub_map = {
                    "house cleaning": "full_house_q1",
                    "house_cleaning": "full_house_q1",
                    "kitchen cleaning": "kitchen_q1",
                    "kitchen_cleaning": "kitchen_q1",
                    "bathroom cleaning": "bathroom_q1",
                    "bathroom_cleaning": "bathroom_q1",
                    "office cleaning": "office_q1",
                    "office_cleaning": "office_q1",
                    "post-construction cleaning": "postconstruction_q1",
                    "post_construction": "postconstruction_q1",
                    "move-in/move-out cleaning": "moveinout_q1",
                    "move_cleaning": "moveinout_q1",
                    "sofa/carpet/curtain cleaning": "sofa_q1",
                    "fabric_cleaning": "sofa_q1"
                }
                start_step = sub_map.get(sub_key, 1)

            elif service == "gardening":
                sub_map = {
                    "garden maintenance": "maintenance_q1",
                    "maintenance": "maintenance_q1",
                    "landscaping": "landscaping_q1",
                    "planting": "planting_q1"
                }
                start_step = sub_map.get(sub_key, 1)

            elif service == "care_support":
                sub_map = {
                    "child care": "child_q1",
                    "child_care": "child_q1",
                    "elderly care": "elderly_q1",
                    "elderly_care": "elderly_q1",
                    "pet care": "pet_q1",
                    "pet_care": "pet_q1",
                    "disability support": "disability_q1",
                    "disability_support": "disability_q1",
                    "personal assistance": "elderly_q2",
                    "personal_assistance": "elderly_q2"
                }
                start_step = sub_map.get(sub_key, 1)

        # auto skip
        start_step = self._auto_skip_answered(flow, start_step, extracted)

        # resolve router nodes properly
        start_step = self._resolve_step(flow, start_step, extracted)

        if start_step is None:
            start_step = 1

        q = flow.get(start_step)

        self.sessions[session_id] = {
            "service": service,
            "current_q": start_step,
            "answers": extracted
        }

        return session_id, self._format_question(start_step, q)

    # -------------------------
    # GET CURRENT QUESTION
    # -------------------------
    def get_current_question(self, session_id):

        session = self.sessions.get(session_id)
        if not session:
            return None

        flow = self._normalize_flow(TEXT_QUESTION_FLOW.get(session["service"]))

        step = session["current_q"]

        step = self._resolve_step(flow, step, session["answers"])

        if step is None:
            return None

        q_data = flow.get(step)

        return self._format_question(step, q_data)

    # -------------------------
    # FORMAT QUESTION
    # -------------------------
    def _format_question(self, step, q):

        if not isinstance(q, dict):
            return None

        if "question" not in q:
            return None

        return {
            "step": step,
            "question": q.get("question"),
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

        flow = self._normalize_flow(TEXT_QUESTION_FLOW.get(session["service"]))
        current_q = session["current_q"]
        q_data = flow.get(current_q)

        if not q_data:
            return {"error": "Invalid step"}

        key = q_data.get("answer_key", str(current_q))
        session["answers"][key] = answer

        next_step = q_data.get("next")

        if isinstance(next_step, dict):
            next_step = next_step.get(answer.lower(), next_step.get("default"))

        # resolve properly
        next_step = self._auto_skip_answered(flow, next_step, session["answers"])
        next_step = self._resolve_step(flow, next_step, session["answers"])

        if next_step is None:
            return self._build_final_output(session_id)

        session["current_q"] = next_step
        next_data = flow.get(next_step)

        return {
            "done": False,
            "question": self._format_question(next_step, next_data)
        }


        # -------------------------
    # BUILD REQUEST SUMMARY
    # -------------------------
    def _build_request_summary(self, session):

        service = session["service"]

        answers = session["answers"]

        sub_service = (
            answers.get("service_type")
            or answers.get("repair_type")
            or answers.get("care_type")
            or answers.get("garden_type")
            or "General"
        )

        if service == "cleaning":

            description = (
                f"{answers.get('service_type', 'Cleaning service')} "
                f"({answers.get('clean_type', 'standard cleaning')}) "
                f"required for a "
                f"{answers.get('house_size', 'property')} "
                f"in {answers.get('location', 'the specified location')}. "
                f"Focus area: {answers.get('focus_areas', 'general cleaning')}. "
                f"Requested schedule: {answers.get('schedule', 'not specified')}."
            )

        elif service == "repairing":

            description = (
                f"{sub_service} repair requested "
                f"at {answers.get('location', 'the specified location')}. "
                f"Issue: {answers.get('problem', 'Not specified')}. "
                f"Preferred schedule: {answers.get('schedule', 'Not specified')}."
            )

        elif service == "gardening":

            description = (
                f"{sub_service} service requested "
                f"at {answers.get('location', 'the specified location')}. "
                f"Preferred schedule: {answers.get('schedule', 'Not specified')}."
            )

        elif service == "care_support":

            description = (
                f"{sub_service} service requested "
                f"at {answers.get('location', 'the specified location')}. "
                f"Preferred schedule: {answers.get('schedule', 'Not specified')}."
            )

        else:

            description = "Service request created."

        return {
            "service": service,
            "sub_service": sub_service,
            "description": description,
            "details": answers
        }

        # -------------------------
    # FINAL OUTPUT
    # -------------------------
    def _build_final_output(self, session_id):

        session = self.sessions[session_id]

        summary = self._build_request_summary(session)

        return {
            "success": True,
            "session_id": session_id,
            "message": "Service request completed successfully.",
            "request_summary": summary
        }