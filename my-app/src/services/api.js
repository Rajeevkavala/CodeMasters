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

// Health check
export const healthCheck = () => api.get('/health');

export default api;