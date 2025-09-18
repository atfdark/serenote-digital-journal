# file: app/routes/entry_routes.py

from flask import Blueprint, request, jsonify, current_app
from app.database.db import db_session
from app.database.models import Entry
import os
from werkzeug.utils import secure_filename
import datetime

entry_routes = Blueprint("entry", __name__)

@entry_routes.route("/add", methods=["POST"])
def add_text_entry():
    """Adds a new text-based journal entry."""
    data = request.json
    user_id = data.get("user_id")
    title = data.get("title")
    content = data.get("content")
    mood = data.get("mood", "Neutral") # Default mood if not provided

    if not all([user_id, title, content]):
        return jsonify({"message": "Missing required fields"}), 400

    new_entry = Entry(
        user_id=user_id,
        title=title,
        content=content,
        type='text',
        mood=mood
    )
    db_session.add(new_entry)
    db_session.commit()
    return jsonify({"message": "Entry saved successfully"}), 201

@entry_routes.route("/user/<int:user_id>", methods=["GET"])
def get_entries(user_id):
    """Gets all entries for a specific user."""
    entries = db_session.query(Entry).filter_by(user_id=user_id).order_by(Entry.created_at.desc()).all()
    
    # Convert entry objects to a list of dictionaries
    result = [{
        "id": entry.id,
        "title": entry.title,
        "content": entry.content,
        "mood": entry.mood,
        "type": entry.type,
        "audio_path": entry.audio_path,
        "created_at": entry.created_at.isoformat()
    } for entry in entries]
    
    return jsonify(result)

@entry_routes.route("/voice", methods=["POST"])
def save_voice_note():
    user_id = request.form.get("user_id")
    title = request.form.get("title")
    mood = request.form.get("mood")
    audio = request.files.get("audio")

    if not audio:
        return jsonify({"error": "No audio uploaded"}), 400

    filename = f"voice_{user_id}_{audio.filename}"
    filepath = os.path.join(current_app.config["UPLOAD_FOLDER"], filename)
    audio.save(filepath)

    # Save in DB
    entry = Entry(
        user_id=user_id,
        title=title,
        mood=mood,
        type="voice",
        audio_path=f"uploads/{filename}"
    )
    db_session.add(entry)
    db_session.commit()

    return jsonify({"message": "Voice note saved", "path": entry.audio_path})