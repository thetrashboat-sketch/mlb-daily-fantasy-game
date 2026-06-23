import 'dotenv/config';
import { finalizeScores } from '../services/scoring.js';

const result = await finalizeScores('2026-06-22');
console.log('Result:', result);
process.exit(0);