import React, { useState, useEffect, useRef } from 'react';
import { Send, Sparkles, Loader2, Bot, User as UserIcon } from 'lucide-react';
import './ChatInterface.css';
import { chatAPI } from '../services/api';
import RoadmapView from './RoadmapView';

/**
 * ChatInterface.tsx - Main Chat Area (BACKEND INTEGRATED)
 * 
 * LEARNING OBJECTIVES:
 * 1. HTTP requests to backend (chat creation, message sending)
 * 2. State management for conversation history
 * 3. Loading states and error handling
 * 4. Auto-scrolling messages
 * 5. Conditional rendering (welcome screen vs chat)
 * 
 * ═══════════════════════════════════════════════════════════════
 * WORKFLOW:
 * ═══════════════════════════════════════════════════════════════
 * 
 * 1. Component mounts → Check if chat exists
 * 2. User types message → handleSend()
 * 3. Send to backend → POST /api/chat/:chatId/message
 * 4. Receive AI response → Add to messages[]
 * 5. After 4 messages → Backend triggers roadmap generation
 * 6. Display roadmap → (Next: RoadmapView component)
 */

// Message type definition
interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  metadata?: {
    type?: string;
    loading?: boolean;
    roadmap_id?: string;
  };
}

// Chat type definition
interface Chat {
  id: string;
  title: string;
  messages: Message[];
  roadmapGenerated: boolean;
  roadmapId?: string;
}

interface ChatInterfaceProps {
  chatId?: string | null; // If provided, load this chat. If null/undefined, start fresh
  onChatCreated?: () => void; // Callback when new chat is created (to refresh sidebar)
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ chatId: propChatId, onChatCreated }) => {
  // ═══════════════════════════════════════════════════════════════
  // STATE MANAGEMENT
  // ═══════════════════════════════════════════════════════════════
  
  const [input, setInput] = useState('');
  const [currentChat, setCurrentChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingChat, setLoadingChat] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedRoadmapId, setGeneratedRoadmapId] = useState<string | null>(null);
  const [generatingRoadmap, setGeneratingRoadmap] = useState(false);
  
  // Ref for auto-scrolling to bottom
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Debug mode
  const DEBUG = import.meta.env.VITE_DEBUG === 'true';
  const log = (...args: any[]) => { if (DEBUG) console.log('[ChatInterface]', ...args); };

  // ═══════════════════════════════════════════════════════════════
  // LOAD CHAT IF CHAT ID PROVIDED
  // ═══════════════════════════════════════════════════════════════
  
  useEffect(() => {
    if (propChatId) {
      loadExistingChat(propChatId);
    } else {
      // Reset for new chat
      setCurrentChat(null);
      setMessages([]);
      setGeneratedRoadmapId(null);
      setError(null);
      log('Starting fresh chat');
    }
  }, [propChatId]);

  const loadExistingChat = async (chatId: string) => {
    try {
      setLoadingChat(true);
      setError(null);
      log('Loading chat:', chatId);
      
      const response = await chatAPI.getChat(chatId);
      const chat = response.data.chat;
      
      setCurrentChat(chat);
      setMessages(chat.messages || []);
      // Don't auto-show roadmap when loading old chat - keep it in chat view
      setGeneratedRoadmapId(null);
      
      log('Chat loaded:', chat.title, 'Messages:', chat.messages?.length);
    } catch (err: any) {
      log('Error loading chat:', err);
      // Don't show error for missing chats - just start fresh
      setCurrentChat(null);
      setMessages([]);
      setGeneratedRoadmapId(null);
      console.warn('Chat not found, starting fresh conversation');
    } finally {
      setLoadingChat(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // AUTO-SCROLL TO BOTTOM WHEN NEW MESSAGES ARRIVE
  // ═══════════════════════════════════════════════════════════════
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ═══════════════════════════════════════════════════════════════
  // CREATE CHAT SESSION ON FIRST MESSAGE
  // ═══════════════════════════════════════════════════════════════
  
  const createChatSession = async () => {
    try {
      log('Creating new chat session...');
      const response = await chatAPI.createChat('New Learning Path');
      setCurrentChat(response.data.chat);
      log('Chat created:', response.data.chat.id);
      return response.data.chat.id;
    } catch (err: any) {
      log('Error creating chat:', err);
      throw new Error(err.response?.data?.error || 'Failed to create chat');
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // HANDLE SEND MESSAGE
  // ═══════════════════════════════════════════════════════════════
  
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    
    const userMessage = input.trim();
    setInput('');
    setError(null);
    setLoading(true);

    try {
      // Create chat if doesn't exist
      let chatId = currentChat?.id;
      if (!chatId) {
        chatId = await createChatSession();
      }

      // Ensure chatId exists
      if (!chatId) {
        throw new Error('Failed to create chat session');
      }

      log('Sending message:', userMessage);

      // Add user message to UI immediately (optimistic update)
      const tempUserMsg: Message = {
        role: 'user',
        content: userMessage,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, tempUserMsg]);

      // Send to backend
      const response = await chatAPI.sendMessage(chatId, userMessage);
      log('Backend response:', response.data);
      
      // If this was the first message, notify parent to refresh sidebar (new title generated)
      if (messages.length === 1 && onChatCreated) {
        log('📝 First message sent, refreshing sidebar for new title');
        onChatCreated();
      }

      // Check if roadmap was generated
      if (response.data.shouldGenerateRoadmap) {
        log('🎉 Roadmap generation triggered!');
        log('📊 Roadmap data:', response.data.roadmap);
        
        // DEV: Log generation source (RAG vs LLM)
        if (response.data.generationSource) {
          console.log(`%c📡 Generation Source: ${response.data.generationSource}`, 'color: #3b82f6; font-weight: bold; font-size: 14px');
          console.log('%cRAG = Retrieval-Augmented Generation (LanceDB + Gemini)', 'color: #6b7280; font-style: italic');
        }
        
        // Backend returns 'id' (not '_id') in toClientJSON()
        const roadmapId = response.data.roadmap.id;
        log('🆔 Roadmap ID:', roadmapId);
        
        // Show generating state
        setGeneratingRoadmap(true);
        
        // Add success message
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `✨ Perfect! I've created your personalized roadmap: "${response.data.roadmap.title}". Loading it now...`,
          timestamp: new Date().toISOString(),
          metadata: { type: 'roadmap_generated', roadmap_id: roadmapId }
        }]);
        
        // Smooth transition delay (let user see success message)
        setTimeout(() => {
          setGeneratedRoadmapId(roadmapId);
          setGeneratingRoadmap(false);
          log('✅ Switched to RoadmapView');
        }, 1000);
      } else {
        // Add AI response to messages (normal conversation)
        const aiMessage: Message = {
          role: 'assistant',
          content: response.data.message.content,
          timestamp: response.data.message.timestamp
        };
        setMessages(prev => [...prev, aiMessage]);
      }

    } catch (err: any) {
      log('Error sending message:', err);
      setError(err.response?.data?.error || err.message || 'Failed to send message');
      
      // Add error message to chat
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '❌ Sorry, I encountered an error. Please try again.',
        timestamp: new Date().toISOString(),
        metadata: { type: 'error' }
      }]);
    } finally {
      setLoading(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // HANDLE SUGGESTION CLICK
  // ═══════════════════════════════════════════════════════════════
  
  const handleSuggestionClick = (text: string) => {
    setInput(text);
  };

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════

  // If roadmap was generated, show RoadmapView
  if (generatedRoadmapId) {
    log('✨ Rendering RoadmapView with ID:', generatedRoadmapId);
    return (
      <main className="chat-interface">
        <RoadmapView 
          roadmapId={generatedRoadmapId} 
          onBack={() => {
            // Go back to chat, keep conversation history
            setGeneratedRoadmapId(null);
            log('↩️ Returned to chat interface');
          }}
        />
      </main>
    );
  }

  return (
    <main className="chat-interface">

      {/* Conditional Rendering: Welcome Screen OR Messages */}
      {messages.length === 0 ? (
        // ═══════════════════════════════════════════════════════════
        // WELCOME SCREEN (No messages yet)
        // ═══════════════════════════════════════════════════════════
        <div className="chat-welcome">
          <div className="welcome-icon">
            <Sparkles size={48} />
          </div>
          <h1>What do you want to learn today?</h1>
          <p>I can help you create a personalized roadmap for any topic.</p>
          
          <div className="suggestion-grid">
            <button 
              className="suggestion-card"
              onClick={() => handleSuggestionClick('I want to learn React from beginner to advanced')}
            >
              <h3>Learn React</h3>
              <p>From basics to advanced hooks</p>
            </button>
            <button 
              className="suggestion-card"
              onClick={() => handleSuggestionClick('I want to master Data Structures and Algorithms')}
            >
              <h3>Master DSA</h3>
              <p>Arrays, Trees, Graphs & DP</p>
            </button>
            <button 
              className="suggestion-card"
              onClick={() => handleSuggestionClick('I want to learn System Design')}
            >
              <h3>System Design</h3>
              <p>Scalability, Load Balancing</p>
            </button>
            <button 
              className="suggestion-card"
              onClick={() => handleSuggestionClick('I want to learn Python for AI and Machine Learning')}
            >
              <h3>Python for AI</h3>
              <p>NumPy, Pandas, PyTorch</p>
            </button>
          </div>
        </div>
      ) : (
        // ═══════════════════════════════════════════════════════════
        // MESSAGES AREA (Conversation started)
        // ═══════════════════════════════════════════════════════════
        <div className="messages-container">
          {messages.map((msg, idx) => (
            <div key={idx} className={`message message-${msg.role}`}>
              <div className="message-icon">
                {msg.role === 'user' ? (
                  <UserIcon size={20} />
                ) : (
                  <Bot size={20} />
                )}
              </div>
              <div className="message-content">
                <div className="message-header">
                  <span className="message-role">
                    {msg.role === 'user' ? 'You' : 'AI Assistant'}
                  </span>
                  <span className="message-time">
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div className="message-text">{msg.content}</div>
              </div>
            </div>
          ))}
          
          {/* Loading indicator */}
          {loading && (
            <div className="message message-assistant">
              <div className="message-icon">
                <Bot size={20} />
              </div>
              <div className="message-content">
                <div className="message-header">
                  <span className="message-role">AI Assistant</span>
                </div>
                <div className="message-text">
                  <Loader2 className="spinner" size={16} /> Thinking...
                </div>
              </div>
            </div>
          )}

          {/* Roadmap Generation Loading */}
          {generatingRoadmap && (
            <div className="roadmap-generating">
              <Loader2 className="generating-spinner" size={32} />
              <p>Generating your personalized roadmap...</p>
            </div>
          )}
          
          {/* Auto-scroll anchor */}
          <div ref={messagesEndRef} />
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="error-banner">
          <span>Error: {error}</span>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}



      {/* Input Area (Always visible) */}
      <div className="chat-input-container">
        <form onSubmit={handleSend} className="chat-input-wrapper">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            className="chat-input"
            disabled={loading}
          />
          <button type="submit" className="send-btn" disabled={!input.trim() || loading}>
            <Send size={20} />
          </button>
        </form>
        <p className="disclaimer">
          AI can make mistakes. Please verify important information.
        </p>
      </div>
    </main>
  );
};

export default ChatInterface;
