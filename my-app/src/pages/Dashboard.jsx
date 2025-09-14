import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { projectsAPI, tasksAPI } from '../services/api';
import '../styles/Dashboard.css';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState({
    totalProjects: 0,
    activeTasks: 0,
    completedTasks: 0,
    pendingTasks: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch projects and tasks in parallel
      const [projectsResponse, tasksResponse] = await Promise.all([
        projectsAPI.getAll(),
        tasksAPI.getAll()
      ]);

      if (projectsResponse.data.success) {
        setProjects(projectsResponse.data.projects);
      }

      if (tasksResponse.data.success) {
        const fetchedTasks = tasksResponse.data.tasks;
        setTasks(fetchedTasks);

        // Calculate stats
        const totalProjects = projectsResponse.data.projects.length;
        const completedTasks = fetchedTasks.filter(task => task.status === 'completed').length;
        const activeTasks = fetchedTasks.filter(task => task.status === 'in-progress').length;
        const pendingTasks = fetchedTasks.filter(task => task.status === 'todo').length;

        setStats({
          totalProjects,
          activeTasks,
          completedTasks,
          pendingTasks
        });
      }

    } catch (error) {
      console.error('Dashboard data fetch error:', error);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const getInitials = (name) => {
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const createNewProject = () => {
    // This would typically open a modal or navigate to create project page
    alert('Create New Project functionality would be implemented here');
  };

  const createNewTask = () => {
    // This would typically open a modal or navigate to create task page
    alert('Create New Task functionality would be implemented here');
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh',
          fontSize: '18px',
          color: '#666'
        }}>
          Loading dashboard...
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Header */}
      <header className="dashboard-header">
        <nav className="dashboard-nav">
          <div className="dashboard-logo">
            CodeMasters
          </div>
          
          <div className="dashboard-user">
            <div className="user-info">
              <div className="user-avatar">
                {user?.profilePicture ? (
                  <img src={user.profilePicture} alt="Profile" />
                ) : (
                  getInitials(user?.name || 'User')
                )}
              </div>
              <div className="user-details">
                <h3>{user?.name || 'User'}</h3>
                <p>{user?.email}</p>
              </div>
            </div>
            <button onClick={handleLogout} className="btn btn-logout">
              Logout
            </button>
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <main className="dashboard-main">
        {error && <div className="error-message">{error}</div>}

        {/* Welcome Section */}
        <section className="dashboard-welcome">
          <h1>Welcome back, {user?.name?.split(' ')[0] || 'User'}!</h1>
          <p>Here's what's happening with your projects today.</p>
        </section>

        {/* Stats Cards */}
        <section className="dashboard-stats">
          <div className="stat-card">
            <div className="stat-number">{stats.totalProjects}</div>
            <p className="stat-label">Total Projects</p>
          </div>
          <div className="stat-card">
            <div className="stat-number">{stats.activeTasks}</div>
            <p className="stat-label">Active Tasks</p>
          </div>
          <div className="stat-card">
            <div className="stat-number">{stats.completedTasks}</div>
            <p className="stat-label">Completed Tasks</p>
          </div>
          <div className="stat-card">
            <div className="stat-number">{stats.pendingTasks}</div>
            <p className="stat-label">Pending Tasks</p>
          </div>
        </section>

        {/* Main Dashboard Content */}
        <section className="dashboard-content">
          <div className="main-content">
            <div className="projects-section">
              <h2>Recent Projects</h2>
              
              {projects.length === 0 ? (
                <div className="empty-state">
                  <h3>No projects yet</h3>
                  <p>Create your first project to get started!</p>
                  <button onClick={createNewProject} className="btn btn-primary">
                    Create New Project
                  </button>
                </div>
              ) : (
                <div className="projects-grid">
                  {projects.slice(0, 6).map((project) => (
                    <div key={project._id} className="project-card">
                      <h3>{project.title}</h3>
                      <p>{project.description}</p>
                      <div className="project-meta">
                        <span className={`project-status status-${project.status}`}>
                          {project.status}
                        </span>
                        <span>{project.tasks?.length || 0} tasks</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <aside className="sidebar">
            <div className="sidebar-section">
              <h3>Quick Actions</h3>
              <div className="quick-actions">
                <button onClick={createNewProject} className="quick-action-btn">
                  + New Project
                </button>
                <button onClick={createNewTask} className="quick-action-btn">
                  + New Task
                </button>
                <button className="quick-action-btn">
                  📊 View Reports
                </button>
                <button className="quick-action-btn">
                  ⚙️ Settings
                </button>
              </div>
            </div>

            <div className="sidebar-section">
              <h3>Recent Activity</h3>
              {tasks.slice(0, 5).map((task) => (
                <div key={task._id} style={{ 
                  padding: '10px 0', 
                  borderBottom: '1px solid #e1e5e9',
                  fontSize: '14px'
                }}>
                  <div style={{ fontWeight: '500', marginBottom: '4px' }}>
                    {task.title}
                  </div>
                  <div style={{ color: '#666', fontSize: '12px' }}>
                    {task.projectId?.title} • {task.status}
                  </div>
                </div>
              ))}
              
              {tasks.length === 0 && (
                <p style={{ color: '#666', fontSize: '14px', margin: 0 }}>
                  No recent activity
                </p>
              )}
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
};

export default Dashboard;