import sqlite3
import uuid
import os
from datetime import datetime

class DBAdapter:
    def __init__(self, db_path):
        self.db_path = db_path
        self.init_db()

    def get_connection(self):
        return sqlite3.connect(self.db_path)

    def init_db(self):
        with self.get_connection() as conn:
            conn.execute('''
                CREATE TABLE IF NOT EXISTS service_session (
                    id TEXT PRIMARY KEY,
                    step INTEGER,
                    category TEXT,
                    object_name TEXT,
                    service_type TEXT,
                    sub_service_type TEXT,
                    confidence TEXT,
                    details TEXT,
                    room_location TEXT,
                    urgency TEXT,
                    usability TEXT,
                    location_address TEXT,
                    latitude REAL,
                    longitude REAL,
                    created_at TEXT
                )
            ''')

    def save_session(self, session):
        with self.get_connection() as conn:
            conn.execute('''
                INSERT OR REPLACE INTO service_session 
                (id, step, category, object_name, service_type, sub_service_type, confidence, details, room_location, urgency, usability, location_address, latitude, longitude, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                session.id, session.step, session.category, session.object_name, 
                session.service_type, session.sub_service_type, session.confidence, 
                session.details, session.room_location, session.urgency, 
                session.usability, session.location_address, session.latitude, 
                session.longitude, session.created_at
            ))

    def get_session(self, session_id):
        with self.get_connection() as conn:
            conn.row_factory = sqlite3.Row
            row = conn.execute('SELECT * FROM service_session WHERE id = ?', (session_id,)).fetchone()
            if row:
                return SessionProxy(dict(row))
        return None

class SessionProxy:
    def __init__(self, data):
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
db_manager = DBAdapter(os.path.join(os.path.dirname(__file__), "../service_discovery.db"))
