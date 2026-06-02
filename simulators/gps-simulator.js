const mqtt = require('mqtt');

const MQTT_HOST = process.env.MQTT_HOST || 'localhost';
const MQTT_PORT = process.env.MQTT_PORT || 1883;
const MQTT_USER = process.env.MQTT_USER;
const MQTT_PASS = process.env.MQTT_PASS;

const ROUTES = {
  1: [
    { lat: 33.5966, lon: -7.6197 },
    { lat: 33.592, lon: -7.618 },
    { lat: 33.589, lon: -7.6128 },
    { lat: 33.585, lon: -7.608 },
    { lat: 33.5812, lon: -7.6035 },
    { lat: 33.579, lon: -7.61 },
    { lat: 33.578, lon: -7.678 },
  ],
  2: [
    { lat: 33.5731, lon: -7.6338 },
    { lat: 33.574, lon: -7.628 },
    { lat: 33.575, lon: -7.62 },
    { lat: 33.57, lon: -7.605 },
    { lat: 33.565, lon: -7.587 },
  ],
  3: [
    { lat: 33.56, lon: -7.64 },
    { lat: 33.562, lon: -7.61 },
    { lat: 33.568, lon: -7.59 },
    { lat: 33.572, lon: -7.57 },
  ],
};

const BUS_ROUTES = { 1: 1, 2: 1, 3: 2, 5: 3 };

const busState = {};

for (const [busId, routeId] of Object.entries(BUS_ROUTES)) {
  busState[busId] = {
    routeId,
    waypointIdx: 0,
    progress: 0,
    speed: 30 + Math.random() * 20,
  };
}

const client = mqtt.connect(`mqtt://${MQTT_HOST}:${MQTT_PORT}`, {
  username: MQTT_USER,
  password: MQTT_PASS,
  clientId: `gps-simulator-${Date.now()}`,
  reconnectPeriod: 5000,
});

client.on('connect', () => {
  console.log('✅ GPS Simulator connected to MQTT');
  startSimulation();
});

client.on('error', (err) => console.error('MQTT error:', err.message));

function interpolate(p1, p2, t) {
  return {
    lat: p1.lat + (p2.lat - p1.lat) * t,
    lon: p1.lon + (p2.lon - p1.lon) * t,
  };
}

function startSimulation() {
  setInterval(() => {
    for (const [busId, state] of Object.entries(busState)) {
      const route = ROUTES[state.routeId];
      const wpIdx = state.waypointIdx % (route.length - 1);
      const nextIdx = (wpIdx + 1) % route.length;

      state.progress += 0.05 + Math.random() * 0.03;
      if (state.progress >= 1) {
        state.progress = 0;
        state.waypointIdx = (state.waypointIdx + 1) % (route.length - 1);
      }

      const pos = interpolate(route[wpIdx], route[nextIdx], state.progress);
      pos.lat += (Math.random() - 0.5) * 0.0002;
      pos.lon += (Math.random() - 0.5) * 0.0002;

      const speed = state.speed + (Math.random() - 0.5) * 10;
      const payload = {
        bus_id: parseInt(busId, 10),
        latitude: parseFloat(pos.lat.toFixed(7)),
        longitude: parseFloat(pos.lon.toFixed(7)),
        speed: Math.max(0, Math.round(speed)),
        timestamp: new Date().toISOString(),
      };

      client.publish(`bus/${busId}/gps`, JSON.stringify(payload), { qos: 1 });
      console.log(`📍 Bus ${busId}: lat=${payload.latitude}, lon=${payload.longitude}, speed=${payload.speed}`);
    }
  }, 5000);
}
