import 'dotenv/config';
import { syncPlayers } from '../services/mlb.js';

await syncPlayers();

console.log('[testSync] done');