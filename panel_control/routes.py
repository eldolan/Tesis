from flask import render_template
from flask import current_app as app

@app.route('/')
def home():
    return render_template('index.html')

from . import db
from sqlalchemy import text

@app.route('/test-db')
def test_db_connection():
    try:
        db.session.execute(text('SELECT 1'))
        return "Conexión a la base de datos exitosa!"
    except Exception as e:
        return f"Error al conectar a la base de datos: {e}"
