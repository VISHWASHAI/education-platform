import { Hono } from 'npm:hono@4';
import { query } from '../lib/db.ts';
import { requireAuth, requireRole } from '../lib/auth.ts';

const analytics = new Hono();
const canView = requireRole('super_admin', 'head_master', 'group_coordinator', 'teacher', 'office_admin');

analytics.use('*', requireAuth);
analytics.use('*', canView);

analytics.get('/attendance-trend', async (c) => {
  const { rows } = await query(
    `SELECT date,
            COUNT(*) FILTER (WHERE status = 'present') AS present,
            COUNT(*) AS total
     FROM attendance
     WHERE date > CURRENT_DATE - INTERVAL '30 days'
     GROUP BY date
     ORDER BY date`
  );
  return c.json(
    rows.map((r) => ({
      date: r.date,
      presentRate: Math.round((Number(r.present) / Number(r.total)) * 1000) / 10,
    }))
  );
});

analytics.get('/exam-performance', async (c) => {
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
  return c.json(
    rows.map((r) => ({
      examId: r.id,
      title: r.title,
      avgPercentage: r.avg_percentage === null ? null : Number(r.avg_percentage),
      submissions: Number(r.submissions),
    }))
  );
});

analytics.get('/class-performance', async (c) => {
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

  return c.json(
    classRows.rows.map((c) => ({
      classId: c.id,
      className: `${c.name} - ${c.section}`,
      attendanceRate: attendanceMap.has(c.id) ? Number(attendanceMap.get(c.id)) : null,
      avgExamScore: examMap.has(c.id) ? Number(examMap.get(c.id)) : null,
    }))
  );
});

export default analytics;
