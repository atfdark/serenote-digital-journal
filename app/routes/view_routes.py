from flask import render_template, Blueprint
from flask_login import login_required

# Create a new blueprint for page views
view_routes = Blueprint('views', __name__)

@view_routes.route('/')
def index_page():
    return render_template('index.html')

@view_routes.route('/login')
def login_page():
    return render_template('login.html')

@view_routes.route('/main')
@login_required
def main_page():
    return render_template('mainpage.html')



