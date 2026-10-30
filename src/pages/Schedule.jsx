import React, { useState, useEffect } from 'react';
import { Table, Badge, Spinner } from 'react-bootstrap';
import Papa from 'papaparse';
import scheduleData from '../data/schedule.json';
import BoxscoreModal from '../components/BoxscoreModal';
import { slugifyMatchup, parseScoreFromCSV } from '../utils/boxscoreEngine';

// Mirror the same glob patterns used in Recaps.jsx
const csvFiles = import.meta.glob('../data/boxscores/**/*.csv', { query: '?raw', import: 'default' });
const jsonFiles = import.meta.glob('../data/boxscores/**/*.json', { eager: true });

// Normalize team names (handles "Gray" vs "Grey" and extra whitespace)
const normalizeTeamName = (name = '') => {
  return name
    .toLowerCase()
    .replace(/\bgray\b/g, 'grey')
    .replace(/[^a-z0-9]/g, '');
};

// Extract the two teams from a matchup string like "Red vs. Green (Boys)"
const extractTeams = (matchupStr = '') => {
  const cleaned = matchupStr
    .replace(/\(boys\)/gi, '')
    .replace(/\(girls\)/gi, '')
    .trim();
  const parts = cleaned.split(/\s+vs\.?\s+/i);
  if (parts.length >= 2) {
    return [normalizeTeamName(parts[0]), normalizeTeamName(parts[1])];
  }
  return [normalizeTeamName(cleaned), ''];
};

// Order-independent pair key (matches "Red vs Green" to "Green vs Red")
const getSortedTeamsKey = (matchupStr = '') => {
  const [t1, t2] = extractTeams(matchupStr);
  return [t1, t2].sort().join('-vs-');
};

// Convert time string like "6:00 PM" or "10/11/26, 5:56 PM" into minutes since midnight
const parseTimeInMinutes = (str = '') => {
  const cleaned = str.replace(/\u202f/g, ' ');
  const match = cleaned.match(/(\d{1,2})[:\-](\d{2})\s*(AM|PM)/i);
  if (!match) return null;
  let hours = parseInt(match[1], 10);
  const mins = parseInt(match[2], 10);
  const period = match[3].toUpperCase();
  if (period === 'PM' && hours < 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;
  return hours * 60 + mins;
};

// Detect division ("boys" or "girls") from schedule string or boxscore JSON
const detectGender = (matchupStr = '', boxscoreData = null) => {
  if (/\(boys\)/i.test(matchupStr)) return 'boys';
  if (/\(girls\)/i.test(matchupStr)) return 'girls';

  // In the CSV/JSON conversions, Girls boxscores have "Time", "+/-", or "Custom 1" columns,
  // whereas Boys boxscores have "Charge  Taken" and "Airball" columns.
  if (boxscoreData?.stats?.length > 0) {
    const firstStat = boxscoreData.stats[0];
    if ('Time' in firstStat || '+/-' in firstStat || 'Custom 1' in firstStat) {
      return 'girls';
    }
    if ('Airball' in firstStat || 'Charge  Taken' in firstStat) {
      return 'boys';
    }
  }
  return null;
};

const Schedule = () => {
  const [loading, setLoading] = useState(true);
  const [gameDataMap, setGameDataMap] = useState({});
  const [allBoxscoresList, setAllBoxscoresList] = useState([]);
  const [showBoxscore, setShowBoxscore] = useState(false);
  const [selectedGame, setSelectedGame] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      const combinedMap = {};
      const boxscoreArray = [];

      // Helper to dynamically pull the week (or playoffs/championships) from the folder path or date
      const getWeekFromPathOrDate = (path, dateStr = '') => {
        const lowerPath = path.toLowerCase();
        if (lowerPath.includes('/playoffs/')) return 'Playoffs';
        if (lowerPath.includes('/championships/')) return 'Championships';
        const weekMatch = path.match(/week\s*(\d+)/i);
        if (weekMatch) return String(weekMatch[1]);

        // Fallback: Infer week from date string if files aren't in a weekX subfolder
        if (dateStr.includes('10/11') || path.includes('10_11') || path.includes('10:11')) return '1';
        if (dateStr.includes('10/18') || path.includes('10_18') || path.includes('10:18')) return '2';
        if (dateStr.includes('10/23') || path.includes('10_23') || path.includes('10:23')) return '3';
        if (dateStr.includes('10/25') || path.includes('10_25') || path.includes('10:25')) return '4';
        if (dateStr.includes('11/6') || dateStr.includes('11/06')) return '5';
        if (dateStr.includes('11/13')) return '6';

        return '1'; // Default fallback if placed directly in boxscores root
      };

      // 1. Process JSON boxscores
      for (const path in jsonFiles) {
        const data = jsonFiles[path].default || jsonFiles[path];
        if (data && data.game) {
          const weekNum = String(data.week || getWeekFromPathOrDate(path, data.date));
          const gender = detectGender(data.game, data);
          const timeMins = parseTimeInMinutes(data.date || path);
          const sortedTeams = getSortedTeamsKey(data.game);
          const [t1, t2] = extractTeams(data.game);

          const enrichedData = {
            ...data,
            week: weekNum,
            _gender: gender,
            _timeMins: timeMins,
            _sortedTeams: sortedTeams,
            _exactTeams: `${t1}-vs-${t2}`,
            _path: path
          };

          boxscoreArray.push(enrichedData);

          // Register legacy slug key + smart keys so lookups never fail
          if (typeof slugifyMatchup === 'function') {
            combinedMap[`${weekNum}-${slugifyMatchup(data.game)}`] = enrichedData;
          }
          combinedMap[`${weekNum}-${t1}-vs-${t2}`] = enrichedData;
          combinedMap[`${weekNum}-${t2}-vs-${t1}`] = enrichedData;
          if (gender) {
            combinedMap[`${weekNum}-${sortedTeams}-${gender}`] = enrichedData;
          }
        }
      }

      // 2. Merge CSV score metadata (if CSV files are also present)
      for (const path in csvFiles) {
        try {
          const rawContent = await csvFiles[path]();
          const results = Papa.parse(rawContent, { skipEmptyLines: true });
          const rows = results.data;

          const matchupLine = rows.find(r => r[0]?.includes('vs.'))?.[0] || '';
          const dateLine = rows[2]?.[0] || '';
          const weekFromPath = getWeekFromPathOrDate(path, dateLine);

          const weekLine = rows.find(r => r[0]?.toLowerCase().includes('week'))?.[0] || '';
          let weekNum = String(weekLine.match(/\d+/)?.[0] || weekFromPath);

          if (weekFromPath === 'Playoffs' || weekFromPath === 'Championships') {
            weekNum = weekFromPath;
          }

          if (weekNum && matchupLine && typeof parseScoreFromCSV === 'function') {
            const csvScores = parseScoreFromCSV(rows);
            const csvTimeMins = parseTimeInMinutes(dateLine || path);
            const csvSortedTeams = getSortedTeamsKey(matchupLine);

            // Find matching boxscore in our list and merge scores if needed
            const matchingGame = boxscoreArray.find(g => {
              if (String(g.week) !== String(weekNum)) return false;
              if (g._sortedTeams !== csvSortedTeams) return false;
              if (g._timeMins && csvTimeMins && Math.abs(g._timeMins - csvTimeMins) <= 25) return true;
              return true;
            });

            if (matchingGame && csvScores) {
              matchingGame.scores = csvScores;
            }
          }
        } catch (err) {
          console.warn('Error parsing CSV boxscore metadata:', path, err);
        }
      }

      setGameDataMap(combinedMap);
      setAllBoxscoresList(boxscoreArray);
      setLoading(false);
    };

    loadData();
  }, []);

  // Strict resolver that matches schedule row (week, matchup, time) to the correct JSON boxscore
  const findMatchingBoxscore = (weekNum, scheduleMatchup, scheduleTime) => {
    const wStr = String(weekNum);
    const schedGender = detectGender(scheduleMatchup);
    const schedSortedTeams = getSortedTeamsKey(scheduleMatchup);
    const schedTimeMins = parseTimeInMinutes(scheduleTime);

    // Filter boxscores that belong to this week and have the same two teams
    const candidates = allBoxscoresList.filter(
      (g) => String(g.week) === wStr && g._sortedTeams === schedSortedTeams
    );

    if (candidates.length === 0) return null;
    if (candidates.length === 1) {
      // If there's only 1 candidate in the week for these two teams, verify if the schedule 
      // specifies a gender. If the file doesn't have a gender or matches, return it.
      if (schedGender && candidates[0]._gender && schedGender !== candidates[0]._gender) {
        return null;
      }
      return candidates[0];
    }

    // If there are multiple games between the same two teams in the same week (e.g. Boys vs Girls),
    // strictly enforce gender matching when specified in the schedule string.
    if (schedGender) {
      const genderMatch = candidates.find(g => g._gender === schedGender);
      if (genderMatch) return genderMatch;
      // If no boxscore matches the requested gender, don't fallback to the wrong gender!
      return null;
    }

    // Fallback to time slot proximity if schedule doesn't specify gender
    let bestMatch = null;
    let bestScore = -999;

    for (const cand of candidates) {
      let score = 0;
      if (schedTimeMins !== null && cand._timeMins !== null) {
        const diff = Math.abs(schedTimeMins - cand._timeMins);
        if (diff <= 30) {
          score += 50 - diff;
        } else {
          score -= diff;
        }
      }
      if (score > bestScore) {
        bestScore = score;
        bestMatch = cand;
      }
    }

    return bestMatch || candidates[0];
  };

  const handleOpenBoxscore = (weekNum, matchup, time) => {
    const matchedGame = findMatchingBoxscore(weekNum, matchup, time);
    if (matchedGame) {
      setSelectedGame(matchedGame);
      setShowBoxscore(true);
    }
  };

  const hasBoxscore = (weekNum, matchup, time) => {
    return !!findMatchingBoxscore(weekNum, matchup, time);
  };

  return (
    <div className="px-3 px-md-5 py-5">
      <style>{`
        .schedule-page-heading {
          font-size: 1.75rem;
          font-weight: 700;
          text-transform: uppercase;
          font-style: italic;
          color: #1a1a1a;
          border-bottom: 4px solid #ff4d4d;
          display: inline-block;
          padding-bottom: 5px;
          margin-bottom: 0.5rem;
          font-family: 'Montserrat', sans-serif;
        }

        .schedule-subtext {
          color: #6c757d;
          font-size: 0.9rem;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 2.5rem;
          display: block;
        }

        .week-card {
          background: rgba(255, 255, 255, 0.92);
          backdrop-filter: blur(4px);
          border: 1px solid rgba(238, 238, 238, 0.8) !important;
          border-radius: 0.25rem !important;
          box-shadow: 0 8px 20px rgba(0,0,0,0.12);
          overflow: hidden;
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s ease;
          margin-bottom: 1rem;
        }

        .week-card-header {
          background: rgba(26, 26, 26, 0.95);
          border-bottom: 2px solid #ff4d4d;
          padding: 1rem 1.5rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .week-label {
          color: #ff4d4d;
          font-weight: 700;
          font-style: italic;
          text-transform: uppercase;
          font-size: 1.1rem;
          font-family: 'Montserrat', sans-serif;
          margin: 0;
        }

        .week-date-badge {
          background: #ff4d4d !important;
          color: white !important;
          font-weight: 600;
          font-size: 0.75rem;
          letter-spacing: 0.5px;
          padding: 0.4em 0.85em;
          border-radius: 4px;
        }

        .location-bar {
          background: rgba(248, 249, 250, 0.85);
          border-bottom: 1px solid rgba(238, 238, 238, 0.8);
          padding: 0.5rem 1.5rem;
          font-size: 0.8rem;
          color: #6c757d;
          font-weight: 500;
        }

        .game-time {
          color: #ff4d4d !important;
          font-weight: 600;
          font-family: 'Montserrat', sans-serif;
        }

        .matchup-name {
          font-weight: 600;
          color: #1a1a1a !important;
        }

        .boxscore-badge {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.8) 0%, rgba(255, 255, 255, 0.3) 100%) !important;
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          border: 1px solid rgba(255, 255, 255, 0.9) !important;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.08);
          color: #1a1a1a !important;
          font-size: 0.7rem;
          font-weight: 700;
          padding: 0.4em 0.85em;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .boxscore-badge:hover {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.5) 100%) !important;
          box-shadow: 0 6px 14px rgba(0, 0, 0, 0.12);
          transform: translateY(-1px);
        }

        .status-badge {
          background: transparent !important;
          border: 1px solid #ddd !important;
          color: #6c757d !important;
          font-size: 0.7rem;
          font-weight: 600;
          padding: 0.35em 0.75em;
          border-radius: 4px;
        }

        .bye-bar {
          padding: 0.75rem 1.5rem;
          background: rgba(255, 251, 240, 0.9);
          border-top: 1px solid rgba(238, 238, 238, 0.8);
          font-size: 0.82rem;
          color: #6c757d;
        }

        @media (max-width: 576px) {
          .week-card-header {
            flex-direction: column;
            align-items: flex-start;
          }
          .week-date-badge {
            text-align: left;
            margin-top: 0.25rem;
          }
        }
      `}</style>

      <div className="text-center mb-5">
        <h1 className="schedule-page-heading">League Schedule</h1>
        <span className="schedule-subtext">Fall 2026 Season Schedule and Boxscores</span>
      </div>

      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" variant="danger" />
        </div>
      ) : (
        scheduleData.map((week) => (
          <div key={`week-${week.week}`} className="week-card">
            <div className="week-card-header">
              <h3 className="week-label">Round: {week.week}</h3>
              <Badge className="week-date-badge">{week.date}</Badge>
            </div>

            <div className="location-bar">📍 {week.location}</div>

            <Table responsive hover className="mb-0">
              <thead>
                <tr>
                  <th style={{ width: '140px' }}>Time</th>
                  <th>Matchup</th>
                  <th className="text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {week.games.map((game, idx) => {
                  const available = hasBoxscore(week.week, game.matchup, game.time);
                  return (
                    <tr
                      key={`game-${week.week}-${idx}-${game.time}-${game.matchup}`}
                      onClick={() => available && handleOpenBoxscore(week.week, game.matchup, game.time)}
                      style={{ cursor: available ? 'pointer' : 'default', background: 'transparent' }}
                    >
                      <td className="game-time">{game.time}</td>
                      <td className="matchup-name">{game.matchup}</td>
                      <td className="text-center">
                        {available ? (
                          <Badge className="boxscore-badge">BOXSCORE ▸</Badge>
                        ) : (
                          <Badge className="status-badge">UPCOMING</Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>

            {week.bye && (
              <div className="bye-bar">
                <span style={{ fontWeight: 600 }}>Bye:</span> {week.bye}
              </div>
            )}
          </div>
        ))
      )}

      <BoxscoreModal
        show={showBoxscore}
        onHide={() => setShowBoxscore(false)}
        gameData={selectedGame}
      />
    </div>
  );
};

export default Schedule;