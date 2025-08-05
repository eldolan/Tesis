from flask import render_template
from flask import current_app as app
from flask import request, jsonify
import requests

API_KEY = "llave"

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/get_weather', methods=['POST'])
def get_weather_data():
    data = request.get_json()
    
    if not data or 'city' not in data:
        return jsonify({'error': 'La ciudad es requerida.'}), 400

    city = data['city']
    url = f'http://api.openweathermap.org/data/2.5/weather?q={city}&appid={API_KEY}&units=metric&lang=es'
    
    response = requests.get(url).json()

    if response.get('cod') != 200:
        error_message = response.get('message', 'Error encontrando la ciudad.')
        return jsonify({'error': error_message}), response.get('cod', 404)

    weather_data = {
        'city': city.title(),
        'temperature': round(response['main']['temp']),
        'description': response['weather'][0]['description'].capitalize(),
        'humidity': response['main']['humidity'],
        'wind_speed': response['wind']['speed'],
        'icon': response['weather'][0]['icon']
    }

    return jsonify(weather_data)