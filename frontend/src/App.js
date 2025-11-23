/**
 * App.js - Main React Application Component
 * 
 * LEARNING OBJECTIVES:
 * 1. React Router for navigation
 * 2. Route configuration
 * 3. Component composition
 * 
 * WHAT THIS FILE DOES:
 * - Sets up routing between pages (Login, Dashboard)
 * - Defines which component shows for each URL
 * - Acts as main entry point for React app
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import './App.css';

/**
 * CONCEPT: React Router
 * 
 * Handles navigation in single-page applications
 * Changes URL without page refresh
 * 
 * Components:
 * - BrowserRouter: Enables routing (renamed as Router)
 * - Routes: Container for all routes
 * - Route: Defines path → component mapping
 * - Navigate: Programmatic redirect
 */

function App() {
  return (
    <Router>
      {/**
       * Routes component contains all route definitions
       * React Router v6 syntax (newer version)
       */}
      <Routes>
        {/* Root redirect to login */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        
        {/* Login page route */}
        <Route path="/login" element={<Login />} />
        
        {/* Dashboard page route (protected) */}
        <Route path="/dashboard" element={<Dashboard />} />
        
        {/* Catch-all route (404) */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
