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
    const { nom, description, couleur, station_ids } = req.body;
    const [result] = await pool.execute(
      'INSERT INTO lignes (nom, description, couleur) VALUES (?, ?, ?)',
      [nom, description || null, couleur || '#3B82F6']
    );
    const ligneId = result.insertId;

    if (Array.isArray(station_ids) && station_ids.length > 0) {
      for (let i = 0; i < station_ids.length; i++) {
        await pool.execute(
          'UPDATE stations SET ligne_id = ?, ordre = ? WHERE id = ?',
          [ligneId, i + 1, station_ids[i]]
        );
      }
    }

    res.status(201).json({ id: ligneId, message: 'Ligne créée' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function updateLigne(req, res) {
  try {
    const { nom, description, couleur, station_ids } = req.body;
    const ligneId = req.params.id;

    await pool.execute(
      'UPDATE lignes SET nom=?, description=?, couleur=? WHERE id=?',
      [nom, description, couleur, ligneId]
    );

    // Unassign old stations linked to this line
    await pool.execute(
      'UPDATE stations SET ligne_id = NULL WHERE ligne_id = ?',
      [ligneId]
    );

    if (Array.isArray(station_ids) && station_ids.length > 0) {
      for (let i = 0; i < station_ids.length; i++) {
        await pool.execute(
          'UPDATE stations SET ligne_id = ?, ordre = ? WHERE id = ?',
          [ligneId, i + 1, station_ids[i]]
        );
      }
    }

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
