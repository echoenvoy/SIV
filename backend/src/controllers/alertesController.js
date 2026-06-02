const { pool } = require('../db/pool');

async function listAlertes(req, res) {
  try {
    const { acquittee, bus_id } = req.query;
    let query = `
      SELECT a.*, b.numero AS bus_numero, b.immatriculation
      FROM alertes a JOIN bus b ON a.bus_id = b.id
      WHERE 1=1
    `;
    const params = [];

    if (acquittee !== undefined) {
      query += ' AND a.acquittee = ?';
      params.push(acquittee === 'true' ? 1 : 0);
    }
    if (bus_id) {
      query += ' AND a.bus_id = ?';
      params.push(bus_id);
    }

    query += ' ORDER BY a.created_at DESC LIMIT 100';
    const [rows] = await pool.execute(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function acquitterAlerte(req, res) {
  try {
    await pool.execute('UPDATE alertes SET acquittee = TRUE WHERE id = ?', [req.params.id]);
    res.json({ message: 'Alerte acquittée' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function acquitterToutes(req, res) {
  try {
    await pool.execute('UPDATE alertes SET acquittee = TRUE WHERE acquittee = FALSE');
    res.json({ message: 'Toutes les alertes acquittées' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { listAlertes, acquitterAlerte, acquitterToutes };
