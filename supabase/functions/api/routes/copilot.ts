import { Hono } from 'npm:hono@4';
import { query } from '../lib/db.ts';
import { requireAuth, JwtPayload } from '../lib/auth.ts';
import { runCopilotTurn } from '../lib/gemini.ts';

const STAFF_ROLES = ['super_admin', 'head_master', 'group_coordinator', 'teacher', 'office_admin'];
const FEE_ROLES = ['super_admin', 'head_master', 'office_admin'];

const copilot = new Hono();
copilot.use('*', requireAuth);

const SYSTEM_INSTRUCTION = `You are the EduFlow assistant for People's Education Society, a school management platform.
You answer questions using ONLY the data returned by the tools available to you — never invent numbers, names, or facts.
If a tool returns no data, say so plainly. Keep answers concise and specific (use real figures from the tool result).
If the question doesn't match any available tool, say you can't help with that yet rather than guessing.`;

// Each tool declaration + its executor. The executor is scoped to the
// authenticated user so a student can never pull another student's data,
// and student-only/staff-only tools are filtered out of the list entirely
// before being sent to the model, so it can't even attempt to call them.

async function currentStudentId(userId: number): Promise<number | null> {
  const { rows } = await query('SELECT id FROM students WHERE user_id = $1', [userId]);
  return rows[0]?.id ?? null;
}

const TOOLS = {
  get_pending_fees: {
    roles: 'all',
    declaration: {
      name: 'get_pending_fees',
      description: 'Get unpaid or partially paid fees. Staff can filter by class; students only see their own fees.',
      parameters: {
        type: 'OBJECT',
        properties: {
          classId: { type: 'NUMBER', description: 'Optional class id to filter by (staff only, ignored for students)' },
        },
      },
    },
    async run(user: JwtPayload, args: Record<string, unknown>) {
      if (user.role === 'student') {
        const sid = await currentStudentId(user.sub);
        if (!sid) return { fees: [] };
        const { rows } = await query(
          `SELECT fc.name AS category, sf.amount, sf.amount_paid, sf.status, sf.due_date
           FROM student_fees sf JOIN fee_categories fc ON fc.id = sf.fee_category_id
           WHERE sf.student_id = $1 AND sf.status != 'paid'
           ORDER BY sf.due_date NULLS LAST`,
          [sid]
        );
        return { fees: rows };
      }
      if (!FEE_ROLES.includes(user.role)) return { error: 'Not authorized to view fee data' };
      const params: unknown[] = [];
      let where = `WHERE sf.status != 'paid'`;
      if (args.classId) {
        params.push(args.classId);
        where += ` AND s.class_id = $${params.length}`;
      }
      const { rows } = await query(
        `SELECT s.full_name AS student, s.admission_no, fc.name AS category, sf.amount, sf.amount_paid, sf.status, sf.due_date
         FROM student_fees sf
         JOIN students s ON s.id = sf.student_id
         JOIN fee_categories fc ON fc.id = sf.fee_category_id
         ${where}
         ORDER BY sf.due_date NULLS LAST LIMIT 25`,
        params
      );
      return { fees: rows, count: rows.length };
    },
  },

  get_attendance_summary: {
    roles: 'all',
    declaration: {
      name: 'get_attendance_summary',
      description: "Get attendance rate over the last 30 days. Staff can specify a class; students get their own rate.",
      parameters: {
        type: 'OBJECT',
        properties: {
          classId: { type: 'NUMBER', description: 'Optional class id (staff only, ignored for students)' },
        },
      },
    },
    async run(user: JwtPayload, args: Record<string, unknown>) {
      if (user.role === 'student') {
        const sid = await currentStudentId(user.sub);
        if (!sid) return { error: 'No student record found' };
        const { rows } = await query(
          `SELECT COUNT(*) FILTER (WHERE status = 'present') AS present, COUNT(*) AS total
           FROM attendance WHERE student_id = $1 AND date > CURRENT_DATE - INTERVAL '30 days'`,
          [sid]
        );
        const total = Number(rows[0].total);
        return {
          attendanceRate: total ? Math.round((Number(rows[0].present) / total) * 1000) / 10 : null,
          daysMarked: total,
        };
      }
      if (!STAFF_ROLES.includes(user.role)) return { error: 'Not authorized' };
      const params: unknown[] = [];
      let where = `WHERE a.date > CURRENT_DATE - INTERVAL '30 days'`;
      if (args.classId) {
        params.push(args.classId);
        where += ` AND s.class_id = $${params.length}`;
      }
      const { rows } = await query(
        `SELECT COUNT(*) FILTER (WHERE a.status = 'present') AS present, COUNT(*) AS total
         FROM attendance a JOIN students s ON s.id = a.student_id
         ${where}`,
        params
      );
      const total = Number(rows[0].total);
      return {
        attendanceRate: total ? Math.round((Number(rows[0].present) / total) * 1000) / 10 : null,
        recordsMarked: total,
      };
    },
  },

  get_flagged_students: {
    roles: STAFF_ROLES,
    declaration: {
      name: 'get_flagged_students',
      description:
        'Get students who need attention: attendance under 75% in the last 30 days, average exam score under 50%, or 2+ overdue assignments not submitted.',
      parameters: {
        type: 'OBJECT',
        properties: {
          classId: { type: 'NUMBER', description: 'Optional class id to filter by' },
        },
      },
    },
    async run(user: JwtPayload, args: Record<string, unknown>) {
      if (!STAFF_ROLES.includes(user.role)) return { error: 'Not authorized' };
      const params: unknown[] = [];
      let classFilter = '';
      if (args.classId) {
        params.push(args.classId);
        classFilter = `AND s.class_id = $${params.length}`;
      }
      const { rows } = await query(
        `WITH att AS (
           SELECT student_id, ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'present') / NULLIF(COUNT(*), 0), 1) AS attendance_rate
           FROM attendance WHERE date > CURRENT_DATE - INTERVAL '30 days'
           GROUP BY student_id
         ),
         exam AS (
           SELECT student_id, ROUND(AVG(total_score / NULLIF(max_score, 0) * 100)::numeric, 1) AS avg_score
           FROM exam_submissions WHERE status = 'graded'
           GROUP BY student_id
         ),
         pending AS (
           SELECT s.id AS student_id, COUNT(*) AS pending_count
           FROM students s
           JOIN assignments a ON a.class_id = s.class_id AND a.status = 'published' AND a.due_at < now()
           LEFT JOIN assignment_submissions sub ON sub.assignment_id = a.id AND sub.student_id = s.id
           WHERE sub.id IS NULL
           GROUP BY s.id
         )
         SELECT s.full_name, s.admission_no, c.name AS class_name, c.section AS class_section,
                att.attendance_rate, exam.avg_score, COALESCE(pending.pending_count, 0) AS pending_assignments
         FROM students s
         LEFT JOIN classes c ON c.id = s.class_id
         LEFT JOIN att ON att.student_id = s.id
         LEFT JOIN exam ON exam.student_id = s.id
         LEFT JOIN pending ON pending.student_id = s.id
         WHERE (att.attendance_rate IS NOT NULL AND att.attendance_rate < 75)
            OR (exam.avg_score IS NOT NULL AND exam.avg_score < 50)
            OR COALESCE(pending.pending_count, 0) >= 2
         ${classFilter}
         ORDER BY att.attendance_rate ASC NULLS LAST
         LIMIT 15`,
        params
      );
      return { flaggedStudents: rows, count: rows.length };
    },
  },

  get_top_bottom_performers: {
    roles: STAFF_ROLES,
    declaration: {
      name: 'get_top_bottom_performers',
      description: 'Get the highest and lowest performing students by average graded exam score, optionally for one class.',
      parameters: {
        type: 'OBJECT',
        properties: {
          classId: { type: 'NUMBER', description: 'Optional class id to filter by' },
        },
      },
    },
    async run(user: JwtPayload, args: Record<string, unknown>) {
      if (!STAFF_ROLES.includes(user.role)) return { error: 'Not authorized' };
      const params: unknown[] = [];
      let classFilter = '';
      if (args.classId) {
        params.push(args.classId);
        classFilter = `AND s.class_id = $${params.length}`;
      }
      const { rows } = await query(
        `SELECT s.full_name, c.name AS class_name, c.section AS class_section,
                ROUND(AVG(es.total_score / NULLIF(es.max_score, 0) * 100)::numeric, 1) AS avg_score
         FROM exam_submissions es
         JOIN students s ON s.id = es.student_id
         LEFT JOIN classes c ON c.id = s.class_id
         WHERE es.status = 'graded' ${classFilter}
         GROUP BY s.id, s.full_name, c.name, c.section
         HAVING COUNT(*) > 0
         ORDER BY avg_score DESC`,
        params
      );
      return {
        top: rows.slice(0, 5),
        bottom: rows.slice(-5).reverse(),
      };
    },
  },

  get_upcoming_deadlines: {
    roles: 'all',
    declaration: {
      name: 'get_upcoming_deadlines',
      description: 'Get exams and assignments due in the next 7 days, scoped to the current user (their class if a student).',
      parameters: { type: 'OBJECT', properties: {} },
    },
    async run(user: JwtPayload, _args: Record<string, unknown>) {
      let classId: number | null = null;
      if (user.role === 'student') {
        const { rows } = await query('SELECT class_id FROM students WHERE user_id = $1', [user.sub]);
        classId = rows[0]?.class_id ?? null;
        if (!classId) return { deadlines: [] };
      }
      const examParams: unknown[] = [];
      let examWhere = `e.status = 'published' AND e.ends_at > now() AND e.ends_at < now() + interval '7 days'`;
      if (classId) {
        examParams.push(classId);
        examWhere += ` AND e.class_id = $${examParams.length}`;
      }
      const assignmentParams: unknown[] = [];
      let assignmentWhere = `a.status = 'published' AND a.due_at > now() AND a.due_at < now() + interval '7 days'`;
      if (classId) {
        assignmentParams.push(classId);
        assignmentWhere += ` AND a.class_id = $${assignmentParams.length}`;
      }
      const [exams, assignmentsRes] = await Promise.all([
        query(
          `SELECT e.title, 'exam' AS type, e.ends_at AS due_at, c.name AS class_name, c.section AS class_section
           FROM exams e JOIN classes c ON c.id = e.class_id WHERE ${examWhere} ORDER BY e.ends_at LIMIT 10`,
          examParams
        ),
        query(
          `SELECT a.title, 'assignment' AS type, a.due_at, c.name AS class_name, c.section AS class_section
           FROM assignments a JOIN classes c ON c.id = a.class_id WHERE ${assignmentWhere} ORDER BY a.due_at LIMIT 10`,
          assignmentParams
        ),
      ]);
      return { deadlines: [...exams.rows, ...assignmentsRes.rows] };
    },
  },

  get_recent_announcements: {
    roles: 'all',
    declaration: {
      name: 'get_recent_announcements',
      description: 'Get the most recent announcements visible to the current user.',
      parameters: { type: 'OBJECT', properties: {} },
    },
    async run(user: JwtPayload, _args: Record<string, unknown>) {
      if (STAFF_ROLES.includes(user.role)) {
        const { rows } = await query(
          `SELECT title, body, created_at FROM announcements ORDER BY is_pinned DESC, created_at DESC LIMIT 5`
        );
        return { announcements: rows };
      }
      const { rows: studentRows } = await query('SELECT class_id FROM students WHERE user_id = $1', [user.sub]);
      const classId = studentRows[0]?.class_id ?? null;
      const { rows } = await query(
        `SELECT title, body, created_at FROM announcements
         WHERE status = 'published' AND (expires_at IS NULL OR expires_at > now())
           AND (target_role IS NULL OR target_role = $1)
           AND (target_class_id IS NULL OR target_class_id = $2)
         ORDER BY is_pinned DESC, created_at DESC LIMIT 5`,
        [user.role, classId]
      );
      return { announcements: rows };
    },
  },
};

copilot.post('/', async (c) => {
  const user = c.get('user') as JwtPayload;
  const { question } = await c.req.json();
  if (!question || typeof question !== 'string') {
    return c.json({ error: 'question is required' }, 400);
  }

  const availableTools = Object.entries(TOOLS).filter(
    ([, t]) => t.roles === 'all' || (t.roles as string[]).includes(user.role)
  );

  try {
    const { answer, toolUsed } = await runCopilotTurn(
      question,
      SYSTEM_INSTRUCTION,
      availableTools.map(([, t]) => t.declaration),
      async (call) => {
        const tool = TOOLS[call.name as keyof typeof TOOLS];
        if (!tool || (tool.roles !== 'all' && !(tool.roles as string[]).includes(user.role))) {
          return { error: 'Tool not available for your role' };
        }
        return tool.run(user, call.args ?? {});
      }
    );
    return c.json({ answer, toolUsed });
  } catch (err) {
    console.error('Copilot error:', err);
    return c.json({ error: err instanceof Error ? err.message : 'Copilot request failed' }, 500);
  }
});

export default copilot;
