from app.database.db import db_session
from app.database.models import User

# Check user details
user = db_session.query(User).filter_by(id=7).first()
if user:
    print(f"User ID: {user.id}, Username: {user.username}")
else:
    print("User not found")

db_session.close()