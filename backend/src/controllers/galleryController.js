import { query } from '../db/pool.js';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export async function listPhotos(req, res) {
  const { rows } = await query(
    `SELECT g.id, g.caption, g.image_data, g.created_at, u.full_name AS uploaded_by_name
     FROM gallery_photos g
     LEFT JOIN users u ON u.id = g.uploaded_by
     ORDER BY g.created_at DESC`
  );
  res.json(rows);
}

export async function uploadPhoto(req, res) {
  const { caption, imageData } = req.body;
  if (!imageData || !imageData.startsWith('data:image/')) {
    return res.status(400).json({ error: 'imageData must be a base64 image data URL' });
  }
  const approxBytes = Math.ceil((imageData.length - imageData.indexOf(',') - 1) * 3 / 4);
  if (approxBytes > MAX_IMAGE_BYTES) {
    return res.status(400).json({ error: 'Image must be under 5MB' });
  }
  const { rows } = await query(
    `INSERT INTO gallery_photos (caption, image_data, uploaded_by) VALUES ($1, $2, $3) RETURNING id, caption, image_data, created_at`,
    [caption || null, imageData, req.user.sub]
  );
  res.status(201).json(rows[0]);
}

export async function deletePhoto(req, res) {
  const { id } = req.params;
  const { rowCount } = await query('DELETE FROM gallery_photos WHERE id = $1', [id]);
  if (!rowCount) return res.status(404).json({ error: 'Photo not found' });
  res.status(204).end();
}
