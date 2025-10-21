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
from .models import SensorRiego20, SensorRiego40, SensorRiego60, SensorFertilizante
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
    # Consultar datos de todos los sensores físicos
    readings_20 = SensorRiego20.query.order_by(SensorRiego20.timestamp.asc()).all()
    readings_40 = SensorRiego40.query.order_by(SensorRiego40.timestamp.asc()).all()
    readings_60 = SensorRiego60.query.order_by(SensorRiego60.timestamp.asc()).all()
    
    # Crear un diccionario unificado de timestamps
    all_timestamps = set()
    for readings in [readings_20, readings_40, readings_60]:
        all_timestamps.update([r.timestamp for r in readings])
    all_timestamps = sorted(all_timestamps)
    
    # Mapear datos por timestamp
    data_20 = {r.timestamp: r for r in readings_20}
    data_40 = {r.timestamp: r for r in readings_40}
    data_60 = {r.timestamp: r for r in readings_60}
    
    irrigation_events = []
    sensor1_data = []
    sensor2_data = []
    sensor3_data = []
    
    for ts in all_timestamps:
        # Sensor 1 (20cm): usar datos reales si existen
        sensor1_data.append(data_20[ts].humedad if ts in data_20 else None)
        
        # Sensores 2 y 3 (40cm, 60cm): usar datos reales si existen, sino null
        sensor2_data.append(data_40[ts].humedad if ts in data_40 else None)
        sensor3_data.append(data_60[ts].humedad if ts in data_60 else None)
        
        # Recoger eventos de riego de cualquier sensor que tenga datos
        if ((ts in data_20 and data_20[ts].es_evento_riego) or 
            (ts in data_40 and data_40[ts].es_evento_riego) or 
            (ts in data_60 and data_60[ts].es_evento_riego)):
            irrigation_events.append(ts.isoformat())
    
    return jsonify({
        'dates': [ts.isoformat() for ts in all_timestamps],
        'sensor1': sensor1_data,  # Sensor 20cm 
        'sensor2': sensor2_data,  # Sensor 40cm
        'sensor3': sensor3_data,  # Sensor 60cm
        'irrigation_events': irrigation_events
    })

@app.route('/get_fertilizer_data')
def get_fertilizer_data():
    readings = SensorFertilizante.query.order_by(SensorFertilizante.timestamp.asc()).all()

    return jsonify({
        'dates': [r.timestamp.isoformat() for r in readings],
        'nitrogen': [r.nitrogen for r in readings],
        'phosphorus': [r.phosphorus for r in readings],
        'potassium': [r.potassium for r in readings],
        'fertilization_events': []
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
        
        if not header or len(header) != 14:  # 13 columnas de datos + 1 timestamp
            return jsonify({'error': 'Formato CSV inválido. Se esperan 14 columnas (timestamp + 13 datos).'}), 400
        
        expected_header = ['timestamp', 'Temp_20cm', 'Hum_20cm', 'Cond_20cm', 'PH_20cm', 
                          'N_20cm', 'P_20cm', 'K_20cm', 'Temp_40cm', 'Hum_40cm', 
                          'Cond_40cm', 'Temp_60cm', 'Hum_60cm', 'PH_60cm']
        
        if header != expected_header:
            return jsonify({'error': f'Encabezado CSV inválido. Se esperaba: {expected_header}'}), 400
        
        # Procesar cada fila de datos
        rows_processed = 0
        errors = []
        
        for row_num, row in enumerate(csv_reader, start=2):
            try:
                if len(row) != 14:
                    errors.append(f'Fila {row_num}: número incorrecto de columnas')
                    continue
                
                # Parsear todas las columnas del nuevo formato
                (timestamp_str, temp_20, hum_20, cond_20, ph_20, n_20, p_20, k_20,
                 temp_40, hum_40, cond_40, temp_60, hum_60, ph_60) = row
                
                timestamp = datetime.strptime(timestamp_str, '%Y-%m-%d %H:%M:%S')
                
                # Convertir valores numéricos para sensor 20cm
                temp_20 = float(temp_20) if temp_20 not in ['', '-999', '-999.0'] else None
                hum_20 = float(hum_20) if hum_20 not in ['', '-999', '-999.0'] else None
                cond_20 = float(cond_20) if cond_20 not in ['', '-999', '-999.0'] else None
                ph_20 = float(ph_20) if ph_20 not in ['', '-999', '-999.0'] else None
                n_20 = float(n_20) if n_20 not in ['', '-999', '-999.0'] else 0.0
                p_20 = float(p_20) if p_20 not in ['', '-999', '-999.0'] else 0.0
                k_20 = float(k_20) if k_20 not in ['', '-999', '-999.0'] else 0.0
                
                # Convertir valores numéricos para sensor 40cm
                temp_40 = float(temp_40) if temp_40 not in ['', '-999', '-999.0'] else None
                hum_40 = float(hum_40) if hum_40 not in ['', '-999', '-999.0'] else None
                cond_40 = float(cond_40) if cond_40 not in ['', '-999', '-999.0'] else None
                
                # Convertir valores numéricos para sensor 60cm
                temp_60 = float(temp_60) if temp_60 not in ['', '-999', '-999.0'] else None
                hum_60 = float(hum_60) if hum_60 not in ['', '-999', '-999.0'] else None
                ph_60 = float(ph_60) if ph_60 not in ['', '-999', '-999.0'] else None
                
                # Crear registro para sensor de 20cm (datos reales)
                if all(v is not None for v in [temp_20, hum_20, cond_20, ph_20]):
                    sensor_20cm = SensorRiego20(
                        timestamp=timestamp,
                        temperatura_c=round(temp_20, 2),
                        humedad=round(max(hum_20, 0), 2),
                        conductividad_us_cm=round(cond_20, 2),
                        ph=round(ph_20, 2),
                        es_evento_riego=False
                    )
                    existing_20 = SensorRiego20.query.filter_by(timestamp=timestamp).first()
                    if not existing_20:
                        db.session.add(sensor_20cm)
                
                # Crear registro para sensor de 40cm (datos reales)
                if all(v is not None for v in [temp_40, hum_40, cond_40]):
                    sensor_40cm = SensorRiego40(
                        timestamp=timestamp,
                        temperatura_c=round(temp_40, 2),
                        humedad=round(max(hum_40, 0), 2),
                        conductividad_us_cm=round(cond_40, 2),
                        ph=round(ph_20, 2),  # pH del sensor de 20cm (no tiene pH propio)
                        es_evento_riego=False
                    )
                    existing_40 = SensorRiego40.query.filter_by(timestamp=timestamp).first()
                    if not existing_40:
                        db.session.add(sensor_40cm)
                
                # Crear registro para sensor de 60cm (datos reales)
                if all(v is not None for v in [temp_60, hum_60, ph_60]):
                    sensor_60cm = SensorRiego60(
                        timestamp=timestamp,
                        temperatura_c=round(temp_60, 2),
                        humedad=round(max(hum_60, 0), 2),
                        conductividad_us_cm=round(cond_20, 2),  # No tiene EC propio, usar del 20cm
                        ph=round(ph_60, 2),
                        es_evento_riego=False
                    )
                    existing_60 = SensorRiego60.query.filter_by(timestamp=timestamp).first()
                    if not existing_60:
                        db.session.add(sensor_60cm)
                
                # Crear registro de fertilizante (NPK del sensor de 20cm)
                sensor_fertilizante = SensorFertilizante(
                    timestamp=timestamp,
                    nitrogen=round(n_20, 2),
                    phosphorus=round(p_20, 2),
                    potassium=round(k_20, 2)
                )
                existing_fert = SensorFertilizante.query.filter_by(timestamp=timestamp).first()
                if not existing_fert:
                    db.session.add(sensor_fertilizante)
                
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
