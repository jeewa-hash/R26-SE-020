import pymongo
import os
from dotenv import load_dotenv

load_dotenv()


class DBAdapter:
    def __init__(self, uri=None):
        self.uri = uri or os.getenv("MONGO_URI", "mongodb://localhost:27017/ServiceSeeker")

        print("Connecting to MongoDB...")
        self.client = pymongo.MongoClient(self.uri)

        self.db = self.client["ServiceSeeker"]
        self.collection = self.db["service_sessions"]

        print("Connected to database: ServiceSeeker")

    def save_session(self, session):
        """Save or update session safely"""

        # 🔥 FIX: correctly extract data
        if isinstance(session, dict):
            session_data = session.copy()
        elif hasattr(session, "data"):
            session_data = session.data.copy()   # ✅ FIX HERE
        else:
            session_data = vars(session).copy()

        # ✅ unify session id handling
        session_id = (
            session_data.get("id")
            or session_data.get("session_id")
            or getattr(session, "id", None)
        )

        if not session_id:
            raise ValueError("Session must have 'id' or 'session_id'")

        session_data["id"] = session_id

        # remove Mongo internal id if exists
        session_data.pop("_id", None)

        # ✅ save/update
        self.collection.update_one(
            {"id": session_id},
            {"$set": session_data},
            upsert=True
        )

    def get_session(self, session_id):
        """Retrieve session safely"""
        data = self.collection.find_one({"id": session_id})
        if data:
            return SessionProxy(data)
        return None


class SessionProxy:
    def __init__(self, data):
        self.data = data

    # 🔥 OPTIONAL BUT VERY USEFUL (prevents future bugs)
    def __getattr__(self, item):
        return self.data.get(item)

    def __setattr__(self, key, value):
        if key == "data":
            super().__setattr__(key, value)
        else:
            self.data[key] = value

    def to_dict(self):
        """Safe export"""
        return {
            "session_id": self.data.get("id"),
            "step": self.data.get("step"),
            "category": self.data.get("category"),
            "object": self.data.get("object_name"),
            "device/type": self.data.get("service_type"),
            "specific_issue": self.data.get("sub_service_type"),
            "confidence": self.data.get("confidence"),
            "urgency": self.data.get("urgency"),
            "room": self.data.get("room_location"),
            "usability": self.data.get("usability"),
            "location": self.data.get("location_address")
        }


# Global instance
db_manager = DBAdapter()