import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { query, pool } from '../db/pool.js';
import { parseCsv, sendCsv } from '../utils/csv.js';

const IMPORT_TEMPLATE_COLUMNS = ['fullName', 'email', 'department', 'specialization'];

export async function listTeachers(req, res) {
  const { search = '', page = 1, pageSize = 20 } = req.query;
  const limit = Math.min(Number(pageSize) || 20, 100);
  const offset = (Math.max(Number(page) || 1, 1) - 1) * limit;

  const params = [];
  let where = '';
  if (search) {
    params.push(`%${search}%`);
    where = `WHERE (u.full_name ILIKE $${params.length} OR u.email ILIKE $${params.length} OR t.department ILIKE $${params.length})`;
  }

  const countResult = await query(
    `SELECT COUNT(*) FROM teachers t JOIN users u ON u.id = t.user_id ${where}`,
    params
  );
  params.push(limit, offset);
  const { rows } = await query(
    `SELECT t.id, t.department, t.specialization, u.id AS user_id, u.full_name, u.email, u.is_active
     FROM teachers t JOIN users u ON u.id = t.user_id
     ${where}
     ORDER BY u.full_name
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  res.json({ data: rows, total: Number(countResult.rows[0].count), page: Number(page), pageSize: limit });
}

export async function createTeacher(req, res) {
  const { fullName, email, department, specialization, password } = req.body;
  if (!fullName || !email) {
    return res.status(400).json({ error: 'fullName and email are required' });
  }

  const tempPassword = password || crypto.randomBytes(6).toString('base64url');
  const passwordHash = await bcrypt.hash(tempPassword, 10);

  const { rows: roleRows } = await query(`SELECT id FROM roles WHERE name = 'teacher'`);
  const roleId = roleRows[0].id;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: userRows } = await client.query(
      `INSERT INTO users (full_name, email, password_hash, role_id) VALUES ($1, $2, $3, $4) RETURNING id`,
      [fullName, email, passwordHash, roleId]
    );
    const { rows: teacherRows } = await client.query(
      `INSERT INTO teachers (user_id, department, specialization) VALUES ($1, $2, $3) RETURNING *`,
      [userRows[0].id, department || null, specialization || null]
    );
    await client.query('COMMIT');
    res.status(201).json({
      ...teacherRows[0],
      fullName,
      email,
      temporaryPassword: password ? undefined : tempPassword,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') {
      return res.status(409).json({ error: 'A user with that email already exists' });
    }
    throw err;
  } finally {
    client.release();
  }
}

export async function updateTeacher(req, res) {
  const { id } = req.params;
  const { fullName, department, specialization, isActive } = req.body;

  const { rows: existing } = await query('SELECT user_id FROM teachers WHERE id = $1', [id]);
  if (!existing[0]) return res.status(404).json({ error: 'Teacher not found' });

  await query(
    `UPDATE users SET full_name = COALESCE($1, full_name), is_active = COALESCE($2, is_active), updated_at = now() WHERE id = $3`,
    [fullName, isActive, existing[0].user_id]
  );
  const { rows } = await query(
    `UPDATE teachers SET department = COALESCE($1, department), specialization = COALESCE($2, specialization) WHERE id = $3 RETURNING *`,
    [department, specialization, id]
  );
  res.json(rows[0]);
}

export async function deleteTeacher(req, res) {
  const { id } = req.params;
  try {
    const { rows } = await query('DELETE FROM teachers WHERE id = $1 RETURNING user_id', [id]);
    if (!rows[0]) return res.status(404).json({ error: 'Teacher not found' });
    await query('DELETE FROM users WHERE id = $1', [rows[0].user_id]);
    res.status(204).end();
  } catch (err) {
    if (err.code === '23503') {
      return res.status(409).json({
        error: 'This teacher still has associated records (led classes, exams, assignments, messages, etc.). Deactivate the account instead, or reassign those records first.',
      });
    }
    throw err;
  }
}

export function downloadTeacherImportTemplate(req, res) {
  sendCsv(res, 'teacher_import_template.csv', [
    { fullName: 'Alex Rivera', email: 'alex.rivera@eduflow.test', department: 'Science', specialization: 'Biology' },
  ], IMPORT_TEMPLATE_COLUMNS);
}

export async function bulkImportTeachers(req, res) {
  const { csvText } = req.body;
  if (!csvText) return res.status(400).json({ error: 'csvText is required' });

  let rows;
  try {
    rows = parseCsv(csvText);
  } catch (err) {
    return res.status(400).json({ error: `Could not parse CSV: ${err.message}` });
  }

  const { rows: roleRows } = await query(`SELECT id FROM roles WHERE name = 'teacher'`);
  const roleId = roleRows[0].id;

  const results = { imported: 0, skipped: 0, errors: [], credentials: [] };

  for (const [index, row] of rows.entries()) {
    const rowNum = index + 2;
    if (!row.fullName || !row.email) {
      results.errors.push({ row: rowNum, error: 'Missing fullName or email' });
      continue;
    }

    const tempPassword = crypto.randomBytes(6).toString('base64url');
    const passwordHash = await bcrypt.hash(tempPassword, 10);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows: userRows } = await client.query(
        `INSERT INTO users (full_name, email, password_hash, role_id) VALUES ($1, $2, $3, $4) RETURNING id`,
        [row.fullName, row.email, passwordHash, roleId]
      );
      await client.query(
        `INSERT INTO teachers (user_id, department, specialization) VALUES ($1, $2, $3)`,
        [userRows[0].id, row.department || null, row.specialization || null]
      );
      await client.query('COMMIT');
      results.imported += 1;
      results.credentials.push({ email: row.email, temporaryPassword: tempPassword });
    } catch (err) {
      await client.query('ROLLBACK');
      results.skipped += 1;
      results.errors.push({
        row: rowNum,
        error: err.code === '23505' ? `Duplicate email: ${row.email}` : err.message,
      });
    } finally {
      client.release();
    }
  }

  res.status(201).json(results);
}

export async function exportTeachers(req, res) {
  const { rows } = await query(
    `SELECT u.full_name AS "fullName", u.email AS "email", t.department AS "department", t.specialization AS "specialization"
     FROM teachers t JOIN users u ON u.id = t.user_id
     ORDER BY u.full_name`
  );
  sendCsv(res, 'teachers_export.csv', rows, IMPORT_TEMPLATE_COLUMNS);
}
