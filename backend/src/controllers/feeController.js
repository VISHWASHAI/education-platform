import crypto from 'node:crypto';
import { query, pool } from '../db/pool.js';
import { sendCsv } from '../utils/csv.js';

export async function listFees(req, res) {
  const { studentId, classId, status } = req.query;
  const conditions = [];
  const params = [];
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
  res.json(rows);
}

export async function getMyFees(req, res) {
  const { rows: studentRows } = await query('SELECT id FROM students WHERE user_id = $1', [req.user.sub]);
  if (!studentRows[0]) return res.json([]);

  const { rows } = await query(
    `SELECT sf.*, fc.name AS category_name
     FROM student_fees sf JOIN fee_categories fc ON fc.id = sf.fee_category_id
     WHERE sf.student_id = $1
     ORDER BY sf.due_date NULLS LAST, sf.created_at DESC`,
    [studentRows[0].id]
  );
  res.json(rows);
}

export async function assignFee(req, res) {
  const { studentIds, feeCategoryId, amount, dueDate } = req.body;
  if (!Array.isArray(studentIds) || studentIds.length === 0 || !feeCategoryId || !amount) {
    return res.status(400).json({ error: 'studentIds[], feeCategoryId, and amount are required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const created = [];
    for (const studentId of studentIds) {
      const { rows } = await client.query(
        `INSERT INTO student_fees (student_id, fee_category_id, amount, due_date, created_by)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [studentId, feeCategoryId, amount, dueDate || null, req.user.sub]
      );
      created.push(rows[0]);
    }
    await client.query('COMMIT');
    res.status(201).json(created);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function getFeeDetail(req, res) {
  const { id } = req.params;
  const { rows: feeRows } = await query(
    `SELECT sf.*, s.full_name AS student_name, s.admission_no, fc.name AS category_name
     FROM student_fees sf
     JOIN students s ON s.id = sf.student_id
     JOIN fee_categories fc ON fc.id = sf.fee_category_id
     WHERE sf.id = $1`,
    [id]
  );
  if (!feeRows[0]) return res.status(404).json({ error: 'Fee not found' });

  const canManageFees = ['super_admin', 'head_master', 'office_admin'].includes(req.user.role);
  if (!canManageFees) {
    if (req.user.role !== 'student') {
      return res.status(403).json({ error: 'You do not have access to fee records' });
    }
    const { rows: ownRows } = await query('SELECT id FROM students WHERE user_id = $1', [req.user.sub]);
    if (!ownRows[0] || Number(ownRows[0].id) !== Number(feeRows[0].student_id)) {
      return res.status(403).json({ error: 'You can only view your own fees' });
    }
  }

  const { rows: payments } = await query(
    'SELECT * FROM payments WHERE student_fee_id = $1 ORDER BY paid_at DESC',
    [id]
  );

  res.json({ ...feeRows[0], payments });
}

export async function updateFee(req, res) {
  const { id } = req.params;
  const { amount, dueDate } = req.body;
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
  if (!rows[0]) return res.status(404).json({ error: 'Fee not found' });
  res.json(rows[0]);
}

export async function deleteFee(req, res) {
  const { id } = req.params;
  const { rowCount } = await query('DELETE FROM student_fees WHERE id = $1', [id]);
  if (!rowCount) return res.status(404).json({ error: 'Fee not found' });
  res.status(204).end();
}

export async function recordPayment(req, res) {
  const { id } = req.params;
  const { amount, method } = req.body;
  if (!amount || !method) {
    return res.status(400).json({ error: 'amount and method are required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: feeRows } = await client.query('SELECT * FROM student_fees WHERE id = $1 FOR UPDATE', [id]);
    if (!feeRows[0]) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Fee not found' });
    }

    const receiptNo = `RCPT-${Date.now()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
    const { rows: paymentRows } = await client.query(
      `INSERT INTO payments (student_fee_id, amount, method, receipt_no, recorded_by)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [id, amount, method, receiptNo, req.user.sub]
    );

    const newPaid = Number(feeRows[0].amount_paid) + Number(amount);
    const status = newPaid >= Number(feeRows[0].amount) ? 'paid' : newPaid > 0 ? 'partial' : 'unpaid';
    const { rows: updatedFee } = await client.query(
      `UPDATE student_fees SET amount_paid = $1, status = $2 WHERE id = $3 RETURNING *`,
      [newPaid, status, id]
    );

    await client.query('COMMIT');
    res.status(201).json({ payment: paymentRows[0], fee: updatedFee[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function payMyFee(req, res) {
  const { id } = req.params;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: studentRows } = await client.query('SELECT id FROM students WHERE user_id = $1', [req.user.sub]);
    if (!studentRows[0]) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Only enrolled students can pay fees' });
    }

    const { rows: feeRows } = await client.query('SELECT * FROM student_fees WHERE id = $1 FOR UPDATE', [id]);
    if (!feeRows[0]) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Fee not found' });
    }
    if (Number(feeRows[0].student_id) !== Number(studentRows[0].id)) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'You can only pay your own fees' });
    }

    const outstanding = Number(feeRows[0].amount) - Number(feeRows[0].amount_paid);
    if (outstanding <= 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'This fee is already paid in full' });
    }

    const receiptNo = `RCPT-${Date.now()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
    const { rows: paymentRows } = await client.query(
      `INSERT INTO payments (student_fee_id, amount, method, receipt_no, recorded_by)
       VALUES ($1, $2, 'online', $3, $4) RETURNING *`,
      [id, outstanding, receiptNo, req.user.sub]
    );

    const { rows: updatedFee } = await client.query(
      `UPDATE student_fees SET amount_paid = amount, status = 'paid' WHERE id = $1 RETURNING *`,
      [id]
    );

    await client.query('COMMIT');
    res.status(201).json({ payment: paymentRows[0], fee: updatedFee[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function getFeesSummary(req, res) {
  const [totals, byMonth, outstanding] = await Promise.all([
    query(`SELECT COALESCE(SUM(amount), 0) AS total_billed, COALESCE(SUM(amount_paid), 0) AS total_collected FROM student_fees`),
    query(
      `SELECT to_char(month_series, 'YYYY-MM') AS month, COALESCE(SUM(p.amount), 0) AS revenue
       FROM generate_series(
         date_trunc('month', now()) - interval '11 months',
         date_trunc('month', now()),
         interval '1 month'
       ) AS month_series
       LEFT JOIN payments p ON date_trunc('month', p.paid_at) = month_series
       GROUP BY month_series
       ORDER BY month_series`
    ),
    query(`SELECT COALESCE(SUM(amount - amount_paid), 0) AS outstanding FROM student_fees WHERE status != 'paid'`),
  ]);

  res.json({
    totalBilled: Number(totals.rows[0].total_billed),
    totalCollected: Number(totals.rows[0].total_collected),
    outstanding: Number(outstanding.rows[0].outstanding),
    revenueByMonth: byMonth.rows.map((r) => ({ month: r.month, revenue: Number(r.revenue) })),
  });
}

export async function exportFees(req, res) {
  const { status } = req.query;
  const params = [];
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
  sendCsv(res, 'fees_export.csv', rows, ['admissionNo', 'studentName', 'category', 'amount', 'amountPaid', 'status', 'dueDate']);
}
