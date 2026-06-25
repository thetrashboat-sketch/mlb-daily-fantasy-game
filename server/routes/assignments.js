import express from 'express';
import { claimAssignment, getAssignment, getAssignmentStats } from '../controllers/assignmentController.js';
import auth from '../middleware/auth.js';

const router = express.Router();

router.post('/claim', auth, claimAssignment);
router.get('/today', auth, getAssignment);
router.get('/today/stats', auth, getAssignmentStats);

export default router;