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

    const irrigationChartContainer = document.getElementById('irrigation-chart-container');
    if (irrigationChartContainer) {

        let chartData = {};

        const options = {
            chart: { type: 'line', height: '95%', background: 'transparent', toolbar: { show: true } },
            theme: { mode: 'dark', palette: 'palette2' },
            stroke: { curve: 'smooth', width: 3 },
            series: [],
            xaxis: { type: 'datetime', categories: [] },
            yaxis: { title: { text: 'Humedad del Suelo' } },
            tooltip: { x: { format: 'dd MMM yyyy' } },
            grid: { borderColor: '#55555533' },
            legend: { position: 'top', horizontalAlign: 'left' },
            noData: { text: 'Cargando datos del sensor...' },
            responsive: [{
                breakpoint: 750,
                options: {
                    legend: {
                        position: 'bottom',
                        horizontalAlign: 'center',
                        offsetY: 5
                    },
                    chart: {
                        toolbar: {
                           tools: {
                                download: false
                           }
                        }
                    }
                },
            }]
        };

        const chart = new ApexCharts(document.querySelector("#chart"), options);
        chart.render();

        const stackedBtn = document.getElementById('stacked-view-btn');
        const sumBtn = document.getElementById('sum-view-btn');

        const updateChartView = () => {
            if (!chartData.dates) return;

            const isSumView = sumBtn.classList.contains('active');

            if (isSumView) {
                const sumData = chartData.sensor1.map((val, i) => 
                    parseFloat(((val + chartData.sensor2[i] + chartData.sensor3[i]) / 3).toFixed(2))
                );

                chart.updateOptions({
                    yaxis: {
                        title: { text: 'Humedad Promedio Total' },
                        min: 40,
                        max: 100
                    },
                    legend: { show: false },
                    annotations: {
                        xaxis: [],
                        yaxis: [
                            {
                                y: 90,
                                y2: 100,
                                borderColor: '#0071FF',
                                fillColor: '#0071FF',
                                opacity: 0.15,
                                label: {
                                    borderColor: '#0071FF',
                                    style: { color: '#FFF', background: '#0071FF' },
                                    text: 'Nivel de Lleno (Full Point)'
                                }
                            },
                            {
                                y: 70,
                                y2: 90,
                                borderColor: '#00E396',
                                fillColor: '#00E396',
                                opacity: 0.1,
                                label: {
                                    borderColor: '#00E396',
                                    style: { color: '#FFF', background: '#00E396' },
                                    text: 'Punto de Recarga (Refill Point)'
                                }
                            },
                            {
                                y: 55,
                                y2: 70,
                                borderColor: '#FEB019',
                                fillColor: '#FEB019',
                                opacity: 0.1,
                                label: {
                                    borderColor: '#FEB019',
                                    style: { color: '#FFF', background: '#FEB019' },
                                    text: 'Inicio de Estrés'
                                }
                            }
                        ]
                    }
                });
                chart.updateSeries([{ name: 'Sumatoria', data: sumData }]);

            } else {
                const irrigationAnnotations = chartData.irrigation_events.map(eventDate => {
                    const date = new Date(eventDate);
                    date.setHours(0, 0, 0, 0);
                    const startTime = date.getTime();
                    date.setHours(23, 59, 59, 999);
                    const endTime = date.getTime();

                    return {
                        x: startTime,
                        x2: endTime,
                        fillColor: 'var(--accent-color)',
                        opacity: 0.15,
                        label: {
                           text: 'Riego',
                           style: { background: 'var(--accent-color)', color: '#fff', fontSize: '10px' },
                           offsetY: 10,
                        }
                    };
                });
                
                chart.updateOptions({
                    yaxis: {
                        title: { text: 'Humedad del Suelo' },
                        min: undefined,
                        max: undefined
                    },
                    legend: { show: true },
                    annotations: {
                        yaxis: [],
                        xaxis: irrigationAnnotations
                    }
                });
                chart.updateSeries([
                    { name: 'Sensor 20cm', data: chartData.sensor1 },
                    { name: 'Sensor 40cm', data: chartData.sensor2 },
                    { name: 'Sensor 60cm', data: chartData.sensor3 }
                ]);
            }
        };
        
        stackedBtn.addEventListener('click', () => {
            stackedBtn.classList.add('active');
            sumBtn.classList.remove('active');
            updateChartView();
        });
        
        sumBtn.addEventListener('click', () => {
            sumBtn.classList.add('active');
            stackedBtn.classList.remove('active');
            updateChartView();
        });

        const fetchAndUpdateData = async () => {
            try {
                const response = await fetch('/get_irrigation_data');
                if (!response.ok) throw new Error('Error al obtener los datos');
                
                const newData = await response.json();
                chartData = newData;

                chart.updateOptions({
                    xaxis: { categories: chartData.dates }
                });
                
                updateChartView();

            } catch (error) {
                console.error("Fallo el polling:", error);
            }
        };

        fetchAndUpdateData();
        setInterval(fetchAndUpdateData, 5000);
    }
});

