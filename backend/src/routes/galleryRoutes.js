import { Router } from 'express';
import { listPhotos, uploadPhoto, deletePhoto } from '../controllers/galleryController.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';

const router = Router();
const canManage = requireRole('super_admin', 'head_master', 'group_coordinator', 'teacher', 'office_admin');

router.use(requireAuth);
router.get('/', listPhotos);
router.post('/', canManage, uploadPhoto);
router.delete('/:id', canManage, deletePhoto);

export default router;
