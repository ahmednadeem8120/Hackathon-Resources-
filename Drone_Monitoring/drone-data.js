// Mock Data for Drones
const droneData = [
    {
        id: 'DRN-3847',
        status: 'Active',
        location: { lat: 25.22, lng: 55.30 },
        battery: 87,
        speed: 24,
        altitude: 119,
        payload: 2.4,
        eta: '14:32',
        distanceFlown: 12.5,
        wind: '7 km/h NW'
    },
    {
        id: 'DRN-9123',
        status: 'Active',
        location: { lat: 25.20, lng: 55.28 },
        battery: 95,
        speed: 30,
        altitude: 110,
        payload: 1.8,
        eta: '14:45',
        distanceFlown: 8.2,
        wind: '7 km/h NW'
    },
    {
        id: 'DRN-5541',
        status: 'Idle',
        location: { lat: 25.23, lng: 55.27 },
        battery: 100,
        speed: 0,
        altitude: 0,
        payload: 0,
        eta: 'N/A',
        distanceFlown: 0,
        wind: 'N/A'
    },
    {
        id: 'DRN-7890',
        status: 'Critical',
        location: { lat: 25.21, lng: 55.32 },
        battery: 15,
        speed: 20,
        altitude: 110,
        payload: 2.0,
        eta: '14:28',
        distanceFlown: 15.1,
        wind: '8 km/h NW'
    },
    {
        id: 'DRN-2468',
        status: 'Maintenance',
        location: { lat: 25.19, lng: 55.29 },
        battery: 50,
        speed: 0,
        altitude: 0,
        payload: 0,
        eta: 'N/A',
        distanceFlown: 0,
        wind: 'N/A'
    },
];

// Function to get a random update for telemetry simulation
function getSimulatedUpdate(drone) {
    if (drone.status === 'Active') {
        drone.battery -= Math.random() * 0.1;
        drone.speed += (Math.random() - 0.5) * 2;
        drone.altitude += (Math.random() - 0.5) * 5;

        // Keep values within a realistic range
        if (drone.battery < 0) drone.battery = 0;
        if (drone.speed < 15) drone.speed = 15;
        if (drone.speed > 35) drone.speed = 35;
        if (drone.altitude < 100) drone.altitude = 100;
        if (drone.altitude > 200) drone.altitude = 200;
    }
    return drone;
}
