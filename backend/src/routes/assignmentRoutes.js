import { Router } from 'express';
import {
  listAssignments, createAssignment, getAssignment, updateAssignment, deleteAssignment,
  submitAssignment, getMySubmission, listSubmissions, gradeSubmission,
} from '../controllers/assignmentController.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';

const router = Router();
const canManage = requireRole('super_admin', 'head_master', 'group_coordinator', 'teacher');

router.use(requireAuth);

router.get('/', listAssignments);
router.post('/', canManage, createAssignment);
router.get('/:id', getAssignment);
router.put('/:id', canManage, updateAssignment);
router.delete('/:id', canManage, deleteAssignment);

router.post('/:id/submit', requireRole('student'), submitAssignment);
router.get('/:id/my-submission', requireRole('student'), getMySubmission);
router.get('/:id/submissions', canManage, listSubmissions);
router.put('/submissions/:submissionId/grade', canManage, gradeSubmission);

export default router;
