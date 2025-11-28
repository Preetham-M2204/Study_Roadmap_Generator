import React, { useState, useEffect } from 'react';
import { MessageSquare, Map, LayoutDashboard, LogOut, Plus, History, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { chatAPI, roadmapAPI } from '../services/api';
import ThemeToggle from './ThemeToggle';
import './Sidebar.css';

/**
 * Sidebar.tsx - Main Navigation Component
 * 
 * LEARNING OBJECTIVES:
 * 1. Navigation layout patterns
 * 2. Active state styling
 * 3. User session management (Logout)
 * 4. Loading real data from MongoDB
 */

interface Chat {
  id: string;
  _id?: string; // Legacy support
  title: string;
  createdAt: string;
  roadmapGenerated: boolean;
}

interface Roadmap {
  id: string;
  title: string;
  createdAt: string;
  totalTopics: number;
  progress: {
    percentageComplete: number;
  };
}

interface SidebarProps {
  refreshTrigger: number; // Increment to trigger data refresh
  onNavigateChat: (chatId?: string) => void;
  onNavigateRoadmaps: () => void;
  onNavigateDashboard: () => void;
  onNavigateRoadmapDetail: (roadmapId: string) => void;
  currentView: string;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  refreshTrigger,
  onNavigateChat, 
  onNavigateRoadmaps, 
  onNavigateDashboard,
  onNavigateRoadmapDetail,
  currentView
}) => {
  const { logout, user, isAuthenticated, loading: authLoading } = useAuth();
  const [recentChats, setRecentChats] = useState<Chat[]>([]);
  const [recentRoadmaps, setRecentRoadmaps] = useState<Roadmap[]>([]);
  const [loading, setLoading] = useState(true);
  const [chatsExpanded, setChatsExpanded] = useState(true);
  const [roadmapsExpanded, setRoadmapsExpanded] = useState(true);
  const mountedRef = React.useRef(false);
  const loadingRef = React.useRef(false);

  const DEBUG = import.meta.env.VITE_DEBUG === 'true';
  const log = (...args: any[]) => { if (DEBUG) console.log('[Sidebar]', ...args); };

  // Move loadRecentData BEFORE useEffect to avoid dependency issues
  // Use a ref guard to prevent duplicate calls (React StrictMode or rapid refreshes)
  const loadRecentData = async () => {
    // If a load is already in flight, skip to avoid duplicate network calls
    if (loadingRef.current) {
      log('loadRecentData: already loading — skipping duplicate call');
      return;
    }

    loadingRef.current = true;
    try {
      setLoading(true);

      // Load chats and roadmaps in parallel
      const [chatsResponse, roadmapsResponse] = await Promise.all([
        chatAPI.getAllChats(),
        roadmapAPI.getAllRoadmaps()
      ]);

      const chats = chatsResponse.data.chats || [];
      const roadmaps = roadmapsResponse.data.roadmaps || [];

      // Take last 3 of each
      setRecentChats(chats.slice(0, 3));
      setRecentRoadmaps(roadmaps.slice(0, 3));

      log('Loaded recent data:', { chats: chats.length, roadmaps: roadmaps.length });
    } catch (error: any) {
      log('Error loading recent data:', error);
      // Prevent infinite loop on error
      setRecentChats([]);
      setRecentRoadmaps([]);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  };

  // Load recent chats and roadmaps on mount ONLY when auth is ready and user is authenticated
  useEffect(() => {
    // Prevent double-invocation in React StrictMode (dev)
    if (mountedRef.current) return;
    mountedRef.current = true;

    // If auth is still initializing, wait until it's finished
    if (authLoading) {
      // Do nothing now; another effect (below) will run when authLoading changes
      return;
    }

    // Only load recent data if user is authenticated
    if (isAuthenticated) {
      loadRecentData();
    } else {
      // Ensure empty state for unauthenticated users
      setRecentChats([]);
      setRecentRoadmaps([]);
      setLoading(false);
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, isAuthenticated]); // Run when auth state is resolved

  // Reload data when refreshTrigger changes — only when authenticated
  useEffect(() => {
    if (refreshTrigger > 0) {
      log('Refresh triggered, reloading data...');
      if (isAuthenticated) loadRecentData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger, isAuthenticated]); // Only depend on refreshTrigger and auth

  const handleNewChat = () => {
    onNavigateChat(); // No chatId = new chat
    loadRecentData(); // Refresh sidebar data
  };

  const handleDeleteChat = async (chatId: string) => {
    if (!confirm('Delete this chat? This will also delete the linked roadmap and progress.')) {
      return;
    }
    
    try {
      log('Deleting chat:', chatId);
      await chatAPI.deleteChat(chatId);
      log('Chat deleted successfully');
      
      // Refresh sidebar data
      loadRecentData();
      
      // Navigate to new chat if we're currently viewing the deleted chat
      onNavigateChat();
    } catch (error: any) {
      console.error('Failed to delete chat:', error);
      alert('Failed to delete chat: ' + (error.response?.data?.error || error.message));
    }
  };

  return (
    <aside className="sidebar">
      {/* New Chat Button */}
      <div className="sidebar-header">
        <button className="new-chat-btn" onClick={handleNewChat}>
          <Plus size={20} />
          <span>New Chat</span>
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="sidebar-nav">
        <div className="nav-section">
          <span className="nav-label">Menu</span>
          <button 
            className={`nav-item ${currentView === 'chat' ? 'active' : ''}`}
            onClick={() => onNavigateChat()}
          >
            <MessageSquare size={18} />
            <span>Chat</span>
          </button>
        </div>

        {/* Recent Chats Section */}
        <div className="nav-section">
          <button 
            className="nav-label-btn"
            onClick={() => setChatsExpanded(!chatsExpanded)}
          >
            <span className="nav-label">Recent Chats</span>
            {chatsExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {chatsExpanded && (
            <div className="history-list">
              {loading ? (
                <div className="history-loading">Loading...</div>
              ) : recentChats.length > 0 ? (
                recentChats.map(chat => (
                  <div 
                    key={chat.id} 
                    className="history-item"
                    onClick={() => onNavigateChat(chat.id)}
                  >
                    <div className="history-item-content">
                      <History size={16} />
                      <span className="history-title">{chat.title}</span>
                    </div>
                    <button
                      className="delete-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteChat(chat.id);
                      }}
                      title="Delete chat"
                      aria-label="Delete chat"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))
              ) : (
                <div className="history-empty">No recent chats</div>
              )}
            </div>
          )}
        </div>

        {/* Recent Roadmaps Section */}
        <div className="nav-section">
          <button 
            className="nav-label-btn"
            onClick={() => setRoadmapsExpanded(!roadmapsExpanded)}
          >
            <span className="nav-label">Recent Roadmaps</span>
            {roadmapsExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {roadmapsExpanded && (
            <div className="history-list">
              {loading ? (
                <div className="history-loading">Loading...</div>
              ) : recentRoadmaps.length > 0 ? (
                recentRoadmaps.map(roadmap => (
                  <div 
                    key={roadmap.id} 
                    className="history-item"
                    onClick={() => onNavigateRoadmapDetail(roadmap.id)}
                    title={roadmap.title}
                  >
                    <div className="history-item-content">
                      <Map size={16} />
                      <span className="history-title">{roadmap.title}</span>
                    </div>
                    <span className="progress-badge">{roadmap.progress?.percentageComplete || 0}%</span>
                  </div>
                ))
              ) : (
                <div className="history-empty">No roadmaps yet</div>
              )}
            </div>
          )}
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
        <div style={{ display: 'flex', gap: '8px' }}>
          <ThemeToggle />
          <button onClick={logout} className="logout-btn" title="Sign Out">
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
