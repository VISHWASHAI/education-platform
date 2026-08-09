import { Hono } from 'npm:hono@4';
import { query } from '../lib/db.ts';
import { requireAuth, requireRole, JwtPayload } from '../lib/auth.ts';

const STAFF_ROLES = ['super_admin', 'head_master', 'group_coordinator', 'teacher', 'office_admin'];

const announcements = new Hono();
const canManage = requireRole('super_admin', 'head_master', 'group_coordinator', 'teacher', 'office_admin');

announcements.use('*', requireAuth);

announcements.get('/', async (c) => {
  const user = c.get('user') as JwtPayload;
  const isStaff = STAFF_ROLES.includes(user.role);

  if (isStaff) {
    const { rows } = await query(
      `SELECT a.*, c.name AS class_name, c.section AS class_section, u.full_name AS created_by_name
       FROM announcements a
       LEFT JOIN classes c ON c.id = a.target_class_id
       LEFT JOIN users u ON u.id = a.created_by
       ORDER BY a.is_pinned DESC, a.created_at DESC`
    );
    return c.json(rows);
  }

  const { rows: studentRows } = await query('SELECT class_id FROM students WHERE user_id = $1', [user.sub]);
  const classId = studentRows[0]?.class_id ?? null;

  const { rows } = await query(
    `SELECT a.*, c.name AS class_name, c.section AS class_section, u.full_name AS created_by_name
     FROM announcements a
     LEFT JOIN classes c ON c.id = a.target_class_id
     LEFT JOIN users u ON u.id = a.created_by
     WHERE a.status = 'published'
       AND (a.expires_at IS NULL OR a.expires_at > now())
       AND (a.target_role IS NULL OR a.target_role = $1)
       AND (a.target_class_id IS NULL OR a.target_class_id = $2)
     ORDER BY a.is_pinned DESC, a.created_at DESC`,
    [user.role, classId]
  );
  return c.json(rows);
});

announcements.post('/', canManage, async (c) => {
  const user = c.get('user') as JwtPayload;
  const { title, body, targetRole, targetClassId, isPinned, status, expiresAt } = await c.req.json();
  if (!title || !body) {
    return c.json({ error: 'title and body are required' }, 400);
  }
  const { rows } = await query(
    `INSERT INTO announcements (title, body, target_role, target_class_id, is_pinned, status, expires_at, created_by)
     VALUES ($1, $2, $3, $4, COALESCE($5, false), COALESCE($6, 'published')::announcement_status, $7, $8)
     RETURNING *`,
    [title, body, targetRole || null, targetClassId || null, isPinned, status, expiresAt || null, user.sub]
  );
  return c.json(rows[0], 201);
});

announcements.put('/:id', canManage, async (c) => {
  const id = c.req.param('id');
  const { title, body, targetRole, targetClassId, isPinned, status, expiresAt } = await c.req.json();
  const { rows } = await query(
    `UPDATE announcements SET
       title = COALESCE($1, title),
       body = COALESCE($2, body),
       target_role = COALESCE($3, target_role),
       target_class_id = COALESCE($4, target_class_id),
       is_pinned = COALESCE($5, is_pinned),
       status = COALESCE($6, status),
       expires_at = COALESCE($7, expires_at)
     WHERE id = $8 RETURNING *`,
    [title, body, targetRole, targetClassId, isPinned, status, expiresAt, id]
  );
  if (!rows[0]) return c.json({ error: 'Announcement not found' }, 404);
  return c.json(rows[0]);
});

announcements.delete('/:id', canManage, async (c) => {
  const id = c.req.param('id');
  const { rowCount } = await query('DELETE FROM announcements WHERE id = $1', [id]);
  if (!rowCount) return c.json({ error: 'Announcement not found' }, 404);
  return c.body(null, 204);
});

export default announcements;
