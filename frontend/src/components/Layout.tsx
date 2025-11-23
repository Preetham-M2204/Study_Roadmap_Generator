import React from 'react';
import Sidebar from './Sidebar';
import ChatInterface from './ChatInterface';
import LoginModal from './LoginModal';
import { useAuth } from '../context/AuthContext';
import './Layout.css';

/**
 * Layout.tsx - Main Application Shell
 * 
 * LEARNING OBJECTIVES:
 * 1. Composition of major UI blocks (Sidebar + Main)
 * 2. Conditional rendering of Modals
 * 3. Responsive layout handling
 */

const Layout = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div className="loading-screen">Loading...</div>;
  }

  return (
    <div className="app-layout">
      {/* Sidebar - Always visible on desktop, hidden on mobile (TODO: Add mobile toggle) */}
      <div className="layout-sidebar">
        <Sidebar />
      </div>

      {/* Main Content Area */}
      <div className="layout-main">
        <ChatInterface />
      </div>

      {/* Login Modal Overlay - Shows if not authenticated */}
      {!isAuthenticated && <LoginModal />}
    </div>
  );
};

export default Layout;
