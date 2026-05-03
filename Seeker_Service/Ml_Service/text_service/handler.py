import os
from joblib import load
from utils.preprocess import normalize_text


class TextHandler:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(TextHandler, cls).__new__(cls)
            cls._instance.vectorizer = None
            cls._instance.service_model = None
            cls._instance.sub_service_model = None
            cls._instance.load_model()
        return cls._instance

    def load_model(self):
        base = os.path.join(os.path.dirname(__file__), "../models")

        self.vectorizer = load(os.path.join(base, "text_vectorizer.joblib"))
        self.service_model = load(os.path.join(base, "text_service_model.joblib"))
        self.sub_service_model = load(os.path.join(base, "text_subservice_model.joblib"))

    def predict(self, text):
        clean_text = normalize_text(text)
        x = self.vectorizer.transform([clean_text])

        # 🔵 Main service prediction
        service_probs = self.service_model.predict_proba(x)[0]
        service_idx = service_probs.argmax()
        service = self.service_model.classes_[service_idx]
        service_conf = float(service_probs[service_idx])

        # 🔵 Sub-service prediction
        sub_probs = self.sub_service_model.predict_proba(x)[0]
        sub_idx = sub_probs.argmax()
        sub_service = self.sub_service_model.classes_[sub_idx]
        sub_conf = float(sub_probs[sub_idx])

        # ✅ FIXED RETURN (IMPORTANT)
        return {
            "service": service,
            "sub_service": sub_service,
            "confidence_score": float(min(service_conf, sub_conf))
        }