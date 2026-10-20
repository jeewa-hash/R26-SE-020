from deep_translator import GoogleTranslator
import time
from threading import Lock

# Cache to avoid repeating API calls for dynamic translations
TRANSLATION_CACHE_EN_SI = {}
TRANSLATION_CACHE_SI_EN = {}
_TRANSLATION_LOCK = Lock()
_MIN_REQUEST_INTERVAL = 0.3
_RATE_LIMIT_COOLDOWN = 60
_next_request_at = 0.0
_rate_limited_until = 0.0
_rate_limit_warning_emitted = False


def _translate_text(text, source, target, cache, reverse_cache):
    global _next_request_at, _rate_limited_until, _rate_limit_warning_emitted

    if not text:
        return text
    if text in cache:
        return cache[text]

    with _TRANSLATION_LOCK:
        if text in cache:
            return cache[text]

        now = time.monotonic()
        if now < _rate_limited_until:
            return text

        wait = _next_request_at - now
        if wait > 0:
            time.sleep(wait)

        try:
            translated = GoogleTranslator(source=source, target=target).translate(text)
        except Exception as error:
            message = str(error)
            _next_request_at = time.monotonic() + _MIN_REQUEST_INTERVAL
            if any(term in message.lower() for term in ("too many requests", "rate limit", "429")):
                _rate_limited_until = time.monotonic() + _RATE_LIMIT_COOLDOWN
                if not _rate_limit_warning_emitted:
                    print("GoogleTranslator rate limited; using original text for 60 seconds.")
                    _rate_limit_warning_emitted = True
            else:
                print(f"GoogleTranslator error: {error}")
            return text

        cache[text] = translated
        reverse_cache[translated] = text
        _next_request_at = time.monotonic() + _MIN_REQUEST_INTERVAL
        _rate_limited_until = 0.0
        _rate_limit_warning_emitted = False
        return translated

def get_sinhala_translation(english_text):
    if not isinstance(english_text, str):
        return english_text
        
    english_text = english_text.strip()
    
    return _translate_text(
        english_text,
        'en',
        'si',
        TRANSLATION_CACHE_EN_SI,
        TRANSLATION_CACHE_SI_EN,
    )

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
    
    return _translate_text(
        answer_stripped,
        'si',
        'en',
        TRANSLATION_CACHE_SI_EN,
        TRANSLATION_CACHE_EN_SI,
    )
