import { Hono } from 'npm:hono@4';
import { query } from '../lib/db.ts';
import { requireAuth, requireRole, JwtPayload } from '../lib/auth.ts';

const assignments = new Hono();
const canManage = requireRole('super_admin', 'head_master', 'group_coordinator', 'teacher');

assignments.use('*', requireAuth);

assignments.get('/', async (c) => {
  const q = c.req.query();
  const classId = q.classId;
  const status = q.status;
  const conditions: string[] = [];
  const params: unknown[] = [];
  if (classId) {
    params.push(classId);
    conditions.push(`a.class_id = $${params.length}`);
  }
  if (status) {
    params.push(status);
    conditions.push(`a.status = $${params.length}`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const { rows } = await query(
    `SELECT a.*, c.name AS class_name, c.section AS class_section,
            (SELECT COUNT(*) FROM assignment_submissions s WHERE s.assignment_id = a.id) AS submission_count
     FROM assignments a
     JOIN classes c ON c.id = a.class_id
     ${where}
     ORDER BY a.due_at NULLS LAST, a.created_at DESC`,
    params
  );
  return c.json(rows);
});

assignments.post('/', canManage, async (c) => {
  const user = c.get('user') as JwtPayload;
  const { title, description, classId, dueAt, maxScore } = await c.req.json();
  if (!title || !classId) {
    return c.json({ error: 'title and classId are required' }, 400);
  }
  const { rows } = await query(
    `INSERT INTO assignments (title, description, class_id, due_at, max_score, created_by)
     VALUES ($1, $2, $3, $4, COALESCE($5, 100), $6) RETURNING *`,
    [title, description || null, classId, dueAt || null, maxScore || null, user.sub]
  );
  return c.json(rows[0], 201);
});

assignments.get('/:id', async (c) => {
  const id = c.req.param('id');
  const { rows } = await query(
    `SELECT a.*, c.name AS class_name, c.section AS class_section
     FROM assignments a JOIN classes c ON c.id = a.class_id WHERE a.id = $1`,
    [id]
  );
  if (!rows[0]) return c.json({ error: 'Assignment not found' }, 404);
  return c.json(rows[0]);
});

assignments.put('/:id', canManage, async (c) => {
  const id = c.req.param('id');
  const { title, description, status, dueAt, maxScore } = await c.req.json();
  const { rows } = await query(
    `UPDATE assignments SET
       title = COALESCE($1, title),
       description = COALESCE($2, description),
       status = COALESCE($3, status),
       due_at = COALESCE($4, due_at),
       max_score = COALESCE($5, max_score)
     WHERE id = $6 RETURNING *`,
    [title, description, status, dueAt, maxScore, id]
  );
  if (!rows[0]) return c.json({ error: 'Assignment not found' }, 404);
  return c.json(rows[0]);
});

assignments.delete('/:id', canManage, async (c) => {
  const id = c.req.param('id');
  const { rowCount } = await query('DELETE FROM assignments WHERE id = $1', [id]);
  if (!rowCount) return c.json({ error: 'Assignment not found' }, 404);
  return c.body(null, 204);
});

assignments.post('/:id/submit', requireRole('student'), async (c) => {
  const id = c.req.param('id');
  const user = c.get('user') as JwtPayload;
  const { content } = await c.req.json();
  if (!content) return c.json({ error: 'content is required' }, 400);

  const { rows: studentRows } = await query('SELECT id FROM students WHERE user_id = $1', [user.sub]);
  if (!studentRows[0]) return c.json({ error: 'Only enrolled students can submit assignments' }, 403);

  const { rows: aRows } = await query('SELECT due_at FROM assignments WHERE id = $1', [id]);
  if (!aRows[0]) return c.json({ error: 'Assignment not found' }, 404);

  const isLate = aRows[0].due_at ? new Date() > new Date(aRows[0].due_at) : false;

  const { rows } = await query(
    `INSERT INTO assignment_submissions (assignment_id, student_id, content, status, submitted_at)
     VALUES ($1, $2, $3, $4, now())
     ON CONFLICT (assignment_id, student_id)
     DO UPDATE SET content = EXCLUDED.content, status = EXCLUDED.status, submitted_at = now()
     RETURNING *`,
    [id, studentRows[0].id, content, isLate ? 'late' : 'submitted']
  );
  return c.json(rows[0], 201);
});

assignments.get('/:id/my-submission', requireRole('student'), async (c) => {
  const id = c.req.param('id');
  const user = c.get('user') as JwtPayload;
  const { rows: studentRows } = await query('SELECT id FROM students WHERE user_id = $1', [user.sub]);
  if (!studentRows[0]) return c.json(null);

  const { rows } = await query(
    'SELECT * FROM assignment_submissions WHERE assignment_id = $1 AND student_id = $2',
    [id, studentRows[0].id]
  );
  return c.json(rows[0] || null);
});

assignments.get('/:id/submissions', canManage, async (c) => {
  const id = c.req.param('id');
  const { rows } = await query(
    `SELECT s.*, st.full_name, st.admission_no
     FROM assignment_submissions s JOIN students st ON st.id = s.student_id
     WHERE s.assignment_id = $1
     ORDER BY st.full_name`,
    [id]
  );
  return c.json(rows);
});

assignments.put('/submissions/:submissionId/grade', canManage, async (c) => {
  const submissionId = c.req.param('submissionId');
  const { score, feedback } = await c.req.json();
  if (score === undefined || score === null) {
    return c.json({ error: 'score is required' }, 400);
  }
  const { rows } = await query(
    `UPDATE assignment_submissions SET score = $1, feedback = $2, status = 'graded', graded_at = now()
     WHERE id = $3 RETURNING *`,
    [score, feedback || null, submissionId]
  );
  if (!rows[0]) return c.json({ error: 'Submission not found' }, 404);
  return c.json(rows[0]);
});

export default assignments;
