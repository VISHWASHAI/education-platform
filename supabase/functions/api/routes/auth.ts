import { Hono } from 'npm:hono@4';
import bcrypt from 'npm:bcryptjs@2.4.3';
import { query } from '../lib/db.ts';
import { requireAuth, signToken, JwtPayload } from '../lib/auth.ts';

const auth = new Hono();

auth.post('/login', async (c) => {
  const { email, password } = await c.req.json();
  if (!email || !password) {
    return c.json({ error: 'Email and password are required' }, 400);
  }

  const { rows } = await query(
    `SELECT u.*, r.name AS role_name
     FROM users u JOIN roles r ON r.id = u.role_id
     WHERE u.email = $1`,
    [email]
  );
  const user = rows[0];
  if (!user || !user.is_active) {
    return c.json({ error: 'Invalid credentials' }, 401);
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return c.json({ error: 'Invalid credentials' }, 401);
  }

  const token = signToken({ sub: user.id, email: user.email, role: user.role_name, name: user.full_name });
  return c.json({
    token,
    user: { id: user.id, fullName: user.full_name, email: user.email, role: user.role_name },
  });
});

auth.get('/me', requireAuth, async (c) => {
  const authUser = c.get('user') as JwtPayload;
  const { rows } = await query(
    `SELECT u.id, u.full_name, u.email, r.name AS role_name
     FROM users u JOIN roles r ON r.id = u.role_id
     WHERE u.id = $1`,
    [authUser.sub]
  );
  const user = rows[0];
  if (!user) return c.json({ error: 'User not found' }, 404);
  return c.json({ id: user.id, fullName: user.full_name, email: user.email, role: user.role_name });
});

export default auth;
