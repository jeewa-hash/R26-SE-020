import pymongo
import os
from dotenv import load_dotenv

load_dotenv()

class DBAdapter:
    def __init__(self, uri=None):
        self.uri = uri or os.getenv("MONGO_URI")
        self.db_name = os.getenv("DB_NAME", "ServiceSeeker")
        
        if not self.uri:
            raise ValueError("MONGO_URI not found in .env file!")

        self.client = pymongo.MongoClient(self.uri)
        self.db = self.client[self.db_name]
        self.collection = self.db["service_sessions"]

    def save_session(self, session_input):
        if isinstance(session_input, dict):
            session_data = session_input.copy()
        elif hasattr(session_input, "data"):
            session_data = session_input.data.copy()
        else:
            session_data = vars(session_input).copy()

        session_id = session_data.get("id") or session_data.get("session_id")
        session_data["id"] = session_id
        session_data.pop("_id", None) 

        self.collection.update_one(
            {"id": session_id},
            {"$set": session_data},
            upsert=True
        )

    def get_session(self, session_id):
        data = self.collection.find_one({"id": session_id})
        return SessionProxy(data) if data else None

class SessionProxy:
    def __init__(self, data):
        self.data = data

    def __getattr__(self, item):
        return self.data.get(item)

    def __setattr__(self, key, value):
        if key == "data":
            super().__setattr__(key, value)
        else:
            self.data[key] = value

    def to_dict(self):
        return {
            "session_id": self.data.get("id"),
            "step": self.data.get("current_step"),
            "category": self.data.get("category"),
            "object": self.data.get("object"),
            "answers": self.data.get("answers", {}),
            "confidence": self.data.get("confidence")
        }

db_manager = DBAdapter()