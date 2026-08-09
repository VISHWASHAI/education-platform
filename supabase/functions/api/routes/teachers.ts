import { Hono } from 'npm:hono@4';
import crypto from 'node:crypto';
import bcrypt from 'npm:bcryptjs@2.4.3';
import { query, pool } from '../lib/db.ts';
import { requireAuth, requireRole } from '../lib/auth.ts';
import { parseCsv, sendCsv } from '../lib/csv.ts';

const IMPORT_TEMPLATE_COLUMNS = ['fullName', 'email', 'department', 'specialization'];

const teachers = new Hono();
const canManage = requireRole('super_admin', 'head_master', 'office_admin');
const canView = requireRole('super_admin', 'head_master', 'group_coordinator', 'teacher', 'office_admin');

teachers.use('*', requireAuth);

teachers.get('/', canView, async (c) => {
  const q = c.req.query();
  const search = q.search ?? '';
  const limit = Math.min(Number(q.pageSize) || 20, 100);
  const page = Math.max(Number(q.page) || 1, 1);
  const offset = (page - 1) * limit;

  const params: unknown[] = [];
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

  return c.json({ data: rows, total: Number(countResult.rows[0].count), page, pageSize: limit });
});

teachers.get('/import-template', canManage, (c) =>
  sendCsv(c, 'teacher_import_template.csv', [
    { fullName: 'Alex Rivera', email: 'alex.rivera@eduflow.test', department: 'Science', specialization: 'Biology' },
  ], IMPORT_TEMPLATE_COLUMNS)
);

teachers.get('/export', canManage, async (c) => {
  const { rows } = await query(
    `SELECT u.full_name AS "fullName", u.email AS "email", t.department AS "department", t.specialization AS "specialization"
     FROM teachers t JOIN users u ON u.id = t.user_id
     ORDER BY u.full_name`
  );
  return sendCsv(c, 'teachers_export.csv', rows, IMPORT_TEMPLATE_COLUMNS);
});

teachers.post('/bulk-import', canManage, async (c) => {
  const { csvText } = await c.req.json();
  if (!csvText) return c.json({ error: 'csvText is required' }, 400);

  let rows;
  try {
    rows = parseCsv(csvText);
  } catch (err) {
    return c.json({ error: `Could not parse CSV: ${(err as Error).message}` }, 400);
  }

  const { rows: roleRows } = await query(`SELECT id FROM roles WHERE name = 'teacher'`);
  const roleId = roleRows[0].id;

  const results = { imported: 0, skipped: 0, errors: [] as unknown[], credentials: [] as unknown[] };

  for (const [index, row] of (rows as Record<string, string>[]).entries()) {
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
        error: (err as { code?: string }).code === '23505' ? `Duplicate email: ${row.email}` : (err as Error).message,
      });
    } finally {
      client.release();
    }
  }

  return c.json(results, 201);
});

teachers.post('/', canManage, async (c) => {
  const { fullName, email, department, specialization, password } = await c.req.json();
  if (!fullName || !email) {
    return c.json({ error: 'fullName and email are required' }, 400);
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
    return c.json({
      ...teacherRows[0],
      fullName,
      email,
      temporaryPassword: password ? undefined : tempPassword,
    }, 201);
  } catch (err) {
    await client.query('ROLLBACK');
    if ((err as { code?: string }).code === '23505') {
      return c.json({ error: 'A user with that email already exists' }, 409);
    }
    throw err;
  } finally {
    client.release();
  }
});

teachers.put('/:id', canManage, async (c) => {
  const id = c.req.param('id');
  const { fullName, department, specialization, isActive } = await c.req.json();

  const { rows: existing } = await query('SELECT user_id FROM teachers WHERE id = $1', [id]);
  if (!existing[0]) return c.json({ error: 'Teacher not found' }, 404);

  await query(
    `UPDATE users SET full_name = COALESCE($1, full_name), is_active = COALESCE($2, is_active), updated_at = now() WHERE id = $3`,
    [fullName, isActive, existing[0].user_id]
  );
  const { rows } = await query(
    `UPDATE teachers SET department = COALESCE($1, department), specialization = COALESCE($2, specialization) WHERE id = $3 RETURNING *`,
    [department, specialization, id]
  );
  return c.json(rows[0]);
});

teachers.delete('/:id', canManage, async (c) => {
  const id = c.req.param('id');
  try {
    const { rows } = await query('DELETE FROM teachers WHERE id = $1 RETURNING user_id', [id]);
    if (!rows[0]) return c.json({ error: 'Teacher not found' }, 404);
    await query('DELETE FROM users WHERE id = $1', [rows[0].user_id]);
    return c.body(null, 204);
  } catch (err) {
    if ((err as { code?: string }).code === '23503') {
      return c.json({
        error: 'This teacher still has associated records (led classes, exams, assignments, messages, etc.). Deactivate the account instead, or reassign those records first.',
      }, 409);
    }
    throw err;
  }
});

export default teachers;
