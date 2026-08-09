import { Router } from 'express';
import { markAttendance, getAttendanceByClassDate, getStudentAttendanceSummary, exportAttendance } from '../controllers/attendanceController.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';

const router = Router();
const canManage = requireRole('super_admin', 'head_master', 'group_coordinator', 'teacher', 'office_admin');

router.use(requireAuth);
router.get('/', canManage, getAttendanceByClassDate);
router.get('/export', canManage, exportAttendance);
router.get('/student/:studentId/summary', getStudentAttendanceSummary);
router.post('/', canManage, markAttendance);

export default router;
