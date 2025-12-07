import sqlite3

# Connect to the database
conn = sqlite3.connect('serenote.db')  # In project root
cursor = conn.cursor()

# Drop the drawing_data column
try:
    cursor.execute("ALTER TABLE entries DROP COLUMN drawing_data")
    print("Dropped drawing_data column")
except sqlite3.OperationalError as e:
    if "no such column" in str(e):
        print("Column does not exist")
    else:
        print(f"Error: {e}")

conn.commit()
conn.close()