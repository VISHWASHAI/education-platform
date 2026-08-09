import { Hono } from 'npm:hono@4';
import { query } from '../lib/db.ts';
import { requireAuth, requireRole } from '../lib/auth.ts';

const auditLog = new Hono();

auditLog.use('*', requireAuth);
auditLog.use('*', requireRole('super_admin', 'head_master'));

auditLog.get('/', async (c) => {
  const q = c.req.query();
  const userId = q.userId;
  const entity = q.entity;
  const action = q.action;
  const dateFrom = q.dateFrom;
  const dateTo = q.dateTo;
  const page = q.page ?? 1;
  const pageSize = q.pageSize ?? 50;

  const limit = Math.min(Number(pageSize) || 50, 200);
  const offset = (Math.max(Number(page) || 1, 1) - 1) * limit;

  const conditions: string[] = [];
  const params: unknown[] = [];

  if (userId) {
    params.push(userId);
    conditions.push(`al.user_id = $${params.length}`);
  }
  if (entity) {
    params.push(entity);
    conditions.push(`al.entity = $${params.length}`);
  }
  if (action) {
    params.push(`%${action}%`);
    conditions.push(`al.action ILIKE $${params.length}`);
  }
  if (dateFrom) {
    params.push(dateFrom);
    conditions.push(`al.created_at >= $${params.length}`);
  }
  if (dateTo) {
    params.push(dateTo);
    conditions.push(`al.created_at <= $${params.length}`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await query(`SELECT COUNT(*) FROM audit_log al ${where}`, params);
  params.push(limit, offset);
  const { rows } = await query(
    `SELECT al.*, u.full_name AS user_name, u.email AS user_email
     FROM audit_log al
     LEFT JOIN users u ON u.id = al.user_id
     ${where}
     ORDER BY al.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  return c.json({ data: rows, total: Number(countResult.rows[0].count), page: Number(page), pageSize: limit });
});

export default auditLog;
