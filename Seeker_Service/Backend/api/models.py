from flask_sqlalchemy import SQLAlchemy
import uuid
from datetime import datetime
import json

db = SQLAlchemy()

class ServiceSession(db.Model):
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    step = db.Column(db.Integer, default=1)
    category = db.Column(db.String(50))
    object_name = db.Column(db.String(100))
    service_type = db.Column(db.String(100))      # Main device/problem (e.g. Fan)
    sub_service_type = db.Column(db.String(100))  # Specific issue (e.g. Not spinning)
    confidence = db.Column(db.String(20))
    details = db.Column(db.String(500))           # Main issue description
    room_location = db.Column(db.String(100))     # e.g. Kitchen, Living Room
    urgency = db.Column(db.String(50))
    usability = db.Column(db.String(50))         # For furniture check
    location_address = db.Column(db.String(200))
    latitude = db.Column(db.Float)
    longitude = db.Column(db.Float)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "session_id": self.id,
            "step": self.step,
            "category": self.category,
            "object": self.object_name,
            "device/type": self.service_type,
            "specific_issue": self.sub_service_type,
            "confidence": self.confidence,
            "urgency": self.urgency,
            "room": self.room_location,
            "usability": self.usability,
            "location": self.location_address
        }
