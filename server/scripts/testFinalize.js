import { finalizeScores } from '../services/scoring.js';

const result = await finalizeScores('2026-05-28');
console.log('Result:', result);
process.exit(0);