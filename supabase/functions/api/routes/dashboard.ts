import { Hono } from 'npm:hono@4';
import { query } from '../lib/db.ts';
import { requireAuth, JwtPayload } from '../lib/auth.ts';

const STAFF_ROLES = ['super_admin', 'head_master', 'group_coordinator', 'teacher', 'office_admin'];

const dashboard = new Hono();
dashboard.use('*', requireAuth);

dashboard.get('/overview', async (c) => {
  const [students, teachers, classesResult, todayAttendance] = await Promise.all([
    query('SELECT COUNT(*) FROM students'),
    query('SELECT COUNT(*) FROM teachers'),
    query('SELECT COUNT(*) FROM classes'),
    query(`SELECT status, COUNT(*) FROM attendance WHERE date = CURRENT_DATE GROUP BY status`),
  ]);

  const attendanceToday: Record<string, number> = { present: 0, absent: 0, late: 0, leave: 0 };
  for (const row of todayAttendance.rows) attendanceToday[row.status] = Number(row.count);
  const markedToday = Object.values(attendanceToday).reduce((a, b) => a + b, 0);

  return c.json({
    totalStudents: Number(students.rows[0].count),
    totalTeachers: Number(teachers.rows[0].count),
    totalClasses: Number(classesResult.rows[0].count),
    attendanceToday,
    attendanceRateToday: markedToday ? Math.round((attendanceToday.present / markedToday) * 1000) / 10 : 0,
  });
});

dashboard.get('/recent-activity', async (c) => {
  const user = c.get('user') as JwtPayload;
  if (!STAFF_ROLES.includes(user.role)) return c.json([]);

  const { rows } = await query(
    `SELECT al.id, al.action, al.entity, al.entity_id, al.created_at, u.full_name AS user_name
     FROM audit_log al
     LEFT JOIN users u ON u.id = al.user_id
     ORDER BY al.created_at DESC
     LIMIT 8`
  );
  return c.json(rows);
});

dashboard.get('/upcoming-deadlines', async (c) => {
  const user = c.get('user') as JwtPayload;
  const isStaff = STAFF_ROLES.includes(user.role);
  let classId: number | null = null;

  if (!isStaff) {
    const { rows: studentRows } = await query('SELECT class_id FROM students WHERE user_id = $1', [user.sub]);
    classId = studentRows[0]?.class_id ?? null;
    if (!classId) return c.json([]);
  }

  const examParams: unknown[] = [];
  let examClauses = `e.status = 'published' AND e.ends_at IS NOT NULL AND e.ends_at > now() AND e.ends_at < now() + interval '7 days'`;
  if (classId) {
    examParams.push(classId);
    examClauses += ` AND e.class_id = $${examParams.length}`;
  }

  const assignmentParams: unknown[] = [];
  let assignmentClauses = `a.status = 'published' AND a.due_at IS NOT NULL AND a.due_at > now() AND a.due_at < now() + interval '7 days'`;
  if (classId) {
    assignmentParams.push(classId);
    assignmentClauses += ` AND a.class_id = $${assignmentParams.length}`;
  }

  const [exams, assignments] = await Promise.all([
    query(
      `SELECT e.id, e.title, e.ends_at AS due_at, 'exam' AS type, c.name AS class_name, c.section AS class_section
       FROM exams e JOIN classes c ON c.id = e.class_id
       WHERE ${examClauses}
       ORDER BY e.ends_at LIMIT 8`,
      examParams
    ),
    query(
      `SELECT a.id, a.title, a.due_at, 'assignment' AS type, c.name AS class_name, c.section AS class_section
       FROM assignments a JOIN classes c ON c.id = a.class_id
       WHERE ${assignmentClauses}
       ORDER BY a.due_at LIMIT 8`,
      assignmentParams
    ),
  ]);

  const combined = [...exams.rows, ...assignments.rows].sort(
    // deno-lint-ignore no-explicit-any
    (a: any, b: any) => new Date(a.due_at).getTime() - new Date(b.due_at).getTime()
  );
  return c.json(combined.slice(0, 8));
});

export default dashboard;
