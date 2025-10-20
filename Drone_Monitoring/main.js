document.addEventListener('DOMContentLoaded', () => {
    // --- GLOBAL STATE ---
    let selectedDroneId = null;
    const droneMarkerRefs = {};

    // --- DOM ELEMENTS ---
    const mapContainer = document.getElementById('map');
    const modal = document.getElementById('confirmationModal');
    
    // --- INITIALIZATION ---
    if (!mapContainer) {
        console.error("Map container not found!");
        return;
    }
    const map = L.map(mapContainer).setView([25.21, 55.29], 13);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap &copy; CARTO',
        maxZoom: 19
    }).addTo(map);

    const droneMarkersLayer = L.layerGroup().addTo(map);

    // --- FUNCTIONS ---

    const createDroneIcon = (drone) => L.divIcon({
        html: `<span>${drone.id.split('-')[1]}</span>`,
        className: `drone-icon status-${drone.status.toLowerCase()}`,
        iconSize: [40, 40],
        iconAnchor: [20, 20]
    });

    const updateStatusPanel = (drone) => {
        if (!drone) return;
        
        // Update all metrics in the consolidated grid
        document.getElementById('drone-id-title').textContent = drone.id;
        document.getElementById('status-battery').textContent = `${Math.round(drone.battery)}%`;
        document.getElementById('status-battery-fill').style.width = `${drone.battery}%`;
        document.getElementById('status-altitude').textContent = `${Math.round(drone.altitude)} m`;
        document.getElementById('status-speed').textContent = `${Math.round(drone.speed)} km/h`;
        document.getElementById('status-signal').textContent = drone.status === 'Active' ? 'Excellent' : 'Offline';
        document.getElementById('metrics-id').textContent = drone.id;
        document.getElementById('metrics-status').textContent = drone.status;
        document.getElementById('metrics-payload').textContent = `${drone.payload} kg`;
        document.getElementById('metrics-wind').textContent = drone.wind;
    };

    const highlightSelectedMarker = () => {
        document.querySelectorAll('.drone-icon').forEach(el => el.classList.remove('selected'));
        if (selectedDroneId && droneMarkerRefs[selectedDroneId]) {
            droneMarkerRefs[selectedDroneId]._icon.classList.add('selected');
        }
    };
    
    const selectDrone = (drone) => {
        selectedDroneId = drone.id;
        updateStatusPanel(drone);
        highlightSelectedMarker();
    };

    const updateMarkers = (filter = 'all') => {
        droneMarkersLayer.clearLayers();
        Object.keys(droneMarkerRefs).forEach(key => delete droneMarkerRefs[key]);

        const filteredDrones = (filter === 'all') ? droneData : droneData.filter(d => d.status === filter);

        filteredDrones.forEach(drone => {
            const icon = createDroneIcon(drone);
            const marker = L.marker([drone.location.lat, drone.location.lng], { icon }).addTo(droneMarkersLayer);
            droneMarkerRefs[drone.id] = marker;
            marker.on('click', () => selectDrone(drone));
        });

        if (!filteredDrones.some(d => d.id === selectedDroneId) && filteredDrones.length > 0) {
            selectDrone(filteredDrones[0]);
        } else if (filteredDrones.length === 0) {
            selectedDroneId = null;
            const offline_data = { id: '--', battery: 0, altitude: 0, speed: 0, payload: 0, status: 'N/A', wind: 'N/A' };
            updateStatusPanel(offline_data);
        } else {
            const currentDrone = droneData.find(d => d.id === selectedDroneId);
            if (currentDrone) selectDrone(currentDrone);
        }
    };

    // --- EVENT LISTENERS ---
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            updateMarkers(this.dataset.filter);
        });
    });

    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.toggle('active', content.id === this.dataset.tab);
            });
        });
    });

    const modalTitle = document.getElementById('modalTitle');
    const modalMessage = document.getElementById('modalMessage');
    const confirmBtn = document.getElementById('confirmBtn');
    let currentActionTarget = null;

    document.querySelectorAll('.emergency-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            if (!selectedDroneId) {
                alert("Please select a drone from the map first.");
                return;
            }
            const actionText = this.textContent.trim();
            currentActionTarget = this;
            modalTitle.textContent = `Confirm: ${actionText}`;
            modalMessage.textContent = `Initiate "${actionText}" for drone ${selectedDroneId}?`;
            confirmBtn.className = 'modal-btn confirm';
            if (this.classList.contains('danger')) confirmBtn.classList.add('danger');
            if (this.classList.contains('success')) confirmBtn.classList.add('success');
            if (this.classList.contains('primary')) confirmBtn.classList.add('primary');
            modal.classList.add('show');
        });
    });

    const closeModal = () => modal.classList.remove('show');
    document.getElementById('cancelBtn').addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
    confirmBtn.addEventListener('click', () => {
        if (currentActionTarget) {
            console.log(`✅ ACTION: "${currentActionTarget.textContent.trim()}" for ${selectedDroneId}.`);
        }
        closeModal();
    });

    // --- TELEMETRY CHARTS & SIMULATION ---
    const createChart = (ctx, label, color, min, max) => new Chart(ctx, { type: 'line', data: { datasets: [{ label, data: [], borderColor: color, backgroundColor: `${color}33`, borderWidth: 2, pointRadius: 0, tension: 0.4, fill: true }] }, options: { responsive: true, maintainAspectRatio: false, scales: { x: { type: 'timeseries', time: { unit: 'second' }, ticks: { display: false } }, y: { min, max } }, plugins: { legend: { display: true, position: 'top', align: 'start' } } } });
    const batteryChart = createChart(document.getElementById('batteryChart').getContext('2d'), 'Battery (%)', '#51b206', 0, 100);
    const speedChart = createChart(document.getElementById('speedChart').getContext('2d'), 'Speed (km/h)', '#3e30d9', 0, 50);
    const signalChart = createChart(document.getElementById('signalChart').getContext('2d'), 'Signal (%)', '#ff9500', 0, 100);
    const charts = [batteryChart, speedChart, signalChart];

    setInterval(() => {
        droneData.forEach(getSimulatedUpdate);
        const selectedDrone = droneData.find(d => d.id === selectedDroneId);
        if (selectedDrone) {
            updateStatusPanel(selectedDrone);
            const now = Date.now();
            const newData = [selectedDrone.battery, selectedDrone.speed, 98 + (Math.random() - 0.5) * 4];
            charts.forEach((chart, index) => {
                const dataset = chart.data.datasets[0];
                if (selectedDrone.status === 'Active') {
                    dataset.data.push({ x: now, y: newData[index] });
                    if (dataset.data.length > 30) dataset.data.shift();
                } else if (dataset.data.length > 0) {
                    dataset.data = [];
                }
                chart.update('quiet');
            });
        }
    }, 2000);

    // --- INITIAL LOAD ---
    updateMarkers();
    if (droneData.length > 0) {
        selectDrone(droneData[0]);
    }
});
