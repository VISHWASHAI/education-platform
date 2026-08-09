import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { query, pool } from '../db/pool.js';
import { parseCsv, sendCsv } from '../utils/csv.js';

const IMPORT_TEMPLATE_COLUMNS = ['admissionNo', 'fullName', 'email', 'className', 'section', 'guardianName', 'guardianContact', 'dateOfBirth'];

export async function listStudents(req, res) {
  const { search = '', classId, page = 1, pageSize = 20 } = req.query;
  const limit = Math.min(Number(pageSize) || 20, 100);
  const offset = (Math.max(Number(page) || 1, 1) - 1) * limit;

  const conditions = [];
  const params = [];

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

  res.json({
    data: rows,
    total: Number(countResult.rows[0].count),
    page: Number(page),
    pageSize: limit,
  });
}

async function createStudentUser(client, { email, fullName, password }) {
  const tempPassword = password || crypto.randomBytes(6).toString('base64url');
  const passwordHash = await bcrypt.hash(tempPassword, 10);

  const { rows: roleRows } = await client.query(`SELECT id FROM roles WHERE name = 'student'`);
  const { rows: userRows } = await client.query(
    `INSERT INTO users (full_name, email, password_hash, role_id) VALUES ($1, $2, $3, $4) RETURNING id`,
    [fullName, email, passwordHash, roleRows[0].id]
  );
  return { userId: userRows[0].id, tempPassword };
}

export async function createStudent(req, res) {
  const { admissionNo, fullName, email, classId, guardianName, guardianContact, dateOfBirth } = req.body;
  if (!admissionNo || !fullName) {
    return res.status(400).json({ error: 'admissionNo and fullName are required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let userId = null;
    let temporaryPassword;
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
    res.status(201).json({ ...rows[0], temporaryPassword });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') {
      return res.status(409).json({ error: 'That admission number or email is already in use' });
    }
    throw err;
  } finally {
    client.release();
  }
}

export async function createStudentLogin(req, res) {
  const { id } = req.params;
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'email is required' });

  const { rows: studentRows } = await query('SELECT full_name, user_id FROM students WHERE id = $1', [id]);
  if (!studentRows[0]) return res.status(404).json({ error: 'Student not found' });
  if (studentRows[0].user_id) return res.status(409).json({ error: 'This student already has a login' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { userId, tempPassword } = await createStudentUser(client, { email, fullName: studentRows[0].full_name });
    await client.query('UPDATE students SET user_id = $1 WHERE id = $2', [userId, id]);
    await client.query('COMMIT');
    res.status(201).json({ email, temporaryPassword: tempPassword });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') {
      return res.status(409).json({ error: 'That email is already in use' });
    }
    throw err;
  } finally {
    client.release();
  }
}

export async function updateStudent(req, res) {
  const { id } = req.params;
  const { fullName, classId, guardianName, guardianContact, dateOfBirth } = req.body;
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
  if (!rows[0]) return res.status(404).json({ error: 'Student not found' });
  res.json(rows[0]);
}

export async function deleteStudent(req, res) {
  const { id } = req.params;
  const { rowCount } = await query('DELETE FROM students WHERE id = $1', [id]);
  if (!rowCount) return res.status(404).json({ error: 'Student not found' });
  res.status(204).end();
}

export function downloadStudentImportTemplate(req, res) {
  sendCsv(res, 'student_import_template.csv', [
    { admissionNo: 'ADM-2001', fullName: 'Jane Doe', email: 'jane.doe@eduflow.test', className: 'Grade 8', section: 'A', guardianName: 'John Doe', guardianContact: '555-0100', dateOfBirth: '2011-05-14' },
  ], IMPORT_TEMPLATE_COLUMNS);
}

export async function bulkImportStudents(req, res) {
  const { csvText } = req.body;
  if (!csvText) return res.status(400).json({ error: 'csvText is required' });

  let rows;
  try {
    rows = parseCsv(csvText);
  } catch (err) {
    return res.status(400).json({ error: `Could not parse CSV: ${err.message}` });
  }

  const results = { imported: 0, skipped: 0, errors: [], credentials: [] };

  for (const [index, row] of rows.entries()) {
    const rowNum = index + 2; // account for header row
    if (!row.admissionNo || !row.fullName) {
      results.errors.push({ row: rowNum, error: 'Missing admissionNo or fullName' });
      continue;
    }

    let classId = null;
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

      let userId = null;
      let tempPassword;
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
        error: err.code === '23505' ? `Duplicate email: ${row.email}` : err.message,
      });
    } finally {
      client.release();
    }
  }

  res.status(201).json(results);
}

export async function exportStudents(req, res) {
  const { classId } = req.query;
  const params = [];
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
  sendCsv(res, 'students_export.csv', rows, IMPORT_TEMPLATE_COLUMNS);
}
