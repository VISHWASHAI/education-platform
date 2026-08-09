import { query } from '../db/pool.js';

export async function listAuditLog(req, res) {
  const { userId, entity, action, dateFrom, dateTo, page = 1, pageSize = 50 } = req.query;
  const limit = Math.min(Number(pageSize) || 50, 200);
  const offset = (Math.max(Number(page) || 1, 1) - 1) * limit;

  const conditions = [];
  const params = [];

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

  res.json({ data: rows, total: Number(countResult.rows[0].count), page: Number(page), pageSize: limit });
}
