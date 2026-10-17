import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navigation from './components/Navigation';
import Footer from './components/Footer';
import Home from './pages/Home';
import Rosters from './pages/Rosters';
import Schedule from './pages/Schedule';
import Standings from './pages/Standings';
import Stats from './pages/Stats';
import Recaps from './pages/Recaps';
import './App.css';

function App() {
  return (
    <Router>
      <div className="app-layout" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Navigation />
        <main style={{ flex: '1' }}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/rosters" element={<Rosters />} />
            <Route path="/schedule" element={<Schedule />} />
            <Route path="/standings" element={<Standings />} /> 
            <Route path="/stats" element={<Stats />} /> 
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;