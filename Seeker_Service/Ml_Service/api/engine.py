from constants import ISSUE_MAPPING

class ConversationEngine:
    @staticmethod
    def get_next_question(session):
        step = session.step
        cat_mapping = ISSUE_MAPPING.get(session.category)
        if not cat_mapping:
            return None
        
        steps = cat_mapping.get('steps', {})
        if step not in steps:
            return None # End of conversation
            
        current_step_config = steps[step]
        
        # Handle conditional steps (like Step 2/3 which depend on earlier answers)
        # We check if the config has a 'question' key. If not, it's a nested dictionary.
        if 'question' not in current_step_config:
            # Conditional logic: find the matching key from previous answers
            # Priority: service_type (Step 1) or details (Step 2/Problem Type)
            key = session.service_type  # e.g. "Fan", "Chair"
            
            # For plumbing, Step 2 and Step 3 depend on Step 1 (Problem Type).
            # Your persistence stores plumbing Step-1 answer into `session.details`.
            if session.category == "plumbing" and step in {2, 3}:
                key = session.details
            
            sub_config = current_step_config.get(key)
            if not sub_config:
                # Fallback if specific mapping not found
                return {
                    'step': step,
                    'question': f"Could you provide more details about the {key}?",
                    'options': ["Repair", "Replacement", "Inspection"]
                }
            return {
                'step': step,
                'question': sub_config['question'],
                'options': sub_config['options']
            }

        # Standard Step
        return {
            'step': step,
            'question': current_step_config['question'],
            'options': current_step_config['options'],
            'type': current_step_config.get('type', 'standard')
        }
