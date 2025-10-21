import os
from flask import Flask
from flask_sqlalchemy import SQLAlchemy

# Cargar variables de entorno desde archivo .env si existe
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass  # python-dotenv no está instalado, usar variables del sistema


db = SQLAlchemy()

def create_app():
    app = Flask(__name__)

    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///adminpanel.db'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    db.init_app(app)
    
    def seed_adminpanel():
        """Inicializar base de datos sin datos de ejemplo.
        
        Los datos serán proporcionados únicamente por los sensores físicos
        conectados al Arduino a través del endpoint /upload.
        """
        print("Base de datos inicializada. Lista para recibir datos de sensores.")

    with app.app_context():
        from . import routes

        db.create_all()

        seed_adminpanel()
    return app

