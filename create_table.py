# create_tables.py
from app.database.db import init_db

print("Creating database tables...")
init_db()
print("Tables created successfully.")

