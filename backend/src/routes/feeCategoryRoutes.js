import { Router } from 'express';
import { listFeeCategories, createFeeCategory, deleteFeeCategory } from '../controllers/feeCategoryController.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';

const router = Router();
const canManage = requireRole('super_admin', 'head_master', 'office_admin');

router.use(requireAuth);
router.get('/', listFeeCategories);
router.post('/', canManage, createFeeCategory);
router.delete('/:id', canManage, deleteFeeCategory);

export default router;
