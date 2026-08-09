import { query } from '../db/pool.js';

export async function listQuestions(req, res) {
  const { search = '', classId, subject } = req.query;
  const conditions = [];
  const params = [];

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
  res.json(rows);
}

export async function createQuestion(req, res) {
  const { classId, subject, questionText, questionType, options, correctAnswer, defaultMarks } = req.body;
  if (!questionText || !questionType) {
    return res.status(400).json({ error: 'questionText and questionType are required' });
  }
  if (questionType === 'mcq' && (!Array.isArray(options) || !correctAnswer)) {
    return res.status(400).json({ error: 'MCQ questions require options[] and correctAnswer' });
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
      req.user.sub,
    ]
  );
  res.status(201).json(rows[0]);
}

export async function deleteQuestion(req, res) {
  const { id } = req.params;
  try {
    const { rowCount } = await query('DELETE FROM question_bank WHERE id = $1', [id]);
    if (!rowCount) return res.status(404).json({ error: 'Question not found' });
    res.status(204).end();
  } catch (err) {
    if (err.code === '23503') {
      return res.status(409).json({ error: 'This question is used on one or more exams and cannot be deleted. Remove it from those exams first.' });
    }
    throw err;
  }
}
