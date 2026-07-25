import express from 'express';
import auth from '../middleware/auth.js';
import { getMe } from '../controllers/usersController.js';
import { getUserHistory } from '../controllers/historyController.js';

const router = express.Router();

router.get('/me', auth, getMe);
router.get('/:userId/history', getUserHistory);

export default router;
