import { getGameDate } from '../../shared/gameDate.js';
import pool from '../db/pool.js';
import client from '../services/bot.js';
import { getLiveScoresForDate } from './scoring.js';

export async function postPicksOpen (){
    try{
        const servRes = await pool.query(`
            SELECT id, guild_id, guild_name, channel_id, is_active, joined_at
            FROM discord_servers
            WHERE is_active = true AND channel_id IS NOT NULL       
            `);

        for (const server of servRes.rows){
            try{
                const { rows: leaderboard } = await pool.query(`
                    SELECT
                        u.username,
                        u.discord_id,
                        COALESCE(SUM(ds.fantasy_points), 0) AS season_total
                    FROM discord_server_members as dsm
                    JOIN users u ON u.id = dsm.user_id
                    LEFT JOIN daily_assignments da ON da.user_id = u.id
                    LEFT JOIN daily_scores ds ON ds.assignment_id = da.id AND ds.is_finalized = TRUE
                    WHERE dsm.discord_server_id = $1
                    GROUP BY u.id, u.username, u.discord_id
                    ORDER BY season_total DESC
                    `, [server.id]);

                let rank = 1;
                for (let i = 0; i < leaderboard.length; i++){
                    if (i > 0 && Number(leaderboard[i].season_total) !== Number(leaderboard[i - 1].season_total)) {
                        rank = i + 1;
                    }
                    leaderboard[i].rank = rank;
                }

                const lines = leaderboard.map(row => {
                    const mention = row.discord_id ? `<@${row.discord_id}>` : row.username;
                    return `**#${row.rank}** ${mention} — ${Number(row.season_total)} pts`;
                });

                const leaderboardBlock = lines.length > 0 ? 
                    `## 🏆 Season Leaderboard\n\n${lines.join('\n')}\n\n` : 
                    '';

                const channel = await client.channels.fetch(server.channel_id);
                await channel.send({
                    content: `${leaderboardBlock}⚾ Player selection is now open! Head over to pick your hitter for today: ${process.env.FRONTEND_URL}`,
                    flags: [4096]
                });
            } catch(err){
                console.error(`[opening post] Failed to post to ${server.guild_name}:`, err);
            }
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
                postMessage += `<@${user.discord_id}> → ${user.player_name} (${user.team_abbr} - ${user.position})\n`
            }

            if (unpicked.length > 0) {
                postMessage += 'Still Need to Pick: '
                for (const user of unpicked) {
                    postMessage += `<@${user.discord_id}> `;
                }
                postMessage += `\nMake your pick here: ${process.env.FRONTEND_URL}`;
            } else {
                postMessage += `Make your pick here: ${process.env.FRONTEND_URL}`;
            }

            await channel.send({
                content: postMessage
            });

        }


    } catch (err){
        console.error('[Midday Post] ', err.message);
    }
}

export async function postEveningUpdate(){
    const dateStr = getGameDate();

    const [liveScores, membersRes, serverRes] = await Promise.all([
        getLiveScoresForDate(dateStr),
        pool.query(`
            SELECT dsm.user_id, dsm.discord_server_id, u.next_day_multiplier
            FROM discord_server_members dsm
            JOIN users u ON u.id = dsm.user_id
        `),
        pool.query(`
            SELECT id, guild_id, guild_name, channel_id, is_active, joined_at
            FROM discord_servers 
            WHERE is_active = TRUE AND channel_id IS NOT NULL
        `)
    ]);

    const scoresByUserId = Object.fromEntries(liveScores.map(s => [s.user_id, s]));

    // Group members by server
    const membersByServer = {};
    for (const row of membersRes.rows){
        if (!membersByServer[row.discord_server_id]) membersByServer[row.discord_server_id] = [];
        membersByServer[row.discord_server_id].push(row);
    }

    for (const server of serverRes.rows){
        try{
            const members = membersByServer[server.id] ?? [];
            if (members.length === 0) continue;
            
            const lines = [];
            
            for (const member of members){
                const result = scoresByUserId[member.user_id];
                if (!result) continue;

                const mention = result.discord_id ? `<@${result.discord_id}>` : result.username;
                const playerName = result.player_name;

                if(!result.playerPlayed){
                    const currentMultiplier = Number(member.next_day_multiplier ?? 1);
                    const nextMultiplier = currentMultiplier + 1;
                    lines.push(`${mention} picked **${playerName}** → did not play · **0 pts** *(multiplier will be ${nextMultiplier}x tomorrow)*`);
                } else{
                    const multiplier = Number(member.next_day_multiplier ?? 1);
                    const basePoints = Number(result.points);
                    const finalPoints = basePoints * multiplier;
                    const multiplierNote = multiplier > 1 ? ` *(${multiplier}x multiplier applied)*` : '';
                    const summary = result.stat_summary ? `${result.stat_summary} · ` : '';
                    const ptsSign = result.points >= 0 ? '+':'';
                    lines.push(`${mention} picked **${playerName}** → ${summary}**${ptsSign}${result.points} pts**`);
                }
            }

            if (lines.length === 0) continue;

            const message = `## ⚾ Daily Dinger — Evening Update\n\n${lines.join('\n')}`;
            const channel = await client.channels.fetch(server.channel_id);
            await channel.send(message);

        } catch(err){
            console.error(`[bot] Failed to post evening update to ${server.guild_name}:`, err.message);
        }
    }
}