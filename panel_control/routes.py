from flask import render_template
from flask import current_app as app
from flask import request, jsonify
from datetime import datetime, timedelta
import requests
import os
import json
from .models import LecturaRiego, LecturaFertilizante

API_KEY = os.environ.get('OPENWEATHER_API_KEY')

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