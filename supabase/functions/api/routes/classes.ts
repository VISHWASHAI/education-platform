import { Hono } from 'npm:hono@4';
import { query } from '../lib/db.ts';
import { requireAuth, requireRole } from '../lib/auth.ts';

const classes = new Hono();
const canManage = requireRole('super_admin', 'head_master', 'office_admin');
const canView = requireRole('super_admin', 'head_master', 'group_coordinator', 'teacher', 'office_admin');

classes.use('*', requireAuth);

classes.get('/', canView, async (c) => {
  const { rows } = await query(
    `SELECT c.id, c.name, c.section, c.lead_teacher_id,
            u.full_name AS lead_teacher_name,
            (SELECT COUNT(*) FROM students s WHERE s.class_id = c.id) AS student_count
     FROM classes c
     LEFT JOIN users u ON u.id = c.lead_teacher_id
     ORDER BY c.name, c.section`
  );
  return c.json(rows);
});

classes.get('/:id/roster', canView, async (c) => {
  const id = c.req.param('id');
  const { rows } = await query(
    `SELECT id, admission_no, full_name, guardian_name, guardian_contact
     FROM students WHERE class_id = $1 ORDER BY full_name`,
    [id]
  );
  return c.json(rows);
});

classes.post('/', canManage, async (c) => {
  const { name, section, leadTeacherId } = await c.req.json();
  if (!name || !section) {
    return c.json({ error: 'name and section are required' }, 400);
  }
  try {
    const { rows } = await query(
      `INSERT INTO classes (name, section, lead_teacher_id) VALUES ($1, $2, $3) RETURNING *`,
      [name, section, leadTeacherId || null]
    );
    return c.json(rows[0], 201);
  } catch (err) {
    if ((err as { code?: string }).code === '23505') {
      return c.json({ error: 'A class with that name and section already exists' }, 409);
    }
    throw err;
  }
});

classes.put('/:id', canManage, async (c) => {
  const id = c.req.param('id');
  const { name, section, leadTeacherId } = await c.req.json();
  const { rows } = await query(
    `UPDATE classes SET
       name = COALESCE($1, name),
       section = COALESCE($2, section),
       lead_teacher_id = $3
     WHERE id = $4 RETURNING *`,
    [name, section, leadTeacherId ?? null, id]
  );
  if (!rows[0]) return c.json({ error: 'Class not found' }, 404);
  return c.json(rows[0]);
});

classes.delete('/:id', canManage, async (c) => {
  const id = c.req.param('id');
  try {
    const { rowCount } = await query('DELETE FROM classes WHERE id = $1', [id]);
    if (!rowCount) return c.json({ error: 'Class not found' }, 404);
    return c.body(null, 204);
  } catch (err) {
    if ((err as { code?: string }).code === '23503') {
      return c.json({ error: 'This class still has students, exams, assignments, or attendance records. Reassign or remove those first.' }, 409);
    }
    throw err;
  }
});

export default classes;
