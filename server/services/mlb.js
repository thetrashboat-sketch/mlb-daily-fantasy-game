import cron from 'node-cron';
import pool from '../db/pool.js';

const BASE_URL = 'https://statsapi.mlb.com/api/v1';

export const getPlayerRoster = async () => {
    let playersList = [];
    const teamsRes = await fetch (`${BASE_URL}/teams?sportId=1&season=2026`);
    const teamsData = await teamsRes.json();

    if (teamsData.error) throw new Error(`${teamsData.error.message}`);

    for (const team of teamsData.teams){
        const playersRes = await fetch (`${BASE_URL}/teams/${team.id}/roster?season=2026`);
        const playersData = await playersRes.json();

        if (playersData.error) throw new Error(`${playersData.error.message}`);

        for (const player of playersData.roster){
            if (player.position.code !== '1'){
                playersList.push(
                    {
                    mlb_id: player.person.id,
                    name: player.person.fullName,
                    team_name: team.name,
                    team_id: team.id,
                    team_abbr: team.abbreviation,
                    position: player.position.name,
                    jersey_number: player.jerseyNumber,
                    headshot_url: `https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:67:current.png/w_213,q_auto:best/v1/people/${player.person.id}/headshot/67/current`,
                    is_active: true,
                    }
                );
            }
        }
    }
    return playersList;
};

export async function syncPlayers() {
    console.log('[playerSync] Starting player sync...');

    const players = getPlayerRoster();

    if (players.length === 0) {
        throw new Error('[playerSync] API returned 0 players — aborting to avoid deactivating everyone');
    }

    console.log(`[playerSync] Fetched ${players.length} active hitters from MLB API`);

    const client = await pool.connect();

    try{
        await client.query('BEGIN');

        for (const p of players) {
            await client.query(
                `INSERT INTO players
                (mlb_id, name, team_id, team, team_abbr, position, jersey_number, headshot_url, is_active, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE, NOW())
                ON CONFLICT (mlb_id) DO UPDATE SET
                name          = EXCLUDED.name,
                team_id       = EXCLUDED.team_id,
                team          = EXCLUDED.team,
                team_abbr     = EXCLUDED.team_abbr,
                position      = EXCLUDED.position,
                jersey_number = EXCLUDED.jersey_number,
                headshot_url  = EXCLUDED.headshot_url,
                is_active     = TRUE,
                updated_at    = NOW()`,
            [p.mlb_id, p.name, p.team_id, p.team, p.team_abbr, p.position, p.jersey_number, p.headshot_url]
            );
        }

        //deactivate any player not in this sync's result set 
        const activeIds = players.map((p) => p.mlb_id);
        const { rowCount } = await client.query(
            `UPDATE players
            SET is_active = FALSE, updated_at = NOW()
            WHERE mlb_id <> ALL($1::int[])
            AND is_active = TRUE`,
            [activeIds]
        );

        await client.query('COMMIT');
        console.log(`[playerSync] Done — upserted: ${players.length}, deactivated: ${rowCount}`);
        return { upserted: players.length, deactivated: rowCount };

    } catch(err){
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

export function scheduleSyncPlayers() {
  cron.schedule('0 6 * * *', async () => {
    console.log('[cron] Running scheduled player sync...');
    try {
      const result = await syncPlayers();
      console.log('[cron] Player sync complete:', result);
    } catch (err) {
      console.error('[cron] Player sync failed:', err.message);
    }
  });

  console.log('[cron] Player sync scheduled for 6:00 AM daily');
}

export async function getTeams() {
  const response = await fetch(`${BASE_URL}/teams?sportId=1&season=2026`);
  if (!response.ok) throw new Error(`MLB API error: ${response.status}`);
  return response.json();
}

export async function getRoster(teamId) {
  const response = await fetch(`${BASE_URL}/teams/${teamId}/roster?season=2026`);
  if (!response.ok) throw new Error(`MLB API error: ${response.status}`);
  return response.json();
}

export async function getPlayer(playerId) {
  const response = await fetch(`${BASE_URL}/people/${playerId}`);
  if (!response.ok) throw new Error(`MLB API error: ${response.status}`);
  return response.json();
}

export async function getSchedule(date) {
  const response = await fetch(`${BASE_URL}/schedule?sportId=1&date=${date}`);
  if (!response.ok) throw new Error(`MLB API error: ${response.status}`);
  return response.json();
}

