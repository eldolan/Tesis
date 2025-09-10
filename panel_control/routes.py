from flask import render_template
from flask import current_app as app
from flask import request, jsonify
from datetime import datetime, timedelta
import requests
import os
import json
import random

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
    dates = []
    sensor1 = []
    sensor2 = []
    sensor3 = []
    base_val = 95
    
    end_date = datetime.now()
    start_date = end_date - timedelta(days=29)
    
    current_date = start_date
    while current_date <= end_date:
        # Formato de fecha ISO 8601, que JavaScript entiende perfectamente
        dates.append(current_date.isoformat())
        
        # Simulamos el consumo de agua y un riego cada 3 días
        base_val -= (random.random() * 1.5) + 0.5
        if current_date.weekday() in [0, 3, 6]: # Riego Lunes, Jueves, Domingo
             base_val = 95 + random.uniform(-2, 2)
        
        # Añadimos pequeñas variaciones a cada sensor y nos aseguramos que no pasen de 100
        s1 = round(min(100, max(0, base_val + random.uniform(-1, 1))), 2)
        s2 = round(min(100, max(0, base_val - 2 + random.uniform(-1.5, 1.5))), 2)
        s3 = round(min(100, max(0, base_val - 5 + random.uniform(-2, 2))), 2)
        
        sensor1.append(s1)
        sensor2.append(s2)
        sensor3.append(s3)
        
        current_date += timedelta(days=1)
            
    return jsonify({
        'dates': dates,
        'sensor1': sensor1,
        'sensor2': sensor2,
        'sensor3': sensor3
    })