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
                    team: team.id,
                    team_abbr: team.abbreviation,
                    position: player.position.name,
                    jersey_number: player.jerseyNumber,
                    headshot_url: `https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:67:current.png/w_213,q_auto:best/v1/people/${player.person.id}/headshot/67/current`,
                    is_active: player.status.description === 'Active',
                    }
                );
            }
        }
    }
    console.log(playersList);
};

