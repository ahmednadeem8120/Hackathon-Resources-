document.addEventListener('DOMContentLoaded', function () {
    // --- COMPREHENSIVE DUMMY DATA ---
    const data = {
        day: {
            all:    { co2Saved: 188, vehiclesOffRoad: 45, traditionalCo2: 342, deliveryModes: [42, 31, 27], co2Trend: [220, 210, 205, 198, 190, 188] },
            drone:  { co2Saved: 150, vehiclesOffRoad: 45, traditionalCo2: 200, deliveryModes: [100, 0, 0], co2Trend: [180, 170, 165, 160, 155, 150] },
            bike:   { co2Saved: 30,  vehiclesOffRoad: 0,  traditionalCo2: 50,  deliveryModes: [0, 100, 0], co2Trend: [40, 38, 35, 33, 32, 30] },
            van:    { co2Saved: 8,   vehiclesOffRoad: 0,  traditionalCo2: 92,  deliveryModes: [0, 0, 100], co2Trend: [15, 14, 12, 10, 9, 8] },
        },
        week: {
            all:    { co2Saved: 1250, vehiclesOffRoad: 312, traditionalCo2: 2270, deliveryModes: [38, 35, 27], co2Trend: [1500, 1420, 1380, 1310, 1280, 1250] },
            drone:  { co2Saved: 1000, vehiclesOffRoad: 312, traditionalCo2: 1500, deliveryModes: [100, 0, 0], co2Trend: [1200, 1150, 1100, 1080, 1050, 1000] },
            bike:   { co2Saved: 200,  vehiclesOffRoad: 0,  traditionalCo2: 350, deliveryModes: [0, 100, 0], co2Trend: [250, 240, 230, 220, 210, 200] },
            van:    { co2Saved: 50,   vehiclesOffRoad: 0,  traditionalCo2: 420, deliveryModes: [0, 0, 100], co2Trend: [80, 70, 65, 60, 55, 50] },
        },
        month: {
            all:    { co2Saved: 5100, vehiclesOffRoad: 1280, traditionalCo2: 9250, deliveryModes: [35, 30, 35], co2Trend: [6000, 5800, 5600, 5450, 5200, 5100] },
            drone:  { co2Saved: 4000, vehiclesOffRoad: 1280, traditionalCo2: 6000, deliveryModes: [100, 0, 0], co2Trend: [5000, 4800, 4600, 4400, 4200, 4000] },
            bike:   { co2Saved: 800,  vehiclesOffRoad: 0,  traditionalCo2: 1250, deliveryModes: [0, 100, 0], co2Trend: [1000, 950, 900, 880, 850, 800] },
            van:    { co2Saved: 300,  vehiclesOffRoad: 0,  traditionalCo2: 2000, deliveryModes: [0, 0, 100], co2Trend: [500, 450, 400, 380, 350, 300] },
        }
    };

    const fleetData = [
        { id: 'NF-D001', type: 'Drone', status: 'Active', energy: 88, distance: 12.5 },
        { id: 'NF-V001', type: 'Van', status: 'Active', energy: 65, distance: 45.2 },
        { id: 'NF-B001', type: 'Bike', status: 'Charging', energy: 95, distance: 0 },
        { id: 'NF-D002', type: 'Drone', status: 'Returning', energy: 34, distance: 8.1 },
        { id: 'NF-D003', type: 'Drone', status: 'Active', energy: 72, distance: 5.7 },
        { id: 'NF-V002', type: 'Van', status: 'Idle', energy: 100, distance: 0 },
        { id: 'NF-B002', type: 'Bike', status: 'Active', energy: 61, distance: 15.3 },
    ];

    let currentFilter = 'day';
    let currentMode = 'all';
    let charts = {};

    function init() {
        initCharts();
        updateDashboard();
        initEventListeners();
        renderFleetTable();
        animateCounters();
        updateTime();
        setInterval(updateTime, 10000);
    }

    function initEventListeners() {
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelector('.filter-btn.active').classList.remove('active');
                btn.classList.add('active');
                currentFilter = btn.dataset.filter;
                updateDashboard();
            });
        });

        document.querySelectorAll('.filter-btn-mode').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelector('.filter-btn-mode.active').classList.remove('active');
                btn.classList.add('active');
                currentMode = btn.dataset.mode;
                updateDashboard();
                renderFleetTable();
            });
        });
        
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', () => {
                const view = item.dataset.view;
                if(view) {
                    document.querySelector('.view.active').classList.remove('active');
                    document.getElementById(`${view}-view`).classList.add('active');
                    document.querySelector('.nav-item.active').classList.remove('active');
                    item.classList.add('active');
                }
            });
        });

        document.getElementById('close-panel-btn').addEventListener('click', () => {
            document.getElementById('details-panel').classList.remove('open');
        });

        document.getElementById('carbon-slider').addEventListener('input', handleSlider);
        document.getElementById('playback-btn').addEventListener('click', runPlayback);
    }
    
    function updateDashboard() {
        const currentData = data[currentFilter][currentMode];
        
        document.getElementById('co2-saved').dataset.target = currentData.co2Saved;
        document.getElementById('vehicles-off-road').dataset.target = currentData.vehiclesOffRoad;
        animateCounters();
        
        document.getElementById('traditional-co2').textContent = `${currentData.traditionalCo2} kg`;
        
        charts.co2.data.datasets[0].data = currentData.co2Trend;
        charts.co2.update();

        charts.delivery.data.datasets[0].data = currentData.deliveryModes;
        charts.delivery.update();

        updateSlider(currentData);
    }

    function handleSlider(e) {
        const percentage = e.target.value;
        const baseData = data[currentFilter].all;
        const traditionalCo2 = baseData.traditionalCo2;
        // Assume drones are ~90% more efficient than vans in terms of CO2/km
        const droneFleetCo2 = traditionalCo2 * 0.1;
        const neurafleetCo2 = traditionalCo2 - (percentage/100) * (traditionalCo2 - droneFleetCo2);
        
        document.getElementById('neurafleet-co2').textContent = `${neurafleetCo2.toFixed(0)} kg`;
        document.getElementById('slider-label').textContent = `Simulating ${percentage}% Drone Adoption`;
    }

    function updateSlider(currentData) {
        const slider = document.getElementById('carbon-slider');
        const dronePercentage = currentData.deliveryModes[0];
        slider.value = dronePercentage;
        
        const traditionalCo2 = currentData.traditionalCo2;
        const neurafleetCo2 = traditionalCo2 - currentData.co2Saved;
        document.getElementById('neurafleet-co2').textContent = `${neurafleetCo2.toFixed(0)} kg`;
        document.getElementById('slider-label').textContent = `Current ${dronePercentage}% Drone Adoption`;
    }
    
    function animateCounters() {
        const counters = document.querySelectorAll('.metric-large[data-target]');
        counters.forEach(counter => {
            const target = +counter.dataset.target;
            const step = (timestamp) => {
                if (!counter.startTime) counter.startTime = timestamp;
                const progress = timestamp - counter.startTime;
                const duration = 1000;
                const current = Math.min(Math.floor(progress / duration * target), target);
                counter.innerText = current;
                if (progress < duration) {
                    requestAnimationFrame(step);
                } else {
                    counter.innerText = target;
                    delete counter.startTime;
                }
            };
            counter.innerText = '0';
            counter.startTime = null;
            requestAnimationFrame(step);
        });
    }

    function initCharts() {
        const defaultOptions = {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: { enabled: true, boxPadding: 4 } }
        };

        const co2Ctx = document.getElementById('co2Chart').getContext('2d');
        charts.co2 = new Chart(co2Ctx, {
            type: 'line', data: { labels: ['-6', '-5', '-4', '-3', '-2', 'Today'], datasets: [{ label: 'CO₂ Saved (kg)', data: [], borderColor: '#28a745', backgroundColor: 'rgba(40, 167, 69, 0.1)', borderWidth: 3, fill: true, tension: 0.4 }] },
            options: { ...defaultOptions, scales: { x: { display: false }, y: { display: false } } }
        });

        const deliveryCtx = document.getElementById('deliveryChart').getContext('2d');
        charts.delivery = new Chart(deliveryCtx, {
            type: 'doughnut', data: { labels: ['Drone', 'Bike', 'Van'], datasets: [{ data: [], backgroundColor: ['#3e30d9', '#28a745', '#ff9500'], borderWidth: 0 }] },
            options: { ...defaultOptions, cutout: '60%', plugins: { ...defaultOptions.plugins, legend: { position: 'bottom', labels: { boxWidth: 12, padding: 20 } } } }
        });
    }

    const map = L.map('map').setView([25.2048, 55.2708], 12);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap &copy; CARTO', maxZoom: 19
    }).addTo(map);

    const zones = {
        "Marina (Drone-Primary)": L.circle([25.077, 55.139], { radius: 1500, color: '#3e30d9', fillOpacity: 0.1 }).addTo(map),
        "Downtown (Van-Primary)": L.circle([25.197, 55.274], { radius: 2000, color: '#ff9500', fillOpacity: 0.1 }).addTo(map),
        "Jumeirah (Hybrid-Optimized)": L.circle([25.222, 55.259], { radius: 2500, color: '#28a745', fillOpacity: 0.1 }).addTo(map),
    };
    for (const [name, layer] of Object.entries(zones)) {
        layer.bindPopup(`<b>${name}</b><br>Active Deliveries: ${Math.floor(Math.random()*20)}`);
    }

    function renderFleetTable() {
        const tbody = document.getElementById('fleet-table-body');
        tbody.innerHTML = '';
        const filteredData = fleetData.filter(unit => currentMode === 'all' || unit.type.toLowerCase() === currentMode);
        filteredData.forEach(unit => {
            const row = document.createElement('tr');
            row.innerHTML = `<td>${unit.id}</td><td>${unit.type}</td><td>${unit.status}</td><td>${unit.energy}%</td><td>${unit.distance}</td>`;
            row.addEventListener('click', () => showDetailsPanel(unit));
            tbody.appendChild(row);
        });
    }

    function showDetailsPanel(unit) {
        const panel = document.getElementById('details-panel');
        document.getElementById('panel-content').innerHTML = `<h2>${unit.id}</h2><p>Type: ${unit.type} | Status: ${unit.status}</p><div class="panel-stat"><span class="label">🔋 Energy Level</span><span class="value">${unit.energy}%</span></div><div class="panel-stat"><span class="label">📍 Distance Today</span><span class="value">${unit.distance} km</span></div><div class="panel-stat"><span class="label">🔧 Last Maintenance</span><span class="value">2025-10-15</span></div><div class="panel-stat"><span class="label">📦 Deliveries Today</span><span class="value">${Math.floor(Math.random()*15 + 5)}</span></div>`;
        panel.classList.add('open');
    }
    
    document.querySelectorAll('#fleet-table th').forEach(header => {
        header.addEventListener('click', () => {
            const key = header.dataset.sort;
            fleetData.sort((a, b) => (a[key] > b[key]) ? 1 : -1);
            renderFleetTable();
        });
    });

    let playbackLayers = [];
    function runPlayback() {
        playbackLayers.forEach(layer => map.removeLayer(layer));
        playbackLayers = [];

        const droneIcon = L.icon({ iconUrl: 'https://cdn-icons-png.flaticon.com/512/826/826069.png', iconSize: [30, 30] });
        const vanIcon = L.icon({ iconUrl: 'https://cdn-icons-png.flaticon.com/512/3448/3448620.png', iconSize: [30, 30] });
        
        const route1 = L.polyline([[25.077, 55.139], [25.12, 55.18], [25.15, 55.20]], { color: '#3e30d9', dashArray: '5, 5' }).addTo(map);
        const route2 = L.polyline([[25.197, 55.274], [25.21, 55.29], [25.23, 55.28]], { color: '#ff9500', dashArray: '5, 5' }).addTo(map);
        const drone = L.marker([25.077, 55.139], { icon: droneIcon }).addTo(map);
        const van = L.marker([25.197, 55.274], { icon: vanIcon }).addTo(map);
        playbackLayers.push(route1, route2, drone, van);

        let progress = 0;
        const interval = setInterval(() => {
            progress += 0.01;
            if (progress > 1) {
                clearInterval(interval);
                playbackLayers.forEach(layer => map.removeLayer(layer));
                return;
            }
            drone.setLatLng(L.latLng(
                route1.getLatLngs()[0].lat + (route1.getLatLngs()[2].lat - route1.getLatLngs()[0].lat) * progress,
                route1.getLatLngs()[0].lng + (route1.getLatLngs()[2].lng - route1.getLatLngs()[0].lng) * progress
            ));
            van.setLatLng(L.latLng(
                route2.getLatLngs()[0].lat + (route2.getLatLngs()[2].lat - route2.getLatLngs()[0].lat) * progress,
                route2.getLatLngs()[0].lng + (route2.getLatLngs()[2].lng - route2.getLatLngs()[0].lng) * progress
            ));
        }, 50);
    }
    
    function updateTime() {
        const now = new Date();
        document.getElementById('current-time').textContent = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    }

    init();
});
