import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/auth.js';
import leaderBoardRouter from './routes/leaderboard.js'
import { getBoxScore } from './services/mlb.js'; //remove this
import { syncPlayers } from './services/mlb.js'; //remove this
import { scheduleSyncPlayers } from './services/mlb.js';
import assignmentRoutes from './routes/assignments.js';

dotenv.config({ path: '../.env' });

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(cookieParser());
app.use('/api/auth', authRoutes);
app.use('/api/leaderboard', leaderBoardRouter);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/assignments', assignmentRoutes);

await syncPlayers();

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  //getBoxScore(824274); //remove this 
});