const { pool } = require('../db/pool');

// GET /api/public/stations - list all stations with live bus ETA
async function listStations(req, res) {
  try {
    const [stations] = await pool.execute(`
      SELECT s.*, l.nom AS ligne_nom, l.couleur AS ligne_couleur
      FROM stations s
      LEFT JOIN lignes l ON s.ligne_id = l.id
      ORDER BY l.nom, s.ordre
    `);
    res.json(stations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// GET /api/public/lignes/:id/eta - ETA for buses on this line
async function getLigneETA(req, res) {
  try {
    const ligneId = req.params.id;

    const [buses] = await pool.execute(`
      SELECT b.id, b.numero,
        p.latitude, p.longitude, p.vitesse, p.date_position,
        t.speed AS can_speed
      FROM bus b
      LEFT JOIN (
        SELECT bus_id, latitude, longitude, vitesse, date_position
        FROM positions p1
        WHERE date_position = (SELECT MAX(date_position) FROM positions WHERE bus_id = p1.bus_id)
      ) p ON b.id = p.bus_id
      LEFT JOIN (
        SELECT bus_id, speed
        FROM telemetrie t1
        WHERE date_reception = (SELECT MAX(date_reception) FROM telemetrie WHERE bus_id = t1.bus_id)
      ) t ON b.id = t.bus_id
      WHERE b.ligne_id = ? AND b.etat = 'actif'
    `, [ligneId]);

    const [stations] = await pool.execute(
      'SELECT * FROM stations WHERE ligne_id = ? ORDER BY ordre',
      [ligneId]
    );

    const result = stations.map((station) => {
      const etas = buses
        .map((bus) => {
          if (!bus.latitude) return null;
          const dist = haversine(bus.latitude, bus.longitude, station.latitude, station.longitude);
          const speed = bus.can_speed || bus.vitesse || 30;
          const etaMinutes = speed > 0 ? Math.round((dist / speed) * 60) : null;
          return { bus_id: bus.id, bus_numero: bus.numero, distance_km: dist.toFixed(2), eta_minutes: etaMinutes };
        })
        .filter(Boolean);

      return { ...station, bus_etas: etas };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

module.exports = { listStations, getLigneETA };
