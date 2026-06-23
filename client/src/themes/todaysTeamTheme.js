import { teamThemes } from './teamThemes';
import { getGameDate } from '../utils/getGameDate';

// Simple deterministic string hash (djb2). Same input always produces the
// same output — no randomness, no storage, just math on the date string.
function hashString(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return Math.abs(hash);
}

// Picks today's team deterministically from getGameDate().
// Every user gets the same team on the same fantasy-day, no backend needed.
export function getTodaysTeamTheme() {
  const dateStr = getGameDate();
  const teamCodes = Object.keys(teamThemes);
  const index = hashString(dateStr) % teamCodes.length;
  //const teamCode = teamCodes[index];
  const teamCode = 'STL';
  return { teamCode, ...teamThemes[teamCode] };
}