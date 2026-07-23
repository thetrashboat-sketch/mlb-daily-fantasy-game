import cron from 'node-cron';
import pool from '../db/pool.js';
import { getGameDate } from '../../shared/gameDate.js';

const BASE_URL = 'https://statsapi.mlb.com/api/v1';
const BIO_BATCH_SIZE = 50;

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
}

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

        // Backfill debut dates for any active player still missing one
        const { rows: missingDebut } = await client.query(
            `SELECT mlb_id FROM players WHERE mlb_id = ANY($1::int[]) AND debut_date IS NULL`,
            [activeIds]
        );

        if (missingDebut.length > 0) {
            const debutDateMap = await getPlayersBioBatch(missingDebut.map(r => r.mlb_id));
            for (const [mlbId, debutDate] of debutDateMap) {
                if (debutDate === null) continue;
                await client.query(
                    `UPDATE players SET debut_date = $1 WHERE mlb_id = $2`,
                    [debutDate, mlbId]
                );
            }
        }

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

    const homeAbbr = bxScoreData.teams.home.team.abbreviation;
    const awayAbbr = bxScoreData.teams.away.team.abbreviation;

    const homePlayers = Object.values(bxScoreData.teams.home.players)
        .map(player => ({ player, opponent: awayAbbr }));
    const awayPlayers = Object.values(bxScoreData.teams.away.players)
        .map(player => ({ player, opponent: homeAbbr }));

    const allPlayers = [...homePlayers, ...awayPlayers];

    for (const {player, opponent} of allPlayers) {
        if (player.position.code !== '1') {
            stats[player.person.id] = {...player.stats, opponent};
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

export async function getGameContext(gamePk){
    const [playByPlayRes, linescoreRes] = await Promise.all([
        fetch(`${BASE_URL}/game/${gamePk}/playByPlay`),
        fetch(`${BASE_URL}/game/${gamePk}/linescore`),
    ]);

    const playByPlay = await playByPlayRes.json();
    const linescore = await linescoreRes.json();

    if (playByPlay.error) throw new Error(`${playByPlay.error.message}`);
    if (linescore.error) throw new Error(`${linescore.error.message}`);

    const allPlays = playByPlay.allPlays || [];

    // Derive isLeadoff: minimum atBatIndex per inning+halfInning group
    const minAtBatIndexByHalfInning = {};
    for (const play of allPlays) {
        const key = `${play.about.inning}-${play.about.halfInning}`;
        const idx = play.about.atBatIndex;
        if (minAtBatIndexByHalfInning[key] === undefined || idx < minAtBatIndexByHalfInning[key]) {
            minAtBatIndexByHalfInning[key] = idx;
        }
    }

    for (const play of allPlays) {
        const key = `${play.about.inning}-${play.about.halfInning}`;
        play.isLeadoff = play.about.atBatIndex === minAtBatIndexByHalfInning[key];
    }

    // Derive isWalkoff: last play, bottom half, caused a scoring event,
    // and the batting (home) team was tied or trailing before it resolved
    if (allPlays.length > 0) {
        const lastPlay = allPlays[allPlays.length - 1];
        const isBottomHalf = lastPlay.about.halfInning === 'bottom';
        const runsScoredOnPlay = (lastPlay.runners || []).some(r => r.details?.isScoringEvent).length;

        let isWalkoff = false;
        if (isBottomHalf && runsScoredOnPlay > 0) {
            const homeScoreBefore = (lastPlay.result?.homeScore ?? 0) - runsScoredOnPlay;
            const awayScoreBefore = lastPlay.result?.awayScore ?? 0;
            isWalkoff = homeScoreBefore <= awayScoreBefore;
        }

        lastPlay.isWalkoff = isWalkoff;
    }

    return { playByPlay, linescore };
}

/**
 * Fetches a player's game log and career hitting totals in a single call.
 * Used to build achievement context: game log feeds streak evaluation,
 * career totals feed first-hit/first-HR checks. Both returned raw —
 * no pre-computed booleans or derived stats. evaluateCondition() does
 * the interpretive work.
 *
 * @param {number} mlbId
 * @returns {Promise<{ gameLog: Array<Object>, career: { hits: number, homeRuns: number, [key: string]: any } }>}
 */
export async function getPlayerHittingHistory(mlbId) {
    // TODO: hardcoded season — replace with dynamic year once season rollover is handled
    const season = 2026;

    const url = `${BASE_URL}/people/${mlbId}/stats` +
        `?stats=gameLog,career&group=hitting&season=${season}`;

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch hitting history for player ${mlbId}: ${response.status}`);
    }

    const data = await response.json();

    // Each requested stat type comes back as a separate entry in data.stats,
    // distinguished by stats[i].type.displayName ("gameLog" / "career").
    const gameLogEntry = data.stats?.find(s => s.type?.displayName === 'gameLog');
    const careerEntry = data.stats?.find(s => s.type?.displayName === 'career');

    const gameLog = gameLogEntry?.splits ?? [];
    // career totals live one level deeper, at splits[0].stat, since it's a
    // single aggregate split rather than a per-game array.
    // Default hits/homeRuns to 0 explicitly so context-building never has
    // to null-check these two fields downstream.
    const career = {
        hits: 0,
        homeRuns: 0,
        ...(careerEntry?.splits?.[0]?.stat ?? {}),
    };

    return { gameLog, career };
}

/**
 * Fetches bio data (currently just debut date) for multiple players in
 * batched requests. Returns a Map<mlbId, debutDate|null> so callers can
 * look up each player without re-parsing the response shape.
 *
 * @param {number[]} mlbIds
 * @returns {Promise<Map<number, string|null>>}
 */
export async function getPlayersBioBatch(mlbIds) {
    const debutDateMap = new Map();

    for (let i = 0; i < mlbIds.length; i += BIO_BATCH_SIZE) {
        const chunk = mlbIds.slice(i, i + BIO_BATCH_SIZE);
        const url = `${BASE_URL}/people/?personIds=${chunk.join(',')}`;

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch player bios: ${response.status}`);
        }

        const data = await response.json();
        for (const person of data.people ?? []) {
            debutDateMap.set(person.id, person.mlbDebutDate ?? null);
        }
    }

    return debutDateMap;
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

