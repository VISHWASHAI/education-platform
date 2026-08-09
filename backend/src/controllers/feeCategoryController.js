import { query } from '../db/pool.js';

export async function listFeeCategories(req, res) {
  const { rows } = await query('SELECT * FROM fee_categories ORDER BY name');
  res.json(rows);
}

export async function createFeeCategory(req, res) {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  try {
    const { rows } = await query(
      'INSERT INTO fee_categories (name, description) VALUES ($1, $2) RETURNING *',
      [name, description || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'A category with that name already exists' });
    throw err;
  }
}

export async function deleteFeeCategory(req, res) {
  const { id } = req.params;
  try {
    const { rowCount } = await query('DELETE FROM fee_categories WHERE id = $1', [id]);
    if (!rowCount) return res.status(404).json({ error: 'Category not found' });
    res.status(204).end();
  } catch (err) {
    if (err.code === '23503') {
      return res.status(409).json({ error: 'This category has fees assigned to students and cannot be deleted.' });
    }
    throw err;
  }
}
