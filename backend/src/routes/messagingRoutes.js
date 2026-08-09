import { Router } from 'express';
import {
  listContacts, listConversations, startDirectConversation, openClassConversation, openMyClassConversation,
  listMessages, sendMessage,
} from '../controllers/messagingController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

router.get('/contacts', listContacts);
router.get('/conversations', listConversations);
router.post('/conversations/direct', startDirectConversation);
router.post('/conversations/class/:classId', openClassConversation);
router.post('/conversations/my-class', openMyClassConversation);
router.get('/conversations/:id/messages', listMessages);
router.post('/conversations/:id/messages', sendMessage);

export default router;
