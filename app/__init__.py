from flask import Flask
from flask_cors import CORS
import os
from .database.db import init_db, db_session
from app.routes.auth_routes import auth_routes
from app.routes.garden_routes import garden_routes
from app.routes.entry_routes import entry_routes
from app.routes.view_routes import view_routes
from app.routes.dashboard_routes import dashboard_api
from app.routes.todo_routes import todo_routes


def create_app():
    app = Flask(__name__)

    # Check if running on Vercel (serverless) or locally
    if os.environ.get('VERCEL'):
        # For Vercel deployment, use /tmp for uploads
        upload_folder = os.path.join('/tmp', 'uploads')
    else:
        # For local development, use app/static/uploads
        upload_folder = os.path.join(os.path.dirname(__file__), 'static', 'uploads')

    os.makedirs(upload_folder, exist_ok=True)

    # 🔐 Secret key for sessions (JWT or cookies if needed)
    app.config["SECRET_KEY"] = "your_super_secret_key"
    # 📂 Upload folder configuration
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
    app.register_blueprint(todo_routes, url_prefix="/todos")

    @app.teardown_appcontext
    def shutdown_session(exception=None):
        db_session.remove()

    return app
