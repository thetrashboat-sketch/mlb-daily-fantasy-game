import express from 'express';
import { redirectToDiscord, handleCallback} from '../controllers/discordController.js';

const router = express.Router();

router.get('/auth', redirectToDiscord);
router.get('/callback', handleCallback);

export default router;