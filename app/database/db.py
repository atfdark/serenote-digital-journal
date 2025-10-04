import os
from sqlalchemy import create_engine
from sqlalchemy.orm import scoped_session, sessionmaker, declarative_base

# --- Start of Changes ---

# Get the absolute path of the project's root directory (serenotes1/)
# os.path.dirname(__file__) -> /app/database
# os.path.join(..., '..') -> /app
# os.path.join(..., '..') -> /
basedir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))

# Create the full, absolute path to the database file
db_path = os.path.join(basedir, 'serenote.db')
db_uri = 'sqlite:///' + db_path

# --- End of Changes ---

# Now use the absolute path URI to create the engine
from sqlalchemy.pool import StaticPool
engine = create_engine(db_uri, echo=False, poolclass=StaticPool, pool_pre_ping=True)
db_session = scoped_session(sessionmaker(autocommit=False, autoflush=False, bind=engine))

Base = declarative_base()
Base.query = db_session.query_property()

def init_db():
    import app.database.models
    Base.metadata.create_all(bind=engine)