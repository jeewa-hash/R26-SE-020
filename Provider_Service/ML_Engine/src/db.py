import os
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")
_client = None
_db     = None

def get_db():
    global _client, _db
    if _db is not None:
        return _db
    if not MONGO_URI:
        raise Exception("MONGO_URI not found in .env file.")
    try:
        _client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
        _client.admin.command("ping")
        db_name = MONGO_URI.split("/")[-1].split("?")[0] or "Provider_Service"
        _db = _client[db_name]
        _create_indexes(_db)
        print(f"✅ MongoDB connected → {db_name}")
    except ConnectionFailure as e:
        print(f"❌ MongoDB connection failed: {e}")
        raise
    return _db

def _create_indexes(db):
    col = db.portfolio_items
    col.create_index([("user_id", 1)])
    col.create_index([("user_id", 1), ("label", 1)])
    col.create_index([("created_at", -1)])
    print("✅ MongoDB indexes ready")