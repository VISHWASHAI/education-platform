import { Hono } from 'npm:hono@4';
import crypto from 'node:crypto';
import { query, pool } from '../lib/db.ts';
import { requireAuth, requireRole, JwtPayload } from '../lib/auth.ts';
import { sendCsv } from '../lib/csv.ts';

const fees = new Hono();
const canManage = requireRole('super_admin', 'head_master', 'office_admin');

fees.use('*', requireAuth);

fees.get('/', canManage, async (c) => {
  const q = c.req.query();
  const studentId = q.studentId;
  const classId = q.classId;
  const status = q.status;
  const conditions: string[] = [];
  const params: unknown[] = [];
  if (studentId) {
    params.push(studentId);
    conditions.push(`sf.student_id = $${params.length}`);
  }
  if (classId) {
    params.push(classId);
    conditions.push(`s.class_id = $${params.length}`);
  }
  if (status) {
    params.push(status);
    conditions.push(`sf.status = $${params.length}`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const { rows } = await query(
    `SELECT sf.*, s.full_name AS student_name, s.admission_no, fc.name AS category_name
     FROM student_fees sf
     JOIN students s ON s.id = sf.student_id
     JOIN fee_categories fc ON fc.id = sf.fee_category_id
     ${where}
     ORDER BY sf.due_date NULLS LAST, sf.created_at DESC`,
    params
  );
  return c.json(rows);
});

fees.get('/my', requireRole('student'), async (c) => {
  const user = c.get('user') as JwtPayload;
  const { rows: studentRows } = await query('SELECT id FROM students WHERE user_id = $1', [user.sub]);
  if (!studentRows[0]) return c.json([]);

  const { rows } = await query(
    `SELECT sf.*, fc.name AS category_name
     FROM student_fees sf JOIN fee_categories fc ON fc.id = sf.fee_category_id
     WHERE sf.student_id = $1
     ORDER BY sf.due_date NULLS LAST, sf.created_at DESC`,
    [studentRows[0].id]
  );
  return c.json(rows);
});

fees.get('/summary', canManage, async (c) => {
  const [totals, byMonth, outstanding] = await Promise.all([
    query(`SELECT COALESCE(SUM(amount), 0) AS total_billed, COALESCE(SUM(amount_paid), 0) AS total_collected FROM student_fees`),
    query(
      `SELECT to_char(date_trunc('month', paid_at), 'YYYY-MM') AS month, SUM(amount) AS revenue
       FROM payments
       WHERE paid_at > now() - interval '12 months'
       GROUP BY 1 ORDER BY 1`
    ),
    query(`SELECT COALESCE(SUM(amount - amount_paid), 0) AS outstanding FROM student_fees WHERE status != 'paid'`),
  ]);

  return c.json({
    totalBilled: Number(totals.rows[0].total_billed),
    totalCollected: Number(totals.rows[0].total_collected),
    outstanding: Number(outstanding.rows[0].outstanding),
    // deno-lint-ignore no-explicit-any
    revenueByMonth: byMonth.rows.map((r: any) => ({ month: r.month, revenue: Number(r.revenue) })),
  });
});

fees.get('/export', canManage, async (c) => {
  const status = c.req.query('status');
  const params: unknown[] = [];
  let where = '';
  if (status) {
    params.push(status);
    where = `WHERE sf.status = $1`;
  }
  const { rows } = await query(
    `SELECT s.admission_no AS "admissionNo", s.full_name AS "studentName", fc.name AS "category",
            sf.amount AS "amount", sf.amount_paid AS "amountPaid", sf.status AS "status",
            sf.due_date AS "dueDate"
     FROM student_fees sf
     JOIN students s ON s.id = sf.student_id
     JOIN fee_categories fc ON fc.id = sf.fee_category_id
     ${where}
     ORDER BY sf.due_date NULLS LAST`,
    params
  );
  return sendCsv(c, 'fees_export.csv', rows, ['admissionNo', 'studentName', 'category', 'amount', 'amountPaid', 'status', 'dueDate']);
});

fees.post('/', canManage, async (c) => {
  const user = c.get('user') as JwtPayload;
  const { studentIds, feeCategoryId, amount, dueDate } = await c.req.json();
  if (!Array.isArray(studentIds) || studentIds.length === 0 || !feeCategoryId || !amount) {
    return c.json({ error: 'studentIds[], feeCategoryId, and amount are required' }, 400);
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const created = [];
    for (const studentId of studentIds) {
      const { rows } = await client.query(
        `INSERT INTO student_fees (student_id, fee_category_id, amount, due_date, created_by)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [studentId, feeCategoryId, amount, dueDate || null, user.sub]
      );
      created.push(rows[0]);
    }
    await client.query('COMMIT');
    return c.json(created, 201);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
});

fees.get('/:id', async (c) => {
  const id = c.req.param('id');
  const user = c.get('user') as JwtPayload;
  const { rows: feeRows } = await query(
    `SELECT sf.*, s.full_name AS student_name, s.admission_no, fc.name AS category_name
     FROM student_fees sf
     JOIN students s ON s.id = sf.student_id
     JOIN fee_categories fc ON fc.id = sf.fee_category_id
     WHERE sf.id = $1`,
    [id]
  );
  if (!feeRows[0]) return c.json({ error: 'Fee not found' }, 404);

  const canManageFees = ['super_admin', 'head_master', 'office_admin'].includes(user.role);
  if (!canManageFees) {
    if (user.role !== 'student') {
      return c.json({ error: 'You do not have access to fee records' }, 403);
    }
    const { rows: ownRows } = await query('SELECT id FROM students WHERE user_id = $1', [user.sub]);
    if (!ownRows[0] || Number(ownRows[0].id) !== Number(feeRows[0].student_id)) {
      return c.json({ error: 'You can only view your own fees' }, 403);
    }
  }

  const { rows: payments } = await query(
    'SELECT * FROM payments WHERE student_fee_id = $1 ORDER BY paid_at DESC',
    [id]
  );

  return c.json({ ...feeRows[0], payments });
});

fees.put('/:id', canManage, async (c) => {
  const id = c.req.param('id');
  const { amount, dueDate } = await c.req.json();
  const { rows } = await query(
    `UPDATE student_fees SET
       amount = COALESCE($1, amount),
       due_date = COALESCE($2, due_date),
       status = CASE
         WHEN COALESCE($1, amount) <= amount_paid THEN 'paid'
         WHEN amount_paid > 0 THEN 'partial'
         ELSE 'unpaid'
       END
     WHERE id = $3 RETURNING *`,
    [amount, dueDate, id]
  );
  if (!rows[0]) return c.json({ error: 'Fee not found' }, 404);
  return c.json(rows[0]);
});

fees.delete('/:id', canManage, async (c) => {
  const id = c.req.param('id');
  const { rowCount } = await query('DELETE FROM student_fees WHERE id = $1', [id]);
  if (!rowCount) return c.json({ error: 'Fee not found' }, 404);
  return c.body(null, 204);
});

fees.post('/:id/payments', canManage, async (c) => {
  const id = c.req.param('id');
  const user = c.get('user') as JwtPayload;
  const { amount, method } = await c.req.json();
  if (!amount || !method) {
    return c.json({ error: 'amount and method are required' }, 400);
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: feeRows } = await client.query('SELECT * FROM student_fees WHERE id = $1 FOR UPDATE', [id]);
    if (!feeRows[0]) {
      await client.query('ROLLBACK');
      return c.json({ error: 'Fee not found' }, 404);
    }

    const receiptNo = `RCPT-${Date.now()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
    const { rows: paymentRows } = await client.query(
      `INSERT INTO payments (student_fee_id, amount, method, receipt_no, recorded_by)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [id, amount, method, receiptNo, user.sub]
    );

    const newPaid = Number(feeRows[0].amount_paid) + Number(amount);
    const status = newPaid >= Number(feeRows[0].amount) ? 'paid' : newPaid > 0 ? 'partial' : 'unpaid';
    const { rows: updatedFee } = await client.query(
      `UPDATE student_fees SET amount_paid = $1, status = $2 WHERE id = $3 RETURNING *`,
      [newPaid, status, id]
    );

    await client.query('COMMIT');
    return c.json({ payment: paymentRows[0], fee: updatedFee[0] }, 201);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
});

fees.post('/:id/pay', requireRole('student'), async (c) => {
  const id = c.req.param('id');
  const user = c.get('user') as JwtPayload;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: studentRows } = await client.query('SELECT id FROM students WHERE user_id = $1', [user.sub]);
    if (!studentRows[0]) {
      await client.query('ROLLBACK');
      return c.json({ error: 'Only enrolled students can pay fees' }, 403);
    }

    const { rows: feeRows } = await client.query('SELECT * FROM student_fees WHERE id = $1 FOR UPDATE', [id]);
    if (!feeRows[0]) {
      await client.query('ROLLBACK');
      return c.json({ error: 'Fee not found' }, 404);
    }
    if (Number(feeRows[0].student_id) !== Number(studentRows[0].id)) {
      await client.query('ROLLBACK');
      return c.json({ error: 'You can only pay your own fees' }, 403);
    }

    const outstanding = Number(feeRows[0].amount) - Number(feeRows[0].amount_paid);
    if (outstanding <= 0) {
      await client.query('ROLLBACK');
      return c.json({ error: 'This fee is already paid in full' }, 400);
    }

    const receiptNo = `RCPT-${Date.now()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
    const { rows: paymentRows } = await client.query(
      `INSERT INTO payments (student_fee_id, amount, method, receipt_no, recorded_by)
       VALUES ($1, $2, 'online', $3, $4) RETURNING *`,
      [id, outstanding, receiptNo, user.sub]
    );

    const { rows: updatedFee } = await client.query(
      `UPDATE student_fees SET amount_paid = amount, status = 'paid' WHERE id = $1 RETURNING *`,
      [id]
    );

    await client.query('COMMIT');
    return c.json({ payment: paymentRows[0], fee: updatedFee[0] }, 201);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
});

export default fees;
