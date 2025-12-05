from flask import Blueprint, request, jsonify
from flask_login import login_user, logout_user, login_required
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
        login_user(user)
        return jsonify({"message": "Login successful"}), 200
    return jsonify({"message": "Invalid username or password"}), 401 # Unauthorized


@auth_routes.route("/logout", methods=["POST"])
@login_required
def logout():
    logout_user()
    return jsonify({"message": "Logout successful"}), 200


@auth_routes.route("/user/<int:user_id>", methods=["GET"])
def get_user(user_id):
    user = db_session.query(User).filter_by(id=user_id).first()
    if not user:
        return jsonify({"message": "User not found"}), 404
    return jsonify({"userId": user.id, "username": user.username}), 200
