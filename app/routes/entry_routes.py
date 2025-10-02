# file: app/routes/entry_routes.py (Corrected)

from flask import Blueprint, request, jsonify, current_app
from app.database.db import db_session
from app.database.models import Entry
from werkzeug.utils import secure_filename
from datetime import datetime
import os
import openai

entry_routes = Blueprint("entry", __name__)

# Set OpenAI API key (in production, use environment variable)
openai.api_key = "your-openai-api-key-here"  # Replace with actual key or env var

@entry_routes.route("/add", methods=["POST"])
def add_text_entry():
    """Adds a new text-based journal entry."""
    data = request.json
    user_id = data.get("user_id")
    title = data.get("title")
    content = data.get("content")
    mood = data.get("mood", "Neutral")   # 👈 allow mood from frontend
    is_capsule = data.get("is_capsule", False)
    capsule_open_date = data.get("capsule_open_date")

    if not all([user_id, title, content]):
        return jsonify({"message": "Missing required fields"}), 400

    from datetime import datetime
    capsule_date = None
    if is_capsule and capsule_open_date:
        try:
            capsule_date = datetime.fromisoformat(capsule_open_date.replace('Z', '+00:00'))
        except ValueError:
            return jsonify({"message": "Invalid capsule open date format"}), 400

    new_entry = Entry(
        user_id=user_id,
        title=title,
        content=content,
        type="text",
        mood=mood,
        is_capsule=is_capsule,
        capsule_open_date=capsule_date
    )
    db_session.add(new_entry)
    db_session.commit()
    return jsonify({"message": "Entry saved successfully"}), 201

@entry_routes.route("/user/<int:user_id>", methods=["GET"])
def get_entries(user_id):
    entries = db_session.query(Entry).filter_by(user_id=user_id).order_by(Entry.created_at.desc()).all()
    result = [{
        "id": entry.id, "title": entry.title, "content": entry.content,
        "mood": entry.mood, "type": entry.type, "audio_path": entry.audio_path,
        "is_capsule": entry.is_capsule, "capsule_open_date": entry.capsule_open_date.isoformat() if entry.capsule_open_date else None,
        "created_at": entry.created_at.isoformat()
    } for entry in entries]
    return jsonify(result)

@entry_routes.route("/delete/<int:entry_id>", methods=["DELETE"])
def delete_entry(entry_id):
    """Deletes an entry by ID."""
    entry = db_session.query(Entry).filter_by(id=entry_id).first()
    if not entry:
        return jsonify({"message": "Entry not found"}), 404

    db_session.delete(entry)
    db_session.commit()
    return jsonify({"message": "Entry deleted successfully"}), 200

@entry_routes.route("/voice", methods=["POST"])
def save_voice_note():
    if 'audio' not in request.files:
        return jsonify({"message": "No audio file provided"}), 400

    user_id = request.form.get("user_id")
    file = request.files['audio']
    is_capsule = request.form.get("is_capsule", "false").lower() == "true"
    capsule_open_date = request.form.get("capsule_open_date")

    if not user_id or not file.filename:
        return jsonify({"message": "Missing required data"}), 400

    upload_folder = current_app.config['UPLOAD_FOLDER']
    filename = secure_filename(f"voice_{user_id}_{datetime.now().timestamp()}_{file.filename}")
    filepath = os.path.join(upload_folder, filename)
    file.save(filepath)

    web_path = os.path.join('static', 'uploads', filename).replace("\\", "/")

    capsule_date = None
    if is_capsule and capsule_open_date:
        try:
            capsule_date = datetime.fromisoformat(capsule_open_date.replace('Z', '+00:00'))
        except ValueError:
            return jsonify({"message": "Invalid capsule open date format"}), 400

    entry = Entry(
        user_id=user_id,
        title=request.form.get("title"),
        mood=request.form.get("mood"),
        type="voice",
        audio_path=web_path,
        is_capsule=is_capsule,
        capsule_open_date=capsule_date
    )
    db_session.add(entry)
    db_session.commit()
    return jsonify({"message": "Voice note saved successfully"})

@entry_routes.route("/generate-prompts", methods=["POST"])
def generate_ai_prompts():
    """Analyze journal content and provide emotion-based quotes/messages."""
    data = request.json
    content = data.get("content", "")

    if not content:
        return jsonify({"messages": [], "detected_emotion": "neutral"}), 200

    try:
        # First, analyze the emotion in the content
        emotion_prompt = f"""Analyze this journal entry and detect the primary emotion: '{content}'

Respond with only one word: the primary emotion (Happy, Sad, Angry, Excited, Calm, Anxious, Neutral, etc.)"""

        emotion_response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": emotion_prompt}],
            max_tokens=20,
            temperature=0.3
        )

        detected_emotion = emotion_response.choices[0].message.content.strip().lower()

        # Now generate appropriate messages based on detected emotion
        emotion_responses = {
            "sad": [
                "💙 'The darkest nights produce the brightest stars.' - Unknown\n\nHey there, remember that tough times don't last, but tough people do! 🌟",
                "😊 Why don't scientists trust atoms? Because they make up everything!\n\nLaughter is the best medicine - here's a smile for you! 😄",
                "🌈 'After every storm, the sun will smile; for every problem, there is a solution.' - Unknown\n\nYou're stronger than you know, and brighter days are coming! ☀️"
            ],
            "angry": [
                "🧘 'For every minute you are angry, you lose sixty seconds of happiness.' - Ralph Waldo Emerson\n\nTake a deep breath - you've got this! 🌬️",
                "😄 Why did the scarecrow win an award? Because he was outstanding in his field!\n\nLet that anger go and enjoy the moment! 🌽",
                "💪 'The best revenge is massive success.' - Frank Sinatra\n\nChannel that energy into something positive! 🚀"
            ],
            "anxious": [
                "🕊️ 'Peace begins with a smile.' - Mother Teresa\n\nYou're safe, you're capable, and you're exactly where you need to be. 🌸",
                "😊 What do you call fake spaghetti? An impasta!\n\nTake it easy - everything will pasta just fine! 🍝",
                "🌟 'The only way to do great work is to love what you do.' - Steve Jobs\n\nTrust the process and believe in yourself! ✨"
            ],
            "happy": [
                "🎉 'Happiness is not something ready-made. It comes from your own actions.' - Dalai Lama\n\nKeep spreading that joy! 🌈",
                "😄 Why don't eggs tell jokes? They'd crack each other up!\n\nYour happiness is contagious - keep shining! 🥚",
                "🌟 'The most important thing is to enjoy your life - to be happy.' - Audrey Hepburn\n\nCherish these moments! 💫"
            ],
            "excited": [
                "🚀 'The future belongs to those who believe in the beauty of their dreams.' - Eleanor Roosevelt\n\nYour enthusiasm is inspiring! ⭐",
                "😄 What did the ocean say to the beach? Nothing, it just waved!\n\nRide that wave of excitement! 🌊",
                "🎯 'The only limit to our realization of tomorrow will be our doubts of today.' - Franklin D. Roosevelt\n\nDream big and go for it! 🎪"
            ],
            "calm": [
                "🧘 'Peace comes from within. Do not seek it without.' - Buddha\n\nEmbrace this peaceful moment! 🌸",
                "😊 Why did the bicycle fall over? It was two-tired!\n\nEven in calm, there's room for a little fun! 🚴",
                "🌿 'The quieter you become, the more you can hear.' - Ram Dass\n\nListen to your inner wisdom! 🌙"
            ]
        }

        # Get messages for detected emotion, fallback to neutral
        messages = emotion_responses.get(detected_emotion, [
            "📝 'The journey of a thousand miles begins with a single step.' - Lao Tzu\n\nEvery word you write brings you closer to understanding yourself! 🌱",
            "😊 Why did the math book look sad? Because it had too many problems!\n\nKeep writing - you're doing great! 📚",
            "✨ 'You are never too old to set another goal or to dream a new dream.' - C.S. Lewis\n\nYour thoughts matter! 💭"
        ])

        return jsonify({
            "messages": messages,
            "detected_emotion": detected_emotion,
            "is_low_mood": detected_emotion in ["sad", "angry", "anxious"]
        })

    except Exception as e:
        # Fallback messages
        return jsonify({
            "messages": [
                "📝 'The best way to predict the future is to create it.' - Peter Drucker\n\nYour words have power! ✨",
                "😊 Why don't skeletons fight each other? They don't have the guts!\n\nKeep expressing yourself! 💀",
                "🌟 'Believe you can and you're halfway there.' - Theodore Roosevelt\n\nYou're on an amazing journey! 🚀"
            ],
            "detected_emotion": "neutral",
            "is_low_mood": False
        }), 200