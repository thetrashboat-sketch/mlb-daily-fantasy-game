import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import './services/scheduler.js';
import authRoutes from './routes/auth.js';
import leaderBoardRouter from './routes/leaderboard.js'
import assignmentRoutes from './routes/assignments.js';
import userRouter from './routes/users.js';
import discordRoutes from './routes/discord.js';
import newsRoutes from './routes/news.js';
import slateRoutes from './routes/slate.js';
import discordClient from './services/bot.js';
import path from 'path';
import pool from './db/pool.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(cookieParser());
app.use('/api/auth', authRoutes);
app.use('/api/leaderboard', leaderBoardRouter);
app.use('/api/discord', discordRoutes);
app.use('/api/users', userRouter);
app.use('/api/news', newsRoutes);
app.use('/api/slate', slateRoutes);
app.use(express.static(process.cwd()));

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/assignments', assignmentRoutes);

async function start(){
  try{
    //verify DB
    const client = await pool.connect();
    client.release();
    console.log("DB connection verified");

    //login bot and wait for ready 
    await new Promise((resolve, reject) => {
      discordClient.once('ready', resolve);
      discordClient.once('error', reject);
      discordClient.login(process.env.DISCORD_BOT_TOKEN);
    });

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });

  } catch(err){
      console.error('Startup Failed:', err);
      process.exit(1);
  }
}

start();


