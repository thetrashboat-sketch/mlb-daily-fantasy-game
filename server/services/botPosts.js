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

export async function postMiddayUpdate(){
    try{
        const servRes = await pool.query(`
            SELECT id, guild_id, guild_name, channel_id, is_active, joined_at
            FROM discord_servers
            WHERE is_active = true AND channel_id IS NOT NULL       
            `);
        
        for (const server of servRes.rows){
            const channel = await client.channels.fetch(server.channel_id);
            const serverUsers = await pool.query(`
                SELECT 
                    u.discord_id,
                    u.discord_username,
                    p.name AS player_name,
                    p.team_abbr,
                    p.position
                FROM discord_server_members dsm
                JOIN users u ON u.id = dsm.user_id
                JOIN discord_servers ds ON ds.id = dsm.discord_server_id
                LEFT JOIN daily_assignments da 
                    ON da.user_id = u.id AND da.assigned_date = CURRENT_DATE
                LEFT JOIN players p ON p.id = da.player_id
                WHERE ds.guild_id = $1
                    AND ds.is_active = true
                `, [server.guild_id]);

            //double check date method
            const dateStr = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', timeZone: 'UTC' });
            let postMessage = `⚾ Today\'s Picks — ${dateStr}\n\n`;

            //loop through serverUsers and add each user + their pick to postMessage, then send it to the channel
            const picked = serverUsers.rows.filter(u => u.player_name !== null); 
            const unpicked = serverUsers.rows.filter(u => u.player_name === null);

            for (const user of picked){
                postMessage += `<@${user.discord_username}> → ${user.player_name} (${user.team_abbr} - ${user.position})\n`
            }

            postMessage += 'Still Need to Pick: '
            for (const user of unpicked){
                postMessage += `<@${user.discord_username}> `;
            }

            postMessage += `\nMake your pick here: ${process.env.FRONTEND_URL}`;

            await channel.send({
                content: postMessage
            });

        }


    } catch (err){
        console.error('[Midday Post] ', err.message);
    }
}