import React from 'react';
import { Container, Row, Col, Card, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';

const Home = () => {
  const navCards = [
    { title: 'Standings', path: '/standings', icon: '🏆' },
    { title: 'Schedule', path: '/schedule', icon: '📅' },
    { title: 'Rosters', path: '/rosters', icon: '🏀' },
  ];

  return (
    <div style={pageWrapper}>
      {/* Added hero-mobile-adjust class for CSS overrides */}
      <div style={heroSection} className="hero-mobile-adjust">
        <div style={heroOverlay}>

          <div className="d-flex gap-3 justify-content-center mt-4">
            <Button as={Link} to="/schedule" variant="danger" size="lg" className="fw-black shadow">
              GAME SCHEDULE
            </Button>
            <Button as={Link} to="/stats" variant="outline-light" size="lg" className="fw-black shadow">
              LEAGUE STATS
            </Button>
          </div>
        </div>
      </div>

      <Container className="py-5">
        <Row className="g-4 justify-content-center">
          {navCards.map((card, idx) => (
            <Col key={idx} xs={12} md={4}>
              <Card 
                as={Link} 
                to={card.path} 
                style={cardStyle} 
                className="h-100 text-decoration-none"
              >
                <Card.Body className="d-flex flex-column align-items-center justify-content-center py-5">
                  <div style={{ fontSize: '3rem' }} className="mb-3">{card.icon}</div>
                  <Card.Title style={cardTitle}>{card.title.toUpperCase()}</Card.Title>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      </Container>
    </div>
  );
};

// Styling Objects
const pageWrapper = {
  backgroundColor: '#f8f9fa',
  minHeight: '100vh',
};

const heroSection = {
  height: '40vh', // Desktop height reverted
  backgroundImage: 'url("/TFL_cover.png")',
  backgroundSize: 'cover',
  backgroundPosition: 'top', // Orientation focused on the hoop
  position: 'relative',
};

const heroOverlay = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.6)',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  color: 'white',
  textAlign: 'center',
  padding: '0 20px',
};

const heroTitle = {
  fontSize: 'clamp(2.5rem, 8vw, 5rem)',
  fontWeight: '900',
  fontStyle: 'italic',
  letterSpacing: '-2px',
  textShadow: '2px 2px 10px rgba(0,0,0,0.5)',
};

const heroSubtitle = {
  fontSize: '1.25rem',
  fontWeight: '700',
  opacity: 0.9,
  textTransform: 'uppercase',
  letterSpacing: '2px',
};

const cardStyle = {
  background: 'rgba(255, 255, 255, 0.9)',
  backdropFilter: 'blur(10px)',
  border: 'none',
  borderRadius: '15px',
  transition: 'transform 0.3s ease, box-shadow 0.3s ease',
  boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
  cursor: 'pointer',
};

const cardTitle = {
  fontSize: '1.5rem',
  fontWeight: '900',
  color: '#111',
  letterSpacing: '1px',
};

export default Home;