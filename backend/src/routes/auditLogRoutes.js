import { Router } from 'express';
import { listAuditLog } from '../controllers/auditLogController.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';

const router = Router();

router.use(requireAuth, requireRole('super_admin', 'head_master'));
router.get('/', listAuditLog);

export default router;
