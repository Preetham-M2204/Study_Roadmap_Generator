/**
 * Dashboard.jsx - Main Application Dashboard
 * 
 * LEARNING OBJECTIVES:
 * 1. Protected route (requires authentication)
 * 2. Reading token from localStorage
 * 3. Redirecting if not authenticated
 * 4. useEffect hook for side effects
 * 
 * WHAT THIS FILE DOES:
 * - Checks if user is logged in (has token)
 * - Redirects to login if no token
 * - Displays welcome message and logout button
 * - (Will add chat interface in next step)
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';

const Dashboard = () => {
  const navigate = useNavigate();
  
  /**
   * State to store user data from localStorage
   */
  const [user, setUser] = useState(null);

  /**
   * CONCEPT: useEffect Hook
   * 
   * Runs code AFTER component renders
   * Used for side effects (fetch data, check auth, subscriptions)
   * 
   * useEffect(function, dependencies)
   * - function: Code to run
   * - dependencies: When to run ([] = only once on mount)
   */
  useEffect(() => {
    // Check if user is authenticated
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token) {
      // No token = not logged in → redirect to login
      navigate('/login');
    } else {
      // Parse user data from JSON string
      setUser(JSON.parse(userData));
    }
  }, []); // Empty array = run only once when component mounts

  /**
   * FUNCTION: Handle logout
   * 
   * Clears token and user data from localStorage
   * Redirects to login page
   */
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  /**
   * Show loading while checking authentication
   */
  if (!user) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-content">
          <h1 className="header-title">AI Roadmap</h1>
          <div className="header-actions">
            <span className="user-name">Welcome, {user.name}</span>
            <button onClick={handleLogout} className="logout-button">
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="dashboard-main">
        <div className="welcome-card">
          <h2 className="welcome-title">Welcome to AI Roadmap</h2>
          <p className="welcome-text">
            Your personalized learning assistant is ready to help you master any topic.
          </p>
          <p className="welcome-subtitle">
            Chat interface coming next...
          </p>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
