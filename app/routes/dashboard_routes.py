from flask import Blueprint, jsonify
from app.database.db import db_session
from app.database.models import Entry
from sqlalchemy import func, desc
from datetime import datetime, timedelta, timezone

# IST timezone (UTC+5:30)
IST = timezone(timedelta(hours=5, minutes=30))

dashboard_api = Blueprint("dashboard_api", __name__)

@dashboard_api.route("/dashboard/data/<int:user_id>", methods=["GET"])
def get_dashboard_data(user_id):
    """Provides mood data as JSON for the frontend chart."""

    # The query now filters to only include entries where the type is 'text'
    mood_counts_query = db_session.query(
        Entry.mood, func.count(Entry.mood)
    ).filter(
        Entry.user_id == user_id,
        Entry.type == 'text'  # <-- THIS IS THE ONLY CHANGE
    ).group_by(Entry.mood).all()

    if not mood_counts_query:
        return jsonify({})

    mood_data = {mood: count for mood, count in mood_counts_query}

    return jsonify(mood_data)

@dashboard_api.route("/dashboard/insights/<int:user_id>", methods=["GET"])
def get_dashboard_insights(user_id):
    """Provides enhanced insights: streaks, trends, etc."""
    # Total entries
    total_entries = db_session.query(func.count(Entry.id)).filter(Entry.user_id == user_id).scalar()

    # Current streak (consecutive days with entries)
    today = datetime.now(IST).date()
    streak = 0
    check_date = today
    while True:
        has_entry = db_session.query(Entry).filter(
            Entry.user_id == user_id,
            func.date(Entry.created_at) == check_date
        ).first() is not None
        if has_entry:
            streak += 1
            check_date -= timedelta(days=1)
        else:
            break

    # Most common mood
    mood_query = db_session.query(Entry.mood, func.count(Entry.mood)).filter(
        Entry.user_id == user_id
    ).group_by(Entry.mood).order_by(desc(func.count(Entry.mood))).first()
    top_mood = mood_query[0] if mood_query else "None"

    # Recent trend (last 7 days mood average - simplified)
    week_ago = datetime.now(IST) - timedelta(days=7)
    recent_entries = db_session.query(Entry).filter(
        Entry.user_id == user_id,
        Entry.created_at >= week_ago
    ).all()

    mood_scores = {"Happy": 5, "Calm": 4, "Neutral": 3, "Sad": 2, "Angry": 1}
    scores = [mood_scores.get(e.mood, 3) for e in recent_entries]
    avg_mood_score = sum(scores) / len(scores) if scores else 3

    return jsonify({
        "total_entries": total_entries,
        "current_streak": streak,
        "top_mood": top_mood,
        "avg_mood_score": round(avg_mood_score, 1),
        "insights": [
            f"You've written {total_entries} entries total.",
            f"Your current journaling streak is {streak} days!",
            f"Your most common mood is {top_mood}.",
            f"Over the last week, your average mood score is {round(avg_mood_score, 1)}/5."
        ]
    })