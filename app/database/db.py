import os
from sqlalchemy import create_engine
from sqlalchemy.orm import scoped_session, sessionmaker, declarative_base

# Use DATABASE_URL from environment, fallback to SQLite for local development
db_uri = os.environ.get('DATABASE_URL', 'sqlite:///serenote.db')

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