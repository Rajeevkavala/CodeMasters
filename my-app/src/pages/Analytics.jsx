import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import '../styles/Dashboard.css';
import Navbar from '../components/Navbar';

export default function Analytics() {
  const { user, logout } = useAuth();

  // Mock analytics data for Phase 1
  const [dailyStats] = useState({
    date: new Date().toLocaleDateString(),
    totalEntries: 127,
    totalExits: 115,
    peakHour: '2-3 PM',
    avgWaitTime: 8.5,
    customerSatisfaction: 4.2
  });

  const [weeklyData] = useState([
    { day: 'Mon', entries: 98, exits: 92, avgWait: 7.2 },
    { day: 'Tue', entries: 112, exits: 108, avgWait: 8.1 },
    { day: 'Wed', entries: 89, exits: 85, avgWait: 6.8 },
    { day: 'Thu', entries: 134, exits: 128, avgWait: 9.3 },
    { day: 'Fri', entries: 156, exits: 149, avgWait: 12.1 },
    { day: 'Sat', entries: 203, exits: 195, avgWait: 15.4 },
    { day: 'Sun', entries: 127, exits: 115, avgWait: 8.5 }
  ]);

  const [hourlyData] = useState([
    { hour: '9 AM', customers: 12, waitTime: 3.2 },
    { hour: '10 AM', customers: 18, waitTime: 4.1 },
    { hour: '11 AM', customers: 25, waitTime: 6.3 },
    { hour: '12 PM', customers: 31, waitTime: 8.7 },
    { hour: '1 PM', customers: 28, waitTime: 7.9 },
    { hour: '2 PM', customers: 35, waitTime: 12.1 },
    { hour: '3 PM', customers: 32, waitTime: 9.8 },
    { hour: '4 PM', customers: 29, waitTime: 8.2 },
    { hour: '5 PM', customers: 24, waitTime: 6.5 },
    { hour: '6 PM', customers: 19, waitTime: 4.8 }
  ]);

  const [staffingAlerts] = useState([
    { id: 1, type: 'warning', message: 'High queue predicted at 2 PM - Consider opening Till 4', priority: 'high' },
    { id: 2, type: 'info', message: 'Optimal staffing for current period', priority: 'low' },
    { id: 3, type: 'suggestion', message: 'Lunch break rotation recommended at 12:30 PM', priority: 'medium' }
  ]);

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
    document.title = "Analytics - Retail Insights";
  }, []);

  return (
    <>
      <header className="dashboard-header">
        <nav className="dashboard-nav">
          <div className="dashboard-logo">Analytics Dashboard</div>
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
        {/* Daily Overview */}
        <div className="analytics-section">
          <h2>Today's Overview - {dailyStats.date}</h2>
          <div className="analytics-grid">
            <div className="analytics-card">
              <div className="analytics-value">{dailyStats.totalEntries}</div>
              <p className="analytics-label">Total Entries</p>
            </div>
            <div className="analytics-card">
              <div className="analytics-value">{dailyStats.totalExits}</div>
              <p className="analytics-label">Total Exits</p>
            </div>
            <div className="analytics-card">
              <div className="analytics-value">{dailyStats.peakHour}</div>
              <p className="analytics-label">Peak Hour</p>
            </div>
            <div className="analytics-card">
              <div className="analytics-value">{dailyStats.avgWaitTime} min</div>
              <p className="analytics-label">Avg Wait Time</p>
            </div>
            <div className="analytics-card">
              <div className="analytics-value">{dailyStats.customerSatisfaction}/5</div>
              <p className="analytics-label">Customer Rating</p>
            </div>
          </div>
        </div>

        {/* Weekly Trends */}
        <div className="trends-section">
          <h2>Weekly Trends</h2>
          <div className="chart-container">
            <div className="chart-header">
              <h3>Entries vs Exits by Day</h3>
            </div>
            <div className="chart-data">
              {weeklyData.map((day, index) => (
                <div key={index} className="chart-bar">
                  <div className="bar-group">
                    <div 
                      className="bar entries" 
                      style={{ height: `${(day.entries / 250) * 100}%` }}
                      title={`Entries: ${day.entries}`}
                    ></div>
                    <div 
                      className="bar exits" 
                      style={{ height: `${(day.exits / 250) * 100}%` }}
                      title={`Exits: ${day.exits}`}
                    ></div>
                  </div>
                  <div className="bar-label">{day.day}</div>
                  <div className="bar-values">
                    <span className="entries-value">↗ {day.entries}</span>
                    <span className="exits-value">↙ {day.exits}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Hourly Analysis */}
        <div className="hourly-section">
          <h2>Today's Hourly Analysis</h2>
          <div className="hourly-grid">
            {hourlyData.map((hour, index) => (
              <div key={index} className="hourly-card">
                <div className="hourly-time">{hour.hour}</div>
                <div className="hourly-stats">
                  <div className="hourly-customers">👥 {hour.customers}</div>
                  <div className="hourly-wait">⏱️ {hour.waitTime}m</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Staffing Alerts */}
        <div className="alerts-section">
          <h2>Staffing Recommendations & Alerts</h2>
          <div className="alerts-container">
            {staffingAlerts.map((alert) => (
              <div key={alert.id} className={`alert-card ${alert.type} ${alert.priority}`}>
                <div className="alert-icon">
                  {alert.type === 'warning' ? '⚠️' : 
                   alert.type === 'info' ? 'ℹ️' : '💡'}
                </div>
                <div className="alert-content">
                  <span className={`priority-badge ${alert.priority}`}>
                    {alert.priority.toUpperCase()}
                  </span>
                  <p>{alert.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="performance-section">
          <h2>Performance Metrics</h2>
          <div className="metrics-grid">
            <div className="metric-card efficiency">
              <h3>Store Efficiency</h3>
              <div className="efficiency-score">87%</div>
              <p>Above average performance</p>
            </div>
            <div className="metric-card throughput">
              <h3>Customer Throughput</h3>
              <div className="throughput-value">4.2/min</div>
              <p>Customers served per minute</p>
            </div>
            <div className="metric-card utilization">
              <h3>Till Utilization</h3>
              <div className="utilization-value">73%</div>
              <p>Average till usage rate</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}