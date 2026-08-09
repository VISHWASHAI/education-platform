import { query, pool } from '../db/pool.js';
import { sendCsv } from '../utils/csv.js';

const STAFF_ROLES = ['super_admin', 'head_master', 'group_coordinator', 'teacher', 'office_admin'];

export async function listExams(req, res) {
  const { classId, status } = req.query;
  const conditions = [];
  const params = [];
  if (classId) {
    params.push(classId);
    conditions.push(`e.class_id = $${params.length}`);
  }
  if (status) {
    params.push(status);
    conditions.push(`e.status = $${params.length}`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const { rows } = await query(
    `SELECT e.*, c.name AS class_name, c.section AS class_section,
            (SELECT COALESCE(SUM(marks), 0) FROM exam_questions eq WHERE eq.exam_id = e.id) AS total_marks,
            (SELECT COUNT(*) FROM exam_questions eq WHERE eq.exam_id = e.id) AS question_count,
            (SELECT COUNT(*) FROM exam_submissions es WHERE es.exam_id = e.id) AS submission_count
     FROM exams e
     JOIN classes c ON c.id = e.class_id
     ${where}
     ORDER BY e.created_at DESC`,
    params
  );
  res.json(rows);
}

export async function createExam(req, res) {
  const { title, description, classId, examType, startsAt, endsAt } = req.body;
  if (!title || !classId) {
    return res.status(400).json({ error: 'title and classId are required' });
  }
  const { rows } = await query(
    `INSERT INTO exams (title, description, class_id, exam_type, starts_at, ends_at, created_by)
     VALUES ($1, $2, $3, COALESCE($4, 'quiz')::exam_type, $5, $6, $7) RETURNING *`,
    [title, description || null, classId, examType || null, startsAt || null, endsAt || null, req.user.sub]
  );
  res.status(201).json(rows[0]);
}

export async function updateExam(req, res) {
  const { id } = req.params;
  const { title, description, status, startsAt, endsAt } = req.body;
  const { rows } = await query(
    `UPDATE exams SET
       title = COALESCE($1, title),
       description = COALESCE($2, description),
       status = COALESCE($3, status),
       starts_at = COALESCE($4, starts_at),
       ends_at = COALESCE($5, ends_at)
     WHERE id = $6 RETURNING *`,
    [title, description, status, startsAt, endsAt, id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Exam not found' });
  res.json(rows[0]);
}

export async function deleteExam(req, res) {
  const { id } = req.params;
  const { rowCount } = await query('DELETE FROM exams WHERE id = $1', [id]);
  if (!rowCount) return res.status(404).json({ error: 'Exam not found' });
  res.status(204).end();
}

export async function getExamDetail(req, res) {
  const { id } = req.params;
  const isStaff = STAFF_ROLES.includes(req.user.role);

  const { rows: examRows } = await query(
    `SELECT e.*, c.name AS class_name, c.section AS class_section FROM exams e
     JOIN classes c ON c.id = e.class_id WHERE e.id = $1`,
    [id]
  );
  if (!examRows[0]) return res.status(404).json({ error: 'Exam not found' });

  const { rows: questions } = await query(
    `SELECT eq.id AS exam_question_id, eq.order_index, eq.marks,
            qb.id AS question_id, qb.question_text, qb.question_type, qb.options,
            ${isStaff ? 'qb.correct_answer' : 'NULL'} AS correct_answer
     FROM exam_questions eq
     JOIN question_bank qb ON qb.id = eq.question_id
     WHERE eq.exam_id = $1
     ORDER BY eq.order_index`,
    [id]
  );

  res.json({ ...examRows[0], questions });
}

export async function addExamQuestion(req, res) {
  const { id } = req.params;
  const { questionId, marks, orderIndex } = req.body;
  if (!questionId) return res.status(400).json({ error: 'questionId is required' });

  const { rows: qRows } = await query('SELECT default_marks FROM question_bank WHERE id = $1', [questionId]);
  if (!qRows[0]) return res.status(404).json({ error: 'Question not found' });

  try {
    const { rows } = await query(
      `INSERT INTO exam_questions (exam_id, question_id, order_index, marks)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [id, questionId, orderIndex ?? 0, marks ?? qRows[0].default_marks]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'That question is already on this exam' });
    }
    throw err;
  }
}

export async function removeExamQuestion(req, res) {
  const { id, examQuestionId } = req.params;
  const { rowCount } = await query(
    'DELETE FROM exam_questions WHERE id = $1 AND exam_id = $2',
    [examQuestionId, id]
  );
  if (!rowCount) return res.status(404).json({ error: 'Exam question not found' });
  res.status(204).end();
}

export async function submitExam(req, res) {
  const { id } = req.params;
  const { answers } = req.body; // [{ examQuestionId, answerText }]
  if (!Array.isArray(answers) || answers.length === 0) {
    return res.status(400).json({ error: 'answers[] is required' });
  }

  const { rows: studentRows } = await query('SELECT id FROM students WHERE user_id = $1', [req.user.sub]);
  if (!studentRows[0]) return res.status(403).json({ error: 'Only enrolled students can submit exams' });
  const studentId = studentRows[0].id;

  const { rows: examQuestions } = await query(
    `SELECT eq.id, eq.marks, qb.question_type, qb.correct_answer
     FROM exam_questions eq JOIN question_bank qb ON qb.id = eq.question_id
     WHERE eq.exam_id = $1`,
    [id]
  );
  const questionMap = new Map(examQuestions.map((q) => [q.id, q]));
  const maxScore = examQuestions.reduce((sum, q) => sum + Number(q.marks), 0);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: subRows } = await client.query(
      `INSERT INTO exam_submissions (exam_id, student_id, status, max_score)
       VALUES ($1, $2, 'submitted', $3)
       ON CONFLICT (exam_id, student_id)
       DO UPDATE SET status = 'submitted', submitted_at = now(), max_score = EXCLUDED.max_score
       RETURNING *`,
      [id, studentId, maxScore]
    );
    const submissionId = subRows[0].id;

    let autoGradedTotal = 0;
    let hasUngraded = false;

    for (const { examQuestionId, answerText } of answers) {
      const question = questionMap.get(examQuestionId);
      if (!question) continue;

      let isCorrect = null;
      let score = null;
      if (question.question_type === 'mcq') {
        isCorrect = answerText === question.correct_answer;
        score = isCorrect ? Number(question.marks) : 0;
        autoGradedTotal += score;
      } else {
        hasUngraded = true;
      }

      await client.query(
        `INSERT INTO submission_answers (submission_id, exam_question_id, answer_text, is_correct, score)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (submission_id, exam_question_id)
         DO UPDATE SET answer_text = EXCLUDED.answer_text, is_correct = EXCLUDED.is_correct, score = EXCLUDED.score`,
        [submissionId, examQuestionId, answerText ?? null, isCorrect, score]
      );
    }

    await client.query(
      `UPDATE exam_submissions SET
         status = $1,
         total_score = $2
       WHERE id = $3`,
      [hasUngraded ? 'submitted' : 'graded', hasUngraded ? null : autoGradedTotal, submissionId]
    );
    if (!hasUngraded) {
      await client.query(`UPDATE exam_submissions SET graded_at = now() WHERE id = $1`, [submissionId]);
    }

    await client.query('COMMIT');
    res.status(201).json({ submissionId, autoGradedTotal, maxScore, hasUngraded });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function getMySubmission(req, res) {
  const { id } = req.params;
  const { rows: studentRows } = await query('SELECT id FROM students WHERE user_id = $1', [req.user.sub]);
  if (!studentRows[0]) return res.json(null);

  const { rows } = await query(
    `SELECT * FROM exam_submissions WHERE exam_id = $1 AND student_id = $2`,
    [id, studentRows[0].id]
  );
  if (!rows[0]) return res.json(null);

  const { rows: answers } = await query(
    `SELECT sa.exam_question_id, sa.answer_text, sa.is_correct, sa.score, sa.feedback,
            qb.question_text, qb.question_type, qb.options, eq.marks AS max_marks
     FROM submission_answers sa
     JOIN exam_questions eq ON eq.id = sa.exam_question_id
     JOIN question_bank qb ON qb.id = eq.question_id
     WHERE sa.submission_id = $1
     ORDER BY eq.order_index`,
    [rows[0].id]
  );

  res.json({ ...rows[0], answers });
}

export async function listSubmissions(req, res) {
  const { id } = req.params;
  const { rows } = await query(
    `SELECT es.id, es.status, es.total_score, es.max_score, es.submitted_at, es.graded_at,
            s.id AS student_id, s.full_name, s.admission_no
     FROM exam_submissions es JOIN students s ON s.id = es.student_id
     WHERE es.exam_id = $1
     ORDER BY s.full_name`,
    [id]
  );
  res.json(rows);
}

export async function exportSubmissions(req, res) {
  const { id } = req.params;
  const { rows: examRows } = await query('SELECT title FROM exams WHERE id = $1', [id]);
  if (!examRows[0]) return res.status(404).json({ error: 'Exam not found' });

  const { rows } = await query(
    `SELECT s.admission_no AS "admissionNo", s.full_name AS "studentName", es.status AS "status",
            es.total_score AS "score", es.max_score AS "maxScore", es.submitted_at AS "submittedAt"
     FROM exam_submissions es JOIN students s ON s.id = es.student_id
     WHERE es.exam_id = $1
     ORDER BY s.full_name`,
    [id]
  );
  sendCsv(res, `exam_${id}_results.csv`, rows, ['admissionNo', 'studentName', 'status', 'score', 'maxScore', 'submittedAt']);
}

export async function getSubmissionDetail(req, res) {
  const { submissionId } = req.params;
  const { rows: subRows } = await query(
    `SELECT es.*, s.full_name, s.admission_no FROM exam_submissions es
     JOIN students s ON s.id = es.student_id WHERE es.id = $1`,
    [submissionId]
  );
  if (!subRows[0]) return res.status(404).json({ error: 'Submission not found' });

  const { rows: answers } = await query(
    `SELECT sa.id AS answer_id, sa.exam_question_id, sa.answer_text, sa.is_correct, sa.score, sa.feedback,
            qb.question_text, qb.question_type, qb.options, qb.correct_answer, eq.marks AS max_marks
     FROM submission_answers sa
     JOIN exam_questions eq ON eq.id = sa.exam_question_id
     JOIN question_bank qb ON qb.id = eq.question_id
     WHERE sa.submission_id = $1
     ORDER BY eq.order_index`,
    [submissionId]
  );

  res.json({ ...subRows[0], answers });
}

export async function gradeAnswer(req, res) {
  const { submissionId, answerId } = req.params;
  const { score, feedback } = req.body;
  if (score === undefined || score === null) {
    return res.status(400).json({ error: 'score is required' });
  }

  const { rows } = await query(
    `UPDATE submission_answers SET score = $1, feedback = $2
     WHERE id = $3 AND submission_id = $4 RETURNING *`,
    [score, feedback || null, answerId, submissionId]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Answer not found' });

  const { rows: totals } = await query(
    `SELECT SUM(score) AS total, COUNT(*) FILTER (WHERE score IS NULL) AS ungraded
     FROM submission_answers WHERE submission_id = $1`,
    [submissionId]
  );
  const ungraded = Number(totals[0].ungraded);
  await query(
    `UPDATE exam_submissions SET
       total_score = $1,
       status = $2,
       graded_at = CASE WHEN $2 = 'graded' THEN now() ELSE graded_at END
     WHERE id = $3`,
    [totals[0].total, ungraded === 0 ? 'graded' : 'submitted', submissionId]
  );

  res.json(rows[0]);
}
