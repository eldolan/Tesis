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
    irrigation_events = []
    base_val = 95
    
    end_date = datetime.now()
    start_date = end_date - timedelta(days=29)
    
    current_date = start_date
    while current_date <= end_date:
        dates.append(current_date.isoformat())
        
        base_val -= (random.random() * 1.5) + 0.5
        
        if current_date.weekday() in [0, 3, 6]:
             base_val = 95 + random.uniform(-2, 2)
             irrigation_events.append(current_date.isoformat())

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
        'sensor3': sensor3,
        'irrigation_events': irrigation_events
    })

@app.route('/get_fertilizer_data')
def get_fertilizer_data():
    dates = []
    nitrogen = []
    phosphorus = []
    potassium = []
    fertilization_events = []
    
    end_date = datetime.now()
    start_date = end_date - timedelta(days=29)
    
    # Valores base en una unidad hipotética, ej: ppm
    n_base, p_base, k_base = 120.0, 50.0, 100.0

    current_date = start_date
    while current_date <= end_date:
        dates.append(current_date.isoformat())
        
        # Simula el consumo de nutrientes por la planta
        n_base -= random.uniform(1, 3)
        p_base -= random.uniform(0.5, 2)
        k_base -= random.uniform(1, 2.5)
        
        # Simula un evento de fertilización cada 10 días
        if current_date.day % 10 == 1 and current_date.day != 1: # Evita el día 1 para que no siempre sea el primero
            n_base, p_base, k_base = 120.0, 50.0, 100.0 # Restablece los valores
            fertilization_events.append(current_date.isoformat())

        # Añade ruido aleatorio y asegura que no bajen de cero
        nitrogen.append(round(max(0, n_base + random.uniform(-5, 5)), 2))
        phosphorus.append(round(max(0, p_base + random.uniform(-3, 3)), 2))
        potassium.append(round(max(0, k_base + random.uniform(-5, 5)), 2))

        current_date += timedelta(days=1)
        
    return jsonify({
        'dates': dates,
        'nitrogen': nitrogen,
        'phosphorus': phosphorus,
        'potassium': potassium,
        'fertilization_events': fertilization_events
    })