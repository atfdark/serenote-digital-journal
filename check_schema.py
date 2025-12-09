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
        print("Connected to database successfully!")

        # Check if entries table exists
        result = conn.execute(text("""
            SELECT table_name FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = 'entries'
        """))
        if result.fetchone():
            print("SUCCESS: entries table exists")

            # Check columns in entries table
            result = conn.execute(text("""
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = 'entries'
                ORDER BY ordinal_position
            """))
            columns = result.fetchall()
            print("\nColumns in entries table:")
            drawing_data_exists = False
            for col in columns:
                print(f"- {col[0]}: {col[1]} ({'NULL' if col[2] == 'YES' else 'NOT NULL'})")
                if col[0] == 'drawing_data':
                    drawing_data_exists = True

            if drawing_data_exists:
                print("\nSUCCESS: drawing_data column exists")
            else:
                print("\nERROR: drawing_data column is MISSING!")

        else:
            print("ERROR: entries table does not exist")

except Exception as e:
    print(f"ERROR: Connection or query error: {e}")