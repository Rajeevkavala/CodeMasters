import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { RetailDataProvider } from './context/RetailDataContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import "./App.css";
import Storepanel from './pages/Storepanel';
import Livequeue from './pages/Livequeue';
import Analytics from './pages/Analytics';

function App() {
  return (
    <Router>
      <AuthProvider>
        <RetailDataProvider>
          <div className="App">
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              
              {/* Protected Routes */}
              <Route 
                path="/dashboard" 
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path='/storepanel' 
                element={
                  <ProtectedRoute>
                    <Storepanel/>
                  </ProtectedRoute>
                }
              />
              <Route 
                path='/livequeue' 
                element={
                  <ProtectedRoute>
                    <Livequeue/>
                  </ProtectedRoute>
                }
              />
              <Route 
                path='/analytics' 
                element={
                  <ProtectedRoute>
                    <Analytics/>
                  </ProtectedRoute>
                }
              />
              
              {/* Default redirect to dashboard */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              
              {/* Catch all route - redirect to dashboard */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </div>
        </RetailDataProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
