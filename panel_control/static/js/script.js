document.addEventListener('DOMContentLoaded', () => {
    const navbar = document.getElementById('navbar');
    const overlay = document.getElementById('overlay');
    const openMenuBtn = document.getElementById('abrir-menu');
    const closeMenuBtn = document.getElementById('cerrar-menu');
    const weatherContainer = document.getElementById('weather-container');
    const originalFormHTML = weatherContainer.innerHTML;
    let tomSelectInstance;

    function abrirSidebar() {
        if (navbar) navbar.classList.add('show');
        if (overlay) overlay.style.display = 'block';
    }

    function cerrarSidebar() {
        if (navbar) navbar.classList.remove('show');
        if (overlay) overlay.style.display = 'none';
    }

    if (openMenuBtn) openMenuBtn.addEventListener('click', abrirSidebar);
    if (closeMenuBtn) closeMenuBtn.addEventListener('click', cerrarSidebar);
    if (overlay) overlay.addEventListener('click', cerrarSidebar);

    async function getWeatherAPIresults(cityId) {
        try {
            const response = await fetch('/get_weather', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ city_id: cityId })
            });
            if (!response.ok) throw new Error('La ciudad no fue encontrada o hubo un error.');

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
            tomSelectInstance = initializeCitySelect();
        }
    }

    function initializeCitySelect() {
        const userBox = document.querySelector('#weather-form .user-box');
        if (!userBox) return null;
        
        const label = userBox.querySelector('label');
        if (!label) return null;

        return new TomSelect('#city-select', {
            valueField: 'id',
            labelField: 'name',
            searchField: 'name',
            create: false,
            load: (query, callback) => {
                fetch('/get_chilean_cities')
                    .then(response => response.json())
                    .then(json => callback(json))
                    .catch(() => callback());
            },
            onInitialize: function() {
                if (this.getValue()) label.classList.add('active');
            },
            onFocus: function() {
                label.classList.add('active');
            },
            onBlur: function() {
                if (!this.getValue()) label.classList.remove('active');
            },
            onChange: function(value) {
                if (value) label.classList.add('active');
            }
        });
    }

    weatherContainer.addEventListener('submit', async (event) => {
        if (event.target.id === 'weather-form') {
            event.preventDefault();
            if (tomSelectInstance) {
                const cityId = tomSelectInstance.getValue();
                if (cityId) {
                    getWeatherAPIresults(cityId);
                } else {
                    alert("Por favor, selecciona una ciudad.");
                }
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

    const ciudadGuardadaId = localStorage.getItem("ciudad_usuario_id");
    if (ciudadGuardadaId) {
        getWeatherAPIresults(ciudadGuardadaId);
    } else {
        tomSelectInstance = initializeCitySelect();
    }
});
