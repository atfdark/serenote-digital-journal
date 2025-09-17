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
    is_capsule = Column(Boolean, default=False)
    capsule_open_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.now(datetime.timezone.utc))

    user = relationship("User", back_populates="entries")

class Garden(Base):
    __tablename__ = 'gardens'
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    last_updated = Column(DateTime, default=datetime.datetime.now(datetime.timezone.utc))
    overall_vibe = Column(String(100))
    environment = Column(Text)   # JSON string
    elements = Column(Text)      # JSON string

    user = relationship("User", back_populates="garden")
