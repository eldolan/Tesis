const navbar = document.getElementById('navbar');

function abrirSidebar() {
    navbar.classList.add('show');
}

function cerrarSidebar() {
    navbar.classList.remove('show');
}

async function getWeatherAPIresults(city, originalFormHTML) {
    try {
        const response = await fetch('/get_weather', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ city: city })
        });

        if (!response.ok) {
            throw new Error('La ciudad no fue encontrada o hubo un error en el servidor.');
        }

        const weatherData = await response.json();
        
        localStorage.setItem("ciudad_usuario", weatherData.city);

        const resultsHTML = `
            <div class="weather-results">
                 <h1 class="weather-title">Clima en ${weatherData.city}</h1>
                 <img src="https://openweathermap.org/img/wn/${weatherData.icon}@2x.png" alt="icono del clima">
                 <h3 class="weather-description">${weatherData.description}</h3>
                 <h2 class="weather-temp">${weatherData.temperature}°C</h2>
                 <p>Humedad: ${weatherData.humidity}%</p>
                 <p>Velocidad del viento: ${weatherData.wind_speed} m/s</p>
                 <button id="search-again-btn">Buscar de Nuevo</button>
            </div>`;
        weatherContainer.innerHTML = resultsHTML;

    } catch (error) {
        console.error('Error al obtener el clima:', error);
        alert(error.message);
        weatherContainer.innerHTML = originalFormHTML;
    }
}

document.addEventListener('DOMContentLoaded', () => {

    const weatherContainer = document.getElementById('weather-container');
    const originalFormHTML = weatherContainer.innerHTML;

    // Verificar si hay una ciudad guardada al cargar la página
    const ciudadGuardada = localStorage.getItem("ciudad_usuario");

    if (ciudadGuardada) {
        getWeatherAPIresults(ciudadGuardada, originalFormHTML);
    }
    
    weatherContainer.addEventListener('submit', async (event) => {
        if (event.target.id === 'weather-form') {
            event.preventDefault();

            const form = event.target;
            const cityInput = form.querySelector('#city');
            const city = cityInput.value;

            getWeatherAPIresults(city, originalFormHTML);
        }
    });

    weatherContainer.addEventListener('click', (event) => {
        if (event.target.id === 'search-again-btn') {
            localStorage.removeItem("ciudad_usuario");
            weatherContainer.innerHTML = originalFormHTML;
        }
    });
});