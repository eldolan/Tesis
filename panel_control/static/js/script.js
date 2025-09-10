const navbar = document.getElementById('navbar');

function abrirSidebar() {
    navbar.classList.add('show');
}

function cerrarSidebar() {
    navbar.classList.remove('show');
}

async function getWeatherAPIresults(cityId, originalFormHTML, weatherContainer) {
    try {
        const response = await fetch('/get_weather', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ city_id: cityId })
        });

        if (!response.ok) {
            throw new Error('La ciudad no fue encontrada o hubo un error en el servidor.');
        }

        const weatherData = await response.json();
        
        localStorage.setItem("ciudad_usuario_id", cityId);

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
        initializeCitySelect();
    }
}

function initializeCitySelect() {
    return new TomSelect('#city-select', {
        valueField: 'id',
        labelField: 'name',
        searchField: 'name',
        create: false,
        load: function(query, callback) {
            fetch('/get_chilean_cities')
                .then(response => response.json())
                .then(json => {
                    callback(json);
                }).catch(()=>{
                    callback();
                });
        },
        render: {
            no_results: function(data, escape) {
                return '<div class="no-results">No se encontraron resultados.</div>';
            },
        }
    });
}


document.addEventListener('DOMContentLoaded', () => {
    const weatherContainer = document.getElementById('weather-container');
    const originalFormHTML = weatherContainer.innerHTML;
    let tomSelectInstance;

    // Lógica principal
    const ciudadGuardadaId = localStorage.getItem("ciudad_usuario_id");

    if (ciudadGuardadaId) {
        getWeatherAPIresults(ciudadGuardadaId, originalFormHTML, weatherContainer);
    } else {
        tomSelectInstance = initializeCitySelect();
    }
    
    weatherContainer.addEventListener('submit', async (event) => {
        if (event.target.id === 'weather-form') {
            event.preventDefault();
            const cityId = tomSelectInstance.getValue();
            if (cityId) {
                getWeatherAPIresults(cityId, originalFormHTML, weatherContainer);
            } else {
                alert("Por favor, selecciona una ciudad.");
            }
        }
    });

    weatherContainer.addEventListener('click', (event) => {
        if (event.target.id === 'search-again-btn') {
            localStorage.removeItem("ciudad_usuario_id");
            weatherContainer.innerHTML = originalFormHTML;
            tomSelectInstance = initializeCitySelect();
        }
    });
});
