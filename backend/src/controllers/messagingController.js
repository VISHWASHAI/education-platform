import { query } from '../db/pool.js';

const STAFF_ROLES = ['super_admin', 'head_master', 'group_coordinator', 'teacher', 'office_admin'];

export async function listContacts(req, res) {
  const isStaff = STAFF_ROLES.includes(req.user.role);
  const roleFilter = isStaff ? '' : `AND r.name != 'student'`;

  const { rows } = await query(
    `SELECT u.id, u.full_name, r.name AS role
     FROM users u JOIN roles r ON r.id = u.role_id
     WHERE u.id != $1 AND u.is_active ${roleFilter}
     ORDER BY u.full_name`,
    [req.user.sub]
  );
  res.json(rows);
}

export async function listConversations(req, res) {
  const { rows } = await query(
    `SELECT c.id, c.type, c.class_id, cl.name AS class_name, cl.section AS class_section,
            (SELECT body FROM messages m WHERE m.conversation_id = c.id ORDER BY m.id DESC LIMIT 1) AS last_message,
            (SELECT created_at FROM messages m WHERE m.conversation_id = c.id ORDER BY m.id DESC LIMIT 1) AS last_message_at,
            (SELECT json_agg(json_build_object('id', u.id, 'fullName', u.full_name))
             FROM conversation_participants cp2 JOIN users u ON u.id = cp2.user_id
             WHERE cp2.conversation_id = c.id AND cp2.user_id != $1) AS other_participants
     FROM conversations c
     JOIN conversation_participants cp ON cp.conversation_id = c.id AND cp.user_id = $1
     LEFT JOIN classes cl ON cl.id = c.class_id
     ORDER BY last_message_at DESC NULLS LAST`,
    [req.user.sub]
  );
  res.json(rows);
}

export async function startDirectConversation(req, res) {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId is required' });
  if (Number(userId) === req.user.sub) return res.status(400).json({ error: 'Cannot message yourself' });

  const { rows: existing } = await query(
    `SELECT c.id FROM conversations c
     JOIN conversation_participants p1 ON p1.conversation_id = c.id AND p1.user_id = $1
     JOIN conversation_participants p2 ON p2.conversation_id = c.id AND p2.user_id = $2
     WHERE c.type = 'direct'`,
    [req.user.sub, userId]
  );
  if (existing[0]) return res.json({ id: existing[0].id, existed: true });

  const { rows: convRows } = await query(`INSERT INTO conversations (type) VALUES ('direct') RETURNING id`);
  const conversationId = convRows[0].id;
  await query(
    `INSERT INTO conversation_participants (conversation_id, user_id) VALUES ($1, $2), ($1, $3)`,
    [conversationId, req.user.sub, userId]
  );
  res.status(201).json({ id: conversationId, existed: false });
}

export async function openClassConversation(req, res) {
  const { classId } = req.params;
  const isStaff = STAFF_ROLES.includes(req.user.role);

  if (!isStaff) {
    const { rows: studentRows } = await query('SELECT class_id FROM students WHERE user_id = $1', [req.user.sub]);
    if (!studentRows[0] || Number(studentRows[0].class_id) !== Number(classId)) {
      return res.status(403).json({ error: 'You are not a member of this class' });
    }
  }

  const { rows: existing } = await query(`SELECT id FROM conversations WHERE type = 'class' AND class_id = $1`, [classId]);
  let conversationId = existing[0]?.id;
  if (!conversationId) {
    const { rows: created } = await query(
      `INSERT INTO conversations (type, class_id) VALUES ('class', $1) RETURNING id`,
      [classId]
    );
    conversationId = created[0].id;
  }

  await query(
    `INSERT INTO conversation_participants (conversation_id, user_id)
     VALUES ($1, $2) ON CONFLICT DO NOTHING`,
    [conversationId, req.user.sub]
  );

  res.json({ id: conversationId });
}

export async function openMyClassConversation(req, res) {
  const { rows: studentRows } = await query('SELECT class_id FROM students WHERE user_id = $1', [req.user.sub]);
  if (!studentRows[0]?.class_id) {
    return res.status(404).json({ error: 'You are not currently assigned to a class' });
  }
  req.params.classId = studentRows[0].class_id;
  return openClassConversation(req, res);
}

async function assertParticipant(conversationId, userId) {
  const { rows } = await query(
    'SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2',
    [conversationId, userId]
  );
  return !!rows[0];
}

export async function listMessages(req, res) {
  const { id } = req.params;
  const { after } = req.query;

  if (!(await assertParticipant(id, req.user.sub))) {
    return res.status(403).json({ error: 'Not a participant in this conversation' });
  }

  const params = [id];
  let afterClause = '';
  if (after) {
    params.push(after);
    afterClause = `AND m.id > $${params.length}`;
  }

  const { rows } = await query(
    `SELECT m.id, m.body, m.created_at, m.sender_id, u.full_name AS sender_name
     FROM messages m JOIN users u ON u.id = m.sender_id
     WHERE m.conversation_id = $1 ${afterClause}
     ORDER BY m.id
     LIMIT 200`,
    params
  );
  res.json(rows);
}

export async function sendMessage(req, res) {
  const { id } = req.params;
  const { body } = req.body;
  if (!body) return res.status(400).json({ error: 'body is required' });

  if (!(await assertParticipant(id, req.user.sub))) {
    return res.status(403).json({ error: 'Not a participant in this conversation' });
  }

  const { rows } = await query(
    `INSERT INTO messages (conversation_id, sender_id, body) VALUES ($1, $2, $3) RETURNING *`,
    [id, req.user.sub, body]
  );
  res.status(201).json(rows[0]);
}
