from flask import Flask
from app.routes.auth_routes import auth_routes

from database.db import init_db

app = Flask(__name__)
init_db()

# Register Blueprints
app.register_blueprint(auth_routes)

if __name__ == "__main__":
    app.run(debug=True, port=5000)
