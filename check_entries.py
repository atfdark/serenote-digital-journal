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

        # Check entries for user 7 specifically
        result = conn.execute(text("""
            SELECT id, user_id, type, title,
                   CASE WHEN drawing_data IS NOT NULL THEN octet_length(drawing_data) ELSE 0 END as drawing_size,
                   CASE WHEN audio_data IS NOT NULL THEN octet_length(audio_data) ELSE 0 END as audio_size
            FROM entries
            WHERE user_id = 7
            ORDER BY created_at DESC
        """))
        user_entries = result.fetchall()

        print(f"\nFound {len(user_entries)} entries for user 7:")
        for entry in user_entries:
            print(f"ID: {entry[0]}, User: {entry[1]}, Type: {entry[2]}, Title: {entry[3]}")
            print(f"  Drawing size: {entry[4]} bytes, Audio size: {entry[5]} bytes")
            if entry[4] > 0:
                print("  HAS DRAWING DATA")
            if entry[5] > 0:
                print("  HAS AUDIO DATA")

        # Check recent entries overall
        result = conn.execute(text("""
            SELECT id, user_id, type, title,
                   CASE WHEN drawing_data IS NOT NULL THEN octet_length(drawing_data) ELSE 0 END as drawing_size,
                   CASE WHEN audio_data IS NOT NULL THEN octet_length(audio_data) ELSE 0 END as audio_size
            FROM entries
            ORDER BY created_at DESC
            LIMIT 10
        """))
        entries = result.fetchall()

        print(f"\nRecent entries overall:")
        for entry in entries:
            print(f"ID: {entry[0]}, User: {entry[1]}, Type: {entry[2]}, Title: {entry[3]}")
            print(f"  Drawing size: {entry[4]} bytes, Audio size: {entry[5]} bytes")
        # Check for any entries that might have issues
        result = conn.execute(text("""
            SELECT COUNT(*) as total_entries,
                   COUNT(CASE WHEN drawing_data IS NOT NULL THEN 1 END) as with_drawing,
                   COUNT(CASE WHEN audio_data IS NOT NULL THEN 1 END) as with_audio,
                   MAX(CASE WHEN drawing_data IS NOT NULL THEN octet_length(drawing_data) ELSE 0 END) as max_drawing_size,
                   MAX(CASE WHEN audio_data IS NOT NULL THEN octet_length(audio_data) ELSE 0 END) as max_audio_size
            FROM entries
        """))
        stats = result.fetchone()
        print("\nOverall stats:")
        print(f"Total entries: {stats[0]}")
        print(f"With drawing data: {stats[1]}")
        print(f"With audio data: {stats[2]}")
        print(f"Max drawing size: {stats[3]} bytes")
        print(f"Max audio size: {stats[4]} bytes")

except Exception as e:
    print(f"ERROR: {e}")