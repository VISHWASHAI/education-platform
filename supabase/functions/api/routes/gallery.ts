import { Hono } from 'npm:hono@4';
import { query } from '../lib/db.ts';
import { requireAuth, requireRole, JwtPayload } from '../lib/auth.ts';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const gallery = new Hono();
const canManage = requireRole('super_admin', 'head_master', 'group_coordinator', 'teacher', 'office_admin');

gallery.use('*', requireAuth);

gallery.get('/', async (c) => {
  const { rows } = await query(
    `SELECT g.id, g.caption, g.image_data, g.created_at, u.full_name AS uploaded_by_name
     FROM gallery_photos g
     LEFT JOIN users u ON u.id = g.uploaded_by
     ORDER BY g.created_at DESC`
  );
  return c.json(rows);
});

gallery.post('/', canManage, async (c) => {
  const user = c.get('user') as JwtPayload;
  const { caption, imageData } = await c.req.json();
  if (!imageData || !imageData.startsWith('data:image/')) {
    return c.json({ error: 'imageData must be a base64 image data URL' }, 400);
  }
  const approxBytes = Math.ceil((imageData.length - imageData.indexOf(',') - 1) * 3 / 4);
  if (approxBytes > MAX_IMAGE_BYTES) {
    return c.json({ error: 'Image must be under 5MB' }, 400);
  }
  const { rows } = await query(
    `INSERT INTO gallery_photos (caption, image_data, uploaded_by) VALUES ($1, $2, $3) RETURNING id, caption, image_data, created_at`,
    [caption || null, imageData, user.sub]
  );
  return c.json(rows[0], 201);
});

gallery.delete('/:id', canManage, async (c) => {
  const id = c.req.param('id');
  const { rowCount } = await query('DELETE FROM gallery_photos WHERE id = $1', [id]);
  if (!rowCount) return c.json({ error: 'Photo not found' }, 404);
  return c.body(null, 204);
});

export default gallery;
