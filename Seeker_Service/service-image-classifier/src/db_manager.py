# pyrefly: ignore [missing-import]
import pymongo  # type: ignore
from bson import ObjectId
import os
from dotenv import load_dotenv  # type: ignore

load_dotenv()

class DBAdapter:
    def __init__(self, uri=None):
        self.uri = uri or os.getenv("MONGO_URI")
        self.db_name = os.getenv("DB_NAME", "ServiceSeeker")
        # Allow user collection name to be set via .env, default to "users"
        self.users_collection_name = os.getenv("USERS_COLLECTION", "users")
        
        if not self.uri:
            raise ValueError("MONGO_URI not found in .env file!")

        self.client = pymongo.MongoClient(self.uri)
        self.db = self.client[self.db_name]
        self.collection = self.db["service_sessions"]

    # ------------------------------------------------------------------
    # FIXED & DEBUGGED seeker_exists
    # ------------------------------------------------------------------
    def seeker_exists(self, seeker_id: str) -> bool:
        """
        Check if a seeker with the given ID exists in the users collection.
        Tries multiple field/type combinations with detailed logging.
        """
        if not seeker_id:
            print("DEBUG: seeker_id is empty")
            return False

        users_collection = self.db[self.users_collection_name]
        print(f"DEBUG: Checking collection '{self.users_collection_name}' for seeker_id: {seeker_id}")

        # 1. Try 'userId' field (string)
        result = users_collection.find_one({"userId": seeker_id})
        if result:
            print(f"DEBUG: Found user by 'userId': {result.get('_id')}")
            return True

        # 2. Try '_id' as ObjectId
        try:
            obj_id = ObjectId(seeker_id)
            result = users_collection.find_one({"_id": obj_id})
            if result:
                print(f"DEBUG: Found user by '_id' (ObjectId): {result.get('_id')}")
                return True
        except Exception as e:
            print(f"DEBUG: ObjectId conversion failed: {e}")

        # 3. Try '_id' as plain string (some systems store _id as string)
        result = users_collection.find_one({"_id": seeker_id})
        if result:
            print(f"DEBUG: Found user by '_id' (string): {result.get('_id')}")
            return True

        # 4. Debug: print all documents in collection (be careful in production)
        # Uncomment the next lines only for debugging:
        # all_users = list(users_collection.find({}, {"_id": 1, "userId": 1}).limit(5))
        # print(f"DEBUG: Sample users in DB: {all_users}")

        print(f"DEBUG: No user found for seeker_id: {seeker_id}")
        return False

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
            "confidence": self.data.get("confidence"),
            "user_name": self.data.get("user_name") or self.data.get("userName"),
            "user_id": self.data.get("user_id") or self.data.get("userId")
        }

# Create a single global instance
db_manager = DBAdapter()