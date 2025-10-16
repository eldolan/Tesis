from . import db
from datetime import datetime, UTC

class LecturaRiego(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    timestamp = db.Column(db.DateTime, nullable=False, default=datetime.now(UTC))
    sensor_20cm = db.Column(db.Float, nullable=False)
    sensor_40cm = db.Column(db.Float, nullable=False)
    sensor_60cm = db.Column(db.Float, nullable=False)
    temperatura_c = db.Column(db.Float, nullable=True)  # Temperatura del sensor
    conductividad_us_cm = db.Column(db.Float, nullable=True)  # Conductividad eléctrica
    ph = db.Column(db.Float, nullable=True)  # pH del suelo
    es_evento_riego = db.Column(db.Boolean, default=False)

class LecturaFertilizante(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    timestamp = db.Column(db.DateTime, nullable=False, default=datetime.now(UTC))
    nitrogen = db.Column(db.Float, nullable=False)
    phosphorus = db.Column(db.Float, nullable=False)
    potassium = db.Column(db.Float, nullable=False)
    es_evento_fertilizacion = db.Column(db.Boolean, default=False)