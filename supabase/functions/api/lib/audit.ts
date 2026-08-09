import { Context, Next } from 'npm:hono@4';
import { query } from './db.ts';
import type { JwtPayload } from './auth.ts';

const LOGGED_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const SENSITIVE_FIELDS = new Set(['password', 'passwordHash', 'temporaryPassword']);

// deno-lint-ignore no-explicit-any
function sanitize(body: any) {
  if (!body || typeof body !== 'object') return null;
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    clean[key] = SENSITIVE_FIELDS.has(key) ? '[redacted]' : value;
  }
  return clean;
}

function inferEntity(path: string) {
  // path looks like /api/students/5 -> "students"
  return path.replace(/^\/api\//, '').split('/')[0] || 'unknown';
}

export async function auditLogger(c: Context, next: Next) {
  await next();

  const method = c.req.method;
  if (!LOGGED_METHODS.has(method) || c.res.status >= 400) return;

  const user = c.get('user') as JwtPayload | undefined;
  if (!user) return;

  const path = new URL(c.req.url).pathname;
  const params = c.req.param() as Record<string, string>;
  const entityId = Number(params.id ?? params.submissionId ?? params.answerId);

  let body: unknown = null;
  try {
    body = await c.req.json();
  } catch {
    // no JSON body on this request
  }

  const task = query(
    `INSERT INTO audit_log (user_id, action, entity, entity_id, details, ip_address)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      user.sub,
      `${method} ${path}`,
      inferEntity(path),
      Number.isFinite(entityId) ? entityId : null,
      JSON.stringify(sanitize(body)),
      c.req.header('x-forwarded-for') ?? null,
    ]
  ).catch((err) => console.error('Audit log write failed:', err.message));

  // deno-lint-ignore no-explicit-any
  const runtime = (globalThis as any).EdgeRuntime;
  if (runtime?.waitUntil) {
    runtime.waitUntil(task);
  } else {
    await task;
  }
}
