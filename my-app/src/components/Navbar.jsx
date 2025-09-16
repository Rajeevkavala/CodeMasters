import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import '../styles/Dashboard.css';

export default function Navbar() {
  const location = useLocation();

  const isActive = (path) => {
    return location.pathname === path ? 'active' : '';
  };

  return (
    <div className='retail-nav-container'>
      <nav className='retail-nav'>
        <Link to="/dashboard" className={`nav-link ${isActive('/dashboard')}`}>
          🏠 Dashboard
        </Link>
        <Link to="/storepanel" className={`nav-link ${isActive('/storepanel')}`}>
          🏪 Store Panel
        </Link>
        <Link to="/livequeue" className={`nav-link ${isActive('/livequeue')}`}>
          📊 Live Queue
        </Link>
        <Link to="/analytics" className={`nav-link ${isActive('/analytics')}`}>
          📈 Analytics
        </Link>
      </nav>
    </div>
  );
}
