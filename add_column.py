import sqlite3

# Connect to the database
conn = sqlite3.connect('serenote.db')  # In project root
cursor = conn.cursor()

# Add the audio_data column if it doesn't exist
try:
    cursor.execute("ALTER TABLE entries ADD COLUMN audio_data BLOB")
    print("Added audio_data column")
except sqlite3.OperationalError as e:
    if "duplicate column name" in str(e):
        print("Column already exists")
    else:
        print(f"Error: {e}")

conn.commit()
conn.close()