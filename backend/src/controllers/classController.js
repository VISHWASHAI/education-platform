import { query } from '../db/pool.js';

export async function listClasses(req, res) {
  const { rows } = await query(
    `SELECT c.id, c.name, c.section, c.lead_teacher_id,
            u.full_name AS lead_teacher_name,
            (SELECT COUNT(*) FROM students s WHERE s.class_id = c.id) AS student_count
     FROM classes c
     LEFT JOIN users u ON u.id = c.lead_teacher_id
     ORDER BY c.name, c.section`
  );
  res.json(rows);
}

export async function createClass(req, res) {
  const { name, section, leadTeacherId } = req.body;
  if (!name || !section) {
    return res.status(400).json({ error: 'name and section are required' });
  }
  try {
    const { rows } = await query(
      `INSERT INTO classes (name, section, lead_teacher_id) VALUES ($1, $2, $3) RETURNING *`,
      [name, section, leadTeacherId || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'A class with that name and section already exists' });
    }
    throw err;
  }
}

export async function updateClass(req, res) {
  const { id } = req.params;
  const { name, section, leadTeacherId } = req.body;
  const { rows } = await query(
    `UPDATE classes SET
       name = COALESCE($1, name),
       section = COALESCE($2, section),
       lead_teacher_id = $3
     WHERE id = $4 RETURNING *`,
    [name, section, leadTeacherId ?? null, id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Class not found' });
  res.json(rows[0]);
}

export async function deleteClass(req, res) {
  const { id } = req.params;
  try {
    const { rowCount } = await query('DELETE FROM classes WHERE id = $1', [id]);
    if (!rowCount) return res.status(404).json({ error: 'Class not found' });
    res.status(204).end();
  } catch (err) {
    if (err.code === '23503') {
      return res.status(409).json({ error: 'This class still has students, exams, assignments, or attendance records. Reassign or remove those first.' });
    }
    throw err;
  }
}

export async function getClassRoster(req, res) {
  const { id } = req.params;
  const { rows } = await query(
    `SELECT id, admission_no, full_name, guardian_name, guardian_contact
     FROM students WHERE class_id = $1 ORDER BY full_name`,
    [id]
  );
  res.json(rows);
}
