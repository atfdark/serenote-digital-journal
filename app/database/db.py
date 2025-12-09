import os
import re
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import scoped_session, sessionmaker, declarative_base

# Load environment variables from .env
load_dotenv()

# Allow forcing local SQLite for development (useful to avoid remote DB timeouts)
if os.environ.get('FORCE_SQLITE'):
    db_uri = 'sqlite:////tmp/serenote.db'
else:
    # Get database URI from environment variable or use SQLite as fallback
    db_uri = os.environ.get('DATABASE_URL', 'sqlite:////tmp/serenote.db')

# If DATABASE_URL is set but connection fails, fall back to SQLite
try:
    # Try to create engine with the URI
    if db_uri.startswith('sqlite'):
        from sqlalchemy.pool import StaticPool
        engine = create_engine(db_uri, echo=False, poolclass=StaticPool, pool_pre_ping=True)
    else:
        engine = create_engine(db_uri, echo=False, pool_pre_ping=True)
    # Test the connection
    with engine.connect() as conn:
        pass
except Exception:
    print("Failed to connect to database, falling back to SQLite")
    db_uri = 'sqlite:////tmp/serenote.db'
    from sqlalchemy.pool import StaticPool
    engine = create_engine(db_uri, echo=False, poolclass=StaticPool, pool_pre_ping=True)

# Create engine based on database type
if db_uri.startswith('sqlite'):
    from sqlalchemy.pool import StaticPool
    engine = create_engine(db_uri, echo=False, poolclass=StaticPool, pool_pre_ping=True)
else:
    # For PostgreSQL and other databases
    engine = create_engine(db_uri, echo=False, pool_pre_ping=True)

db_session = scoped_session(sessionmaker(autocommit=False, autoflush=False, bind=engine))

Base = declarative_base()
Base.query = db_session.query_property()

def init_db():
    import app.database.models
    Base.metadata.create_all(bind=engine)