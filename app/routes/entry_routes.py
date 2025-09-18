# file: app/routes/entry_routes.py (Corrected)

from flask import Blueprint, request, jsonify, current_app
from app.database.db import db_session
from app.database.models import Entry
from werkzeug.utils import secure_filename
from datetime import datetime
import os

entry_routes = Blueprint("entry", __name__)

@entry_routes.route("/add", methods=["POST"])
def add_text_entry():
    data = request.json
    user_id, title, content, mood = data.get("user_id"), data.get("title"), data.get("content"), data.get("mood", "Neutral")
    if not all([user_id, title, content]):
        return jsonify({"message": "Missing required fields"}), 400

    new_entry = Entry(user_id=user_id, title=title, content=content, type="text", mood=mood)
    db_session.add(new_entry)
    db_session.commit()
    return jsonify({"message": "Entry saved successfully"}), 201

@entry_routes.route("/user/<int:user_id>", methods=["GET"])
def get_entries(user_id):
    entries = db_session.query(Entry).filter_by(user_id=user_id).order_by(Entry.created_at.desc()).all()
    result = [{
        "id": entry.id, "title": entry.title, "content": entry.content,
        "mood": entry.mood, "type": entry.type, "audio_path": entry.audio_path,
        "created_at": entry.created_at.isoformat()
    } for entry in entries]
    return jsonify(result)

@entry_routes.route("/voice", methods=["POST"])
def save_voice_note():
    if 'audio' not in request.files:
        return jsonify({"message": "No audio file provided"}), 400

    user_id = request.form.get("user_id")
    file = request.files['audio']

    if not user_id or not file.filename:
        return jsonify({"message": "Missing required data"}), 400

    upload_folder = current_app.config['UPLOAD_FOLDER']
    filename = secure_filename(f"voice_{user_id}_{datetime.now().timestamp()}_{file.filename}")
    filepath = os.path.join(upload_folder, filename)
    file.save(filepath)

    web_path = os.path.join('static', 'uploads', filename).replace("\\", "/")

    entry = Entry(
        user_id=user_id,
        title=request.form.get("title"),
        mood=request.form.get("mood"),
        type="voice",
        audio_path=web_path,
    )
    db_session.add(entry)
    db_session.commit()
    return jsonify({"message": "Voice note saved successfully"})