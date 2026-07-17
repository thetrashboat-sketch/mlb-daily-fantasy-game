import 'dotenv/config';
import { finalizeScores } from '../services/scoring.js';

const result = await finalizeScores('2026-07-17');
console.log('Result:', result);
process.exit(0);