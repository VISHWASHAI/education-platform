import { Router } from 'express';
import { getAttendanceTrend, getExamPerformance, getClassPerformance } from '../controllers/analyticsController.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';

const router = Router();
const canView = requireRole('super_admin', 'head_master', 'group_coordinator', 'teacher', 'office_admin');

router.use(requireAuth, canView);

router.get('/attendance-trend', getAttendanceTrend);
router.get('/exam-performance', getExamPerformance);
router.get('/class-performance', getClassPerformance);

export default router;
