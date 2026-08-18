from deep_translator import GoogleTranslator

# Cache to avoid repeating API calls for dynamic translations
TRANSLATION_CACHE_EN_SI = {}
TRANSLATION_CACHE_SI_EN = {}

def get_sinhala_translation(english_text):
    if not isinstance(english_text, str):
        return english_text
        
    english_text = english_text.strip()
    
    # Check dynamic cache
    if english_text in TRANSLATION_CACHE_EN_SI:
        return TRANSLATION_CACHE_EN_SI[english_text]
        
    # Use Google Translator directly
    try:
        translated = GoogleTranslator(source='en', target='si').translate(english_text)
        TRANSLATION_CACHE_EN_SI[english_text] = translated
        TRANSLATION_CACHE_SI_EN[translated] = english_text
        return translated
    except Exception as e:
        print(f"GoogleTranslator error: {e}")
        return english_text

def translate_payload(payload, language):
    """
    Translates a question payload (dict with 'question' and 'options')
    from English to Sinhala if language == 'sinhala'.
    """
    if language != 'sinhala':
        return payload
        
    if not isinstance(payload, dict):
        return payload
        
    translated = payload.copy()
    
    # Translate question
    if 'question' in translated:
        translated['question'] = get_sinhala_translation(translated['question'])
            
    # Translate options
    if 'options' in translated and isinstance(translated['options'], list):
        translated['options'] = [
            get_sinhala_translation(opt) for opt in translated['options']
        ]
        
    return translated

def translate_answer_to_english(answer):
    """
    Translates a user's answer from Sinhala back to English.
    """
    if not isinstance(answer, str):
        return answer
        
    answer_stripped = answer.strip()
    
    # Check dynamic cache
    if answer_stripped in TRANSLATION_CACHE_SI_EN:
        return TRANSLATION_CACHE_SI_EN[answer_stripped]
        
    # Use Google Translator directly
    try:
        translated = GoogleTranslator(source='si', target='en').translate(answer_stripped)
        TRANSLATION_CACHE_SI_EN[answer_stripped] = translated
        TRANSLATION_CACHE_EN_SI[translated] = answer_stripped
        return translated
    except Exception as e:
        print(f"GoogleTranslator error: {e}")
        return answer
