from flask import Flask
from flask_cors import CORS
from app.database.db import init_db
from app.routes.auth_routes import auth_routes
from app.routes.garden_routes import garden_routes
from app.routes.entry_routes import entry_routes

def create_app():
    app = Flask(__name__)

    # 🔐 Secret key for sessions (JWT or cookies if needed)
    app.config["SECRET_KEY"] = "your_super_secret_key"

    # 📂 Initialize database
    init_db()

    # 🌍 Allow frontend JS to call backend (important if frontend runs separately)
    CORS(app)

    # 🔗 Register routes
    app.register_blueprint(auth_routes, url_prefix="/auth")
    app.register_blueprint(garden_routes, url_prefix="/garden")
    app.register_blueprint(entry_routes, url_prefix="/entries")

    return app
