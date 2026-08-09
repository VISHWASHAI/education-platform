import { query } from '../db/pool.js';

const LOGGED_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const SENSITIVE_FIELDS = new Set(['password', 'passwordHash', 'temporaryPassword']);

function sanitize(body) {
  if (!body || typeof body !== 'object') return null;
  const clean = {};
  for (const [key, value] of Object.entries(body)) {
    clean[key] = SENSITIVE_FIELDS.has(key) ? '[redacted]' : value;
  }
  return clean;
}

function inferEntity(baseUrl) {
  return baseUrl.replace(/^\/api\//, '').split('/')[0] || 'unknown';
}

export function auditLogger(req, res, next) {
  res.on('finish', () => {
    if (!LOGGED_METHODS.has(req.method) || res.statusCode >= 400 || !req.user) return;

    const entityId = Number(req.params?.id ?? req.params?.submissionId ?? req.params?.answerId);
    query(
      `INSERT INTO audit_log (user_id, action, entity, entity_id, details, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        req.user.sub,
        `${req.method} ${req.baseUrl}${req.route?.path === '/' ? '' : req.route?.path || ''}`,
        inferEntity(req.baseUrl),
        Number.isFinite(entityId) ? entityId : null,
        JSON.stringify(sanitize(req.body)),
        req.ip,
      ]
    ).catch((err) => console.error('Audit log write failed:', err.message));
  });
  next();
}
