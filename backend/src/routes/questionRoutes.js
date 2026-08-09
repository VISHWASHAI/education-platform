import { Router } from 'express';
import { listQuestions, createQuestion, deleteQuestion } from '../controllers/questionController.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';

const router = Router();
const canManage = requireRole('super_admin', 'head_master', 'group_coordinator', 'teacher');

router.use(requireAuth);
router.get('/', canManage, listQuestions);
router.post('/', canManage, createQuestion);
router.delete('/:id', canManage, deleteQuestion);

export default router;
