import os
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, timedelta
import random

db = SQLAlchemy()

def create_app():
    app = Flask(__name__)

    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///adminpanel.db'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    db.init_app(app)

    with app.app_context():
        from . import routes
        from .models import LecturaRiego, LecturaFertilizante

        db.create_all()
        seed_adminpanel()

    return app

def seed_adminpanel():
    if LecturaRiego.query.first() is not None:
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

        leyendo_riego = LecturaRiego(
            timestamp=date,
            sensor_20cm=round(max(0, valor_base), 2),
            sensor_40cm=round(max(0, valor_base - 2), 2),
            sensor_60cm=round(max(0, valor_base - 5), 2),
            es_evento_riego = evento_riego
        )
        db.session.add(leyendo_riego)

        fecha_fertilizacion = datetime.now() - timedelta(days=59)
        n, p, k = 120.0, 50.0, 100.0
        
        for i in range(60):
            date = datetime.now() - timedelta(days=59 - i)
            evento_fertilizacion = (i == 0)

            if not evento_fertilizacion:
                n -= 0.1
                p -= 0.05
                k -= 0.1

                reading = LecturaFertilizante(
                    timestamp=date,
                    nitrogen=round(max(0, n + random.uniform(-1, 1)), 2),
                    phosphorus=round(max(0, p + random.uniform(-0.5, 0.5)), 2),
                    potassium=round(max(0, k + random.uniform(-1, 1)), 2),
                    es_evento_fertilizacion = evento_fertilizacion
                )
                db.session.add(reading)
        db.session.commit()
        print("Datos de ejemplo llenados exitosamente.")