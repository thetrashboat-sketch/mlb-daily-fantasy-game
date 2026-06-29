import pool from '../db/pool.js';
import { getGameDate } from '../../shared/gameDate.js';

export async function getTodaysSlateCount(){
    const gameDate = getGameDate();

    const result = await pool.query(`
        SELECT COUNT(*) FROM scheduled_games WHERE game_date = $1
        `, [gameDate]);

    return parseInt(result.rows[0].count, 10);
}