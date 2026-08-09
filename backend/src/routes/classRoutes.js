import { Router } from 'express';
import { listClasses, createClass, updateClass, deleteClass, getClassRoster } from '../controllers/classController.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';

const router = Router();
const canManage = requireRole('super_admin', 'head_master', 'office_admin');
const canView = requireRole('super_admin', 'head_master', 'group_coordinator', 'teacher', 'office_admin');

router.use(requireAuth);
router.get('/', canView, listClasses);
router.get('/:id/roster', canView, getClassRoster);
router.post('/', canManage, createClass);
router.put('/:id', canManage, updateClass);
router.delete('/:id', canManage, deleteClass);

export default router;
