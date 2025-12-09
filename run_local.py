import os
# Force local SQLite usage for faster local development
os.environ['FORCE_SQLITE'] = '1'
os.environ.pop('DATABASE_URL', None)

from app import create_app

app = create_app()

if __name__ == "__main__":
    app.run(debug=True, port=5000)
