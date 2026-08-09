import { Router } from 'express';
import {
  listStudents, createStudent, updateStudent, deleteStudent, createStudentLogin,
  downloadStudentImportTemplate, bulkImportStudents, exportStudents,
} from '../controllers/studentController.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';

const router = Router();
const canManage = requireRole('super_admin', 'head_master', 'office_admin');
const canView = requireRole('super_admin', 'head_master', 'group_coordinator', 'teacher', 'office_admin');

router.use(requireAuth);
router.get('/', canView, listStudents);
router.get('/import-template', canManage, downloadStudentImportTemplate);
router.get('/export', canManage, exportStudents);
router.post('/bulk-import', canManage, bulkImportStudents);
router.post('/', canManage, createStudent);
router.put('/:id', canManage, updateStudent);
router.post('/:id/create-login', canManage, createStudentLogin);
router.delete('/:id', canManage, deleteStudent);

export default router;
