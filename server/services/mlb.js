import cron from 'node-cron';
import pool from '../db/pool.js';
import { getGameDate } from '../../shared/gameDate.js';

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
            //ignores pitchers 
            if (player.position.code !== '1'){
                playersList.push(
                    {
                    mlb_id: player.person.id,
                    name: player.person.fullName,
                    team_name: team.name,
                    team_id: team.id,
                    team_abbr: team.abbreviation,
                    position: player.position.name,
                    position_abbr: player.position.abbreviation,
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

export async function getScheduledGames(date) {
    const res = await fetch(`${BASE_URL}/schedule?sportId=1&date=${date}`);
    const data = await res.json();

    if (data.error) throw new Error(`${data.error.message}`);

    const games = [];
    for (const dateEntry of data.dates ?? []) {
        for (const game of dateEntry.games ?? []) {
            games.push({
                game_pk: game.gamePk,
                game_date: dateEntry.date,
                home_team_id: game.teams.home.team.id,
                away_team_id: game.teams.away.team.id,
            });
        }
    }
    return games;
}

export async function syncScheduledGames(date, client) {
    console.log(`[gamesSync] Syncing scheduled games for ${date}...`);

    const games = await getScheduledGames(date);

    for (const g of games) {
        await client.query(
            `INSERT INTO scheduled_games (game_date, game_pk, home_team_id, away_team_id)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (game_date, game_pk) DO NOTHING`,
            [g.game_date, g.game_pk, g.home_team_id, g.away_team_id]
        );
    }

    console.log(`[gamesSync] Done — upserted ${games.length} games for ${date}`);
    return games.length;
}

export async function syncPlayers() {
    console.log('[playerSync] Starting player sync...');

    const players = await getPlayerRoster();

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
                (mlb_id, name, team_id, team_name, team_abbr, position, position_abbr, jersey_number, headshot_url, is_active, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE, NOW())
                ON CONFLICT (mlb_id) DO UPDATE SET
                name          = EXCLUDED.name,
                team_id       = EXCLUDED.team_id,
                team_name     = EXCLUDED.team_name,
                team_abbr     = EXCLUDED.team_abbr,
                position      = EXCLUDED.position,
                position_abbr = EXCLUDED.position_abbr,
                jersey_number = EXCLUDED.jersey_number,
                headshot_url  = EXCLUDED.headshot_url,
                is_active     = TRUE,
                updated_at    = NOW()`,
            [p.mlb_id, p.name, p.team_id, p.team_name, p.team_abbr, p.position, p.position_abbr, p.jersey_number, p.headshot_url]
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

        // Sync today's scheduled games in the same transaction
        const today = getGameDate();
        const gamesCount = await syncScheduledGames(today, client);

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

export async function getBoxScore(gamePk){
    const bxScoreRes = await fetch(`${BASE_URL}/game/${gamePk}/boxscore`);
    const bxScoreData = await bxScoreRes.json();
    const stats = {};

    if (bxScoreData.error) throw new Error(`${bxScoreData.error.message}`);

    const allPlayers = [
        ...Object.values(bxScoreData.teams.home.players),
        ...Object.values(bxScoreData.teams.away.players),
    ];

    for (const player of allPlayers) {
        if (player.position.code !== '1') {
            stats[player.person.id] = player.stats;
        }
    }

    return stats;
}

export function calculateFantasyPoints(stats){
    let score = 0;
    const batting = stats.batting;

    if (!batting || Object.keys(batting).length === 0) {
        return 0;
    }

    //calculate singles
    const singles = batting.hits - (batting.doubles + batting.triples + batting.homeRuns);

    score += singles;
    score += batting.doubles * 2;
    score += batting.triples * 3;
    score += batting.homeRuns * 4;
    score += batting.rbi;
    score += batting.runs;
    score += batting.baseOnBalls;
    score += batting.stolenBases;
    score += batting.hitByPitch;
    score -= batting.caughtStealing;
    score -= batting.strikeOuts;
    score -= batting.groundIntoDoublePlay * 2;
    score -= (batting.groundIntoTriplePlay ?? 0) * 3;

    return score;
}

export async function getSeasonStats(mlbId) {
    const season = new Date().getFullYear();
    const statsRes = await fetch(`${BASE_URL}/people/${mlbId}/stats?stats=season&group=hitting&season=${season}`);
    const statsData = await statsRes.json();

    if (statsData.error) throw new Error(`${statsData.error.message}`);

    const splits = statsData.stats?.[0]?.splits;

    if (!splits || splits.length === 0) {
        return null;
    }

    const s = splits[0].stat;

    return {
        atBats: s.atBats,
        hits: s.hits,
        homeRuns: s.homeRuns,
        rbi: s.rbi,
        runs: s.runs,
        ops: s.ops,
    };
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

