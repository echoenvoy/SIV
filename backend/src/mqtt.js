const mqtt = require('mqtt');
const { pool } = require('./db/pool');
const { broadcast } = require('./websocket');

const ALERT_THRESHOLDS = {
  engine_temp: 95,
  fuel: 15,
  offline_seconds: 60,
};

const lastSeen = {};
let client = null;

function connectMQTT() {
  const options = {
    host: process.env.MQTT_HOST || 'localhost',
    port: parseInt(process.env.MQTT_PORT, 10) || 1883,
    username: process.env.MQTT_USER,
    password: process.env.MQTT_PASS,
    clientId: `siv-backend-${Date.now()}`,
    reconnectPeriod: 5000,
  };

  client = mqtt.connect(`mqtt://${options.host}:${options.port}`, options);

  client.on('connect', () => {
    console.log('✅ MQTT connected to broker');
    client.subscribe('bus/+/gps', { qos: 1 });
    client.subscribe('bus/+/can', { qos: 1 });
    console.log('📡 Subscribed to bus/+/gps and bus/+/can');
  });

  client.on('message', async (topic, message) => {
    try {
      const payload = JSON.parse(message.toString());
      const parts = topic.split('/');
      const busId = parseInt(parts[1], 10);
      const dataType = parts[2];

      lastSeen[busId] = Date.now();

      if (dataType === 'gps') {
        await handleGPS(busId, payload);
      } else if (dataType === 'can') {
        await handleCAN(busId, payload);
      }
    } catch (err) {
      console.error('MQTT message error:', err.message, 'topic:', topic);
    }
  });

  client.on('error', (err) => console.error('❌ MQTT error:', err.message));
  client.on('reconnect', () => console.log('🔄 MQTT reconnecting...'));

  setInterval(() => checkOfflineBuses(), 30000);
}

async function handleGPS(busId, data) {
  const { latitude, longitude, speed } = data;
  if (!latitude || !longitude) return;

  await pool.execute(
    'INSERT INTO positions (bus_id, latitude, longitude, vitesse, date_position) VALUES (?, ?, ?, ?, NOW())',
    [busId, latitude, longitude, speed || 0]
  );

  await pool.execute("UPDATE bus SET etat = 'actif' WHERE id = ?", [busId]);

  broadcast('gps_update', { bus_id: busId, latitude, longitude, speed: speed || 0 });
}

async function handleCAN(busId, data) {
  const { speed, fuel, engine_temp, odometer, doors } = data;

  await pool.execute(
    'INSERT INTO telemetrie (bus_id, speed, fuel, engine_temp, odometer, doors, date_reception) VALUES (?, ?, ?, ?, ?, ?, NOW())',
    [busId, speed || 0, fuel || 0, engine_temp || 0, odometer || 0, doors || 'closed']
  );

  broadcast('telemetry_update', { bus_id: busId, speed, fuel, engine_temp, odometer, doors });

  await checkAlerts(busId, { fuel, engine_temp, doors, speed });
}

async function checkAlerts(busId, data) {
  const alerts = [];

  if (data.engine_temp > ALERT_THRESHOLDS.engine_temp) {
    alerts.push({ type: 'temperature', message: `Température moteur critique: ${data.engine_temp}°C`, valeur: data.engine_temp });
  }
  if (data.fuel < ALERT_THRESHOLDS.fuel) {
    alerts.push({ type: 'carburant', message: `Carburant bas: ${data.fuel}%`, valeur: data.fuel });
  }
  if (data.doors === 'open' && data.speed > 5) {
    alerts.push({ type: 'porte', message: `Porte ouverte pendant déplacement (${data.speed} km/h)`, valeur: data.speed });
  }

  for (const alert of alerts) {
    const [existing] = await pool.execute(
      'SELECT id FROM alertes WHERE bus_id = ? AND type = ? AND acquittee = FALSE AND created_at > DATE_SUB(NOW(), INTERVAL 5 MINUTE)',
      [busId, alert.type]
    );

    if (existing.length === 0) {
      await pool.execute(
        'INSERT INTO alertes (bus_id, type, message, valeur) VALUES (?, ?, ?, ?)',
        [busId, alert.type, alert.message, alert.valeur]
      );
      broadcast('alert', { bus_id: busId, ...alert });
    }
  }
}

async function checkOfflineBuses() {
  const now = Date.now();

  for (const [busId, ts] of Object.entries(lastSeen)) {
    const elapsed = (now - ts) / 1000;

    if (elapsed > ALERT_THRESHOLDS.offline_seconds) {
      const [existing] = await pool.execute(
        "SELECT id FROM alertes WHERE bus_id = ? AND type = 'hors_ligne' AND acquittee = FALSE AND created_at > DATE_SUB(NOW(), INTERVAL 5 MINUTE)",
        [busId]
      );

      if (existing.length === 0) {
        await pool.execute(
          "INSERT INTO alertes (bus_id, type, message, valeur) VALUES (?, 'hors_ligne', ?, ?)",
          [busId, `Bus hors ligne depuis ${Math.round(elapsed)}s`, elapsed]
        );
        await pool.execute("UPDATE bus SET etat = 'inactif' WHERE id = ?", [busId]);
        broadcast('alert', { bus_id: parseInt(busId, 10), type: 'hors_ligne', message: `Bus hors ligne depuis ${Math.round(elapsed)}s` });
      }
    }
  }
}

module.exports = { connectMQTT };
