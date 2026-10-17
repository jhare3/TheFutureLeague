import React, { useMemo, useState, useRef, useEffect } from 'react';
import { calculateStandings } from '../utils/standingsEngine';
import playerConfig from '../data/players.json';

// Dynamically import all boxscore files from the week subfolders
const gameFiles = import.meta.glob('../data/boxscores/**/*.json', { eager: true });

// Self-contained scrollable table: tracks its own scroll position so the
// mini progress bar, edge fades, and drag-to-scroll all work per-instance
// (safe even if this ever renders more than one table, e.g. conferences).
const ScrollableTeamsTable = ({ title, teams, sortConfig, requestSort }) => {
  const scrollRef = useRef(null);
  const dragInfo = useRef({ isDown: false, startX: 0, startScrollLeft: 0 });
  const [scrollState, setScrollState] = useState({ atStart: true, atEnd: true, scrollable: false, thumbWidthPct: 100, thumbLeftPct: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const updateScrollState = () => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    const maxScroll = scrollWidth - clientWidth;
    const thumbWidthPct = Math.min(100, (clientWidth / scrollWidth) * 100);
    const thumbLeftPct = maxScroll > 0 ? (scrollLeft / maxScroll) * (100 - thumbWidthPct) : 0;
    setScrollState({
      atStart: scrollLeft <= 4,
      atEnd: scrollLeft >= maxScroll - 4,
      scrollable: scrollWidth > clientWidth + 4,
      thumbWidthPct,
      thumbLeftPct
    });
  };

  useEffect(() => {
    updateScrollState();
    window.addEventListener('resize', updateScrollState);
    return () => window.removeEventListener('resize', updateScrollState);
  }, [teams]);

  const handleScroll = () => updateScrollState();

  const handleMouseDown = (e) => {
    const el = scrollRef.current;
    if (!el) return;
    dragInfo.current = { isDown: true, startX: e.pageX, startScrollLeft: el.scrollLeft };
    setIsDragging(true);
  };

  const handleMouseMove = (e) => {
    const el = scrollRef.current;
    if (!el || !dragInfo.current.isDown) return;
    const delta = e.pageX - dragInfo.current.startX;
    el.scrollLeft = dragInfo.current.startScrollLeft - delta;
  };

  const endDrag = () => {
    dragInfo.current.isDown = false;
    setIsDragging(false);
  };

  return (
    <div className="mb-5">
      <h2 style={confHeaderStyle}>{title}</h2>
      <div style={tableWrapper}>
        <div style={tableOuterWrapper}>
          {scrollState.scrollable && (
            <div style={miniScrollTrack}>
              <div style={{ ...miniScrollThumb, width: `${scrollState.thumbWidthPct}%`, left: `${scrollState.thumbLeftPct}%` }} />
            </div>
          )}

          <div
            ref={scrollRef}
            style={{ ...tableScroll, cursor: isDragging ? 'grabbing' : 'grab' }}
            onScroll={handleScroll}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={endDrag}
            onMouseLeave={endDrag}
          >
            <table className="table table-hover m-0" style={{ minWidth: '560px' }}>
              <thead style={{ backgroundColor: '#111', color: '#fff' }}>
                <tr>
                  <th style={{ ...thStyle, textAlign: 'left' }}>TEAM</th>
                  <th style={thStyle} onClick={() => requestSort('W')}>W</th>
                  <th style={thStyle} onClick={() => requestSort('L')}>L</th>
                  <th style={thStyle} onClick={() => requestSort('PCT')}>PCT</th>
                  <th style={thStyle} onClick={() => requestSort('PF')}>PF</th>
                  <th style={thStyle} onClick={() => requestSort('PA')}>PA</th>
                  <th style={thStyle} onClick={() => requestSort('DIFF')}>DIFF</th>
                </tr>
              </thead>
              <tbody>
                {teams.map((t) => (
                  <tr key={t.name} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ ...tdStyle, textAlign: 'left', fontWeight: '800' }}>{t.name}</td>
                    <td style={tdStyle}>{t.W}</td>
                    <td style={tdStyle}>{t.L}</td>
                    <td style={tdStyle}>{t.PCT}</td>
                    <td style={tdStyle}>{t.PF}</td>
                    <td style={tdStyle}>{t.PA}</td>
                    <td style={{ 
                      ...tdStyle, 
                      fontWeight: '900', 
                      color: t.DIFF > 0 ? '#28a745' : t.DIFF < 0 ? '#dc3545' : '#222' 
                    }}>
                      {t.DIFF > 0 ? `+${t.DIFF}` : t.DIFF}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ ...edgeFadeLeft, opacity: !scrollState.scrollable || scrollState.atStart ? 0 : 1 }} />
          <div style={{ ...edgeFadeRight, opacity: !scrollState.scrollable || scrollState.atEnd ? 0 : 1 }} />
        </div>
      </div>
    </div>
  );
};

const Standings = () => {
  // State for interactive sorting
  const [sortConfig, setSortConfig] = useState({ key: 'W', direction: 'desc' });

  // Build standings for one division. Team names like "Black (Lamoille)" exist in
  // both divisions, so we hand the engine a players list limited to that division.
  const buildDivision = (division) => {
    const divisionConfig = {
      ...playerConfig,
      players: playerConfig.players.filter(p => p.division === division)
    };
    const calculatedTeams = calculateStandings(gameFiles, divisionConfig)
      // If the engine tags rows with a division, keep only this one
      .filter(t => !t.division || t.division === division);

    // Process calculated data for display (Win % and Point Differential)
    let items = calculatedTeams.map(t => {
      const gp = t.W + t.L;
      return {
        ...t,
        PCT: gp > 0 ? (t.W / gp).toFixed(3) : ".000",
        DIFF: t.PF - t.PA
      };
    });

    // 3. Interactive Sort Logic
    items.sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];

      if (sortConfig.key === 'PCT') {
        aVal = parseFloat(aVal);
        bVal = parseFloat(bVal);
      }

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      
      // Secondary sort: fall back to DIFF if primary key is tied
      return b.DIFF - a.DIFF;
    });

    return items;
  };

  const boysStandings = useMemo(() => buildDivision('Boys'), [sortConfig]);
  const girlsStandings = useMemo(() => buildDivision('Girls'), [sortConfig]);

  const requestSort = (key) => {
    let direction = 'desc';
    if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key, direction });
  };

  return (
    <div className="container py-5" style={{ fontFamily: 'Inter, sans-serif' }}>
      <h1 className="text-center fw-black mb-5" style={{ letterSpacing: '-2px', fontSize: '3rem' }}>STANDINGS</h1>
      <ScrollableTeamsTable title="BOYS" teams={boysStandings} sortConfig={sortConfig} requestSort={requestSort} />
      <ScrollableTeamsTable title="GIRLS" teams={girlsStandings} sortConfig={sortConfig} requestSort={requestSort} />
    </div>
  );
};

// --- STYLES ---
const confHeaderStyle = { fontWeight: '900', color: '#ff4d4d', borderBottom: '4px solid #111', paddingBottom: '8px', marginBottom: '20px' };
const tableWrapper = { borderRadius: '12px', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', border: '1px solid #eee' };
const tableOuterWrapper = { position: 'relative' };
const tableScroll = { 
  overflowX: 'auto', 
  WebkitOverflowScrolling: 'touch', 
  scrollBehavior: 'smooth', 
  overscrollBehaviorX: 'contain' 
};
const thStyle = { padding: '15px', textAlign: 'center', fontSize: '12px', fontWeight: '800', cursor: 'pointer' };
const tdStyle = { padding: '15px', textAlign: 'center', verticalAlign: 'middle', fontSize: '14px' };
const edgeFadeBase = { position: 'absolute', top: 0, bottom: 0, width: '32px', pointerEvents: 'none', transition: 'opacity 0.25s ease', zIndex: 8 };
const edgeFadeLeft = { ...edgeFadeBase, left: 0, background: 'linear-gradient(to right, rgba(255,255,255,0.95), rgba(255,255,255,0))' };
const edgeFadeRight = { ...edgeFadeBase, right: 0, width: '22px', background: 'linear-gradient(to left, rgba(255,255,255,0.65), rgba(255,255,255,0))' };
const miniScrollTrack = { position: 'relative', width: '100%', height: '2.5px', backgroundColor: '#eee', marginBottom: '0px' };
const miniScrollThumb = { position: 'absolute', top: 0, bottom: 0, backgroundColor: '#ff4d4d', borderRadius: '999px', transition: 'left 0.05s linear' };

export default Standings;