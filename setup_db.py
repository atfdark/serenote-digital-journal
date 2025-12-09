#!/usr/bin/env python3
"""
Script to set up Supabase database connection and create tables.
"""
import os
import getpass

# Load environment variables from .env
from dotenv import load_dotenv
load_dotenv()

# Set the DATABASE_URL environment variable (use .env or fallback)
database_url = os.getenv('DATABASE_URL')
if not database_url:
    database_url = f"postgresql://postgres.wygcosfhwqxvznuytgew:Alok1234Alok@aws-1-us-east-2.pooler.supabase.com:6543/postgres"
os.environ['DATABASE_URL'] = database_url

print("Setting DATABASE_URL...")
print(f"DATABASE_URL: {database_url}")

print("\nInitializing database and creating tables...")
try:
    # Import the db module directly from its file to avoid importing the top-level
    # `app` package (which registers routes and may require Supabase client setup).
    import importlib.util
    import sys
    from pathlib import Path

    db_path = Path(__file__).parent / 'app' / 'database' / 'db.py'
    spec = importlib.util.spec_from_file_location("app_database_db", str(db_path))
    db_mod = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = db_mod
    spec.loader.exec_module(db_mod)

    init_db = getattr(db_mod, 'init_db')
    engine = getattr(db_mod, 'engine')

    init_db()
    print("Database initialized successfully!")
    print("All tables should now be created")

    # Test the connection
    from sqlalchemy import text
    with engine.connect() as conn:
        if engine.url.drivername == 'sqlite':
            result = conn.execute(text("SELECT name FROM sqlite_master WHERE type='table'"))
        else:
            result = conn.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"))
        tables = [row[0] for row in result]
        print(f"\nTables in database: {tables}")

except Exception as e:
    print(f"Error initializing database: {e}")
    print("Make sure your database connection is correct and the database is accessible.")