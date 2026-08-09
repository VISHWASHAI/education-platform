import { Router } from 'express';
import {
  listFees, getMyFees, assignFee, getFeeDetail, updateFee, deleteFee, recordPayment, payMyFee, getFeesSummary, exportFees,
} from '../controllers/feeController.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';

const router = Router();
const canManage = requireRole('super_admin', 'head_master', 'office_admin');

router.use(requireAuth);

router.get('/', canManage, listFees);
router.get('/my', requireRole('student'), getMyFees);
router.get('/summary', canManage, getFeesSummary);
router.get('/export', canManage, exportFees);
router.post('/', canManage, assignFee);
router.get('/:id', getFeeDetail);
router.put('/:id', canManage, updateFee);
router.delete('/:id', canManage, deleteFee);
router.post('/:id/payments', canManage, recordPayment);
router.post('/:id/pay', requireRole('student'), payMyFee);

export default router;
