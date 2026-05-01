import pymongo
import os
import uuid
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv()

class DBAdapter:
    def __init__(self, uri=None):
        self.uri = uri or os.getenv("MONGO_URI", "mongodb://localhost:27017/ServiceSeeker")
        print(f"Connecting to MongoDB...")
        self.client = pymongo.MongoClient(self.uri)
        # Hardcode the DB name to match your Atlas setup exactly
        db_name = "ServiceSeeker"
        self.db = self.client[db_name]
        self.collection = self.db["service_sessions"]
        print(f"Connected to database: {db_name}")

    def save_session(self, session):
        """Save or update a session in MongoDB"""
        if isinstance(session, dict):
            session_data = session.copy()
            session_id = session_data.get('id')
        else:
            session_data = vars(session).copy()
            session_id = getattr(session, 'id', None)

        # Ensure we don't save any internal pymongo _id if it exists
        if '_id' in session_data:
            del session_data['_id']
            
        self.collection.update_one(
            {"id": session_id},
            {"$set": session_data},
            upsert=True
        )

    def get_session(self, session_id):
        """Retrieve a session from MongoDB and wrap it in a SessionProxy"""
        data = self.collection.find_one({"id": session_id})
        if data:
            return SessionProxy(data)
        return None

class SessionProxy:
    def __init__(self, data):
        # Convert any potential BSON types to standard Python types if needed
        # but for now simple update is fine
        self.__dict__.update(data)
    
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

# Global DB manager for the app
db_manager = DBAdapter()
