import { query } from '../db/pool.js';
import { sendCsv } from '../utils/csv.js';

export async function markAttendance(req, res) {
  const { classId, date, records } = req.body; // records: [{ studentId, status }]
  if (!classId || !date || !Array.isArray(records)) {
    return res.status(400).json({ error: 'classId, date, and records[] are required' });
  }

  const results = [];
  for (const { studentId, status } of records) {
    const { rows } = await query(
      `INSERT INTO attendance (student_id, class_id, date, status, marked_by)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (student_id, date)
       DO UPDATE SET status = EXCLUDED.status, marked_by = EXCLUDED.marked_by
       RETURNING *`,
      [studentId, classId, date, status, req.user.sub]
    );
    results.push(rows[0]);
  }
  res.status(201).json(results);
}

export async function getAttendanceByClassDate(req, res) {
  const { classId, date } = req.query;
  if (!classId || !date) {
    return res.status(400).json({ error: 'classId and date are required' });
  }
  const { rows } = await query(
    `SELECT a.id, a.status, s.id AS student_id, s.full_name, s.admission_no
     FROM students s
     LEFT JOIN attendance a ON a.student_id = s.id AND a.date = $2
     WHERE s.class_id = $1
     ORDER BY s.full_name`,
    [classId, date]
  );
  res.json(rows);
}

export async function getStudentAttendanceSummary(req, res) {
  const { studentId } = req.params;

  if (req.user.role === 'student') {
    const { rows: ownRows } = await query('SELECT id FROM students WHERE user_id = $1', [req.user.sub]);
    if (!ownRows[0] || Number(ownRows[0].id) !== Number(studentId)) {
      return res.status(403).json({ error: 'You can only view your own attendance' });
    }
  }

  const { rows } = await query(
    `SELECT status, COUNT(*) AS count
     FROM attendance WHERE student_id = $1
     GROUP BY status`,
    [studentId]
  );
  const summary = { present: 0, absent: 0, late: 0, leave: 0 };
  for (const row of rows) summary[row.status] = Number(row.count);
  const total = Object.values(summary).reduce((a, b) => a + b, 0);
  const percentage = total ? Math.round((summary.present / total) * 1000) / 10 : 0;
  res.json({ summary, total, attendancePercentage: percentage });
}

export async function exportAttendance(req, res) {
  const { classId, dateFrom, dateTo } = req.query;
  const conditions = [];
  const params = [];
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
  sendCsv(res, 'attendance_export.csv', rows, ['date', 'admissionNo', 'studentName', 'className', 'section', 'status']);
}
