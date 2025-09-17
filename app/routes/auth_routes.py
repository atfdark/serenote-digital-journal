from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from app.database.db import db_session
from app.database.models import User

auth_routes = Blueprint("auth", __name__)

@auth_routes.route("/register", methods=["POST"])
def register():
    data = request.json
    if not data.get("username") or not data.get("password"):
        return jsonify({"message": "Username and password required"})

    if db_session.query(User).filter_by(username=data["username"]).first():
        return jsonify({"message": "Username already exists"})

    user = User(
        username=data["username"],
        password=generate_password_hash(data["password"])
    )
    db_session.add(user)
    db_session.commit()
    return jsonify({"message": "User registered successfully"})


@auth_routes.route("/login", methods=["POST"])
def login():
    data = request.json
    user = db_session.query(User).filter_by(username=data.get("username")).first()
    if user and check_password_hash(user.password, data["password"]):
        return jsonify({"message": "Login successful", "userId": user.id})
    return jsonify({"message": "Invalid credentials"})
