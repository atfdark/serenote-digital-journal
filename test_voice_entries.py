from app.database.db import db_session
from app.database.models import Entry

# Query all voice entries
voice_entries = db_session.query(Entry).filter_by(type='voice').all()

print(f"Total voice entries: {len(voice_entries)}")

for entry in voice_entries:
    print(f"ID: {entry.id}, User: {entry.user_id}, Title: {entry.title}, Created: {entry.created_at}, Has audio_data: {entry.audio_data is not None}, Audio_data size: {len(entry.audio_data) if entry.audio_data else 0}")

db_session.close()