from deep_translator import GoogleTranslator

# Cache to avoid repeating API calls
TRANSLATION_CACHE_EN_SI = {}
TRANSLATION_CACHE_SI_EN = {}

def get_sinhala_translation(english_text):
    if not isinstance(english_text, str) or not english_text.strip():
        return english_text
    if english_text in TRANSLATION_CACHE_EN_SI:
        return TRANSLATION_CACHE_EN_SI[english_text]
    try:
        translated = GoogleTranslator(source='en', target='si').translate(english_text)
        TRANSLATION_CACHE_EN_SI[english_text] = translated
        TRANSLATION_CACHE_SI_EN[translated] = english_text
        return translated
    except Exception as e:
        print(f"Translation error: {e}")
        return english_text

def translate_payload(payload, language):
    if language != 'si' or not isinstance(payload, dict):
        return payload
    translated = payload.copy()
    if 'question' in translated:
        translated['question'] = get_sinhala_translation(translated['question'])
    if 'options' in translated and isinstance(translated['options'], list):
        translated['options'] = [get_sinhala_translation(opt) for opt in translated['options']]
    return translated

def translate_answer_to_english(answer):
    if not isinstance(answer, str) or not answer.strip():
        return answer
    if answer in TRANSLATION_CACHE_SI_EN:
        return TRANSLATION_CACHE_SI_EN[answer]
    try:
        translated = GoogleTranslator(source='si', target='en').translate(answer)
        TRANSLATION_CACHE_SI_EN[answer] = translated
        TRANSLATION_CACHE_EN_SI[translated] = answer
        return translated
    except Exception as e:
        return answer