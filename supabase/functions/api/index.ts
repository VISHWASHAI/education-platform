import { Hono } from 'npm:hono@4';
import { cors } from 'npm:hono@4/cors';
import { auditLogger } from './lib/audit.ts';

import auth from './routes/auth.ts';
import students from './routes/students.ts';
import teachers from './routes/teachers.ts';
import classes from './routes/classes.ts';
import attendance from './routes/attendance.ts';
import dashboard from './routes/dashboard.ts';
import questions from './routes/questions.ts';
import exams from './routes/exams.ts';
import assignments from './routes/assignments.ts';
import feeCategories from './routes/feeCategories.ts';
import fees from './routes/fees.ts';
import analytics from './routes/analytics.ts';
import auditLog from './routes/auditLog.ts';
import announcements from './routes/announcements.ts';
import messaging from './routes/messaging.ts';
import gallery from './routes/gallery.ts';
import copilot from './routes/copilot.ts';

const app = new Hono().basePath('/api');

app.use('*', cors({ origin: Deno.env.get('CLIENT_ORIGIN') ?? '*' }));
app.use('*', auditLogger);

app.get('/health', (c) => c.json({ status: 'ok' }));

app.route('/auth', auth);
app.route('/students', students);
app.route('/teachers', teachers);
app.route('/classes', classes);
app.route('/attendance', attendance);
app.route('/dashboard', dashboard);
app.route('/questions', questions);
app.route('/exams', exams);
app.route('/assignments', assignments);
app.route('/fee-categories', feeCategories);
app.route('/fees', fees);
app.route('/analytics', analytics);
app.route('/audit-log', auditLog);
app.route('/announcements', announcements);
app.route('/messaging', messaging);
app.route('/gallery', gallery);
app.route('/copilot', copilot);

app.notFound((c) => c.json({ error: 'Not found' }, 404));

app.onError((err, c) => {
  console.error(err);
  return c.json({ error: 'Internal server error' }, 500);
});

Deno.serve(app.fetch);
