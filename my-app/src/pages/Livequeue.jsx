import React from "react";
import { useState ,useEffect} from "react";
import { useAuth } from "../context/AuthContext";
import { useRetailData } from "../context/RetailDataContext";
import "../styles/Dashboard.css";
import Navbar from "../components/Navbar";

export default function Livequeue() {
  const { user, logout } = useAuth();
  const {
    footfallData,
    alerts,
    currentOccupancy,
    totalQueue,
    avgWaitTime,
    activeTills,
    lastUpdated,
    acknowledgeAlert,
    resolveAlert,
    loading
  } = useRetailData();

  // Real-time queue data from context or fallback to mock
  const queueStats = footfallData ? {
    totalCustomers: currentOccupancy,
    currentQueue: totalQueue,
    avgWaitTime: avgWaitTime,
    peakQueueToday: 15, // Could be computed from analytics
  } : {
    totalCustomers: 0,
    currentQueue: 0,
    avgWaitTime: 0,
    peakQueueToday: 0,
  };

  // Real-time till data
  const queueData = footfallData?.queueData?.tillQueues || [
    { id: 1, tillNumber: 1, queueLength: 0, avgServiceTime: 0, status: 'inactive', eta: 'N/A' },
    { id: 2, tillNumber: 2, queueLength: 0, avgServiceTime: 0, status: 'inactive', eta: 'N/A' },
    { id: 3, tillNumber: 3, queueLength: 0, avgServiceTime: 0, status: 'inactive', eta: 'N/A' },
  ];

  // Calculate ETA for each till
  const queueDataWithETA = queueData.map(till => ({
    ...till,
    eta: till.status === 'active' && till.queueLength > 0 
      ? `${Math.round(till.avgServiceTime * till.queueLength)}-${Math.round(till.avgServiceTime * till.queueLength + 2)} min`
      : till.status === 'active' ? '0-2 min' : 'Closed'
  }));

  // Recent activity - could be enhanced with real API data
  const [recentActivity] = useState([
    { id: 1, type: 'entry', timestamp: '2 minutes ago', location: 'Main Entrance' },
    { id: 2, type: 'exit', timestamp: '3 minutes ago', location: 'Till 2' },
    { id: 3, type: 'entry', timestamp: '5 minutes ago', location: 'Side Entrance' },
    { id: 4, type: 'exit', timestamp: '7 minutes ago', location: 'Till 1' },
    { id: 5, type: 'entry', timestamp: '9 minutes ago', location: 'Main Entrance' },
  ]);

  const handleAcknowledgeAlert = async (alertId) => {
    await acknowledgeAlert(alertId);
  };

  const handleResolveAlert = async (alertId) => {
    await resolveAlert(alertId);
  };

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
     document.title = "Live Queue - Real-time Monitoring"
  }, [])
  
  return (
    <>
      <header className="dashboard-header">
        <nav className="dashboard-nav">
          <div className="dashboard-logo">Live Queue Monitor</div>

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
        {/* Live Queue Statistics */}
        <div className="queue-stats-section">
          <h2>Live Queue Statistics 
            {lastUpdated && (
              <span className="last-updated"> (Updated: {lastUpdated.toLocaleTimeString()})</span>
            )}
          </h2>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-number">{queueStats.totalCustomers}</div>
              <p className="stat-label">Current Occupancy</p>
            </div>
            <div className="stat-card">
              <div className="stat-number">{queueStats.currentQueue}</div>
              <p className="stat-label">Total Queue</p>
            </div>
            <div className="stat-card">
              <div className="stat-number">{queueStats.avgWaitTime} min</div>
              <p className="stat-label">Avg Wait Time</p>
            </div>
            <div className="stat-card">
              <div className="stat-number">{activeTills}</div>
              <p className="stat-label">Active Tills</p>
            </div>
          </div>
        </div>

        {/* Per-Till Queue Information */}
        <div className="till-queues-section">
          <h2>Per-Till Queue Status</h2>
          <div className="till-grid">
            {queueDataWithETA.map((till) => (
              <div key={till.id || till.tillNumber} className={`till-card ${till.status}`}>
                <div className="till-header">
                  <h3>Till {till.tillNumber}</h3>
                  <span className={`status-badge ${till.status}`}>
                    {till.status.toUpperCase()}
                  </span>
                </div>
                <div className="till-stats">
                  <div className="till-stat">
                    <span className="stat-value">{till.queueLength}</span>
                    <span className="stat-label">Queue Length</span>
                  </div>
                  <div className="till-stat">
                    <span className="stat-value">{till.avgServiceTime}m</span>
                    <span className="stat-label">Avg Service</span>
                  </div>
                  <div className="till-stat">
                    <span className="stat-value">{till.eta}</span>
                    <span className="stat-label">ETA</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Active Alerts Section */}
        {alerts && alerts.length > 0 && (
          <div className="alerts-section">
            <h2>Active Alerts</h2>
            <div className="alerts-container">
              {alerts.slice(0, 3).map((alert) => (
                <div key={alert._id} className={`alert-card ${alert.alertType} ${alert.severity}`}>
                  <div className="alert-icon">
                    {alert.severity === 'critical' ? '🚨' : 
                     alert.severity === 'high' ? '⚠️' : 
                     alert.severity === 'medium' ? '💡' : 'ℹ️'}
                  </div>
                  <div className="alert-content">
                    <span className={`priority-badge ${alert.severity}`}>
                      {alert.severity.toUpperCase()}
                    </span>
                    <h4>{alert.title}</h4>
                    <p>{alert.message}</p>
                    {!alert.isAcknowledged && (
                      <div className="alert-actions">
                        <button 
                          className="btn-acknowledge"
                          onClick={() => handleAcknowledgeAlert(alert._id)}
                        >
                          Acknowledge
                        </button>
                        <button 
                          className="btn-resolve"
                          onClick={() => handleResolveAlert(alert._id)}
                        >
                          Resolve
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Activity Feed */}
        <div className="activity-section">
          <h2>Recent Activity</h2>
          <div className="activity-feed">
            {recentActivity.map((activity) => (
              <div key={activity.id} className={`activity-item ${activity.type}`}>
                <div className="activity-icon">
                  {activity.type === 'entry' ? '→' : '←'}
                </div>
                <div className="activity-details">
                  <span className="activity-type">
                    {activity.type === 'entry' ? 'Customer Entry' : 'Customer Exit'}
                  </span>
                  <span className="activity-location">{activity.location}</span>
                  <span className="activity-time">{activity.timestamp}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Queue Management Controls */}
        <div className="controls-section">
          <h2>Queue Management</h2>
          <div className="controls-grid">
            <button className="control-btn primary">
              📢 Announce Till Opening
            </button>
            <button className="control-btn secondary">
              ⚠️ Emergency Alert
            </button>
            <button className="control-btn info">
              📊 Generate Report
            </button>
            <button className="control-btn warning">
              🔔 Staff Alert
            </button>
          </div>
        </div>

        {loading && (
          <div className="loading-overlay">
            <div className="loading-spinner"></div>
            <p>Updating queue data...</p>
          </div>
        )}
      </div>
    </>
  );
}
