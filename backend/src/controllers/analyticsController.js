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

export async function getOverviewStats(req, res) {
  const [students, teachers, thisMonthAttendance, lastMonthAttendance, examScore, studentGrowth] = await Promise.all([
    query('SELECT COUNT(*) FROM students'),
    query('SELECT COUNT(*) FROM teachers'),
    query(
      `SELECT COUNT(*) FILTER (WHERE status = 'present') AS present, COUNT(*) AS total
       FROM attendance WHERE date >= date_trunc('month', CURRENT_DATE)`
    ),
    query(
      `SELECT COUNT(*) FILTER (WHERE status = 'present') AS present, COUNT(*) AS total
       FROM attendance
       WHERE date >= date_trunc('month', CURRENT_DATE) - interval '1 month'
         AND date < date_trunc('month', CURRENT_DATE)`
    ),
    query(`SELECT ROUND(AVG(total_score / NULLIF(max_score, 0) * 100)::numeric, 1) AS avg_score FROM exam_submissions WHERE status = 'graded'`),
    query(
      `SELECT COUNT(*) AS now_count, COUNT(*) FILTER (WHERE created_at <= now() - interval '30 days') AS then_count FROM students`
    ),
  ]);

  const rate = (row) => (Number(row.total) ? Math.round((Number(row.present) / Number(row.total)) * 1000) / 10 : null);
  const thisRate = rate(thisMonthAttendance.rows[0]);
  const lastRate = rate(lastMonthAttendance.rows[0]);

  const nowCount = Number(studentGrowth.rows[0].now_count);
  const thenCount = Number(studentGrowth.rows[0].then_count);

  res.json({
    totalStudents: Number(students.rows[0].count),
    totalTeachers: Number(teachers.rows[0].count),
    attendanceRateThisMonth: thisRate,
    attendanceTrendPct: thisRate !== null && lastRate !== null && lastRate !== 0 ? Math.round((thisRate - lastRate) * 10) / 10 : null,
    avgExamScore: examScore.rows[0].avg_score === null ? null : Number(examScore.rows[0].avg_score),
    studentsTrendPct: thenCount ? Math.round(((nowCount - thenCount) / thenCount) * 1000) / 10 : null,
  });
}

export async function getStudentsByClass(req, res) {
  const { rows } = await query(
    `SELECT c.id AS class_id, c.name, c.section, COUNT(s.id) AS count
     FROM classes c
     LEFT JOIN students s ON s.class_id = c.id
     GROUP BY c.id, c.name, c.section
     ORDER BY c.name, c.section`
  );
  res.json(rows.map((r) => ({ classId: r.class_id, className: `${r.name} - ${r.section}`, count: Number(r.count) })));
}

export async function getTopPerformers(req, res) {
  const { rows } = await query(
    `SELECT s.full_name, c.name AS class_name, c.section AS class_section,
            ROUND(AVG(es.total_score / NULLIF(es.max_score, 0) * 100)::numeric, 1) AS avg_score
     FROM exam_submissions es
     JOIN students s ON s.id = es.student_id
     LEFT JOIN classes c ON c.id = s.class_id
     WHERE es.status = 'graded'
     GROUP BY s.id, s.full_name, c.name, c.section
     ORDER BY avg_score DESC
     LIMIT 5`
  );
  res.json(rows.map((r) => ({ fullName: r.full_name, className: r.class_name ? `${r.class_name} - ${r.class_section}` : null, avgScore: Number(r.avg_score) })));
}

export async function getMonthSummary(req, res) {
  const { rows } = await query(
    `SELECT
       (SELECT COUNT(*) FROM students WHERE created_at >= date_trunc('month', now())) AS new_students,
       (SELECT COUNT(*) FROM teachers WHERE created_at >= date_trunc('month', now())) AS new_teachers,
       (SELECT COUNT(*) FROM assignments WHERE created_at >= date_trunc('month', now())) AS assignments_created,
       (SELECT COUNT(*) FROM exams WHERE created_at >= date_trunc('month', now())) AS exams_created,
       (SELECT COUNT(*) FROM announcements WHERE created_at >= date_trunc('month', now())) AS announcements_posted`
  );
  const r = rows[0];
  res.json({
    newStudents: Number(r.new_students),
    newTeachers: Number(r.new_teachers),
    assignmentsCreated: Number(r.assignments_created),
    examsCreated: Number(r.exams_created),
    announcementsPosted: Number(r.announcements_posted),
  });
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
