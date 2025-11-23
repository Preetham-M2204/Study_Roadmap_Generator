/**
 * App.tsx - Main React Application Component
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
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout';
import './App.css';

/**
 * CONCEPT: Context Provider Wrapping
 * 
 * We wrap the entire app in AuthProvider so that
 * ANY component can access user state (login/logout)
 */

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Main Route - Renders the App Shell */}
          <Route path="/" element={<Layout />} />
          
          {/* Redirect any other path to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
