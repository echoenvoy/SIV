const { pool } = require('../db/pool');

async function listLignes(req, res) {
  try {
    const [rows] = await pool.execute('SELECT * FROM lignes ORDER BY nom');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function getLigne(req, res) {
  try {
    const [rows] = await pool.execute('SELECT * FROM lignes WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Ligne introuvable' });
    const [stations] = await pool.execute(
      'SELECT * FROM stations WHERE ligne_id = ? ORDER BY ordre',
      [req.params.id]
    );
    res.json({ ...rows[0], stations });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function createLigne(req, res) {
  try {
    const { nom, description, couleur } = req.body;
    const [result] = await pool.execute(
      'INSERT INTO lignes (nom, description, couleur) VALUES (?, ?, ?)',
      [nom, description || null, couleur || '#3B82F6']
    );
    res.status(201).json({ id: result.insertId, message: 'Ligne créée' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function updateLigne(req, res) {
  try {
    const { nom, description, couleur } = req.body;
    await pool.execute(
      'UPDATE lignes SET nom=?, description=?, couleur=? WHERE id=?',
      [nom, description, couleur, req.params.id]
    );
    res.json({ message: 'Ligne mise à jour' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function deleteLigne(req, res) {
  try {
    await pool.execute('DELETE FROM lignes WHERE id = ?', [req.params.id]);
    res.json({ message: 'Ligne supprimée' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { listLignes, getLigne, createLigne, updateLigne, deleteLigne };
