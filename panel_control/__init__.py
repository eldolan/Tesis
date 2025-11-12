import os
from flask import Flask
from flask_sqlalchemy import SQLAlchemy

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass


db = SQLAlchemy()

def create_app():
    app = Flask(__name__)

    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///adminpanel.db'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    db.init_app(app)
    
    def seed_adminpanel():
        print("Base de datos iniciada. Lista para recibir datos de sensores.")

    with app.app_context():
        from . import routes

        db.create_all()

        seed_adminpanel()
    return app

