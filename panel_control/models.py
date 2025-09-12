from . import db
from datetime import datetime, UTC

class LecturaRiego(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    timestamp = db.Column(db.DateTime, nullable=False, default=datetime.now(UTC))
    sensor_20cm = db.Column(db.Float, nullable=False)
    sensor_40cm = db.Column(db.Float, nullable=False)
    sensor_60cm = db.Column(db.Float, nullable=False)
    is_irrigation_event = db.Column(db.Boolean, default=False)

class LecturaFertilizante(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    timestamp = db.Column(db.DateTime, nullable=False, default=datetime.now(UTC))
    nitrogen = db.Column(db.Float, nullable=False)
    phosphorus = db.Column(db.Float, nullable=False)
    potassium = db.Column(db.Float, nullable=False)
    is_fertilization_event = db.Column(db.Boolean, default=False)