from flask import render_template
from flask import current_app as app
from flask import request, jsonify
from datetime import datetime, timedelta
import requests
import os
import json
import csv
from io import StringIO
import hashlib
import hmac
from functools import wraps
from collections import defaultdict
import time
from .models import LecturaRiego, LecturaFertilizante
from . import db

API_KEY = os.environ.get('OPENWEATHER_API_KEY')
SENSOR_API_KEY = os.environ.get('SENSOR_API_KEY', 'default-sensor-key-change-me')
MAX_FILE_SIZE = 1024 * 1024  # 1MB

# Rate limiting storage (in production, use Redis or database)
rate_limit_storage = defaultdict(list)

def check_rate_limit(ip_address, max_requests=10, time_window=60):
    """Check if IP has exceeded rate limit"""
    current_time = time.time()
    requests_in_window = rate_limit_storage[ip_address]
    
    # Clean old requests outside time window
    rate_limit_storage[ip_address] = [req_time for req_time in requests_in_window 
                                      if current_time - req_time < time_window]
    
    # Check if limit exceeded
    if len(rate_limit_storage[ip_address]) >= max_requests:
        return False
    
    # Add current request
    rate_limit_storage[ip_address].append(current_time)
    return True

def validate_api_key(provided_key):
    """Validate API key using secure comparison"""
    if not provided_key or not SENSOR_API_KEY:
        return False
    return hmac.compare_digest(provided_key, SENSOR_API_KEY)

def require_api_key(f):
    """Decorator to require API key authentication"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        api_key = request.headers.get('X-API-Key') or request.form.get('api_key')
        
        if not validate_api_key(api_key):
            app.logger.warning(f"Unauthorized upload attempt from {request.remote_addr}")
            return jsonify({'error': 'API key requerida o inválida'}), 401
        
        return f(*args, **kwargs)
    return decorated_function

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/get_chilean_cities')
def get_chilean_cities():
    chilean_cities = []
    try:
        with open('city.list.json', 'r', encoding='utf-8') as f:
            all_cities = json.load(f)
            for city in all_cities:
                if city.get('country') == 'CL':
                    chilean_cities.append({
                        'id': city['id'],
                        'name': city['name']
                    })
        chilean_cities.sort(key=lambda x: x['name'])
        return jsonify(chilean_cities)
    except FileNotFoundError:
        return jsonify({"error": "El archivo de ciudades (city.list.json) no se encontró en el servidor."}), 404
    except Exception as e:
        return jsonify({"error": f"Ocurrió un error procesando la lista de ciudades: {str(e)}"}), 500

@app.route('/get_weather', methods=['POST'])
def get_weather_data():
    data = request.get_json()
    
    if not data or 'city_id' not in data:
        return jsonify({'error': 'La ciudad es requerida.'}), 400

    city_id = data['city_id']
    url = f'http://api.openweathermap.org/data/2.5/weather?id={city_id}&appid={API_KEY}&units=metric&lang=es'
    
    response = requests.get(url).json()

    if response.get('cod') != 200:
        error_message = response.get('message', 'Error encontrando la ciudad.')
        return jsonify({'error': error_message}), response.get('cod', 404)

    weather_data = {
        'city': response['name'],
        'temperature': round(response['main']['temp']),
        'description': response['weather'][0]['description'],
        'humidity': response['main']['humidity'],
        'wind_speed': response['wind']['speed'],
        'icon': response['weather'][0]['icon']
    }

    return jsonify(weather_data)

@app.route('/get_irrigation_data')
def get_irrigation_data():
    readings = LecturaRiego.query.order_by(LecturaRiego.timestamp.asc()).all()
    
    return jsonify({
        'dates': [r.timestamp.isoformat() for r in readings],
        'sensor1': [r.sensor_20cm for r in readings],
        'sensor2': [r.sensor_40cm for r in readings],
        'sensor3': [r.sensor_60cm for r in readings],
        'irrigation_events': [r.timestamp.isoformat() for r in readings if r.es_evento_riego]
    })

@app.route('/get_fertilizer_data')
def get_fertilizer_data():
    readings = LecturaFertilizante.query.order_by(LecturaFertilizante.timestamp.asc()).all()

    return jsonify({
        'dates': [r.timestamp.isoformat() for r in readings],
        'nitrogen': [r.nitrogen for r in readings],
        'phosphorus': [r.phosphorus for r in readings],
        'potassium': [r.potassium for r in readings],
        'fertilization_events': [r.timestamp.isoformat() for r in readings if r.es_evento_fertilizacion]
    })

@app.route('/upload', methods=['POST'])
@require_api_key
def upload_sensor_data():
    """Endpoint para recibir datos CSV de sensores desde laptop externa"""
    
    # Rate limiting check
    client_ip = request.remote_addr
    if not check_rate_limit(client_ip):
        app.logger.warning(f"Rate limit exceeded for IP {client_ip}")
        return jsonify({'error': 'Demasiadas peticiones. Inténtalo más tarde.'}), 429
    
    if 'file' not in request.files:
        app.logger.warning(f"Upload attempt without file from {client_ip}")
        return jsonify({'error': 'No se encontró archivo en la petición'}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({'error': 'No se seleccionó ningún archivo'}), 400
    
    if not file.filename.lower().endswith('.csv'):
        return jsonify({'error': 'El archivo debe ser de tipo CSV'}), 400
    
    # Check file size
    file.seek(0, os.SEEK_END)
    file_size = file.tell()
    file.seek(0)  # Reset file pointer
    
    if file_size > MAX_FILE_SIZE:
        app.logger.warning(f"File too large ({file_size} bytes) from {client_ip}")
        return jsonify({'error': f'Archivo demasiado grande. Máximo permitido: {MAX_FILE_SIZE // 1024}KB'}), 400
    
    if file_size == 0:
        return jsonify({'error': 'El archivo está vacío'}), 400
    
    try:
        # Leer el contenido del archivo CSV
        stream = StringIO(file.stream.read().decode("UTF-8"), newline=None)
        csv_reader = csv.reader(stream)
        
        # Leer el encabezado
        header = next(csv_reader, None)
        
        if not header or len(header) != 8:
            return jsonify({'error': 'Formato CSV inválido. Se esperan 8 columnas.'}), 400
        
        expected_header = ['timestamp', 'temperatura_c', 'humedad_rh', 'conductividad_us_cm', 
                          'ph', 'nitrogeno_mg_kg', 'fosforo_mg_kg', 'potasio_mg_kg']
        
        if header != expected_header:
            return jsonify({'error': f'Encabezado CSV inválido. Se esperaba: {expected_header}'}), 400
        
        # Procesar cada fila de datos
        rows_processed = 0
        errors = []
        
        for row_num, row in enumerate(csv_reader, start=2):
            try:
                if len(row) != 8:
                    errors.append(f'Fila {row_num}: número incorrecto de columnas')
                    continue
                
                # Parsear timestamp
                timestamp_str, temp, humid, conduct, ph_val, nitrogen, phosphorus, potassium = row
                timestamp = datetime.strptime(timestamp_str, '%Y-%m-%d %H:%M:%S')
                
                # Convertir valores numéricos
                temp = float(temp)
                humid = float(humid)
                conduct = float(conduct)
                ph_val = float(ph_val)
                nitrogen = float(nitrogen)
                phosphorus = float(phosphorus)
                potassium = float(potassium)
                
                # Crear lectura de riego usando humedad real del sensor
                # La humedad del suelo se simula en 3 profundidades basada en la humedad real
                base_humidity = max(humid, 0.1)  # Evitar valores extremadamente bajos
                
                # Simulación realista de sensores a diferentes profundidades
                # Superficie (20cm): más variable, puede ser más seca
                # Profundidad media (40cm): valor base del sensor
                # Profundidad mayor (60cm): más estable, ligeramente más húmeda
                sensor_20cm = base_humidity * 0.85  # Superficie más seca
                sensor_40cm = base_humidity * 1.0   # Valor del sensor real
                sensor_60cm = base_humidity * 1.15  # Profundidad más húmeda
                
                lectura_riego = LecturaRiego(
                    timestamp=timestamp,
                    sensor_20cm=round(max(sensor_20cm, 0), 2),
                    sensor_40cm=round(max(sensor_40cm, 0), 2), 
                    sensor_60cm=round(max(sensor_60cm, 0), 2),
                    es_evento_riego=False  # Los eventos de riego se marcan manualmente
                )
                
                # Crear lectura de fertilizante (NPK puede ser 0, es normal)
                lectura_fertilizante = LecturaFertilizante(
                    timestamp=timestamp,
                    nitrogen=round(max(nitrogen, 0), 2),
                    phosphorus=round(max(phosphorus, 0), 2),
                    potassium=round(max(potassium, 0), 2),
                    es_evento_fertilizacion=False  # Los eventos se marcan manualmente
                )
                
                # Verificar si ya existe una lectura con el mismo timestamp
                existing_riego = LecturaRiego.query.filter_by(timestamp=timestamp).first()
                existing_fertilizante = LecturaFertilizante.query.filter_by(timestamp=timestamp).first()
                
                if not existing_riego:
                    db.session.add(lectura_riego)
                if not existing_fertilizante:
                    db.session.add(lectura_fertilizante)
                
                rows_processed += 1
                
            except ValueError as e:
                errors.append(f'Fila {row_num}: error de conversión de datos - {str(e)}')
            except Exception as e:
                errors.append(f'Fila {row_num}: error inesperado - {str(e)}')
        
        # Guardar cambios en la base de datos
        db.session.commit()
        
        response_data = {
            'message': f'Archivo procesado exitosamente. {rows_processed} filas agregadas.',
            'rows_processed': rows_processed
        }
        
        if errors:
            response_data['warnings'] = errors[:10]  # Limitar a 10 errores
            response_data['total_errors'] = len(errors)
        
        app.logger.info(f"Successful data upload from {client_ip}: {rows_processed} rows processed")
        return jsonify(response_data), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Error al procesar archivo CSV: {str(e)}'}), 500
