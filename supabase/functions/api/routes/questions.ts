import { Hono } from 'npm:hono@4';
import { query } from '../lib/db.ts';
import { requireAuth, requireRole, JwtPayload } from '../lib/auth.ts';

const questions = new Hono();
const canManage = requireRole('super_admin', 'head_master', 'group_coordinator', 'teacher');

questions.use('*', requireAuth);

questions.get('/', canManage, async (c) => {
  const q = c.req.query();
  const search = q.search ?? '';
  const classId = q.classId;
  const subject = q.subject;
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (search) {
    params.push(`%${search}%`);
    conditions.push(`question_text ILIKE $${params.length}`);
  }
  if (classId) {
    params.push(classId);
    conditions.push(`class_id = $${params.length}`);
  }
  if (subject) {
    params.push(subject);
    conditions.push(`subject = $${params.length}`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const { rows } = await query(
    `SELECT * FROM question_bank ${where} ORDER BY created_at DESC`,
    params
  );
  return c.json(rows);
});

questions.post('/', canManage, async (c) => {
  const user = c.get('user') as JwtPayload;
  const { classId, subject, questionText, questionType, options, correctAnswer, defaultMarks } = await c.req.json();
  if (!questionText || !questionType) {
    return c.json({ error: 'questionText and questionType are required' }, 400);
  }
  if (questionType === 'mcq' && (!Array.isArray(options) || !correctAnswer)) {
    return c.json({ error: 'MCQ questions require options[] and correctAnswer' }, 400);
  }

  const { rows } = await query(
    `INSERT INTO question_bank (class_id, subject, question_text, question_type, options, correct_answer, default_marks, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [
      classId || null,
      subject || null,
      questionText,
      questionType,
      questionType === 'mcq' ? JSON.stringify(options) : null,
      questionType === 'mcq' ? correctAnswer : null,
      defaultMarks || 1,
      user.sub,
    ]
  );
  return c.json(rows[0], 201);
});

questions.delete('/:id', canManage, async (c) => {
  const id = c.req.param('id');
  try {
    const { rowCount } = await query('DELETE FROM question_bank WHERE id = $1', [id]);
    if (!rowCount) return c.json({ error: 'Question not found' }, 404);
    return c.body(null, 204);
  } catch (err) {
    if ((err as { code?: string }).code === '23503') {
      return c.json({ error: 'This question is used on one or more exams and cannot be deleted. Remove it from those exams first.' }, 409);
    }
    throw err;
  }
});

export default questions;
