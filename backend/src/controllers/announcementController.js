import { query } from '../db/pool.js';

const STAFF_ROLES = ['super_admin', 'head_master', 'group_coordinator', 'teacher', 'office_admin'];

export async function listAnnouncements(req, res) {
  const isStaff = STAFF_ROLES.includes(req.user.role);

  if (isStaff) {
    const { rows } = await query(
      `SELECT a.*, c.name AS class_name, c.section AS class_section, u.full_name AS created_by_name
       FROM announcements a
       LEFT JOIN classes c ON c.id = a.target_class_id
       LEFT JOIN users u ON u.id = a.created_by
       ORDER BY a.is_pinned DESC, a.created_at DESC`
    );
    return res.json(rows);
  }

  const { rows: studentRows } = await query('SELECT class_id FROM students WHERE user_id = $1', [req.user.sub]);
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
    [req.user.role, classId]
  );
  res.json(rows);
}

export async function createAnnouncement(req, res) {
  const { title, body, targetRole, targetClassId, isPinned, status, expiresAt } = req.body;
  if (!title || !body) {
    return res.status(400).json({ error: 'title and body are required' });
  }
  const { rows } = await query(
    `INSERT INTO announcements (title, body, target_role, target_class_id, is_pinned, status, expires_at, created_by)
     VALUES ($1, $2, $3, $4, COALESCE($5, false), COALESCE($6, 'published')::announcement_status, $7, $8)
     RETURNING *`,
    [title, body, targetRole || null, targetClassId || null, isPinned, status, expiresAt || null, req.user.sub]
  );
  res.status(201).json(rows[0]);
}

export async function updateAnnouncement(req, res) {
  const { id } = req.params;
  const { title, body, targetRole, targetClassId, isPinned, status, expiresAt } = req.body;
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
  if (!rows[0]) return res.status(404).json({ error: 'Announcement not found' });
  res.json(rows[0]);
}

export async function deleteAnnouncement(req, res) {
  const { id } = req.params;
  const { rowCount } = await query('DELETE FROM announcements WHERE id = $1', [id]);
  if (!rowCount) return res.status(404).json({ error: 'Announcement not found' });
  res.status(204).end();
}
