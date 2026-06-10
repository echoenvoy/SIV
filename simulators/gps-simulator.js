const mysql = require('mysql2/promise');
const mqtt = require('mqtt');

const MQTT_HOST = process.env.MQTT_HOST || 'localhost';
const MQTT_PORT = process.env.MQTT_PORT || 1883;
const MQTT_USER = process.env.MQTT_USER;
const MQTT_PASS = process.env.MQTT_PASS;

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = process.env.DB_PORT || 3306;
const DB_NAME = process.env.DB_NAME || 'siv_db';
const DB_USER = process.env.DB_USER || 'siv_user';
const DB_PASS = process.env.DB_PASS || 'siv_pass';

let dbPool = null;
let mqttClient = null;
const busState = {};

function initDB() {
  dbPool = mysql.createPool({
    host: DB_HOST,
    port: parseInt(DB_PORT, 10),
    database: DB_NAME,
    user: DB_USER,
    password: DB_PASS,
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0,
  });
}

function initMQTT() {
  mqttClient = mqtt.connect(`mqtt://${MQTT_HOST}:${MQTT_PORT}`, {
    username: MQTT_USER,
    password: MQTT_PASS,
    clientId: `gps-simulator-${Date.now()}`,
    reconnectPeriod: 5000,
  });

  mqttClient.on('connect', () => {
    console.log('✅ GPS Simulator connected to MQTT');
  });

  mqttClient.on('error', (err) => console.error('MQTT error:', err.message));
}

function interpolate(p1, p2, t) {
  return {
    lat: p1.lat + (p2.lat - p1.lat) * t,
    lon: p1.lon + (p2.lon - p1.lon) * t,
  };
}

async function refreshRoutes() {
  try {
    const [rows] = await dbPool.execute(`
      SELECT b.id AS bus_id, b.numero, b.etat, s.latitude, s.longitude, s.ordre
      FROM bus b
      INNER JOIN stations s ON b.ligne_id = s.ligne_id
      WHERE b.etat = 'actif'
      ORDER BY b.id, s.ordre
    `);

    // Group stations by bus_id
    const routesByBus = {};
    for (const row of rows) {
      if (!routesByBus[row.bus_id]) {
        routesByBus[row.bus_id] = [];
      }
      routesByBus[row.bus_id].push({
        lat: parseFloat(row.latitude),
        lon: parseFloat(row.longitude)
      });
    }

    // Convert paths to round trips to simulate back-and-forth movement
    const dynamicRoutes = {};
    for (const [busIdStr, stations] of Object.entries(routesByBus)) {
      if (stations.length < 2) continue;

      const roundTrip = [...stations];
      for (let i = stations.length - 2; i > 0; i--) {
        roundTrip.push(stations[i]);
      }
      dynamicRoutes[busIdStr] = roundTrip;
    }

    // Update simulation state
    for (const [busIdStr, waypoints] of Object.entries(dynamicRoutes)) {
      const busId = parseInt(busIdStr, 10);

      if (!busState[busId]) {
        busState[busId] = {
          waypointIdx: 0,
          progress: 0,
          speed: 30 + Math.random() * 20,
          waypoints: waypoints
        };
      } else {
        // Update waypoints list in case station coordinates changed
        busState[busId].waypoints = waypoints;
        if (busState[busId].waypointIdx >= waypoints.length) {
          busState[busId].waypointIdx = 0;
          busState[busId].progress = 0;
        }
      }
    }

    // Clean up states for buses that are no longer active
    for (const busId of Object.keys(busState)) {
      if (!dynamicRoutes[busId]) {
        delete busState[busId];
      }
    }
  } catch (err) {
    console.error('Error refreshing routes from database:', err.message);
  }
}

function startSimulation() {
  // Refresh routes immediately, then every 10 seconds
  refreshRoutes();
  setInterval(refreshRoutes, 10000);

  // Simulation step every 5 seconds
  setInterval(() => {
    if (!mqttClient || !mqttClient.connected) return;

    for (const [busId, state] of Object.entries(busState)) {
      const route = state.waypoints;
      if (!route || route.length < 2) continue;

      const wpIdx = state.waypointIdx % route.length;
      const nextIdx = (wpIdx + 1) % route.length;

      // Update progress along current segment
      state.progress += 0.04 + Math.random() * 0.03;
      if (state.progress >= 1) {
        state.progress = 0;
        state.waypointIdx = (state.waypointIdx + 1) % route.length;
      }

      const currentWp = route[wpIdx];
      const nextWp = route[nextIdx];
      const pos = interpolate(currentWp, nextWp, state.progress);
      
      // Add very tiny random jitter (simulating GPS drift)
      pos.lat += (Math.random() - 0.5) * 0.00005;
      pos.lon += (Math.random() - 0.5) * 0.00005;

      const speed = state.speed + (Math.random() - 0.5) * 6;
      const payload = {
        bus_id: parseInt(busId, 10),
        latitude: parseFloat(pos.lat.toFixed(7)),
        longitude: parseFloat(pos.lon.toFixed(7)),
        speed: Math.max(0, Math.round(speed)),
        timestamp: new Date().toISOString(),
      };

      mqttClient.publish(`bus/${busId}/gps`, JSON.stringify(payload), { qos: 1 });
      console.log(`📍 Bus ${busId}: lat=${payload.latitude}, lon=${payload.longitude}, speed=${payload.speed}`);
    }
  }, 5000);
}

initDB();
initMQTT();
startSimulation();
