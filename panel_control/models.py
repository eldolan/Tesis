from . import db
from datetime import datetime, UTC

class SensorRiego20(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    timestamp = db.Column(db.DateTime, nullable=False, default=datetime.now(UTC))
    temperatura_c = db.Column(db.Float, nullable=False)
    humedad = db.Column(db.Float, nullable=False)
    conductividad_us_cm = db.Column(db.Float, nullable=False)
    ph = db.Column(db.Float, nullable=False)
    temperatura_onboard = db.Column(db.Float, nullable=True)
    humedad_onboard = db.Column(db.Float, nullable=True)
    es_evento_riego = db.Column(db.Boolean, default=False)

class SensorRiego40(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    timestamp = db.Column(db.DateTime, nullable=False, default=datetime.now(UTC))
    temperatura_c = db.Column(db.Float, nullable=False)
    humedad = db.Column(db.Float, nullable=False)
    conductividad_us_cm = db.Column(db.Float, nullable=False)
    ph = db.Column(db.Float, nullable=False)
    temperatura_onboard = db.Column(db.Float, nullable=True)
    humedad_onboard = db.Column(db.Float, nullable=True)
    es_evento_riego = db.Column(db.Boolean, default=False)

class SensorRiego60(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    timestamp = db.Column(db.DateTime, nullable=False, default=datetime.now(UTC))
    temperatura_c = db.Column(db.Float, nullable=False)
    humedad = db.Column(db.Float, nullable=False)
    conductividad_us_cm = db.Column(db.Float, nullable=False)
    ph = db.Column(db.Float, nullable=False)
    temperatura_onboard = db.Column(db.Float, nullable=True)
    humedad_onboard = db.Column(db.Float, nullable=True)
    es_evento_riego = db.Column(db.Boolean, default=False)

class SensorFertilizante(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    timestamp = db.Column(db.DateTime, nullable=False, default=datetime.now(UTC))
    nitrogen = db.Column(db.Float, nullable=False)
    phosphorus = db.Column(db.Float, nullable=False)
    potassium = db.Column(db.Float, nullable=False)
