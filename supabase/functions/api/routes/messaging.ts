import { Hono } from 'npm:hono@4';
import { query } from '../lib/db.ts';
import { requireAuth, JwtPayload } from '../lib/auth.ts';

const STAFF_ROLES = ['super_admin', 'head_master', 'group_coordinator', 'teacher', 'office_admin'];

const messaging = new Hono();
messaging.use('*', requireAuth);

messaging.get('/contacts', async (c) => {
  const user = c.get('user') as JwtPayload;
  const isStaff = STAFF_ROLES.includes(user.role);
  const roleFilter = isStaff ? '' : `AND r.name != 'student'`;

  const { rows } = await query(
    `SELECT u.id, u.full_name, r.name AS role
     FROM users u JOIN roles r ON r.id = u.role_id
     WHERE u.id != $1 AND u.is_active ${roleFilter}
     ORDER BY u.full_name`,
    [user.sub]
  );
  return c.json(rows);
});

messaging.get('/conversations', async (c) => {
  const user = c.get('user') as JwtPayload;
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
    [user.sub]
  );
  return c.json(rows);
});

messaging.post('/conversations/direct', async (c) => {
  const user = c.get('user') as JwtPayload;
  const { userId } = await c.req.json();
  if (!userId) return c.json({ error: 'userId is required' }, 400);
  if (Number(userId) === user.sub) return c.json({ error: 'Cannot message yourself' }, 400);

  const { rows: existing } = await query(
    `SELECT c.id FROM conversations c
     JOIN conversation_participants p1 ON p1.conversation_id = c.id AND p1.user_id = $1
     JOIN conversation_participants p2 ON p2.conversation_id = c.id AND p2.user_id = $2
     WHERE c.type = 'direct'`,
    [user.sub, userId]
  );
  if (existing[0]) return c.json({ id: existing[0].id, existed: true });

  const { rows: convRows } = await query(`INSERT INTO conversations (type) VALUES ('direct') RETURNING id`);
  const conversationId = convRows[0].id;
  await query(
    `INSERT INTO conversation_participants (conversation_id, user_id) VALUES ($1, $2), ($1, $3)`,
    [conversationId, user.sub, userId]
  );
  return c.json({ id: conversationId, existed: false }, 201);
});

// Shared by both "open class conversation" routes below — Express's version mutated
// req.params.classId to reuse one handler; Hono params aren't mutable, so this is
// factored into a plain function instead. Behavior/response shape is unchanged.
async function resolveClassConversation(classId: string, user: JwtPayload) {
  const isStaff = STAFF_ROLES.includes(user.role);

  if (!isStaff) {
    const { rows: studentRows } = await query('SELECT class_id FROM students WHERE user_id = $1', [user.sub]);
    if (!studentRows[0] || Number(studentRows[0].class_id) !== Number(classId)) {
      return { status: 403 as const, body: { error: 'You are not a member of this class' } };
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
    [conversationId, user.sub]
  );

  return { status: 200 as const, body: { id: conversationId } };
}

messaging.post('/conversations/class/:classId', async (c) => {
  const classId = c.req.param('classId');
  const user = c.get('user') as JwtPayload;
  const result = await resolveClassConversation(classId, user);
  return c.json(result.body, result.status);
});

messaging.post('/conversations/my-class', async (c) => {
  const user = c.get('user') as JwtPayload;
  const { rows: studentRows } = await query('SELECT class_id FROM students WHERE user_id = $1', [user.sub]);
  if (!studentRows[0]?.class_id) {
    return c.json({ error: 'You are not currently assigned to a class' }, 404);
  }
  const result = await resolveClassConversation(String(studentRows[0].class_id), user);
  return c.json(result.body, result.status);
});

async function assertParticipant(conversationId: string, userId: number) {
  const { rows } = await query(
    'SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2',
    [conversationId, userId]
  );
  return !!rows[0];
}

messaging.get('/conversations/:id/messages', async (c) => {
  const id = c.req.param('id');
  const after = c.req.query('after');
  const user = c.get('user') as JwtPayload;

  if (!(await assertParticipant(id, user.sub))) {
    return c.json({ error: 'Not a participant in this conversation' }, 403);
  }

  const params: unknown[] = [id];
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
  return c.json(rows);
});

messaging.post('/conversations/:id/messages', async (c) => {
  const id = c.req.param('id');
  const user = c.get('user') as JwtPayload;
  const { body } = await c.req.json();
  if (!body) return c.json({ error: 'body is required' }, 400);

  if (!(await assertParticipant(id, user.sub))) {
    return c.json({ error: 'Not a participant in this conversation' }, 403);
  }

  const { rows } = await query(
    `INSERT INTO messages (conversation_id, sender_id, body) VALUES ($1, $2, $3) RETURNING *`,
    [id, user.sub, body]
  );
  return c.json(rows[0], 201);
});

export default messaging;
