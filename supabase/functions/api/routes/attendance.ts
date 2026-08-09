import { Hono } from 'npm:hono@4';
import { query } from '../lib/db.ts';
import { requireAuth, requireRole, JwtPayload } from '../lib/auth.ts';
import { sendCsv } from '../lib/csv.ts';

const attendance = new Hono();
const canManage = requireRole('super_admin', 'head_master', 'group_coordinator', 'teacher', 'office_admin');

attendance.use('*', requireAuth);

attendance.get('/', canManage, async (c) => {
  const classId = c.req.query('classId');
  const date = c.req.query('date');
  if (!classId || !date) {
    return c.json({ error: 'classId and date are required' }, 400);
  }
  const { rows } = await query(
    `SELECT a.id, a.status, s.id AS student_id, s.full_name, s.admission_no
     FROM students s
     LEFT JOIN attendance a ON a.student_id = s.id AND a.date = $2
     WHERE s.class_id = $1
     ORDER BY s.full_name`,
    [classId, date]
  );
  return c.json(rows);
});

attendance.get('/export', canManage, async (c) => {
  const classId = c.req.query('classId');
  const dateFrom = c.req.query('dateFrom');
  const dateTo = c.req.query('dateTo');
  const conditions: string[] = [];
  const params: unknown[] = [];
  if (classId) {
    params.push(classId);
    conditions.push(`a.class_id = $${params.length}`);
  }
  if (dateFrom) {
    params.push(dateFrom);
    conditions.push(`a.date >= $${params.length}`);
  }
  if (dateTo) {
    params.push(dateTo);
    conditions.push(`a.date <= $${params.length}`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const { rows } = await query(
    `SELECT a.date AS "date", s.admission_no AS "admissionNo", s.full_name AS "studentName",
            c.name AS "className", c.section AS "section", a.status AS "status"
     FROM attendance a
     JOIN students s ON s.id = a.student_id
     JOIN classes c ON c.id = a.class_id
     ${where}
     ORDER BY a.date DESC, s.full_name`,
    params
  );
  return sendCsv(c, 'attendance_export.csv', rows, ['date', 'admissionNo', 'studentName', 'className', 'section', 'status']);
});

attendance.get('/student/:studentId/summary', async (c) => {
  const studentId = c.req.param('studentId');
  const user = c.get('user') as JwtPayload;

  if (user.role === 'student') {
    const { rows: ownRows } = await query('SELECT id FROM students WHERE user_id = $1', [user.sub]);
    if (!ownRows[0] || Number(ownRows[0].id) !== Number(studentId)) {
      return c.json({ error: 'You can only view your own attendance' }, 403);
    }
  }

  const { rows } = await query(
    `SELECT status, COUNT(*) AS count
     FROM attendance WHERE student_id = $1
     GROUP BY status`,
    [studentId]
  );
  const summary: Record<string, number> = { present: 0, absent: 0, late: 0, leave: 0 };
  for (const row of rows) summary[row.status] = Number(row.count);
  const total = Object.values(summary).reduce((a, b) => a + b, 0);
  const percentage = total ? Math.round((summary.present / total) * 1000) / 10 : 0;
  return c.json({ summary, total, attendancePercentage: percentage });
});

attendance.post('/', canManage, async (c) => {
  const user = c.get('user') as JwtPayload;
  const { classId, date, records } = await c.req.json();
  if (!classId || !date || !Array.isArray(records)) {
    return c.json({ error: 'classId, date, and records[] are required' }, 400);
  }

  const results = [];
  for (const { studentId, status } of records) {
    const { rows } = await query(
      `INSERT INTO attendance (student_id, class_id, date, status, marked_by)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (student_id, date)
       DO UPDATE SET status = EXCLUDED.status, marked_by = EXCLUDED.marked_by
       RETURNING *`,
      [studentId, classId, date, status, user.sub]
    );
    results.push(rows[0]);
  }
  return c.json(results, 201);
});

export default attendance;
