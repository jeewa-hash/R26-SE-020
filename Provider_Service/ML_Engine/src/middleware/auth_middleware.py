import os
from functools import wraps
import jwt
from flask import request, jsonify

JWT_SECRET    = os.getenv("JWT_SECRET", "")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")

def jwt_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return jsonify({"error": "Authorization header missing."}), 401
        token = auth_header.split(" ", 1)[1].strip()
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token expired."}), 401
        except jwt.InvalidTokenError as e:
            return jsonify({"error": f"Invalid token: {e}"}), 401
        user_obj = payload.get("user", {})
        user_id  = user_obj.get("id") or user_obj.get("_id")
        if not user_id:
            return jsonify({"error": "Token payload missing user ID."}), 401
        return f(str(user_id), *args, **kwargs)
    return decorated