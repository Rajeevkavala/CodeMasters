import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, getCurrentUserToken } from '../services/firebase';
import { authAPI } from '../services/api';

// Create Auth Context
const AuthContext = createContext();

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Auth Provider Component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load user from localStorage on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    const savedToken = localStorage.getItem('authToken');
    
    if (savedUser && savedToken) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  // Listen for Firebase auth changes (for Google Sign-in)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser && firebaseUser.providerData[0]?.providerId === 'google.com') {
        try {
          // Get Firebase ID token
          const idToken = await getCurrentUserToken();
          
          if (idToken) {
            // Send to backend for verification and JWT creation
            const response = await authAPI.googleAuth(idToken);
            
            if (response.data.success) {
              const { user: userData, token } = response.data;
              
              // Store user and token
              localStorage.setItem('user', JSON.stringify(userData));
              localStorage.setItem('authToken', token);
              setUser(userData);
              setError(null);
            }
          }
        } catch (error) {
          console.error('Google auth error:', error);
          setError('Google authentication failed');
          // Sign out from Firebase if backend auth fails
          auth.signOut();
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Login with email/password
  const login = async (email, password) => {
    try {
      setLoading(true);
      setError(null);

      const response = await authAPI.login({ email, password });
      
      if (response.data.success) {
        const { user: userData, token } = response.data;
        
        // Store user and token
        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('authToken', token);
        setUser(userData);
        
        return { success: true };
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Login failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Signup with email/password
  const signup = async (name, email, password) => {
    try {
      setLoading(true);
      setError(null);

      const response = await authAPI.signup({ name, email, password });
      
      if (response.data.success) {
        const { user: userData, token } = response.data;
        
        // Store user and token
        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('authToken', token);
        setUser(userData);
        
        return { success: true };
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Signup failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Logout
  const logout = async () => {
    try {
      // Sign out from Firebase (if signed in with Google)
      if (auth.currentUser) {
        await auth.signOut();
      }
      
      // Clear local storage
      localStorage.removeItem('user');
      localStorage.removeItem('authToken');
      setUser(null);
      setError(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Get current user info from backend
  const refreshUser = async () => {
    try {
      const response = await authAPI.getCurrentUser();
      if (response.data.success) {
        const userData = response.data.user;
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
      }
    } catch (error) {
      console.error('Refresh user error:', error);
      // If token is invalid, logout
      if (error.response?.status === 401) {
        logout();
      }
    }
  };

  const value = {
    user,
    loading,
    error,
    login,
    signup,
    logout,
    refreshUser,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};