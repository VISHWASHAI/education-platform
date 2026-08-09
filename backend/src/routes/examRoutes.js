import { Router } from 'express';
import {
  listExams, createExam, updateExam, deleteExam, getExamDetail,
  addExamQuestion, removeExamQuestion,
  submitExam, listSubmissions, getSubmissionDetail, gradeAnswer, getMySubmission, exportSubmissions,
} from '../controllers/examController.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';

const router = Router();
const canManage = requireRole('super_admin', 'head_master', 'group_coordinator', 'teacher');

router.use(requireAuth);

router.get('/', listExams);
router.post('/', canManage, createExam);
router.get('/:id', getExamDetail);
router.put('/:id', canManage, updateExam);
router.delete('/:id', canManage, deleteExam);

router.post('/:id/questions', canManage, addExamQuestion);
router.delete('/:id/questions/:examQuestionId', canManage, removeExamQuestion);

router.post('/:id/submit', requireRole('student'), submitExam);
router.get('/:id/my-submission', requireRole('student'), getMySubmission);
router.get('/:id/submissions', canManage, listSubmissions);
router.get('/:id/submissions/export', canManage, exportSubmissions);

router.get('/submissions/:submissionId', getSubmissionDetail);
router.put('/submissions/:submissionId/answers/:answerId/grade', canManage, gradeAnswer);

export default router;
