import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";

const Navigation = () => {
  const location = useLocation();
  const [isNavExpanded, setIsNavExpanded] = useState(false);

const navLinks = [
  { name: 'Home', path: '/' },
  { name: 'Rosters', path: '/rosters' },
  { name: 'Schedule', path: '/schedule' },
  { name: 'Standings', path: '/standings' },
  { name: 'Stats', path: '/stats' },
];

  return (
    <>
      <style>{`
        .custom-nav-container {
          position: sticky;
          top: 0;
          z-index: 1050;
          width: 100%;
        }

        .custom-navbar {
          background: #ffffff;
          border-bottom: 2px solid #eeeeee;
          padding: 0.75rem 2rem;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          width: 100%;
        }

        .custom-navbar .navbar-brand {
          color: #1a1a1a !important;
          font-weight: 900;
          font-style: italic;
          text-transform: uppercase;
          letter-spacing: -0.5px;
          font-family: 'Montserrat', sans-serif;
        }

        .custom-navbar .nav-link {
          color: #444444 !important;
          font-weight: 600;
          padding: 0.5rem 1rem !important;
          transition: color 0.2s ease;
          font-family: 'Montserrat', sans-serif;
          font-size: 0.9rem;
        }

        .custom-navbar .nav-link:hover {
          color: #ff4d4d !important;
        }

        .custom-navbar .nav-link.active {
          color: #ff4d4d !important;
        }

        .navbar-toggler {
          border: none !important;
          padding: 0;
          background: transparent !important;
          outline: none !important;
          box-shadow: none !important;
        }

        .hamburger-icon {
          width: 30px;
          height: 20px;
          position: relative;
          display: block;
          cursor: pointer;
        }

        .hamburger-icon span {
          display: block;
          position: absolute;
          height: 2px;
          width: 100%;
          background: #1a1a1a;
          border-radius: 9px;
          opacity: 1;
          left: 0;
          transform: rotate(0deg);
          transition: .25s ease-in-out;
        }

        .hamburger-icon span:nth-child(1) { top: 0px; }
        .hamburger-icon span:nth-child(2) { top: 9px; }
        .hamburger-icon span:nth-child(3) { top: 18px; }

        .hamburger-icon.open span:nth-child(1) {
          top: 9px;
          transform: rotate(135deg);
        }
        .hamburger-icon.open span:nth-child(2) {
          opacity: 0;
          left: -40px;
        }
        .hamburger-icon.open span:nth-child(3) {
          top: 9px;
          transform: rotate(-135deg);
        }

        .custom-logo {
          height: 40px;
          margin-right: 12px;
          border-radius: 4px;
        }

        @media (max-width: 991px) {
          .navbar-collapse {
            background: #ffffff;
            border-top: 1px solid #eeeeee;
            margin-top: 10px;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 10px 20px rgba(0,0,0,0.1);
          }

          .nav-item {
            border-bottom: 1px solid #f8f9fa;
            width: 100%;
            text-align: center;
          }

          .nav-item:last-child {
            border-bottom: none;
          }

          .custom-navbar .nav-link.active {
            background-color: #fff5f5;
            border-radius: 4px;
          }
        }
      `}</style>

      <div className="custom-nav-container">
        <nav className="navbar navbar-expand-lg custom-navbar">
          <div className="container-fluid p-0">
            <Link className="navbar-brand d-flex align-items-center" to="/">
              <img src="/TFL.jpeg" alt="Logo" className="custom-logo" />
              <span>THE FUTURE LEAGUE 2026</span>
            </Link>

            <button
              className="navbar-toggler"
              type="button"
              aria-controls="navbarNav"
              aria-expanded={isNavExpanded}
              aria-label="Toggle navigation"
              onClick={() => setIsNavExpanded(!isNavExpanded)}
            >
              <div className={`hamburger-icon ${isNavExpanded ? "open" : ""}`}>
                <span></span>
                <span></span>
                <span></span>
              </div>
            </button>

            <div
              className={`collapse navbar-collapse ${isNavExpanded ? "show" : ""}`}
              id="navbarNav"
            >
              <ul className="navbar-nav ms-auto align-items-center">
                {navLinks.map((link) => (
                  <li className="nav-item mx-lg-1" key={link.path}>
                    <Link
                      className={`nav-link ${location.pathname === link.path ? "active" : ""}`}
                      to={link.path}
                      onClick={() => setIsNavExpanded(false)}
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </nav>
      </div>
    </>
  );
};

export default Navigation;