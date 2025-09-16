import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Authentication API calls
export const authAPI = {
  // Normal email/password signup
  signup: (userData) => api.post('/auth/signup', userData),
  
  // Normal email/password login
  login: (credentials) => api.post('/auth/login', credentials),
  
  // Google authentication with Firebase token
  googleAuth: (idToken) => api.post('/auth/google', { idToken }),
  
  // Get current user info
  getCurrentUser: () => api.get('/auth/me'),
};

// Projects API calls
export const projectsAPI = {
  // Get all projects
  getAll: () => api.get('/api/projects'),
  
  // Get single project
  getById: (id) => api.get(`/api/projects/${id}`),
  
  // Create new project
  create: (projectData) => api.post('/api/projects', projectData),
  
  // Update project
  update: (id, projectData) => api.put(`/api/projects/${id}`, projectData),
  
  // Delete project
  delete: (id) => api.delete(`/api/projects/${id}`),
};

// Tasks API calls
export const tasksAPI = {
  // Get all tasks (optionally filtered by project)
  getAll: (filters = {}) => {
    const params = new URLSearchParams();
    Object.keys(filters).forEach(key => {
      if (filters[key]) params.append(key, filters[key]);
    });
    return api.get(`/api/tasks?${params.toString()}`);
  },
  
  // Get single task
  getById: (id) => api.get(`/api/tasks/${id}`),
  
  // Create new task
  create: (taskData) => api.post('/api/tasks', taskData),
  
  // Update task
  update: (id, taskData) => api.put(`/api/tasks/${id}`, taskData),
  
  // Delete task
  delete: (id) => api.delete(`/api/tasks/${id}`),
  
  // Add comment to task
  addComment: (id, comment) => api.post(`/api/tasks/${id}/comments`, comment),
};

// Store API calls
export const storeAPI = {
  // Get all stores
  getAll: () => api.get('/api/stores'),
  
  // Get single store
  getById: (storeId) => api.get(`/api/stores/${storeId}`),
  
  // Create new store
  create: (storeData) => api.post('/api/stores', storeData),
  
  // Update store
  update: (storeId, storeData) => api.put(`/api/stores/${storeId}`, storeData),
  
  // Delete store
  delete: (storeId) => api.delete(`/api/stores/${storeId}`),
};

// Footfall API calls
export const footfallAPI = {
  // Ingest footfall data
  ingest: (storeId, data) => api.post('/api/footfall/ingest', { storeId, ...data }),
  
  // Get latest footfall data
  getLatest: (storeId) => api.get(`/api/footfall/latest/${storeId}`),
  
  // Get window statistics
  getWindowStats: (storeId, minutes = 60) => 
    api.get(`/api/footfall/window/${storeId}?minutes=${minutes}`),
  
  // Get historical data
  getHistory: (storeId, params = {}) => {
    const queryParams = new URLSearchParams(params);
    return api.get(`/api/footfall/history/${storeId}?${queryParams.toString()}`);
  },
  
  // Get analytics data
  getAnalytics: (storeId, period = 'today', groupBy = 'hour') => 
    api.get(`/api/footfall/analytics/${storeId}?period=${period}&groupBy=${groupBy}`),
};

// Alert API calls
export const alertAPI = {
  // Get all alerts
  getAll: (params = {}) => {
    const queryParams = new URLSearchParams(params);
    return api.get(`/api/alerts?${queryParams.toString()}`);
  },
  
  // Get single alert
  getById: (id) => api.get(`/api/alerts/${id}`),
  
  // Create new alert
  create: (alertData) => api.post('/api/alerts', alertData),
  
  // Acknowledge alert
  acknowledge: (id) => api.put(`/api/alerts/${id}/acknowledge`),
  
  // Resolve alert
  resolve: (id) => api.put(`/api/alerts/${id}/resolve`),
  
  // Delete alert
  delete: (id) => api.delete(`/api/alerts/${id}`),
  
  // Get alert statistics
  getStats: (storeId) => api.get(`/api/alerts/stats/${storeId}`),
};

// Health check
export const healthCheck = () => api.get('/health');

export default api;