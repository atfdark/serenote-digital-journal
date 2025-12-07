from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean, Float, LargeBinary
from sqlalchemy.orm import relationship
from .db import Base
import datetime
from datetime import timezone, timedelta
from flask_login import UserMixin

# IST timezone (UTC+5:30)
IST = timezone(timedelta(hours=5, minutes=30))

class User(Base, UserMixin):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True)
    username = Column(String(100), unique=True, nullable=False)
    password = Column(String(200), nullable=False)  # hashed

    entries = relationship("Entry", back_populates="user")
    garden = relationship("Garden", uselist=False, back_populates="user")

class Entry(Base):
    __tablename__ = 'entries'
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    title = Column(String(200))
    content = Column(Text)
    type = Column(String(50))   # text or voice
    mood = Column(String(50))
    audio_path = Column(String(300), nullable=True)
    audio_data = Column(LargeBinary, nullable=True)
    is_capsule = Column(Boolean, default=False)
    capsule_open_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(IST))


    user = relationship("User", back_populates="entries")

class Garden(Base):
    __tablename__ = "gardens"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    last_updated = Column(DateTime, default=lambda: datetime.datetime.now(IST))
    overall_vibe = Column(String(100))

    # Garden progression data
    growth_level = Column(Integer, default=0)   # how many "stages" filled
    flowers = Column(Integer, default=0)        # how many flowers bloomed
    trees = Column(Integer, default=0)          # optional future growth

    # Watering and gamification
    water_level = Column(Integer, default=100)  # current water level (0-100)
    last_watered = Column(DateTime, nullable=True)
    watering_streak = Column(Integer, default=0)  # consecutive days watered
    total_waterings = Column(Integer, default=0)

    # Seasonal theme
    current_season = Column(String(20), default="spring")  # spring, summer, autumn, winter

    # Achievements
    achievements = Column(Text, default="[]")  # JSON array of unlocked achievements

    user = relationship("User", back_populates="garden")
    flowers_data = relationship("GardenFlower", back_populates="garden", cascade="all, delete-orphan")

class GardenFlower(Base):
    __tablename__ = "garden_flowers"

    id = Column(Integer, primary_key=True)
    garden_id = Column(Integer, ForeignKey("gardens.id"))
    mood_type = Column(String(50))  # happy, sad, angry, etc.
    flower_type = Column(String(50))  # sunflower, lily, rose, etc.
    growth_stage = Column(Float, default=0.0)  # 0.0 (seed) to 1.0 (fully grown)
    position_x = Column(Float, default=0.0)  # percentage position in garden
    position_y = Column(Float, default=0.0)
    health = Column(Float, default=1.0)  # 0.0 to 1.0
    planted_date = Column(DateTime, default=lambda: datetime.datetime.now(IST))
    last_growth = Column(DateTime, default=lambda: datetime.datetime.now(IST))
    bloom_count = Column(Integer, default=0)  # how many times it has bloomed

    garden = relationship("Garden", back_populates="flowers_data")

class Todo(Base):
    __tablename__ = "todos"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    title = Column(String(200), nullable=False)
    description = Column(Text)
    completed = Column(Boolean, default=False)
    priority = Column(String(20), default="medium")  # low, medium, high
    category = Column(String(50), default="general")  # work, personal, health, etc.
    due_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(IST))
    updated_at = Column(DateTime, default=lambda: datetime.datetime.now(IST), onupdate=lambda: datetime.datetime.now(IST))

    user = relationship("User")
