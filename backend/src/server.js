import express from 'express';
import 'express-async-errors';
import cors from 'cors';
import dotenv from 'dotenv';

import authRoutes from './routes/authRoutes.js';
import studentRoutes from './routes/studentRoutes.js';
import attendanceRoutes from './routes/attendanceRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import teacherRoutes from './routes/teacherRoutes.js';
import classRoutes from './routes/classRoutes.js';
import questionRoutes from './routes/questionRoutes.js';
import examRoutes from './routes/examRoutes.js';
import assignmentRoutes from './routes/assignmentRoutes.js';
import feeCategoryRoutes from './routes/feeCategoryRoutes.js';
import feeRoutes from './routes/feeRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import auditLogRoutes from './routes/auditLogRoutes.js';
import announcementRoutes from './routes/announcementRoutes.js';
import messagingRoutes from './routes/messagingRoutes.js';
import { auditLogger } from './middleware/auditLogger.js';

dotenv.config();

const app = express();

app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());
app.use(auditLogger);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/teachers', teacherRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/fee-categories', feeCategoryRoutes);
app.use('/api/fees', feeRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/audit-log', auditLogRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/messaging', messagingRoutes);

app.use((req, res) => res.status(404).json({ error: 'Not found' }));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection (server kept running):', err);
});

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`EduFlow API listening on port ${port}`));
