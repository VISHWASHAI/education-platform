import { Context, Next } from 'npm:hono@4';
import jwt from 'npm:jsonwebtoken@9.0.2';

export interface JwtPayload {
  sub: number;
  email: string;
  role: string;
  name: string;
}

const JWT_SECRET = Deno.env.get('JWT_SECRET')!;
const JWT_EXPIRES_IN = Deno.env.get('JWT_EXPIRES_IN') || '8h';

export function signToken(payload: JwtPayload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export async function requireAuth(c: Context, next: Next) {
  const header = c.req.header('authorization');
  if (!header?.startsWith('Bearer ')) {
    return c.json({ error: 'Missing or invalid authorization header' }, 401);
  }
  const token = header.slice('Bearer '.length);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
    c.set('user', payload);
    await next();
  } catch {
    return c.json({ error: 'Invalid or expired token' }, 401);
  }
}

export function requireRole(...roles: string[]) {
  return async (c: Context, next: Next) => {
    const user = c.get('user') as JwtPayload | undefined;
    if (!user) return c.json({ error: 'Not authenticated' }, 401);
    if (!roles.includes(user.role)) {
      return c.json({ error: 'Insufficient permissions' }, 403);
    }
    await next();
  };
}
