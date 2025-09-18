from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from app.database.db import db_session
from app.database.models import User

auth_routes = Blueprint("auth", __name__)

@auth_routes.route("/register", methods=["POST"])
def register():
    data = request.json
    username = data.get("username")
    password = data.get("password")

    if not username or not password:
        return jsonify({"message": "Username and password are required"}), 400

    if db_session.query(User).filter_by(username=data["username"]).first():
        return jsonify({"message": "Username already exists"}), 409 # Conflict

    user = User(username=username, password=generate_password_hash(password))
    db_session.add(user)
    db_session.commit()
    return jsonify({"message": "User registered successfully"}), 201


@auth_routes.route("/login", methods=["POST"])
def login():
    data = request.json
    user = db_session.query(User).filter_by(username=data.get("username")).first()
    if user and check_password_hash(user.password, data["password"]):
        return jsonify({"message": "Login successful", "userId": user.id}), 200
    return jsonify({"message": "Invalid username or password"}), 401 # Unauthorized
