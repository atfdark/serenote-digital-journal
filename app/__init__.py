from flask import Flask
from flask_cors import CORS
import os
from .database.db import init_db
from app.routes.auth_routes import auth_routes
from app.routes.garden_routes import garden_routes
from app.routes.entry_routes import entry_routes
from app.routes.view_routes import view_routes
from app.routes.dashboard_routes import dashboard_api


def create_app():
    app = Flask(__name__)
    
    # Define the absolute path for the upload folder
    upload_folder = os.path.join(app.root_path, 'static', 'uploads')
    os.makedirs(upload_folder, exist_ok=True)

    # 🔐 Secret key for sessions (JWT or cookies if needed)
    app.config["SECRET_KEY"] = "your_super_secret_key"
    # 📂 Upload folder configuration
    upload_folder = os.path.join(app.root_path, 'static', 'uploads')
    os.makedirs(upload_folder, exist_ok=True)
    app.config['UPLOAD_FOLDER'] = upload_folder

    # 📂 Initialize database
    init_db()

    # 🌍 Allow frontend JS to call backend (important if frontend runs separately)
    CORS(app)

    # 🔗 Register routes
    app.register_blueprint(auth_routes, url_prefix="/auth")
    app.register_blueprint(garden_routes, url_prefix="/garden")
    app.register_blueprint(entry_routes, url_prefix="/entries")
    app.register_blueprint(view_routes)
    app.register_blueprint(dashboard_api)

    return app
