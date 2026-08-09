import { query } from '../db/pool.js';

export async function listAssignments(req, res) {
  const { classId, status } = req.query;
  const conditions = [];
  const params = [];
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
  res.json(rows);
}

export async function createAssignment(req, res) {
  const { title, description, classId, dueAt, maxScore } = req.body;
  if (!title || !classId) {
    return res.status(400).json({ error: 'title and classId are required' });
  }
  const { rows } = await query(
    `INSERT INTO assignments (title, description, class_id, due_at, max_score, created_by)
     VALUES ($1, $2, $3, $4, COALESCE($5, 100), $6) RETURNING *`,
    [title, description || null, classId, dueAt || null, maxScore || null, req.user.sub]
  );
  res.status(201).json(rows[0]);
}

export async function getAssignment(req, res) {
  const { id } = req.params;
  const { rows } = await query(
    `SELECT a.*, c.name AS class_name, c.section AS class_section
     FROM assignments a JOIN classes c ON c.id = a.class_id WHERE a.id = $1`,
    [id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Assignment not found' });
  res.json(rows[0]);
}

export async function updateAssignment(req, res) {
  const { id } = req.params;
  const { title, description, status, dueAt, maxScore } = req.body;
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
  if (!rows[0]) return res.status(404).json({ error: 'Assignment not found' });
  res.json(rows[0]);
}

export async function deleteAssignment(req, res) {
  const { id } = req.params;
  const { rowCount } = await query('DELETE FROM assignments WHERE id = $1', [id]);
  if (!rowCount) return res.status(404).json({ error: 'Assignment not found' });
  res.status(204).end();
}

export async function submitAssignment(req, res) {
  const { id } = req.params;
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: 'content is required' });

  const { rows: studentRows } = await query('SELECT id FROM students WHERE user_id = $1', [req.user.sub]);
  if (!studentRows[0]) return res.status(403).json({ error: 'Only enrolled students can submit assignments' });

  const { rows: aRows } = await query('SELECT due_at FROM assignments WHERE id = $1', [id]);
  if (!aRows[0]) return res.status(404).json({ error: 'Assignment not found' });

  const isLate = aRows[0].due_at ? new Date() > new Date(aRows[0].due_at) : false;

  const { rows } = await query(
    `INSERT INTO assignment_submissions (assignment_id, student_id, content, status, submitted_at)
     VALUES ($1, $2, $3, $4, now())
     ON CONFLICT (assignment_id, student_id)
     DO UPDATE SET content = EXCLUDED.content, status = EXCLUDED.status, submitted_at = now()
     RETURNING *`,
    [id, studentRows[0].id, content, isLate ? 'late' : 'submitted']
  );
  res.status(201).json(rows[0]);
}

export async function getMySubmission(req, res) {
  const { id } = req.params;
  const { rows: studentRows } = await query('SELECT id FROM students WHERE user_id = $1', [req.user.sub]);
  if (!studentRows[0]) return res.json(null);

  const { rows } = await query(
    'SELECT * FROM assignment_submissions WHERE assignment_id = $1 AND student_id = $2',
    [id, studentRows[0].id]
  );
  res.json(rows[0] || null);
}

export async function listSubmissions(req, res) {
  const { id } = req.params;
  const { rows } = await query(
    `SELECT s.*, st.full_name, st.admission_no
     FROM assignment_submissions s JOIN students st ON st.id = s.student_id
     WHERE s.assignment_id = $1
     ORDER BY st.full_name`,
    [id]
  );
  res.json(rows);
}

export async function gradeSubmission(req, res) {
  const { submissionId } = req.params;
  const { score, feedback } = req.body;
  if (score === undefined || score === null) {
    return res.status(400).json({ error: 'score is required' });
  }
  const { rows } = await query(
    `UPDATE assignment_submissions SET score = $1, feedback = $2, status = 'graded', graded_at = now()
     WHERE id = $3 RETURNING *`,
    [score, feedback || null, submissionId]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Submission not found' });
  res.json(rows[0]);
}
