/**
 * api.ts - Axios API Client Configuration
 * 
 * LEARNING OBJECTIVES:
 * 1. Centralized API configuration
 * 2. Axios interceptors for auth headers
 * 3. Error handling across all requests
 * 4. Request/response logging for debugging
 * 
 * ═══════════════════════════════════════════════════════════════════
 * WHY CENTRALIZE API CALLS?
 * ═══════════════════════════════════════════════════════════════════
 * 
 * BAD APPROACH (Scattered):
 * // In 10 different components:
 * axios.post('http://localhost:5000/api/...', data)
 * 
 * Problems:
 * - Hardcoded URLs everywhere
 * - Forget to add auth token
 * - Inconsistent error handling
 * 
 * GOOD APPROACH (Centralized):
 * // Configure once here, use everywhere
 * import api from './api';
 * api.post('/chat/new', data);  // Automatically includes token!
 */

import axios, { AxiosError } from 'axios';

// ═══════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 70000, // 70 seconds (roadmap generation can be slow)
  headers: {
    'Content-Type': 'application/json'
  }
});

// ═══════════════════════════════════════════════════════════════════
// REQUEST INTERCEPTOR
// ═══════════════════════════════════════════════════════════════════

/**
 * CONCEPT: Interceptors
 * 
 * Interceptors are functions that run BEFORE request is sent
 * or AFTER response is received.
 * 
 * Use cases:
 * - Add auth token to every request automatically
 * - Log all requests for debugging
 * - Transform request data
 */

api.interceptors.request.use(
  (config) => {
    // Get token from localStorage
    const token = localStorage.getItem('token');
    
    // Add token to Authorization header if it exists
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Debug logging (only in development)
    if (import.meta.env.DEV) {
      console.log('🚀 API Request:', {
        method: config.method?.toUpperCase(),
        url: config.url,
        data: config.data,
        headers: {
          ...config.headers,
          Authorization: token ? `Bearer ${token.substring(0, 20)}...` : 'None'
        }
      });
    }
    
    return config;
  },
  (error) => {
    console.error('❌ Request Error:', error);
    return Promise.reject(error);
  }
);

// ═══════════════════════════════════════════════════════════════════
// RESPONSE INTERCEPTOR
// ═══════════════════════════════════════════════════════════════════

/**
 * Handles all responses and errors globally
 */

api.interceptors.response.use(
  (response) => {
    // Debug logging (only in development)
    if (import.meta.env.DEV) {
      console.log('✅ API Response:', {
        status: response.status,
        url: response.config.url,
        data: response.data
      });
    }
    
    return response;
  },
  (error: AxiosError) => {
    // Enhanced error handling
    console.error('❌ API Error:', {
      message: error.message,
      status: error.response?.status,
      url: error.config?.url,
      data: error.response?.data
    });
    
    // Handle specific error cases
    if (error.response) {
      // Server responded with error status
      const status = error.response.status;
      
      if (status === 401) {
        // Unauthorized - token expired or invalid
        console.warn('🔐 Authentication failed. Clearing session...');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        // Redirect to login (if not already there)
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/';
        }
      } else if (status === 404) {
        console.error('🔍 Resource not found');
      } else if (status === 500) {
        console.error('💥 Server error');
      }
    } else if (error.request) {
      // Request made but no response
      console.error('📡 No response from server. Is it running?');
    } else {
      // Something else happened
      console.error('⚠️ Request setup error:', error.message);
    }
    
    return Promise.reject(error);
  }
);

// ═══════════════════════════════════════════════════════════════════
// API METHODS
// ═══════════════════════════════════════════════════════════════════

/**
 * CONCEPT: API Abstraction Layer
 * 
 * Instead of using axios directly, we create typed functions
 * This provides:
 * - Type safety (TypeScript)
 * - Consistent error handling
 * - Easy to mock for testing
 */

export const authAPI = {
  register: (name: string, email: string, password: string) =>
    api.post('/api/auth/register', { name, email, password }),
  
  login: (email: string, password: string) =>
    api.post('/api/auth/login', { email, password }),
  
  getCurrentUser: () =>
    api.get('/api/auth/me')
};

export const chatAPI = {
  createChat: (title?: string) =>
    api.post('/api/chat/new', { title }),
  
  sendMessage: (chatId: string, message: string) =>
    api.post(`/api/chat/${chatId}/message`, { message }),
  
  getChat: (chatId: string) =>
    api.get(`/api/chat/${chatId}`),
  
  getAllChats: () =>
    api.get('/api/chat'),
  
  generateRoadmap: (chatId: string) =>
    api.post(`/api/chat/${chatId}/generate-roadmap`),
  
  deleteChat: (chatId: string) =>
    api.delete(`/api/chat/${chatId}`)
};

export const roadmapAPI = {
  getAllRoadmaps: () =>
    api.get('/api/roadmap'),
  
  getRoadmap: (roadmapId: string) =>
    api.get(`/api/roadmap/${roadmapId}`),
  
  deleteRoadmap: (roadmapId: string) =>
    api.delete(`/api/roadmap/${roadmapId}`),
  
  archiveRoadmap: (roadmapId: string) =>
    api.put(`/api/roadmap/${roadmapId}/archive`)
};

export const progressAPI = {
  toggleProgress: (roadmapId: string, topicId: string, topicIdentifier: string) =>
    api.post('/api/progress/toggle', { roadmapId, topicId, topicIdentifier }),
  
  getRoadmapProgress: (roadmapId: string) =>
    api.get(`/api/progress/roadmap/${roadmapId}`),
  
  getUserStats: () =>
    api.get('/api/progress/stats'),
  
  updateNotes: (progressId: string, notes: string) =>
    api.put(`/api/progress/${progressId}/notes`, { notes }),
  
  updateRating: (progressId: string, rating: number) =>
    api.put(`/api/progress/${progressId}/rating`, { rating })
};

// Export axios instance as default
export default api;
