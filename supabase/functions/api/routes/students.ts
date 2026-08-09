import { Hono } from 'npm:hono@4';
import crypto from 'node:crypto';
import bcrypt from 'npm:bcryptjs@2.4.3';
import { query, pool } from '../lib/db.ts';
import { requireAuth, requireRole, JwtPayload } from '../lib/auth.ts';
import { parseCsv, sendCsv } from '../lib/csv.ts';

const IMPORT_TEMPLATE_COLUMNS = ['admissionNo', 'fullName', 'email', 'className', 'section', 'guardianName', 'guardianContact', 'dateOfBirth'];

const students = new Hono();
const canManage = requireRole('super_admin', 'head_master', 'office_admin');
const canView = requireRole('super_admin', 'head_master', 'group_coordinator', 'teacher', 'office_admin');

students.use('*', requireAuth);

students.get('/', canView, async (c) => {
  const q = c.req.query();
  const search = q.search ?? '';
  const classId = q.classId;
  const limit = Math.min(Number(q.pageSize) || 20, 100);
  const page = Math.max(Number(q.page) || 1, 1);
  const offset = (page - 1) * limit;

  const conditions: string[] = [];
  const params: unknown[] = [];
  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(s.full_name ILIKE $${params.length} OR s.admission_no ILIKE $${params.length})`);
  }
  if (classId) {
    params.push(classId);
    conditions.push(`s.class_id = $${params.length}`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await query(`SELECT COUNT(*) FROM students s ${where}`, params);
  params.push(limit, offset);
  const { rows } = await query(
    `SELECT s.id, s.admission_no, s.full_name, s.guardian_name, s.guardian_contact,
            s.date_of_birth, s.user_id, u.email,
            c.name AS class_name, c.section AS class_section
     FROM students s
     LEFT JOIN classes c ON c.id = s.class_id
     LEFT JOIN users u ON u.id = s.user_id
     ${where}
     ORDER BY s.full_name
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  return c.json({
    data: rows,
    total: Number(countResult.rows[0].count),
    page,
    pageSize: limit,
  });
});

// deno-lint-ignore no-explicit-any
async function createStudentUser(client: any, { email, fullName, password }: { email: string; fullName: string; password?: string }) {
  const tempPassword = password || crypto.randomBytes(6).toString('base64url');
  const passwordHash = await bcrypt.hash(tempPassword, 10);

  const { rows: roleRows } = await client.query(`SELECT id FROM roles WHERE name = 'student'`);
  const { rows: userRows } = await client.query(
    `INSERT INTO users (full_name, email, password_hash, role_id) VALUES ($1, $2, $3, $4) RETURNING id`,
    [fullName, email, passwordHash, roleRows[0].id]
  );
  return { userId: userRows[0].id, tempPassword };
}

students.get('/import-template', canManage, (c) =>
  sendCsv(c, 'student_import_template.csv', [
    { admissionNo: 'ADM-2001', fullName: 'Jane Doe', email: 'jane.doe@eduflow.test', className: 'Grade 8', section: 'A', guardianName: 'John Doe', guardianContact: '555-0100', dateOfBirth: '2011-05-14' },
  ], IMPORT_TEMPLATE_COLUMNS)
);

students.get('/export', canManage, async (c) => {
  const classId = c.req.query('classId');
  const params: unknown[] = [];
  let where = '';
  if (classId) {
    params.push(classId);
    where = `WHERE s.class_id = $1`;
  }
  const { rows } = await query(
    `SELECT s.admission_no AS "admissionNo", s.full_name AS "fullName", u.email AS "email",
            c.name AS "className", c.section AS "section",
            s.guardian_name AS "guardianName", s.guardian_contact AS "guardianContact",
            s.date_of_birth AS "dateOfBirth"
     FROM students s
     LEFT JOIN classes c ON c.id = s.class_id
     LEFT JOIN users u ON u.id = s.user_id
     ${where}
     ORDER BY s.full_name`,
    params
  );
  return sendCsv(c, 'students_export.csv', rows, IMPORT_TEMPLATE_COLUMNS);
});

students.post('/bulk-import', canManage, async (c) => {
  const { csvText } = await c.req.json();
  if (!csvText) return c.json({ error: 'csvText is required' }, 400);

  let rows;
  try {
    rows = parseCsv(csvText);
  } catch (err) {
    return c.json({ error: `Could not parse CSV: ${(err as Error).message}` }, 400);
  }

  const results = { imported: 0, skipped: 0, errors: [] as unknown[], credentials: [] as unknown[] };

  for (const [index, row] of (rows as Record<string, string>[]).entries()) {
    const rowNum = index + 2;
    if (!row.admissionNo || !row.fullName) {
      results.errors.push({ row: rowNum, error: 'Missing admissionNo or fullName' });
      continue;
    }

    let classId: number | null = null;
    if (row.className && row.section) {
      const { rows: classRows } = await query(
        'SELECT id FROM classes WHERE name = $1 AND section = $2',
        [row.className, row.section]
      );
      if (classRows[0]) classId = classRows[0].id;
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      let userId: number | null = null;
      let tempPassword: string | undefined;
      if (row.email) {
        const created = await createStudentUser(client, { email: row.email, fullName: row.fullName });
        userId = created.userId;
        tempPassword = created.tempPassword;
      }

      const { rows: inserted } = await client.query(
        `INSERT INTO students (admission_no, full_name, class_id, guardian_name, guardian_contact, date_of_birth, user_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (admission_no) DO NOTHING
         RETURNING id`,
        [row.admissionNo, row.fullName, classId, row.guardianName || null, row.guardianContact || null, row.dateOfBirth || null, userId]
      );

      if (inserted[0]) {
        await client.query('COMMIT');
        results.imported += 1;
        if (tempPassword) results.credentials.push({ email: row.email, temporaryPassword: tempPassword });
      } else {
        await client.query('ROLLBACK');
        results.skipped += 1;
        results.errors.push({ row: rowNum, error: `Duplicate admission number: ${row.admissionNo}` });
      }
    } catch (err) {
      await client.query('ROLLBACK');
      results.skipped += 1;
      results.errors.push({
        row: rowNum,
        error: (err as { code?: string; message: string }).code === '23505' ? `Duplicate email: ${row.email}` : (err as Error).message,
      });
    } finally {
      client.release();
    }
  }

  return c.json(results, 201);
});

students.post('/', canManage, async (c) => {
  const user = c.get('user') as JwtPayload;
  const { admissionNo, fullName, email, classId, guardianName, guardianContact, dateOfBirth } = await c.req.json();
  if (!admissionNo || !fullName) {
    return c.json({ error: 'admissionNo and fullName are required' }, 400);
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let userId: number | null = null;
    let temporaryPassword: string | undefined;
    if (email) {
      const created = await createStudentUser(client, { email, fullName });
      userId = created.userId;
      temporaryPassword = created.tempPassword;
    }

    const { rows } = await client.query(
      `INSERT INTO students (admission_no, full_name, class_id, guardian_name, guardian_contact, date_of_birth, user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [admissionNo, fullName, classId || null, guardianName || null, guardianContact || null, dateOfBirth || null, userId]
    );

    await client.query('COMMIT');
    return c.json({ ...rows[0], temporaryPassword }, 201);
  } catch (err) {
    await client.query('ROLLBACK');
    if ((err as { code?: string }).code === '23505') {
      return c.json({ error: 'That admission number or email is already in use' }, 409);
    }
    throw err;
  } finally {
    client.release();
  }
});

students.put('/:id', canManage, async (c) => {
  const id = c.req.param('id');
  const { fullName, classId, guardianName, guardianContact, dateOfBirth } = await c.req.json();
  const { rows } = await query(
    `UPDATE students SET
       full_name = COALESCE($1, full_name),
       class_id = COALESCE($2, class_id),
       guardian_name = COALESCE($3, guardian_name),
       guardian_contact = COALESCE($4, guardian_contact),
       date_of_birth = COALESCE($5, date_of_birth),
       updated_at = now()
     WHERE id = $6 RETURNING *`,
    [fullName, classId, guardianName, guardianContact, dateOfBirth, id]
  );
  if (!rows[0]) return c.json({ error: 'Student not found' }, 404);
  return c.json(rows[0]);
});

students.post('/:id/create-login', canManage, async (c) => {
  const id = c.req.param('id');
  const { email } = await c.req.json();
  if (!email) return c.json({ error: 'email is required' }, 400);

  const { rows: studentRows } = await query('SELECT full_name, user_id FROM students WHERE id = $1', [id]);
  if (!studentRows[0]) return c.json({ error: 'Student not found' }, 404);
  if (studentRows[0].user_id) return c.json({ error: 'This student already has a login' }, 409);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { userId, tempPassword } = await createStudentUser(client, { email, fullName: studentRows[0].full_name });
    await client.query('UPDATE students SET user_id = $1 WHERE id = $2', [userId, id]);
    await client.query('COMMIT');
    return c.json({ email, temporaryPassword: tempPassword }, 201);
  } catch (err) {
    await client.query('ROLLBACK');
    if ((err as { code?: string }).code === '23505') {
      return c.json({ error: 'That email is already in use' }, 409);
    }
    throw err;
  } finally {
    client.release();
  }
});

students.delete('/:id', canManage, async (c) => {
  const id = c.req.param('id');
  const { rowCount } = await query('DELETE FROM students WHERE id = $1', [id]);
  if (!rowCount) return c.json({ error: 'Student not found' }, 404);
  return c.body(null, 204);
});

export default students;
