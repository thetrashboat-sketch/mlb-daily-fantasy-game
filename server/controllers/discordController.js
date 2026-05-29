import jwt from 'jsonwebtoken';
import pool from '../db/pool.js';

export function redirectToDiscord(req, res){
    const url = `https://discord.com/oauth2/authorize?client_id=${process.env.DISCORD_CLIENT_ID}&redirect_uri=${encodeURIComponent(process.env.DISCORD_REDIRECT_URI)}&response_type=code&scope=identify`;
    res.redirect(url);
}

export async function handleCallback(req, res){
    try{
        const decoded = jwt.verify(req.cookies.token, process.env.JWT_SECRET);
        const userId = decoded.id;

        const { code } = req.query;
        if (!code) return res.status(400).json({ error: 'No code provided' });

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

        res.json({ success: true });

        
    }catch(err){
        res.status(500).json({ error: 'Discord linking failed' });
    }


}