// src/utils/standingsEngine.js
//
// calculateStandings(gameFiles, divisionConfig)
//   gameFiles       - result of import.meta.glob('../data/boxscores/**/*.json', { eager: true })
//   divisionConfig  - players.json shape, with `players` already filtered to ONE division
//
// Returns: [{ name, division, W, L, PF, PA }]  (one row per team in that division)

// Only boxscores inside these folders count toward standings.
// Playoffs / championships are excluded on purpose. Add them here if you want them counted.
const COUNTED_PATH = /\/boxscores\/week\d+\//i;

// Boxscore team names -> roster team base names (boxscores say "Grey", roster says "Gray")
const ALIASES = { grey: 'gray' };

const norm = (s) => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();

// "Black (Lamoille)" -> "black",  "Light Blue (SB)" -> "light blue"
const baseTeam = (s) => {
  const b = norm(String(s || '').replace(/\(.*?\)/g, ''));
  return ALIASES[b] || b;
};

// "#0 Owen Rock" -> ["owen", "rock"],  "#99 Sub Mac" -> ["mac"]
const nameTokens = (playerName) =>
  norm(String(playerName || '').replace(/^#\s*\d+\s*/, '').replace(/^sub\s+/i, ''))
    .split(/[\s]+/)
    .filter(Boolean);

const toInt = (v) => {
  const n = parseInt(String(v).replace(/[^\d-]/g, ''), 10);
  return Number.isFinite(n) ? n : NaN;
};

const teamTotal = (t) => {
  if (!t) return NaN;
  const total = toInt(t.Total);
  if (Number.isFinite(total)) return total;
  const q = ['1', '2', '3', '4'].map((k) => toInt(t[k])).filter(Number.isFinite);
  return q.length ? q.reduce((a, b) => a + b, 0) : NaN;
};

export function calculateStandings(gameFiles, playerConfig) {
  const players = (playerConfig && playerConfig.players) || [];

  // Seed every roster team so teams with no games still show up as 0-0
  const table = new Map(); // baseName -> row
  const rosterByTeam = new Map(); // baseName -> Set(last-name tokens)
  players.forEach((p) => {
    const key = baseTeam(p.team);
    if (!table.has(key)) {
      table.set(key, { name: p.team, division: p.division, W: 0, L: 0, PF: 0, PA: 0 });
      rosterByTeam.set(key, new Set());
    }
    nameTokens(p.last_name).forEach((t) => rosterByTeam.get(key).add(t));
  });

  // Does this team's stat lines look like THIS division's roster for that team?
  // (Team colors repeat across Boys/Girls, so we confirm by player names.)
  const rosterMatchRatio = (stats, key) => {
    const rows = (stats || []).filter((r) => baseTeam(r.Team) === key);
    if (!rows.length) return 0;
    const roster = rosterByTeam.get(key);
    const hits = rows.filter((r) => nameTokens(r['Player Name']).some((t) => roster.has(t))).length;
    return hits / rows.length;
  };

  const seen = new Set();

  Object.entries(gameFiles || {}).forEach(([path, mod]) => {
    if (!COUNTED_PATH.test(path.replace(/\\/g, '/'))) return;

    // eager glob of JSON gives { ...json, default: json } -- use the clean object
    const game = mod && mod.default ? mod.default : mod;
    if (!game || !game.scores || !game.scores.team1 || !game.scores.team2) return;

    const t1 = game.scores.team1;
    const t2 = game.scores.team2;
    const k1 = baseTeam(t1.name);
    const k2 = baseTeam(t2.name);
    if (!table.has(k1) || !table.has(k2)) return; // not a team in this division

    const s1 = teamTotal(t1);
    const s2 = teamTotal(t2);
    if (!Number.isFinite(s1) || !Number.isFinite(s2)) return;

    // Belong to this division? Both teams' player lines must match this division's rosters.
    if (rosterMatchRatio(game.stats, k1) < 0.5 || rosterMatchRatio(game.stats, k2) < 0.5) return;

    // Same game saved twice (e.g. copied into two folders) should only count once
    const fingerprint = [game.date, k1, s1, k2, s2].join('|');
    if (seen.has(fingerprint)) return;
    seen.add(fingerprint);

    const a = table.get(k1);
    const b = table.get(k2);
    a.PF += s1; a.PA += s2;
    b.PF += s2; b.PA += s1;
    if (s1 > s2) { a.W += 1; b.L += 1; }
    else if (s2 > s1) { b.W += 1; a.L += 1; }
    // exact tie: points count, no W/L
  });

  return Array.from(table.values());
}

export default calculateStandings;