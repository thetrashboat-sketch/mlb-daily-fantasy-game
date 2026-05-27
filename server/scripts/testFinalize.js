import { finalizeScores } from '../services/scoring.js';

const result = await finalizeScores('2026-05-27');
console.log('Result:', result);
process.exit(0);