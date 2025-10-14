import os
from sqlalchemy import create_engine, text

# Set your Supabase DATABASE_URL here (replace with actual URL)
DATABASE_URL = "postgresql://postgres:Aloknan123@@db.ewocpzbnooftvvmenwsv.supabase.co:5432/postgres"

engine = create_engine(DATABASE_URL, echo=True)

try:
    with engine.connect() as conn:
        # Test connection
        result = conn.execute(text("SELECT version();"))
        print("Connected to Supabase!")
        print("PostgreSQL version:", result.fetchone()[0])

        # List tables
        result = conn.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';"))
        tables = result.fetchall()
        print("\nTables in database:")
        for table in tables:
            print(f"- {table[0]}")

        # Example: Query users table (if exists)
        try:
            result = conn.execute(text("SELECT id, username FROM users LIMIT 5;"))
            users = result.fetchall()
            print("\nSample users:")
            for user in users:
                print(f"ID: {user[0]}, Username: {user[1]}")
        except Exception as e:
            print(f"Users table may not exist yet: {e}")

except Exception as e:
    print(f"Connection failed: {e}")
    print("Make sure DATABASE_URL is correct and you have network access.")