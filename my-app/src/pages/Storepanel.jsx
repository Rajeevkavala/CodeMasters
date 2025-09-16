import React from 'react'
import { useState , useEffect} from 'react';
import { useAuth } from "../context/AuthContext";
import '../styles/Dashboard.css';
import Navbar from '../components/Navbar';

export default function Storepanel() {
   const { user, logout } = useAuth();
  const [stats] = useState({
      totalStrength: 15,
      currentOccupancy: 8,
      avgServiceTime: 4.5,
      peakHours: "2-4 PM",
    });

  // Mock entry/exit data
  const [entryExitData] = useState({
    entriesCount: 23,
    exitsCount: 15,
    currentQueue: 8,
    posRate: 2.3  
  });

  // Mock store configuration
  const [storeConfig] = useState({
    storeId: "ST001",
    storeName: "Downtown Branch",
    tillCount: 3,
    operatingHours: "9 AM - 9 PM"
  });

  const getInitials = (name) => {
    return name
      .split(" ")
      .map((part) => part.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  useEffect(() => {
    document.title = "Store Panel - Retail Analytics"
  }, [])
  return (
     <>
           <header className="dashboard-header">
        <nav className="dashboard-nav">
          <div className="dashboard-logo">Retail Analytics - Store Panel</div>

          <div className="dashboard-user">
            <div className="user-info">
              <div className="user-avatar">
                {user?.profilePicture ? (
                  <img src={user.profilePicture} alt="Profile" />
                ) : (
                  getInitials(user?.name || "User")
                )}
              </div>
              <div className="user-details">
                <h3>{user?.name || "User"}</h3>
                <p>{user?.email}</p>
              </div>
            </div>
            <button onClick={handleLogout} className="btn btn-logout">
              Logout
            </button>
          </div>
        </nav>
      </header>

      <Navbar />

      <div className="main-content">
        {/* Store Information Section */}
        <div className="store-info-section">
          <h2>Store Configuration</h2>
          <div className="config-grid">
            <div className="config-card">
              <h3>Store ID</h3>
              <p className="config-value">{storeConfig.storeId}</p>
            </div>
            <div className="config-card">
              <h3>Store Name</h3>
              <p className="config-value">{storeConfig.storeName}</p>
            </div>
            <div className="config-card">
              <h3>Till Count</h3>
              <p className="config-value">{storeConfig.tillCount}</p>
            </div>
            <div className="config-card">
              <h3>Operating Hours</h3>
              <p className="config-value">{storeConfig.operatingHours}</p>
            </div>
          </div>
        </div>

        {/* Real-time Stats Section */}
        <div className="stats-section">
          <h2>Live Store Metrics</h2>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-number">{stats.totalStrength}</div>
              <p className="stat-label">Total Staff</p>
            </div>
            <div className="stat-card">
              <div className="stat-number">{stats.currentOccupancy}</div>
              <p className="stat-label">Current Occupancy</p>
            </div>
            <div className="stat-card">
              <div className="stat-number">{stats.avgServiceTime}min</div>
              <p className="stat-label">Avg Service Time</p>
            </div>
            <div className="stat-card">
              <div className="stat-number">{stats.peakHours}</div>
              <p className="stat-label">Peak Hours</p>
            </div>
          </div>
        </div>

        {/* Entry/Exit Tracking Section */}
        <div className="tracking-section">
          <h2>Entry/Exit Tracking</h2>
          <div className="tracking-grid">
            <div className="tracking-card entries">
              <div className="tracking-icon">↗</div>
              <div className="tracking-info">
                <h3>Entries Today</h3>
                <p className="tracking-value">{entryExitData.entriesCount}</p>
              </div>
            </div>
            <div className="tracking-card exits">
              <div className="tracking-icon">↙</div>
              <div className="tracking-info">
                <h3>Exits Today</h3>
                <p className="tracking-value">{entryExitData.exitsCount}</p>
              </div>
            </div>
            <div className="tracking-card queue">
              <div className="tracking-icon">👥</div>
              <div className="tracking-info">
                <h3>Current Queue</h3>
                <p className="tracking-value">{entryExitData.currentQueue}</p>
              </div>
            </div>
            <div className="tracking-card pos-rate">
              <div className="tracking-icon">💳</div>
              <div className="tracking-info">
                <h3>POS Rate</h3>
                <p className="tracking-value">{entryExitData.posRate}/min</p>
              </div>
            </div>
          </div>
        </div>

        {/* Staffing Recommendations */}
        <div className="recommendations-section">
          <h2>Staffing Recommendations</h2>
          <div className="recommendations-grid">
            <div className="recommendation-card optimal">
              <h3>Current Status</h3>
              <p className="status-badge optimal">OPTIMAL</p>
              <p>Current staffing levels are adequate for the current queue</p>
            </div>
            <div className="recommendation-card suggestion">
              <h3>Next Hour Prediction</h3>
              <p className="status-badge warning">INCREASE</p>
              <p>Consider adding 1 more till operator for expected rush</p>
            </div>
          </div>
        </div>
      </div>
     </>
  )
}
