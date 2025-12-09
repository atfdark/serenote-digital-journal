import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

# Load environment variables from .env
load_dotenv()

# Get database URI from environment variable
db_uri = os.environ.get('DATABASE_URL')

if not db_uri:
    print("DATABASE_URL not found in .env")
    exit(1)

# Create engine
engine = create_engine(db_uri, echo=False, pool_pre_ping=True)

try:
    with engine.connect() as conn:
        # Add the drawing_data column if it doesn't exist
        try:
            conn.execute(text("ALTER TABLE entries ADD COLUMN drawing_data BYTEA"))
            conn.commit()
            print("Added drawing_data column")
        except Exception as e:
            if "already exists" in str(e).lower() or "duplicate column" in str(e).lower():
                print("Column already exists")
            else:
                print(f"Error: {e}")
except Exception as e:
    print(f"Connection error: {e}")