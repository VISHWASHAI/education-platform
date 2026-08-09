import { query } from '../db/pool.js';

export async function getAttendanceTrend(req, res) {
  const { rows } = await query(
    `SELECT date,
            COUNT(*) FILTER (WHERE status = 'present') AS present,
            COUNT(*) AS total
     FROM attendance
     WHERE date > CURRENT_DATE - INTERVAL '30 days'
     GROUP BY date
     ORDER BY date`
  );
  res.json(
    rows.map((r) => ({
      date: r.date,
      presentRate: Math.round((Number(r.present) / Number(r.total)) * 1000) / 10,
    }))
  );
}

export async function getExamPerformance(req, res) {
  const { rows } = await query(
    `SELECT e.id, e.title,
            ROUND(AVG(es.total_score / NULLIF(es.max_score, 0) * 100)::numeric, 1) AS avg_percentage,
            COUNT(es.id) AS submissions
     FROM exams e
     JOIN exam_submissions es ON es.exam_id = e.id AND es.status = 'graded'
     GROUP BY e.id, e.title, e.created_at
     ORDER BY e.created_at DESC
     LIMIT 10`
  );
  res.json(
    rows.map((r) => ({
      examId: r.id,
      title: r.title,
      avgPercentage: r.avg_percentage === null ? null : Number(r.avg_percentage),
      submissions: Number(r.submissions),
    }))
  );
}

export async function getClassPerformance(req, res) {
  const [attendanceRows, examRows, classRows] = await Promise.all([
    query(
      `SELECT c.id AS class_id,
              ROUND(100.0 * COUNT(*) FILTER (WHERE a.status = 'present') / NULLIF(COUNT(*), 0), 1) AS attendance_rate
       FROM classes c
       LEFT JOIN attendance a ON a.class_id = c.id
       GROUP BY c.id`
    ),
    query(
      `SELECT e.class_id,
              ROUND(AVG(es.total_score / NULLIF(es.max_score, 0) * 100)::numeric, 1) AS avg_score
       FROM exams e
       JOIN exam_submissions es ON es.exam_id = e.id AND es.status = 'graded'
       GROUP BY e.class_id`
    ),
    query(`SELECT id, name, section FROM classes ORDER BY name, section`),
  ]);

  const attendanceMap = new Map(attendanceRows.rows.map((r) => [r.class_id, r.attendance_rate]));
  const examMap = new Map(examRows.rows.map((r) => [r.class_id, r.avg_score]));

  res.json(
    classRows.rows.map((c) => ({
      classId: c.id,
      className: `${c.name} - ${c.section}`,
      attendanceRate: attendanceMap.has(c.id) ? Number(attendanceMap.get(c.id)) : null,
      avgExamScore: examMap.has(c.id) ? Number(examMap.get(c.id)) : null,
    }))
  );
}
