import React, { useState } from 'react';
import { Row, Col, Button, ButtonGroup } from 'react-bootstrap';
import playersData from '../data/players.json';

const Rosters = () => {
  const [selectedDivision, setSelectedDivision] = useState('All');

  const players = playersData.players || [];

  // Filter players by division if selected
  const filteredPlayers = players.filter((player) => {
    if (selectedDivision === 'All') return true;
    return player.division === selectedDivision;
  });

  // Group players by division and team
  const divisions = filteredPlayers.reduce((acc, player) => {
    const div = player.division || 'Unassigned';
    const teamName = player.team || 'Unassigned';
    if (!acc[div]) acc[div] = {};
    if (!acc[div][teamName]) acc[div][teamName] = [];
    acc[div][teamName].push(player);
    return acc;
  }, {});

  return (
    <div className="px-3 px-md-5 py-5">
      <style>{`
        .rosters-heading {
          font-size: 1.75rem;
          font-weight: 700;
          text-transform: uppercase;
          font-style: italic;
          color: #1a1a1a;
          border-bottom: 4px solid #ff4d4d;
          display: inline-block;
          padding-bottom: 5px;
          margin-bottom: 1.5rem;
          font-family: 'Montserrat', sans-serif;
        }

        .division-title {
          font-size: 1.35rem;
          font-weight: 700;
          text-transform: uppercase;
          font-style: italic;
          color: #333;
          margin-top: 2rem;
          margin-bottom: 1.5rem;
          border-left: 5px solid #ff4d4d;
          padding-left: 0.75rem;
          font-family: 'Montserrat', sans-serif;
        }

        .team-card {
          background: #ffffff;
          border: 1px solid #eeeeee !important;
          border-radius: 0.25rem !important;
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
          overflow: hidden;
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s ease, border 0.3s ease;
          height: 100%;
        }

        .team-card:hover {
          transform: translateY(-8px);
          box-shadow: 0 20px 40px rgba(51, 51, 51, 0.15);
          border: 1px solid rgba(51, 51, 51, 0.2) !important;
        }

        .team-card-body {
          padding: 1.5rem;
        }

        .team-name {
          font-weight: 700;
          font-style: italic;
          text-transform: uppercase;
          font-size: 1rem;
          color: #1a1a1a;
          letter-spacing: -0.3px;
          padding-bottom: 0.75rem;
          margin-bottom: 0.75rem;
          border-bottom: 2px solid #eeeeee;
          font-family: 'Montserrat', sans-serif;
        }

        .player-row {
          padding: 0.5rem 0;
          border-bottom: 1px solid #f5f5f5;
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 0.85rem;
          color: #444;
          font-family: 'Montserrat', sans-serif;
        }

        .player-row:last-child {
          border-bottom: none;
        }

        .player-name {
          font-weight: 500;
        }

        .team-header-green       { border-top: 5px solid #28a745 !important; }
        .team-header-red         { border-top: 5px solid #ff4d4d !important; }
        .team-header-blue        { border-top: 5px solid #007bff !important; }
        .team-header-yellow      { border-top: 5px solid #ffc107 !important; }
        .team-header-tan         { border-top: 5px solid #d2b48c !important; }
        .team-header-pink        { border-top: 5px solid #e83e8c !important; }
        .team-header-black       { border-top: 5px solid #1a1a1a !important; }
        .team-header-gray        { border-top: 5px solid #6c757d !important; }
        .team-header-grey        { border-top: 5px solid #6c757d !important; }
        .team-header-orange      { border-top: 5px solid #fd7e14 !important; }
        .team-header-purple      { border-top: 5px solid #6f42c1 !important; }
        .team-header-light-blue  { border-top: 5px solid #17a2b8 !important; }
      `}</style>

      <div className="text-center mb-4">
        <h1 className="rosters-heading">League Rosters</h1>
        <div className="d-flex justify-content-center mt-3">
          <ButtonGroup>
            <Button
              variant={selectedDivision === 'All' ? 'dark' : 'outline-dark'}
              onClick={() => setSelectedDivision('All')}
            >
              All Divisions
            </Button>
            <Button
              variant={selectedDivision === 'Boys' ? 'dark' : 'outline-dark'}
              onClick={() => setSelectedDivision('Boys')}
            >
              Boys Division
            </Button>
            <Button
              variant={selectedDivision === 'Girls' ? 'dark' : 'outline-dark'}
              onClick={() => setSelectedDivision('Girls')}
            >
              Girls Division
            </Button>
          </ButtonGroup>
        </div>
      </div>

      {Object.keys(divisions).sort().map((divName) => {
        const teams = divisions[divName];
        const teamNames = Object.keys(teams).sort();

        return (
          <div key={divName} className="mb-5">
            <h2 className="division-title">{divName} Division</h2>
            <Row className="g-4">
              {teamNames.map((teamName) => {
                const cardColorClass = teamName.toLowerCase().replace(/\s+/g, '-');
                return (
                  <Col key={teamName} xs={12} md={6} lg={4}>
                    <div className={`team-card team-header-${cardColorClass}`}>
                      <div className="team-card-body">
                        <div className="team-name">{teamName}</div>
                        {teams[teamName].map((player) => (
                          <div key={player.id} className="player-row">
                            <span className="player-name">
                              {player.first_name} {player.last_name}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </Col>
                );
              })}
            </Row>
          </div>
        );
      })}
    </div>
  );
};

export default Rosters;