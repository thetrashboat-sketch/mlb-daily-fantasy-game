import pool from '../db/pool.js';
import client from '../services/bot.js';

export async function postPicksOpen (){
    try{
        const servRes = await pool.query(`
            SELECT id, guild_id, guild_name, channel_id, is_active, joined_at
            FROM discord_servers
            WHERE is_active = true AND channel_id IS NOT NULL       
            `);

        for (const server of servRes.rows){
            const channel = await client.channels.fetch(server.channel_id);
            channel.send({
                content: `⚾ Player selection is now open! Head over to pick your hitter for today: ${process.env.FRONTEND_URL}`,
                flags: [4096]
            });
        }

    } catch(err){
        console.error(`[opening post] ${err.message}`);
    }
}