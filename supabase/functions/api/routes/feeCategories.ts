import { Hono } from 'npm:hono@4';
import { query } from '../lib/db.ts';
import { requireAuth, requireRole } from '../lib/auth.ts';

const feeCategories = new Hono();
const canManage = requireRole('super_admin', 'head_master', 'office_admin');

feeCategories.use('*', requireAuth);

feeCategories.get('/', async (c) => {
  const { rows } = await query('SELECT * FROM fee_categories ORDER BY name');
  return c.json(rows);
});

feeCategories.post('/', canManage, async (c) => {
  const { name, description } = await c.req.json();
  if (!name) return c.json({ error: 'name is required' }, 400);
  try {
    const { rows } = await query(
      'INSERT INTO fee_categories (name, description) VALUES ($1, $2) RETURNING *',
      [name, description || null]
    );
    return c.json(rows[0], 201);
  } catch (err) {
    if ((err as { code?: string }).code === '23505') {
      return c.json({ error: 'A category with that name already exists' }, 409);
    }
    throw err;
  }
});

feeCategories.delete('/:id', canManage, async (c) => {
  const id = c.req.param('id');
  try {
    const { rowCount } = await query('DELETE FROM fee_categories WHERE id = $1', [id]);
    if (!rowCount) return c.json({ error: 'Category not found' }, 404);
    return c.body(null, 204);
  } catch (err) {
    if ((err as { code?: string }).code === '23503') {
      return c.json({ error: 'This category has fees assigned to students and cannot be deleted.' }, 409);
    }
    throw err;
  }
});

export default feeCategories;
