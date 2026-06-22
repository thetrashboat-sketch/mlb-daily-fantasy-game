import jwt from 'jsonwebtoken';
import pool from '../db/pool.js';
import client from '../services/bot.js';

export function redirectToDiscord(req, res){
    const url = `https://discord.com/oauth2/authorize?client_id=${process.env.DISCORD_CLIENT_ID}&redirect_uri=${encodeURIComponent(process.env.DISCORD_REDIRECT_URI)}&response_type=code&scope=identify`;
    res.redirect(url);
}

export async function handleCallback(req, res){
    try{
        const decoded = jwt.verify(req.cookies.token, process.env.JWT_SECRET);
        const userId = decoded.id;

        const { code } = req.query;
        if (!code) return res.redirect(`${process.env.FRONTEND_URL}profile?discord=denied`);

        const params = new URLSearchParams({
            client_id: process.env.DISCORD_CLIENT_ID,
            client_secret: process.env.DISCORD_CLIENT_SECRET,
            grant_type: 'authorization_code',
            code,
            redirect_uri: process.env.DISCORD_REDIRECT_URI,
        });

        const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params, 
        });

        const tokenData = await tokenRes.json();

        const userRes = await fetch('https://discord.com/api/users/@me', {
            headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });

        const discordUser = await userRes.json();

        await pool.query(
            `UPDATE users
            SET discord_id = $1,
            discord_username = $2,
            discord_avatar = $3
            WHERE id = $4`,
            [discordUser.id, discordUser.username, discordUser.avatar, userId]
        );

        for (const guild of client.guilds.cache.values()){
            try{
                const server = await guild.members.fetch(discordUser.id);
                const serverRes = await pool.query(`
                    SELECT id FROM discord_servers 
                    WHERE guild_id = $1
                    `, [guild.id]);

                if (!serverRes.rows[0]) continue;
                const serverId = serverRes.rows[0].id;

                await pool.query(`
                    INSERT INTO discord_server_members(discord_server_id, user_id)
                    VALUES ($1, $2)
                    ON CONFLICT (discord_server_id, user_id) DO NOTHING
                    `, [serverId, userId]);
            } catch(err){
                console.error(`[discord server] ${err}`);
                continue;
            }
        }

        res.redirect(`${process.env.FRONTEND_URL}profile?discord=linked`);

        
    }catch(err){
        console.error('[discord] error:', err);
        res.redirect(`${process.env.FRONTEND_URL}profile?discord=error`);
    }


}