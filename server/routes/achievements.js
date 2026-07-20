import express from 'express';
import auth from '../middleware/auth.js';
import { getUnnotifiedAchievements, getUserAchievements } from '../controllers/achievementsController.js';

const router = express.Router();

router.get('/unnotified', auth, getUnnotifiedAchievements);
router.get('/mine', auth, getUserAchievements);

export default router;