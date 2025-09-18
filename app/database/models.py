from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from .db import Base
import datetime

class User(Base):
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
    is_capsule = Column(Boolean, default=False)
    capsule_open_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.now(datetime.timezone.utc))


    user = relationship("User", back_populates="entries")

class Garden(Base):
    __tablename__ = "gardens"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    last_updated = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc))
    overall_vibe = Column(String(100))

    # Garden progression data
    growth_level = Column(Integer, default=0)   # how many “stages” filled
    flowers = Column(Integer, default=0)        # how many flowers bloomed
    trees = Column(Integer, default=0)          # optional future growth

    user = relationship("User", back_populates="garden")
