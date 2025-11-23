import React from 'react';
import { MessageSquare, Map, LayoutDashboard, LogOut, Plus, History } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Sidebar.css';

/**
 * Sidebar.tsx - Main Navigation Component
 * 
 * LEARNING OBJECTIVES:
 * 1. Navigation layout patterns
 * 2. Active state styling
 * 3. User session management (Logout)
 */

const Sidebar = () => {
  const { logout, user } = useAuth();

  return (
    <aside className="sidebar">
      {/* New Chat Button */}
      <div className="sidebar-header">
        <button className="new-chat-btn">
          <Plus size={20} />
          <span>New Chat</span>
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="sidebar-nav">
        <div className="nav-section">
          <span className="nav-label">Menu</span>
          <a href="#" className="nav-item active">
            <MessageSquare size={18} />
            <span>Chat</span>
          </a>
          <a href="#" className="nav-item">
            <Map size={18} />
            <span>Roadmaps</span>
          </a>
          <a href="#" className="nav-item">
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </a>
        </div>

        {/* History Section (Mock Data for now) */}
        <div className="nav-section">
          <span className="nav-label">Recent</span>
          <div className="history-list">
            <button className="history-item">
              <History size={14} />
              <span>React Learning Path</span>
            </button>
            <button className="history-item">
              <History size={14} />
              <span>DSA Arrays</span>
            </button>
            <button className="history-item">
              <History size={14} />
              <span>System Design</span>
            </button>
          </div>
        </div>
      </nav>

      {/* User Profile / Footer */}
      <div className="sidebar-footer">
        <div className="user-profile">
          <div className="avatar">
            {user?.name?.charAt(0) || 'U'}
          </div>
          <div className="user-info">
            <span className="user-name">{user?.name || 'Guest'}</span>
            <span className="user-email">{user?.email || 'Sign in to save'}</span>
          </div>
        </div>
        <button onClick={logout} className="logout-btn" title="Sign Out">
          <LogOut size={18} />
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
