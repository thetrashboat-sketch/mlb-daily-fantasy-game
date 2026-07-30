import 'dotenv/config';

import { getLiveScoresForDate } from "../services/scoring.js";

const results = await getLiveScoresForDate('2026-07-29'); // the date in question
const row = results.find(r => r.assignment_id === 208);
console.log(row.context.batting);
console.log(row.points);