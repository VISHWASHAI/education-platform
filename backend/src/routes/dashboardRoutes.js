import { Router } from 'express';
import { getOverview, getRecentActivity, getUpcomingDeadlines } from '../controllers/dashboardController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);
router.get('/overview', getOverview);
router.get('/recent-activity', getRecentActivity);
router.get('/upcoming-deadlines', getUpcomingDeadlines);

export default router;
