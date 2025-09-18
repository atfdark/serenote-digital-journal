from flask import Blueprint, jsonify
from app.database.db import db_session
from app.database.models import Entry
from sqlalchemy import func

dashboard_api = Blueprint("dashboard_api", __name__)

@dashboard_api.route("/dashboard/data/<int:user_id>", methods=["GET"])
def get_dashboard_data(user_id):
    """Provides mood data as JSON for the frontend chart."""
    
    mood_counts_query = db_session.query(
        Entry.mood, func.count(Entry.mood)
    ).filter(
        Entry.user_id == user_id
    ).group_by(Entry.mood).all()

    if not mood_counts_query:
        return jsonify({})

    mood_data = {mood: count for mood, count in mood_counts_query}
    
    return jsonify(mood_data)