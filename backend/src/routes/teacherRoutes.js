import { Router } from 'express';
import {
  listTeachers, createTeacher, updateTeacher, deleteTeacher,
  downloadTeacherImportTemplate, bulkImportTeachers, exportTeachers,
} from '../controllers/teacherController.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';

const router = Router();
const canManage = requireRole('super_admin', 'head_master', 'office_admin');
const canView = requireRole('super_admin', 'head_master', 'group_coordinator', 'teacher', 'office_admin');

router.use(requireAuth);
router.get('/', canView, listTeachers);
router.get('/import-template', canManage, downloadTeacherImportTemplate);
router.get('/export', canManage, exportTeachers);
router.post('/bulk-import', canManage, bulkImportTeachers);
router.post('/', canManage, createTeacher);
router.put('/:id', canManage, updateTeacher);
router.delete('/:id', canManage, deleteTeacher);

export default router;
