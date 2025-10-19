document.addEventListener('DOMContentLoaded', async () => {
    // --- GLOBAL STATE ---
    let selectedDroneId = null;
    const droneMarkerRefs = {};

    // --- DOM ELEMENTS ---
    const mapContainer = document.getElementById('map');
    const modal = document.getElementById('confirmationModal');

    // --- For the live feedback ---
    const { ObjectDetector, FilesetResolver } = await import("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/vision_bundle.js");
    let objectDetector;
    let lastVideoTime = -1;
    let isAlertVisible = false;

    const video = document.getElementById('live-video-feed');
    const canvasElement = document.getElementById('output-canvas');
    const canvasCtx = canvasElement.getContext('2d');
    const alertBanner = document.getElementById('alert-banner');

    // --- For the Live feedback button function 
    // Replace the existing nav-btn event listener with this one

    document.querySelectorAll('.emergency-btn primary feed').forEach(btn => {
        btn.addEventListener('click', async function() {
            document.querySelectorAll('.emergency-btn primary feed').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            const targetViewId = this.dataset.view + '-container';
            document.querySelectorAll('.view-container').forEach(view => {
                view.classList.toggle('active', view.id === targetViewId);
            });

            // If the "Live Drone View" is activated
            if (this.dataset.view === 'live-feed') {
                if (!objectDetector) {
                    alert("Object detector is still loading. Please wait a moment.");
                    return;
                }
                try {
                    // Get the webcam stream
                    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                    video.srcObject = stream;
                    // Add an event listener to start detection once the video is playing
                    video.addEventListener('loadeddata', predictWebcam);
                    document.getElementById('waiting-message').style.display = 'none';
                } catch (err) {
                    console.error("Error accessing webcam:", err);
                    document.getElementById('waiting-message').textContent = 'Error: Could not access webcam.';
                }
            } else {
                // If switching away, stop the stream and the detection loop
                if (video.srcObject) {
                    video.srcObject.getTracks().forEach(track => track.stop());
                }
                video.removeEventListener('loadeddata', predictWebcam);
            }
        });
    });

    // The main AI detection loop
    async function predictWebcam() {
        // Match canvas size to video size
        canvasElement.width = video.videoWidth;
        canvasElement.height = video.videoHeight;
        const videoArea = video.videoWidth * video.videoHeight;

        // Only process a new frame if it's different from the last one
        if (video.currentTime !== lastVideoTime) {
            lastVideoTime = video.currentTime;
            const detections = objectDetector.detectForVideo(video, performance.now());

            // Clear the canvas and draw the video frame onto it
            canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
            canvasCtx.drawImage(video, 0, 0, canvasElement.width, canvasElement.height);

            let objectIsTooClose = false;
            
            // Loop through all detected objects
            for (const detection of detections.detections) {
                const bbox = detection.boundingBox;
                const objectArea = bbox.width * bbox.height;
                const areaPercentage = objectArea / videoArea;

                // --- "TOO CLOSE" LOGIC ---
                // If any detected object covers more than 30% of the screen area, trigger the alert.
                // You can adjust this 0.3 value to be more or less sensitive.
                if (areaPercentage > 0.30) {
                    objectIsTooClose = true;
                }

                // Draw bounding boxes for visualization
                canvasCtx.strokeStyle = "#FF0000";
                canvasCtx.lineWidth = 4;
                canvasCtx.strokeRect(bbox.originX, bbox.originY, bbox.width, bbox.height);
                canvasCtx.fillStyle = "#FF0000";
                canvasCtx.font = "18px Urbanist";
                const label = `${detection.categories[0].categoryName} (${Math.round(detection.categories[0].score * 100)}%)`;
                canvasCtx.fillText(label, bbox.originX, bbox.originY - 5);
            }

            if (objectIsTooClose) {
                showAlert("PROXIMITY ALERT: Object too close!");
            }
        }

        // Continue the loop
        window.requestAnimationFrame(predictWebcam);
    }

    // Function to show and hide the alert banner
    function showAlert(message) {
        if (isAlertVisible) return; // Don't show if already visible

        isAlertVisible = true;
        alertBanner.textContent = message;
        alertBanner.classList.add('show');

        // Hide the alert after 3 seconds
        setTimeout(() => {
            alertBanner.classList.remove('show');
            isAlertVisible = false;
        }, 3000);
    }

    

    // Function to initialize the Object Detector
    async function createObjectDetector() {
        const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm");
        objectDetector = await ObjectDetector.createFromOptions(vision, {
            baseOptions: {
                // EfficientDet-Lite0 is a fast and lightweight model
                modelAssetPath: `https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float16/1/efficientdet_lite0.tflite`,
                delegate: "GPU"
            },
            scoreThreshold: 0.5, // Only detect objects with 50% confidence or more
            runningMode: "VIDEO"
        });
        console.log("✅ Object detector loaded successfully.");
    }
    createObjectDetector();

    
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

    // UPDATED FUNCTION
    const updateStatusPanel = (drone) => {
        if (!drone) return;
        
        // Update top status panel
        document.getElementById('drone-id-title').textContent = drone.id;
        document.getElementById('status-battery').textContent = `${Math.round(drone.battery)}%`;
        document.getElementById('status-battery-fill').style.width = `${drone.battery}%`;
        document.getElementById('status-altitude').textContent = `${Math.round(drone.altitude)} m`;
        document.getElementById('status-speed').textContent = `${Math.round(drone.speed)} km/h`;
        document.getElementById('status-signal').textContent = drone.status === 'Active' ? 'Excellent' : 'Offline';

        // Update new key metrics panel
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
            const offline_data = { id: 'No Drones', battery: 0, altitude: 0, speed: 0, payload: 0, status: 'N/A', wind: 'N/A' };
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
