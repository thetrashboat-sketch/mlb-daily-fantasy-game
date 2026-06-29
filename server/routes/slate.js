import express from 'express';
import { getSlate } from '../controllers/slateController.js';

const router = express.Router();

router.get('/', getSlate);

export default router;