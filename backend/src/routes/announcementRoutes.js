import { Router } from 'express';
import { listAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement } from '../controllers/announcementController.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';

const router = Router();
const canManage = requireRole('super_admin', 'head_master', 'group_coordinator', 'teacher', 'office_admin');

router.use(requireAuth);
router.get('/', listAnnouncements);
router.post('/', canManage, createAnnouncement);
router.put('/:id', canManage, updateAnnouncement);
router.delete('/:id', canManage, deleteAnnouncement);

export default router;
