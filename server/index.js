import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import './services/scheduler.js';
import authRoutes from './routes/auth.js';
import leaderBoardRouter from './routes/leaderboard.js'
import assignmentRoutes from './routes/assignments.js';
import discordRoutes from './routes/discord.js';
import discordClient from './services/bot.js';
import path from 'path';


dotenv.config({ path: '../.env' });

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(cookieParser());
app.use('/api/auth', authRoutes);
app.use('/api/leaderboard', leaderBoardRouter);
app.use('/api/discord', discordRoutes);
app.use(express.static(process.cwd()));

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/assignments', assignmentRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});