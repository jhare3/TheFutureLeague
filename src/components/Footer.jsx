import React from 'react';
import { Container, Row, Col } from 'react-bootstrap';

const Footer = () => {
  return (
    <footer style={footerStyle}>
      <Container>
        <Row className="gy-4 align-items-center">
          <Col xs={12} md={4} className="text-center text-md-start">
            <h5 className="fw-black italic mb-1">THE FUTURE BASKETBALL LEAGUE 🏀</h5>
            <p className="small text-muted mb-0">2026 Fall League</p>
          </Col>
          
          <Col xs={12} md={4} className="text-center">
            <div className="d-flex justify-content-center gap-4 h4 mb-0">
              <a href="https://facebook.com" target="_blank" rel="noreferrer" style={linkStyle}>
                <i className="bi bi-facebook"></i>
              </a>
              <a href="https://instagram.com" target="_blank" rel="noreferrer" style={linkStyle}>
                <i className="bi bi-instagram"></i>
              </a>
            </div>
          </Col>

          <Col xs={12} md={4} className="text-center text-md-end">
            <div style={creditsStyle}>
              <div>Organized by <span className="text-white">Revolution Basketball</span></div>  
              <div>Site Design by <span className="text-white">James Hare</span></div>
            </div>
          </Col>
        </Row>
        
        <hr style={{ borderColor: '#333', margin: '30px 0' }} />
        
        <div className="text-center small text-muted">
          &copy; {new Date().getFullYear()} Revolution Basketball. All Rights Reserved.
        </div>
      </Container>
    </footer>
  );
};

const footerStyle = {
  backgroundColor: '#111',
  color: '#fff',
  padding: '60px 0 30px 0',
  marginTop: 'auto',
  borderTop: '4px solid #ff4d4d'
};

const linkStyle = {
  color: '#fff',
  transition: 'color 0.2s',
};

const creditsStyle = {
  fontSize: '11px',
  textTransform: 'uppercase',
  fontWeight: 'bold',
  letterSpacing: '1px',
  color: '#888',
  lineHeight: '1.8'
};

export default Footer;