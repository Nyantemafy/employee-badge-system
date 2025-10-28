import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import pkg from 'pg';

dotenv.config();
const { Pool } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

// Serve static frontend
app.use(express.static(__dirname));

// Body parsers
app.use(express.json({ limit: '5mb' }));
app.use('/api/save', express.raw({ type: 'application/octet-stream', limit: '200mb' }));

// Ensure folders for saved files
const badgeDir = path.join(__dirname, 'badge');
const histoDir = path.join(__dirname, 'historique');
for (const d of [badgeDir, histoDir]) {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}

// PostgreSQL pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  host: process.env.PGHOST,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  port: process.env.PGPORT ? Number(process.env.PGPORT) : undefined,
  ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : undefined,
});

async function initDb() {
  const sql = `
  CREATE TABLE IF NOT EXISTS employees (
    id SERIAL PRIMARY KEY,
    employee_code VARCHAR(32) UNIQUE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    title TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
  );
  CREATE INDEX IF NOT EXISTS idx_employees_code ON employees(employee_code);
  CREATE INDEX IF NOT EXISTS idx_employees_name ON employees(last_name, first_name);
  `;
  await pool.query(sql);
}

// Minimal REST API
app.get('/api/health', (req, res) => res.json({ ok: true }));

// List employees with pagination and optional search q
app.get('/api/employees', async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(200, Math.max(1, Number(req.query.pageSize) || 20));
    const q = (req.query.q || '').toString().trim();

    const where = [];
    const params = [];
    if (q) {
      params.push(`%${q.replace(/%/g, '')}%`);
      where.push('(first_name ILIKE $' + params.length + ' OR last_name ILIKE $' + params.length + ' OR employee_code ILIKE $' + params.length + ')');
    }
    const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : '';

    const countSql = `SELECT COUNT(*)::int AS total FROM employees ${whereSql}`;
    const countRes = await pool.query(countSql, params);
    const total = countRes.rows[0]?.total || 0;

    params.push(pageSize);
    params.push((page - 1) * pageSize);
    const listSql = `
      SELECT id, employee_code, first_name, last_name, phone, title, created_at
      FROM employees
      ${whereSql}
      ORDER BY id DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `;
    const listRes = await pool.query(listSql, params);

    res.json({ page, pageSize, total, items: listRes.rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create employee
app.post('/api/employees', async (req, res) => {
  try {
    const { firstName, lastName, phone, title } = req.body || {};
    if (!firstName || !lastName || !phone || !title) {
      return res.status(400).json({ error: 'Missing fields' });
    }
    // Generate employee_code like EMP0001
    const seqRes = await pool.query('SELECT COALESCE(MAX(id),0)+1 AS next FROM employees');
    const next = seqRes.rows[0].next;
    const employee_code = 'EMP' + String(next).padStart(4, '0');

    const insertSql = `INSERT INTO employees (employee_code, first_name, last_name, phone, title)
      VALUES ($1,$2,$3,$4,$5) RETURNING id, employee_code, first_name, last_name, phone, title, created_at`;
    const ins = await pool.query(insertSql, [employee_code, firstName, lastName, phone, title]);
    res.status(201).json(ins.rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Save uploaded badge PDF
app.post('/api/save/badge', (req, res) => {
  try {
    const name = (req.query.filename || 'badge.pdf').toString().replace(/[^\w\-.]/g, '_');
    const filePath = path.join(badgeDir, name);
    fs.writeFileSync(filePath, req.body);
    res.json({ ok: true, path: filePath });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Cannot save badge' });
  }
});

// Save uploaded excel
app.post('/api/save/excel', (req, res) => {
  try {
    const name = (req.query.filename || 'employees.xlsx').toString().replace(/[^\w\-.]/g, '_');
    const filePath = path.join(histoDir, name);
    fs.writeFileSync(filePath, req.body);
    res.json({ ok: true, path: filePath });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Cannot save excel' });
  }
});

app.listen(port, async () => {
  try { await initDb(); } catch (e) { console.error('DB init error:', e.message); }
  console.log(`Server listening on http://localhost:${port}`);
});
