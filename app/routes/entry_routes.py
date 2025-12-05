# file: app/routes/entry_routes.py (Corrected)

from flask import Blueprint, request, jsonify
from flask_login import current_user, login_required
from app.database.db import db_session
from app.database.models import Entry
from datetime import datetime, timezone, timedelta
from sqlalchemy import func
import openai
import base64

# IST timezone (UTC+5:30)
IST = timezone(timedelta(hours=5, minutes=30))

entry_routes = Blueprint("entry", __name__)

# Set OpenAI API key (in production, use environment variable)
openai.api_key = "your-openai-api-key-here"  # Replace with actual key or env var

@login_required
@entry_routes.route("/add", methods=["POST"])
def add_text_entry():
    """Adds a new text-based journal entry."""
    data = request.json
    user_id = current_user.id
    title = data.get("title")
    content = data.get("content")
    mood = data.get("mood", "Neutral")   # 👈 allow mood from frontend
    is_capsule = data.get("is_capsule", False)
    capsule_open_date = data.get("capsule_open_date")

    if not all([title, content]):
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

@login_required
@entry_routes.route("/user/<int:user_id>", methods=["GET"])
def get_entries(user_id):
    """Legacy endpoint - returns all entries with audio data (use specific endpoints for better performance)"""
    print(f"DEBUG: get_entries called by user {current_user.id} for user_id {user_id}")
    print(f"DEBUG: current_user.id type: {type(current_user.id)}, user_id type: {type(user_id)}")
    if user_id != current_user.id:
        print(f"DEBUG: Authorization failed: {user_id} != {current_user.id}")
        return jsonify({"message": "Unauthorized"}), 403
    print(f"DEBUG: Authorization passed")
    entries = db_session.query(Entry).filter_by(user_id=current_user.id).order_by(Entry.created_at.desc()).all()
    print(f"DEBUG: Found {len(entries)} total entries for user {current_user.id}")
    voice_entries = [e for e in entries if e.type == 'voice']
    print(f"DEBUG: Found {len(voice_entries)} voice entries")
    result = []
    for entry in entries:
        if entry.created_at is None:
            continue
        entry_data = {
            "id": entry.id, "title": entry.title, "content": entry.content,
            "mood": entry.mood, "type": entry.type, "audio_path": entry.audio_path,
            "is_capsule": entry.is_capsule, "capsule_open_date": entry.capsule_open_date.isoformat() if entry.capsule_open_date else None,
            "created_at": entry.created_at.isoformat()
        }
        if entry.audio_data:
            entry_data["audio_data"] = base64.b64encode(entry.audio_data).decode('utf-8')
            print(f"DEBUG: Entry {entry.id} has audio_data, length: {len(entry_data['audio_data'])}")
        result.append(entry_data)
    print(f"DEBUG: Returning {len(result)} entries")
    return jsonify(result)

@login_required
@entry_routes.route("/text/<int:user_id>", methods=["GET"])
def get_text_entries(user_id):
    """Optimized endpoint for text entries only - no audio data"""
    if user_id != current_user.id:
        return jsonify({"message": "Unauthorized"}), 403

    # Get pagination parameters
    page = int(request.args.get('page', 1))
    limit = int(request.args.get('limit', 50))
    offset = (page - 1) * limit

    # Query only text entries
    entries = db_session.query(Entry).filter_by(
        user_id=current_user.id,
        type='text'
    ).order_by(Entry.created_at.desc()).offset(offset).limit(limit).all()

    result = []
    for entry in entries:
        if entry.created_at is None:
            continue
        entry_data = {
            "id": entry.id,
            "title": entry.title,
            "content": entry.content,
            "mood": entry.mood,
            "type": entry.type,
            "is_capsule": entry.is_capsule,
            "capsule_open_date": entry.capsule_open_date.isoformat() if entry.capsule_open_date else None,
            "created_at": entry.created_at.isoformat(),
            "tags": entry.tags.split(',') if entry.tags else []
        }
        result.append(entry_data)

    # Get total count for pagination
    total_count = db_session.query(Entry).filter_by(
        user_id=current_user.id,
        type='text'
    ).count()

    return jsonify({
        "entries": result,
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total_count,
            "pages": (total_count + limit - 1) // limit
        }
    })

@login_required
@entry_routes.route("/voice/metadata/<int:user_id>", methods=["GET"])
def get_voice_entries_metadata(user_id):
    """Returns voice entries metadata without audio data for better performance"""
    if user_id != current_user.id:
        return jsonify({"message": "Unauthorized"}), 403

    # Get pagination parameters
    page = int(request.args.get('page', 1))
    limit = int(request.args.get('limit', 50))
    offset = (page - 1) * limit

    # Query voice entries without audio_data
    entries = db_session.query(
        Entry.id, Entry.title, Entry.mood, Entry.type, Entry.is_capsule,
        Entry.capsule_open_date, Entry.created_at, Entry.audio_path
    ).filter_by(
        user_id=current_user.id,
        type='voice'
    ).order_by(Entry.created_at.desc()).offset(offset).limit(limit).all()

    result = []
    for entry in entries:
        entry_data = {
            "id": entry.id,
            "title": entry.title or "Voice Note",
            "mood": entry.mood,
            "type": entry.type,
            "audio_path": entry.audio_path,
            "is_capsule": entry.is_capsule,
            "capsule_open_date": entry.capsule_open_date.isoformat() if entry.capsule_open_date else None,
            "created_at": entry.created_at.isoformat()
        }
        result.append(entry_data)

    # Get total count for pagination
    total_count = db_session.query(Entry).filter_by(
        user_id=current_user.id,
        type='voice'
    ).count()

    return jsonify({
        "entries": result,
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total_count,
            "pages": (total_count + limit - 1) // limit
        }
    })

@login_required
@entry_routes.route("/voice/audio/<int:entry_id>", methods=["GET"])
def get_voice_audio(entry_id):
    """Lazy load audio data for a specific voice entry"""
    print(f"DEBUG: get_voice_audio called for entry_id={entry_id}, user_id={current_user.id}")
    entry = db_session.query(Entry).filter_by(id=entry_id, user_id=current_user.id).first()
    if not entry:
        print(f"DEBUG: Entry {entry_id} not found for user {current_user.id}")
        return jsonify({"message": "Entry not found"}), 404

    print(f"DEBUG: Entry found - type: {entry.type}, has audio_data: {entry.audio_data is not None}")
    if entry.type != 'voice' or not entry.audio_data:
        print(f"DEBUG: No audio data available - type: {entry.type}, audio_data exists: {entry.audio_data is not None}")
        return jsonify({"message": "No audio data available"}), 404

    # Determine MIME type based on audio_path or default to webm
    mime_type = "audio/webm"
    if entry.audio_path:
        if entry.audio_path.endswith('.mp4') or entry.audio_path.endswith('.m4a'):
            mime_type = "audio/mp4"
        elif entry.audio_path.endswith('.wav'):
            mime_type = "audio/wav"
        elif entry.audio_path.endswith('.ogg'):
            mime_type = "audio/ogg"

    audio_data_b64 = base64.b64encode(entry.audio_data).decode('utf-8')
    print(f"DEBUG: Returning audio data - MIME type: {mime_type}, data length: {len(audio_data_b64)}")
    return jsonify({
        "audio_data": audio_data_b64,
        "mime_type": mime_type
    })

@login_required
@entry_routes.route("/summary/<int:user_id>", methods=["GET"])
def get_entries_summary(user_id):
    """Combined endpoint for entry statistics and recent entries"""
    if user_id != current_user.id:
        return jsonify({"message": "Unauthorized"}), 403

    # Get counts by type
    text_count = db_session.query(Entry).filter_by(user_id=current_user.id, type='text').count()
    voice_count = db_session.query(Entry).filter_by(user_id=current_user.id, type='voice').count()
    capsule_count = db_session.query(Entry).filter_by(user_id=current_user.id, is_capsule=True).count()

    # Get recent entries (last 5 text entries for dashboard)
    recent_entries = db_session.query(Entry).filter_by(
        user_id=current_user.id,
        type='text'
    ).order_by(Entry.created_at.desc()).limit(5).all()

    recent_data = []
    for entry in recent_entries:
        recent_data.append({
            "id": entry.id,
            "title": entry.title,
            "created_at": entry.created_at.isoformat(),
            "mood": entry.mood
        })

    # Get today's entry count
    today = datetime.now(IST).date()
    today_count = db_session.query(Entry).filter(
        Entry.user_id == current_user.id,
        Entry.type == 'text',
        func.date(Entry.created_at) == today
    ).count()

    return jsonify({
        "stats": {
            "total_entries": text_count + voice_count,
            "text_entries": text_count,
            "voice_entries": voice_count,
            "time_capsules": capsule_count,
            "today_entries": today_count
        },
        "recent_entries": recent_data
    })

@login_required
@entry_routes.route("/delete/<int:entry_id>", methods=["DELETE"])
def delete_entry(entry_id):
    """Deletes an entry by ID."""
    entry = db_session.query(Entry).filter_by(id=entry_id, user_id=current_user.id).first()
    if not entry:
        return jsonify({"message": "Entry not found"}), 404

    db_session.delete(entry)
    db_session.commit()
    return jsonify({"message": "Entry deleted successfully"}), 200

@login_required
@entry_routes.route("/voice", methods=["POST"])
def save_voice_note():
    print("Voice note: Received POST request to /entries/voice")
    if 'audio' not in request.files:
        print("Voice note: No audio file in request.files")
        return jsonify({"message": "No audio file provided"}), 400

    user_id = current_user.id
    file = request.files['audio']
    is_capsule = request.form.get("is_capsule", "false").lower() == "true"
    capsule_open_date = request.form.get("capsule_open_date")

    print(f"Voice note: user_id={user_id}, file.filename={file.filename}, is_capsule={is_capsule}")

    if not file.filename:
        print("Voice note: Missing filename")
        return jsonify({"message": "Missing required data"}), 400

    # Read the audio file data
    try:
        audio_data = file.read()
        print(f"Voice note: Read audio data, size={len(audio_data)} bytes")
    except Exception as e:
        print(f"Voice note: Error reading audio file: {e}")
        return jsonify({"message": "Failed to read audio file"}), 500

    capsule_date = None
    if is_capsule and capsule_open_date:
        try:
            capsule_date = datetime.fromisoformat(capsule_open_date.replace('Z', '+00:00'))
        except ValueError:
            return jsonify({"message": "Invalid capsule open date format"}), 400

    try:
        entry = Entry(
            user_id=user_id,
            title=request.form.get("title"),
            mood=request.form.get("mood"),
            type="voice",
            audio_data=audio_data,
            is_capsule=is_capsule,
            capsule_open_date=capsule_date
        )
        db_session.add(entry)
        db_session.commit()
        print("Voice note: Database entry saved successfully")
    except Exception as e:
        print(f"Voice note: Error saving to database: {e}")
        return jsonify({"message": "Failed to save voice note"}), 500

    return jsonify({"message": "Voice note saved successfully"})

@login_required
@entry_routes.route("/generate-prompts", methods=["POST"])
def generate_ai_prompts():
    """Analyze journal content and provide emotion-based quotes/messages."""
    data = request.json
    content = data.get("content", "")

    if not content:
        return jsonify({"messages": [], "detected_emotion": "neutral"}), 200

    try:
        # Use the user's explicitly selected mood for compassionate responses
        # The AI analysis is still performed for personalized messages, but we respect user's self-identification
        mood = data.get("mood")
        detected_emotion = mood.lower() if mood else "neutral"

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

@login_required
@entry_routes.route("/compassionate-tools", methods=["GET"])
def get_compassionate_tools():
    """Get all compassionate response tools based on emotion."""
    emotion = request.args.get("emotion", "neutral").lower()

    tools = {
        "quotes": get_comforting_quotes(emotion),
        "prompts": get_guided_prompts(emotion),
        "music": get_music_recommendations(emotion),
        "breathing": get_breathing_exercise(emotion)
    }

    return jsonify(tools)

def get_comforting_quotes(emotion):
    """Get curated comforting quotes based on emotion."""
    quotes_db = {
        "sad": [
            {"text": "The darkest nights produce the brightest stars.", "author": "Unknown"},
            {"text": "This too shall pass.", "author": "Unknown"},
            {"text": "Your pain is valid, and so is your strength.", "author": "Unknown"},
            {"text": "Healing takes time, and that's okay.", "author": "Unknown"}
        ],
        "angry": [
            {"text": "For every minute you are angry, you lose sixty seconds of happiness.", "author": "Ralph Waldo Emerson"},
            {"text": "The best revenge is massive success.", "author": "Frank Sinatra"},
            {"text": "Peace begins with a smile.", "author": "Mother Teresa"},
            {"text": "Let go of what you can't control.", "author": "Unknown"}
        ],
        "anxious": [
            {"text": "Peace comes from within. Do not seek it without.", "author": "Buddha"},
            {"text": "The only way to do great work is to love what you do.", "author": "Steve Jobs"},
            {"text": "You are stronger than you know.", "author": "Unknown"},
            {"text": "One day at a time.", "author": "Unknown"}
        ],
        "happy": [
            {"text": "Happiness is not something ready-made. It comes from your own actions.", "author": "Dalai Lama"},
            {"text": "The most important thing is to enjoy your life.", "author": "Audrey Hepburn"},
            {"text": "Choose joy.", "author": "Unknown"},
            {"text": "Gratitude turns what we have into enough.", "author": "Unknown"}
        ],
        "neutral": [
            {"text": "The journey of a thousand miles begins with a single step.", "author": "Lao Tzu"},
            {"text": "You are exactly where you need to be.", "author": "Unknown"},
            {"text": "Every moment is a fresh beginning.", "author": "T.S. Eliot"},
            {"text": "Trust the process.", "author": "Unknown"}
        ]
    }

    return quotes_db.get(emotion, quotes_db["neutral"])

def get_guided_prompts(emotion):
    """Get guided journaling prompts based on emotion."""
    prompts_db = {
        "sad": [
            "What is one small thing that brought you comfort today?",
            "If you could talk to your younger self right now, what would you say?",
            "What are three things you're grateful for, even on difficult days?",
            "Describe a time when you felt truly supported by someone.",
            "What does self-compassion look like for you in this moment?"
        ],
        "angry": [
            "What triggered this anger, and what might it be trying to tell you?",
            "If this anger could speak, what would it say?",
            "What would it look like to channel this energy into something positive?",
            "What boundaries do you need to set to protect your peace?",
            "How can you express this feeling in a healthy way?"
        ],
        "anxious": [
            "What is one thing you can control right now?",
            "What evidence do you have that you've gotten through difficult times before?",
            "What would you tell a friend who was feeling this way?",
            "What are three things you can see, hear, and feel in this moment?",
            "What small step can you take today to move forward?"
        ],
        "happy": [
            "What brought this happiness into your life?",
            "How can you cultivate more of this feeling?",
            "What would you like to share with others about this moment?",
            "What does joy feel like in your body?",
            "How can you carry this feeling with you throughout your day?"
        ],
        "neutral": [
            "What are you noticing about your thoughts right now?",
            "What does balance feel like for you?",
            "What small change could bring more peace to your day?",
            "What are you looking forward to?",
            "How are you taking care of yourself today?"
        ]
    }

    return prompts_db.get(emotion, prompts_db["neutral"])

def get_music_recommendations(emotion):
    """Get music recommendations based on emotion."""
    music_db = {
        "sad": [
            {"title": "Hurt", "artist": "Johnny Cash", "genre": "Folk/Country", "mood": "Reflective"},
            {"title": "Someone Like You", "artist": "Adele", "genre": "Pop", "mood": "Melancholic"},
            {"title": "The Night We Met", "artist": "Lord Huron", "genre": "Indie Folk", "mood": "Nostalgic"},
            {"title": "Skinny Love", "artist": "Bon Iver", "genre": "Folk", "mood": "Intimate"}
        ],
        "angry": [
            {"title": "Break Stuff", "artist": "Limp Bizkit", "genre": "Rap Metal", "mood": "Energetic"},
            {"title": "Killing in the Name", "artist": "Rage Against the Machine", "genre": "Alternative Metal", "mood": "Rebellious"},
            {"title": "Breathe", "artist": "The Prodigy", "genre": "Electronic", "mood": "Intense"},
            {"title": "Smells Like Teen Spirit", "artist": "Nirvana", "genre": "Grunge", "mood": "Raw"}
        ],
        "anxious": [
            {"title": "Weightless", "artist": "Marconi Union", "genre": "Ambient", "mood": "Calming"},
            {"title": "River", "artist": "Joni Mitchell", "genre": "Folk", "mood": "Soothing"},
            {"title": "Holocene", "artist": "Bon Iver", "genre": "Indie Folk", "mood": "Peaceful"},
            {"title": "The Night We Met", "artist": "Lord Huron", "genre": "Indie Folk", "mood": "Gentle"}
        ],
        "happy": [
            {"title": "Happy", "artist": "Pharrell Williams", "genre": "Pop", "mood": "Uplifting"},
            {"title": "Can't Stop the Feeling!", "artist": "Justin Timberlake", "genre": "Pop", "mood": "Joyful"},
            {"title": "Walking on Sunshine", "artist": "Katrina and the Waves", "genre": "Pop Rock", "mood": "Energetic"},
            {"title": "Three Little Birds", "artist": "Bob Marley", "genre": "Reggae", "mood": "Positive"}
        ],
        "neutral": [
            {"title": "Dream On", "artist": "Aerosmith", "genre": "Rock", "mood": "Motivational"},
            {"title": "Imagine", "artist": "John Lennon", "genre": "Pop Rock", "mood": "Hopeful"},
            {"title": "What a Wonderful World", "artist": "Louis Armstrong", "genre": "Jazz", "mood": "Grateful"},
            {"title": "Lean on Me", "artist": "Bill Withers", "genre": "Soul", "mood": "Supportive"}
        ]
    }

    return music_db.get(emotion, music_db["neutral"])

def get_breathing_exercise(emotion):
    """Get breathing exercise based on emotion."""
    exercises_db = {
        "sad": {
            "name": "Compassionate Breathing",
            "description": "A gentle breathing exercise to nurture self-compassion",
            "steps": [
                "Place one hand on your heart and one on your belly",
                "Inhale slowly through your nose for a count of 4, feeling your belly rise",
                "Hold for a count of 4, sending love to yourself",
                "Exhale through your mouth for a count of 6, releasing any tension",
                "Repeat for 2-3 minutes, focusing on self-kindness"
            ],
            "duration": "2-3 minutes",
            "benefits": "Helps cultivate self-compassion and emotional healing"
        },
        "angry": {
            "name": "Grounding Breath",
            "description": "A powerful breathing technique to release anger and find calm",
            "steps": [
                "Sit or stand with your feet firmly on the ground",
                "Inhale deeply through your nose for a count of 4",
                "Hold your breath for a count of 4",
                "Exhale forcefully through your mouth for a count of 4, imagining releasing the anger",
                "Pause for a count of 4 before the next inhale",
                "Repeat for 1-2 minutes until you feel more centered"
            ],
            "duration": "1-2 minutes",
            "benefits": "Helps release pent-up energy and restore emotional balance"
        },
        "anxious": {
            "name": "4-7-8 Breathing",
            "description": "A calming technique to reduce anxiety and promote relaxation",
            "steps": [
                "Place the tip of your tongue against the ridge behind your front teeth",
                "Inhale quietly through your nose for a count of 4",
                "Hold your breath for a count of 7",
                "Exhale completely through your mouth for a count of 8, making a whoosh sound",
                "Repeat the cycle 4 times",
                "Practice this 2-3 times daily for best results"
            ],
            "duration": "1-2 minutes",
            "benefits": "Activates the parasympathetic nervous system to reduce anxiety"
        },
        "happy": {
            "name": "Joyful Breathing",
            "description": "An energizing breath to amplify positive emotions",
            "steps": [
                "Stand or sit with good posture, smiling gently",
                "Inhale deeply through your nose for a count of 4, expanding your chest",
                "Exhale through your mouth with a gentle sigh for a count of 4",
                "On each exhale, think of something you're grateful for",
                "Repeat for 1-2 minutes, allowing joy to fill your body",
                "Notice how your mood becomes even more positive"
            ],
            "duration": "1-2 minutes",
            "benefits": "Amplifies positive emotions and cultivates gratitude"
        },
        "neutral": {
            "name": "Balanced Breathing",
            "description": "A simple technique to find balance and presence",
            "steps": [
                "Sit comfortably with your spine straight",
                "Inhale through your nose for a count of 4",
                "Exhale through your nose for a count of 4",
                "Continue for 2-3 minutes, keeping your breath smooth and even",
                "If your mind wanders, gently bring it back to your breath",
                "Notice how this creates a sense of calm and balance"
            ],
            "duration": "2-3 minutes",
            "benefits": "Promotes mindfulness and emotional equilibrium"
        }
    }

    return exercises_db.get(emotion, exercises_db["neutral"])