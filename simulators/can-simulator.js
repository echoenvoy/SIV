const mqtt = require('mqtt');

const MQTT_HOST = process.env.MQTT_HOST || 'localhost';
const MQTT_PORT = process.env.MQTT_PORT || 1883;
const MQTT_USER = process.env.MQTT_USER;
const MQTT_PASS = process.env.MQTT_PASS;

const BUS_IDS = [1, 2, 3, 5];

const state = {};

for (const busId of BUS_IDS) {
  state[busId] = {
    speed: 25 + Math.round(Math.random() * 25),
    fuel: 45 + Math.round(Math.random() * 45),
    engineTemp: 78 + Math.round(Math.random() * 8),
    odometer: 120000 + Math.round(Math.random() * 10000),
    doors: 'closed',
  };
}

const client = mqtt.connect(`mqtt://${MQTT_HOST}:${MQTT_PORT}`, {
  username: MQTT_USER,
  password: MQTT_PASS,
  clientId: `can-simulator-${Date.now()}`,
  reconnectPeriod: 5000,
});

client.on('connect', () => {
  console.log('✅ CAN Simulator connected to MQTT');
  startSimulation();
});

client.on('error', (err) => console.error('MQTT error:', err.message));

function startSimulation() {
  setInterval(() => {
    for (const busId of BUS_IDS) {
      const current = state[busId];

      current.speed = Math.max(0, current.speed + Math.round((Math.random() - 0.5) * 8));
      current.fuel = Math.max(5, current.fuel - Math.random() * 0.15);
      current.engineTemp = Math.max(70, current.engineTemp + Math.round((Math.random() - 0.5) * 3));
      current.odometer += Math.round(current.speed / 30);
      current.doors = current.speed > 5 && Math.random() > 0.9 ? 'open' : 'closed';

      const payload = {
        bus_id: busId,
        speed: Math.round(current.speed),
        fuel: parseFloat(current.fuel.toFixed(1)),
        engine_temp: Math.round(current.engineTemp),
        odometer: Math.round(current.odometer),
        doors: current.doors,
        timestamp: new Date().toISOString(),
      };

      client.publish(`bus/${busId}/can`, JSON.stringify(payload), { qos: 1 });
      console.log(`⚙️ Bus ${busId}: speed=${payload.speed}, fuel=${payload.fuel}, temp=${payload.engine_temp}, doors=${payload.doors}`);
    }
  }, 5000);
}
