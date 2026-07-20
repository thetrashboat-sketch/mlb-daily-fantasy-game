import express from 'express';
import auth from '../middleware/auth.js';
import { getUnnotifiedAchievements } from '../controllers/achievementsController.js';

const router = express.Router();

router.get('/unnotified', auth, getUnnotifiedAchievements);

export default router;