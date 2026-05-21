import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/auth.js';
import { scheduleSyncPlayers } from './services/mlb.js';
import { syncPlayers, getPlayerRoster, getTeams, getRoster } from './services/mlb.js'; // remove this later



dotenv.config({ path: '../.env' });

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(cookieParser());
app.use('/api/auth', authRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  scheduleSyncPlayers();
});