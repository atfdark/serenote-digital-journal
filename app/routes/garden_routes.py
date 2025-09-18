from flask import Blueprint, request, jsonify
from app.database.db import db_session
from app.database.models import Garden
import datetime

garden_routes = Blueprint("garden",__name__)

@garden_routes.route("/", methods=["POST"])
def log_mood_and_update_garden():
    """Logs a user's mood and updates their garden stats."""
    data=request.json
    user_id=data.get("user_id")
    mood=data.get("mood")

    if not user_id or not mood:
        return jsonify({"message":"user_id and mood are required fields"}), 400

    garden=db_session.query(Garden).filter_by(user_id=user_id).first()
    
    if not garden:
        # Create a new garden if one doesn't exist
        garden=Garden(user_id=user_id, overall_vibe=mood, growth_level=1, flowers=0, trees=0)
        db_session.add(garden)
    else:
        # Update existing garden
        garden.overall_vibe=mood
        garden.last_updated=datetime.datetime.now(datetime.timezone.utc)
        garden.growth_level += 1

    # Update garden elements based on mood
    if mood.lower() in ["happy", "joyful", "peaceful", "energetic", "joy"]:
            garden.flowers += 1   # happy moods grow flowers
    else:
            garden.trees += 1     # other moods grow trees
    
    db_session.commit()
    return jsonify({
        "message": f"Mood '{mood}' logged, garden updated!",
        "growth_level": garden.growth_level,
        "flowers": garden.flowers,
        "trees": garden.trees
    }), 200

@garden_routes.route("/<int:user_id>", methods=["GET"])
def get_garden(user_id):
    garden = db_session.query(Garden).filter_by(user_id=user_id).first()
    if not garden:
        return jsonify({"message": f"Garden for user_id {user_id} not found"}), 404

    return jsonify({
        "user_id": garden.user_id,
        "overall_vibe": garden.overall_vibe,
        "growth_level": garden.growth_level,
        "flowers": garden.flowers,
        "trees": garden.trees,
        "last_updated": garden.last_updated.isoformat()
    }), 200