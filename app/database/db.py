# app/database/db.py
from sqlalchemy import create_engine
from sqlalchemy.orm import scoped_session, sessionmaker, declarative_base

engine = create_engine("sqlite:///serenote.db", echo=True)
db_session = scoped_session(sessionmaker(autocommit=False, autoflush=False,bind=engine))

Base = declarative_base()
Base.query = db_session.query_property()

def init_db():
    import app.database.models  # ensure models are loaded
    Base.metadata.create_all(bind=engine)
