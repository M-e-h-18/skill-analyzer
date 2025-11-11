# backend/routes/auth.py
from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
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
        role=role
        # created_at is set automatically by default in the model
    )
    user.save()
    
    return jsonify({"msg": f"{role.capitalize()} created successfully"}), 201

@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    email = data.get("email")
    password = data.get("password")
    
    try:
        user = User.objects(email=email).first()
        if not user or not check_password_hash(user.password, password):
            return jsonify({"msg": "Invalid credentials"}), 401
        
        token = create_access_token(identity=str(user.id))
        
        return jsonify({
            "access_token": token,
            "user": {
                "id": str(user.id),
                "email": user.email,
                "name": user.name,
                "role": user.role
            }
        }), 200
    except Exception as e:
        print(f"Login error - Database connection issue: {e}")
        return jsonify({
            "ok": False, 
            "msg": "Database connection error. Please check server logs."
        }), 500

@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def get_current_user():
    user_id = get_jwt_identity()
    user = User.objects(id=user_id).first()
    
    if not user:
        return jsonify({"msg": "User not found"}), 404
    
    return jsonify({
        "user": {
            "id": str(user.id),
            "email": user.email,
            "name": user.name,
            "role": user.role
        }
    }), 200