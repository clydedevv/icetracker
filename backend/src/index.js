import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pkg from 'pg';

const { Pool } = pkg;

const app = express();
const PORT = process.env.PORT || 4000;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://icetracker:icetracker@localhost:5432/icetracker'
});

app.use(helmet());
app.use(express.json());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || '*'
  })
);

// Basic health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Initialize DB (simple MVP schema)
async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS reports (
      id SERIAL PRIMARY KEY,
      created_at TIMESTAMPTZ DEFAULT now(),
      status TEXT NOT NULL DEFAULT 'pending', -- pending | approved | rejected
      confirmation_status TEXT NOT NULL DEFAULT 'non_confirmed', -- confirmed | non_confirmed
      source_type TEXT NOT NULL DEFAULT 'web', -- web | telegram | signal | other
      title TEXT,
      description TEXT,
      type TEXT NOT NULL, -- Critical | Active | Observed | Other
      latitude DOUBLE PRECISION NOT NULL,
      longitude DOUBLE PRECISION NOT NULL
    );
  `);
}

// Create report (public)
app.post('/api/reports', async (req, res) => {
  try {
    const { title, description, type, latitude, longitude, sourceType } = req.body;

    if (!type || !latitude || !longitude) {
      return res.status(400).json({ error: 'type, latitude, and longitude are required' });
    }

    const result = await pool.query(
      `INSERT INTO reports (title, description, type, latitude, longitude, source_type)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [title || null, description || null, type, latitude, longitude, sourceType || 'web']
    );

    res.status(201).json({ report: result.rows[0] });
  } catch (err) {
    console.error('Error creating report', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// List reports (public, only approved)
app.get('/api/reports', async (req, res) => {
  try {
    const { type, status, confirmation_status } = req.query;

    const conditions = ['status = $1'];
    const values = ['approved'];
    let idx = 2;

    if (type) {
      conditions.push(`type = $${idx++}`);
      values.push(type);
    }
    if (status) {
      conditions.push(`status = $${idx++}`);
      values.push(status);
    }
    if (confirmation_status) {
      conditions.push(`confirmation_status = $${idx++}`);
      values.push(confirmation_status);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await pool.query(
      `SELECT * FROM reports ${where} ORDER BY created_at DESC LIMIT 1000`,
      values
    );

    res.json({ reports: result.rows });
  } catch (err) {
    console.error('Error listing reports', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Moderation endpoints (MVP: simple shared secret header)
function requireModerator(req, res, next) {
  const token = req.headers['x-moderator-token'];
  if (!process.env.MODERATOR_TOKEN || token !== process.env.MODERATOR_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// List pending reports for moderation
app.get('/api/mod/reports', requireModerator, async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM reports WHERE status = 'pending' ORDER BY created_at ASC LIMIT 500`
    );
    res.json({ reports: result.rows });
  } catch (err) {
    console.error('Error listing pending reports', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Approve / reject report
app.post('/api/mod/reports/:id', requireModerator, async (req, res) => {
  try {
    const { id } = req.params;
    const { action, confirmationStatus } = req.body; // action: approve|reject

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'action must be approve or reject' });
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    const newConfirmation = confirmationStatus || 'non_confirmed';

    const result = await pool.query(
      `UPDATE reports
       SET status = $1,
           confirmation_status = $2
       WHERE id = $3
       RETURNING *`,
      [newStatus, newConfirmation, id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Report not found' });
    }

    res.json({ report: result.rows[0] });
  } catch (err) {
    console.error('Error moderating report', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`ICETracker backend listening on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize database', err);
    process.exit(1);
  });

