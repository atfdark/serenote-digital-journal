from flask import Blueprint, request, jsonify
from app.database.db import db_session
from app.database.models import Garden, GardenFlower
import datetime
import json
import random

garden_routes = Blueprint("garden",__name__)

# Mood to flower mapping
MOOD_FLOWERS = {
    "happy": "sunflower",
    "joyful": "sunflower",
    "excited": "tulip",
    "energetic": "daisy",
    "peaceful": "lavender",
    "calm": "chamomile",
    "sad": "lily",
    "melancholy": "forget-me-not",
    "angry": "rose",
    "frustrated": "thorned_rose",
    "anxious": "butterfly_bush",
    "neutral": "dandelion",
    "confused": "puzzle_flower",
    "grateful": "morning_glory",
    "hopeful": "cherry_blossom"
}

SEASONAL_THEMES = {
    "spring": {"colors": ["#FFC107", "#4CAF50", "#E91E63"], "background": "#E8F5E8"},
    "summer": {"colors": ["#FF9800", "#2196F3", "#9C27B0"], "background": "#FFF3E0"},
    "autumn": {"colors": ["#FF5722", "#795548", "#607D8B"], "background": "#FBE9E7"},
    "winter": {"colors": ["#00BCD4", "#3F51B5", "#9E9E9E"], "background": "#E3F2FD"}
}

@garden_routes.route("/", methods=["POST"])
def log_mood_and_update_garden():
    """Logs a user's mood and updates their garden stats."""
    data = request.json
    user_id = data.get("user_id")
    mood = data.get("mood")
    intensity = data.get("intensity", 1.0)

    if not user_id or not mood:
        return jsonify({"message": "user_id and mood are required fields"}), 400

    garden = db_session.query(Garden).filter_by(user_id=user_id).first()

    if not garden:
        # Create a new garden if one doesn't exist
        garden = Garden(user_id=user_id, overall_vibe=mood)
        db_session.add(garden)
        db_session.flush()  # Get the garden ID

    # Update overall vibe
    garden.overall_vibe = mood
    garden.last_updated = datetime.datetime.now(datetime.timezone.utc)
    garden.growth_level += 1

    # Find or create flower for this mood
    flower_type = MOOD_FLOWERS.get(mood.lower(), "dandelion")
    flower = db_session.query(GardenFlower).filter_by(
        garden_id=garden.id, mood_type=mood.lower()
    ).first()

    if not flower:
        # Create new flower
        flower = GardenFlower(
            garden_id=garden.id,
            mood_type=mood.lower(),
            flower_type=flower_type,
            position_x=random.uniform(15, 75),  # Keep away from UI elements
            position_y=random.uniform(20, 70)   # Account for stats panel at top and water level at bottom
        )
        db_session.add(flower)
    else:
        # Update existing flower growth
        growth_increase = intensity * 0.1  # Intensity affects growth rate
        flower.growth_stage = min(1.0, flower.growth_stage + growth_increase)
        flower.last_growth = datetime.datetime.now(datetime.timezone.utc)
        if flower.growth_stage >= 1.0:
            flower.bloom_count += 1

    # Update garden counters
    garden.flowers = db_session.query(GardenFlower).filter_by(garden_id=garden.id).count()

    # Check for achievements
    achievements = json.loads(garden.achievements or "[]")
    if garden.flowers >= 5 and "first_five" not in achievements:
        achievements.append("first_five")
    if any(f.growth_stage >= 1.0 for f in garden.flowers_data) and "first_bloom" not in achievements:
        achievements.append("first_bloom")
    garden.achievements = json.dumps(achievements)

    db_session.commit()
    return jsonify({
        "message": f"Mood '{mood}' logged, garden updated!",
        "growth_level": garden.growth_level,
        "flowers": garden.flowers,
        "new_flower": flower.flower_type if flower.growth_stage < 0.1 else None
    }), 200

@garden_routes.route("/<int:user_id>", methods=["GET"])
def get_garden(user_id):
    try:
        garden = db_session.query(Garden).filter_by(user_id=user_id).first()
        if not garden:
            # Create a new garden if one doesn't exist
            garden = Garden(
                user_id=user_id,
                overall_vibe="neutral",
                water_level=100,
                watering_streak=0,
                total_waterings=0,
                current_season="spring",
                achievements="[]"
            )
            db_session.add(garden)
            db_session.commit()

        # Re-query to ensure relationships are loaded
        garden = db_session.query(Garden).filter_by(user_id=user_id).first()

        flowers = []
        for flower in garden.flowers_data:
            flowers.append({
                "id": flower.id,
                "mood_type": flower.mood_type,
                "flower_type": flower.flower_type,
                "growth_stage": float(flower.growth_stage),
                "position_x": float(flower.position_x),
                "position_y": float(flower.position_y),
                "health": float(flower.health),
                "bloom_count": flower.bloom_count
            })

        # Determine current season based on month
        current_month = datetime.datetime.now().month
        if current_month in [12, 1, 2]:
            season = "winter"
        elif current_month in [3, 4, 5]:
            season = "spring"
        elif current_month in [6, 7, 8]:
            season = "summer"
        else:
            season = "autumn"

        garden.current_season = season

        response_data = {
            "user_id": garden.user_id,
            "overall_vibe": garden.overall_vibe,
            "growth_level": garden.growth_level,
            "flowers": garden.flowers,
            "water_level": garden.water_level,
            "watering_streak": garden.watering_streak,
            "current_season": garden.current_season,
            "achievements": json.loads(garden.achievements or "[]"),
            "flowers_data": flowers,
            "seasonal_theme": SEASONAL_THEMES[season],
            "last_updated": garden.last_updated.isoformat() if garden.last_updated else None
        }

        return jsonify(response_data), 200

    except Exception as e:
        import traceback
        print(f"Error in get_garden for user {user_id}: {str(e)}")
        print("Full traceback:")
        print(traceback.format_exc())
        db_session.rollback()
        return jsonify({"error": "Failed to load garden", "details": str(e), "user_id": user_id}), 500

@garden_routes.route("/water/<int:user_id>", methods=["POST"])
def water_garden(user_id):
    garden = db_session.query(Garden).filter_by(user_id=user_id).first()
    if not garden:
        return jsonify({"message": "Garden not found"}), 404

    now = datetime.datetime.now(datetime.timezone.utc)

    # Check if already watered today
    if garden.last_watered and garden.last_watered.date() == now.date():
        return jsonify({"message": "Garden already watered today!", "already_watered": True}), 200

    # Water the garden
    garden.water_level = min(100, garden.water_level + 25)
    garden.last_watered = now
    garden.total_waterings += 1

    # Update watering streak
    if garden.last_watered and (now - garden.last_watered).days == 1:
        garden.watering_streak += 1
    else:
        garden.watering_streak = 1

    # Boost flower growth when watered
    rewards = []
    for flower in garden.flowers_data:
        if flower.health < 1.0:
            flower.health = min(1.0, flower.health + 0.1)
            rewards.append(f"Health boost for {flower.flower_type}")

        if random.random() < 0.3:  # 30% chance for growth boost
            old_stage = flower.growth_stage
            flower.growth_stage = min(1.0, flower.growth_stage + 0.05)
            if flower.growth_stage >= 1.0 and old_stage < 1.0:
                rewards.append(f"{flower.flower_type} bloomed!")
                flower.bloom_count += 1

    # Check for watering achievements
    achievements = json.loads(garden.achievements or "[]")
    if garden.watering_streak >= 7 and "week_warrior" not in achievements:
        achievements.append("week_warrior")
        rewards.append("🏆 Week Warrior achievement unlocked!")
    if garden.total_waterings >= 50 and "dedicated_gardener" not in achievements:
        achievements.append("dedicated_gardener")
        rewards.append("🏆 Dedicated Gardener achievement unlocked!")

    garden.achievements = json.dumps(achievements)

    db_session.commit()

    return jsonify({
        "message": "Garden watered successfully! 🌧️",
        "water_level": garden.water_level,
        "watering_streak": garden.watering_streak,
        "rewards": rewards,
        "new_achievements": [a for a in achievements if a not in json.loads(garden.achievements or "[]")]
    }), 200

@garden_routes.route("/achievements/<int:user_id>", methods=["GET"])
def get_achievements(user_id):
    garden = db_session.query(Garden).filter_by(user_id=user_id).first()
    if not garden:
        return jsonify({"message": "Garden not found"}), 404

    achievements_data = {
        "first_five": {"name": "First Five", "description": "Grow your first 5 flowers", "icon": "🌸"},
        "first_bloom": {"name": "First Bloom", "description": "Watch your first flower bloom", "icon": "🌺"},
        "week_warrior": {"name": "Week Warrior", "description": "Water your garden for 7 consecutive days", "icon": "⚔️"},
        "dedicated_gardener": {"name": "Dedicated Gardener", "description": "Water your garden 50 times", "icon": "👩‍🌾"},
        "season_master": {"name": "Season Master", "description": "Experience all four seasons", "icon": "🌈"},
        "mood_explorer": {"name": "Mood Explorer", "description": "Grow flowers for 10 different moods", "icon": "🧭"}
    }

    unlocked = json.loads(garden.achievements or "[]")
    all_achievements = []

    for key, data in achievements_data.items():
        all_achievements.append({
            "id": key,
            "name": data["name"],
            "description": data["description"],
            "icon": data["icon"],
            "unlocked": key in unlocked
        })

    return jsonify({"achievements": all_achievements}), 200