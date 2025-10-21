import os
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, timedelta
import random

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

        from .models import SensorRiego20, SensorRiego40, SensorRiego60, SensorFertilizante

        if SensorRiego20.query.first() is not None:
            print("La base de datos ya tiene datos.")
            return
    
        print("Creando datos de ejemplo en la base de datos...")

        valor_base = 95.0

        for i in range(30):
            date = datetime.now() - timedelta(days=29 - i)
            evento_riego = (i % 4 == 0)

            if evento_riego:
                valor_base = 95.0 + random.uniform(-2, 2)
            else:
                valor_base -= (random.random() * 1.5) + 0.5

            # Crear datos de ejemplo para sensor de 20cm
            sensor_20cm = SensorRiego20(
                timestamp=date,
                temperatura_c=round(20.0 + random.uniform(-3, 8), 2),
                humedad=round(max(0, valor_base), 2),
                conductividad_us_cm=round(800 + random.uniform(-100, 200), 2),
                ph=round(6.5 + random.uniform(-0.5, 1.0), 2),
                es_evento_riego=evento_riego
            )
            
            db.session.add(sensor_20cm)
            
            # NOTA: Las tablas SensorRiego40 y SensorRiego60 están listas para 
            # futuros sensores físicos. No se crean datos de ejemplo para ellas.

        # Datos de fertilizante
        n, p, k = 120.0, 50.0, 100.0
        
        for i in range(60):
            date = datetime.now() - timedelta(days=59 - i)

            if i > 0:  # Degradación gradual después del primer día
                n -= 0.1
                p -= 0.05
                k -= 0.1

            sensor_fert = SensorFertilizante(
                timestamp=date,
                nitrogen=round(max(0, n + random.uniform(-1, 1)), 2),
                phosphorus=round(max(0, p + random.uniform(-0.5, 0.5)), 2),
                potassium=round(max(0, k + random.uniform(-1, 1)), 2)
            )
            db.session.add(sensor_fert)

        db.session.commit()
        print("Datos de ejemplo llenados exitosamente.")

    with app.app_context():
        from . import routes

        db.create_all()

        seed_adminpanel()
    return app

