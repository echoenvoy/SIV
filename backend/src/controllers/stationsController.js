const { pool } = require('../db/pool');

async function createStation(req, res) {
  try {
    const { nom, latitude, longitude, ligne_id, ordre } = req.body;
    const [result] = await pool.execute(
      'INSERT INTO stations (nom, latitude, longitude, ligne_id, ordre) VALUES (?, ?, ?, ?, ?)',
      [nom, latitude, longitude, ligne_id || null, ordre || 0]
    );
    res.status(201).json({ id: result.insertId, message: 'Station créée' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function updateStation(req, res) {
  try {
    const { nom, latitude, longitude, ligne_id, ordre } = req.body;
    await pool.execute(
      'UPDATE stations SET nom = ?, latitude = ?, longitude = ?, ligne_id = ?, ordre = ? WHERE id = ?',
      [nom, latitude, longitude, ligne_id || null, ordre || 0, req.params.id]
    );
    res.json({ message: 'Station mise à jour' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function deleteStation(req, res) {
  try {
    await pool.execute('DELETE FROM stations WHERE id = ?', [req.params.id]);
    res.json({ message: 'Station supprimée' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { createStation, updateStation, deleteStation };
