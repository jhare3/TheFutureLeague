// src/utils/standingsEngine.js

// Normalize a player name so small formatting differences don't break matching.
const normName = (s) =>
  String(s || '')
    .replace(/^#\d+\s*/, '')   // strip leading "#12 "
    .replace(/['’`]/g, '')     // O'Callaghan -> OCallaghan
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

export const calculateStandings = (gameFiles, rosterData) => {
  const teams = {};

  // 1. Initialize every roster team so 0-0 teams still appear.
  [...new Set(rosterData.players.map((p) => p.team))].forEach((name) => {
    teams[name.toUpperCase()] = { name, W: 0, L: 0, PF: 0, PA: 0 };
  });

  // Player -> team lookup built from players.json
  const playerToTeam = {};
  rosterData.players.forEach((p) => {
    playerToTeam[normName(`${p.first_name} ${p.last_name}`)] = p.team.toUpperCase();
  });

  // 2. Process each game
  Object.values(gameFiles).forEach((file) => {
    const game = file.default || file;
    if (!game.stats || !game.scores) return;

    const { team1, team2 } = game.scores;
    const labels = [team1, team2].map((t) => String(t.name).trim().toLowerCase());

    // Vote: which roster team does each side of this box score belong to?
    // Votes come from roster-matched players, so unrostered/misspelled
    // players are ignored instead of breaking the game.
    const votes = { [labels[0]]: {}, [labels[1]]: {} };
    game.stats.forEach((row) => {
      const side = String(row.Team || '').trim().toLowerCase();
      if (!votes[side]) return;
      const team = playerToTeam[normName(row['Player Name'])];
      if (team) votes[side][team] = (votes[side][team] || 0) + 1;
    });

    const resolve = (label) => {
      const entries = Object.entries(votes[label]);
      if (!entries.length) return null;
      return entries.sort((a, b) => b[1] - a[1])[0][0];
    };

    const tA = resolve(labels[0]);
    const tB = resolve(labels[1]);

    // Skip games that don't belong to this roster (e.g. the other division)
    // or that couldn't be resolved to two different teams.
    if (!tA || !tB || tA === tB || !teams[tA] || !teams[tB]) return;

    // Use the official final scores, not summed player points.
    const sA = Number(team1.final) || 0;
    const sB = Number(team2.final) || 0;

    teams[tA].PF += sA; teams[tA].PA += sB;
    teams[tB].PF += sB; teams[tB].PA += sA;

    if (sA > sB) { teams[tA].W += 1; teams[tB].L += 1; }
    else if (sB > sA) { teams[tB].W += 1; teams[tA].L += 1; }
  });

  return Object.values(teams);
};