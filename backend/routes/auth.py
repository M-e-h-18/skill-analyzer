# backend/routes/auth.py
from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import create_access_token
from models import User
import datetime

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")

@auth_bp.route("/signup", methods=["POST"])
def signup():
    data = request.get_json() or {}
    email = data.get("email")
    password = data.get("password")
    name = data.get("name", "")
    role = data.get("role", "employee")  # employer | employee

    if not email or not password:
        return jsonify({"msg": "Email and password required"}), 400
    if User.objects(email=email).first():
        return jsonify({"msg": "User already exists"}), 409

    user = User(
        email=email,
        name=name,
        password=generate_password_hash(password),
        role=role,
        created_at=datetime.datetime.utcnow()
    )
    user.save()
    return jsonify({"msg": f"{role.capitalize()} created successfully"}), 201


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    email = data.get("email")
    password = data.get("password")

    user = User.objects(email=email).first()
    if not user or not check_password_hash(user.password, password):
        return jsonify({"msg": "Invalid credentials"}), 401

    token = create_access_token(identity=str(user.id))
    return jsonify({
        "token": token,
        "user": {
            "id": str(user.id),
            "email": user.email,
            "name": user.name,
            "role": user.role
        }
    }), 200
