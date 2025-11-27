import React, { useState } from 'react';
import Sidebar from './Sidebar';
import ChatInterface from './ChatInterface';
import RoadmapView from './RoadmapView';
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
 * 4. View navigation (Chat, Roadmaps, Dashboard)
 */

type ViewType = 'chat' | 'roadmaps' | 'dashboard' | 'roadmap-detail';

interface ViewState {
  type: ViewType;
  data?: any; // For passing data like roadmapId, chatId
}

const Layout = () => {
  const { isAuthenticated, loading } = useAuth();
  const [currentView, setCurrentView] = useState<ViewState>({ type: 'chat', data: { chatId: null } });
  const [sidebarRefreshTrigger, setSidebarRefreshTrigger] = useState(0);
  const [chatKey, setChatKey] = useState(0); // Force ChatInterface to remount on "New Chat"

  const DEBUG = import.meta.env.VITE_DEBUG === 'true';
  const log = (...args: any[]) => { if (DEBUG) console.log('[Layout]', ...args); };

  // Trigger sidebar data refresh without remounting
  const refreshSidebar = () => {
    log('Triggering sidebar refresh...');
    setSidebarRefreshTrigger(prev => prev + 1);
  };

  if (loading) {
    return <div className="loading-screen">Loading...</div>;
  }

  // Navigation handlers
  const navigateToChat = (chatId?: string) => {
    log('Navigating to Chat', chatId ? `(loading chat: ${chatId})` : '(new chat)');
    // If no chatId (new chat), increment key to force remount
    if (!chatId) {
      setChatKey(prev => prev + 1);
    }
    setCurrentView({ type: 'chat', data: { chatId: chatId || null } });
  };

  const navigateToRoadmaps = () => {
    log('Navigating to Roadmaps');
    setCurrentView({ type: 'roadmaps' });
  };

  const navigateToDashboard = () => {
    log('Navigating to Dashboard');
    setCurrentView({ type: 'dashboard' });
  };

  const navigateToRoadmapDetail = (roadmapId: string) => {
    log('Navigating to Roadmap Detail:', roadmapId);
    setCurrentView({ type: 'roadmap-detail', data: { roadmapId } });
  };

  // Render current view
  const renderMainContent = () => {
    switch (currentView.type) {
      case 'chat':
        return <ChatInterface key={chatKey} chatId={currentView.data?.chatId} onChatCreated={refreshSidebar} />;
      
      case 'roadmap-detail':
        return (
          <RoadmapView 
            roadmapId={currentView.data?.roadmapId} 
            onBack={navigateToChat}
          />
        );
      
      case 'roadmaps':
        return (
          <div className="view-container">
            <h1>Your Roadmaps</h1>
            <p>Roadmaps list view coming soon...</p>
            <button onClick={navigateToChat}>Back to Chat</button>
          </div>
        );
      
      case 'dashboard':
        return (
          <div className="view-container">
            <h1>Dashboard</h1>
            <p>Dashboard with stats and analytics coming soon...</p>
            <button onClick={navigateToChat}>Back to Chat</button>
          </div>
        );
      
      default:
        return <ChatInterface />;
    }
  };

  return (
    <div className="app-layout">
      {/* Sidebar with navigation handlers */}
      <div className="layout-sidebar">
        <Sidebar 
          refreshTrigger={sidebarRefreshTrigger}
          onNavigateChat={navigateToChat}
          onNavigateRoadmaps={navigateToRoadmaps}
          onNavigateDashboard={navigateToDashboard}
          onNavigateRoadmapDetail={navigateToRoadmapDetail}
          currentView={currentView.type}
        />
      </div>

      {/* Main Content Area */}
      <div className="layout-main">
        {renderMainContent()}
      </div>

      {/* Login Modal Overlay - Shows if not authenticated */}
      {!isAuthenticated && <LoginModal />}
    </div>
  );
};

export default Layout;
