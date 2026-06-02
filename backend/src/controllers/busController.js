const { pool } = require('../db/pool');

async function listBus(req, res) {
  try {
    const [rows] = await pool.execute(`
      SELECT b.*, l.nom AS ligne_nom,
        p.latitude, p.longitude, p.vitesse, p.date_position,
        t.fuel, t.engine_temp, t.doors, t.speed AS can_speed
      FROM bus b
      LEFT JOIN lignes l ON b.ligne_id = l.id
      LEFT JOIN (
        SELECT bus_id, latitude, longitude, vitesse, date_position
        FROM positions p1
        WHERE date_position = (SELECT MAX(date_position) FROM positions WHERE bus_id = p1.bus_id)
      ) p ON b.id = p.bus_id
      LEFT JOIN (
        SELECT bus_id, fuel, engine_temp, doors, speed, date_reception
        FROM telemetrie t1
        WHERE date_reception = (SELECT MAX(date_reception) FROM telemetrie WHERE bus_id = t1.bus_id)
      ) t ON b.id = t.bus_id
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function getBus(req, res) {
  try {
    const [rows] = await pool.execute(
      'SELECT b.*, l.nom AS ligne_nom FROM bus b LEFT JOIN lignes l ON b.ligne_id = l.id WHERE b.id = ?',
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Bus introuvable' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function getActiveBuses(req, res) {
  try {
    const [rows] = await pool.execute(`
      SELECT b.*, l.nom AS ligne_nom,
        p.latitude, p.longitude, p.vitesse, p.date_position,
        t.fuel, t.engine_temp, t.doors, t.speed AS can_speed
      FROM bus b
      LEFT JOIN lignes l ON b.ligne_id = l.id
      LEFT JOIN (
        SELECT bus_id, latitude, longitude, vitesse, date_position
        FROM positions p1
        WHERE date_position = (SELECT MAX(date_position) FROM positions WHERE bus_id = p1.bus_id)
      ) p ON b.id = p.bus_id
      LEFT JOIN (
        SELECT bus_id, fuel, engine_temp, doors, speed, date_reception
        FROM telemetrie t1
        WHERE date_reception = (SELECT MAX(date_reception) FROM telemetrie WHERE bus_id = t1.bus_id)
      ) t ON b.id = t.bus_id
      WHERE b.etat = 'actif'
    `);

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function getBusPosition(req, res) {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM positions WHERE bus_id = ? ORDER BY date_position DESC LIMIT 1',
      [req.params.id]
    );
    res.json(rows[0] || null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function getBusTelemetrie(req, res) {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM telemetrie WHERE bus_id = ? ORDER BY date_reception DESC LIMIT 1',
      [req.params.id]
    );
    res.json(rows[0] || null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function getBusHistorique(req, res) {
  try {
    const { from, to, page = '1', limit = '50' } = req.query;
    const pageNumber = Math.max(1, parseInt(page, 10) || 1);
    const pageSize = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));
    const offset = (pageNumber - 1) * pageSize;
    let query = 'SELECT * FROM positions WHERE bus_id = ?';
    const params = [req.params.id];

    if (from) {
      query += ' AND date_position >= ?';
      params.push(from);
    }
    if (to) {
      query += ' AND date_position <= ?';
      params.push(to);
    }

    query += ' ORDER BY date_position DESC LIMIT ? OFFSET ?';
    params.push(pageSize, offset);
    const [rows] = await pool.execute(query, params);

    let countQuery = 'SELECT COUNT(*) AS total FROM positions WHERE bus_id = ?';
    const countParams = [req.params.id];
    if (from) {
      countQuery += ' AND date_position >= ?';
      countParams.push(from);
    }
    if (to) {
      countQuery += ' AND date_position <= ?';
      countParams.push(to);
    }

    const [countRows] = await pool.execute(countQuery, countParams);
    res.json({
      data: rows,
      meta: {
        page: pageNumber,
        limit: pageSize,
        total: countRows[0]?.total || 0,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function createBus(req, res) {
  try {
    const { immatriculation, numero, ligne_id, etat, capacite } = req.body;
    const [result] = await pool.execute(
      'INSERT INTO bus (immatriculation, numero, ligne_id, etat, capacite) VALUES (?, ?, ?, ?, ?)',
      [immatriculation, numero, ligne_id || null, etat || 'inactif', capacite || 50]
    );
    res.status(201).json({ id: result.insertId, message: 'Bus créé' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Immatriculation déjà existante' });
    res.status(500).json({ error: err.message });
  }
}

async function updateBus(req, res) {
  try {
    const { immatriculation, numero, ligne_id, etat, capacite } = req.body;
    await pool.execute(
      'UPDATE bus SET immatriculation=?, numero=?, ligne_id=?, etat=?, capacite=? WHERE id=?',
      [immatriculation, numero, ligne_id || null, etat, capacite, req.params.id]
    );
    res.json({ message: 'Bus mis à jour' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function deleteBus(req, res) {
  try {
    await pool.execute('DELETE FROM bus WHERE id = ?', [req.params.id]);
    res.json({ message: 'Bus supprimé' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { listBus, getActiveBuses, getBus, getBusPosition, getBusTelemetrie, getBusHistorique, createBus, updateBus, deleteBus };
