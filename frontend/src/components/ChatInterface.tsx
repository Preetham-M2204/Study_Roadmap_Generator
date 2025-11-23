import React, { useState } from 'react';
import { Send, Sparkles } from 'lucide-react';
import './ChatInterface.css';

/**
 * ChatInterface.tsx - Main Chat Area
 * 
 * LEARNING OBJECTIVES:
 * 1. Chat UI layout (messages area + input area)
 * 2. Auto-growing text input
 * 3. Message rendering
 */

const ChatInterface = () => {
  const [input, setInput] = useState('');

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    // TODO: Implement chat logic
    console.log('Sending:', input);
    setInput('');
  };

  return (
    <main className="chat-interface">
      {/* Empty State / Welcome Screen */}
      <div className="chat-welcome">
        <div className="welcome-icon">
          <Sparkles size={48} />
        </div>
        <h1>What do you want to learn today?</h1>
        <p>I can help you create a personalized roadmap for any topic.</p>
        
        <div className="suggestion-grid">
          <button className="suggestion-card">
            <h3>Learn React</h3>
            <p>From basics to advanced hooks</p>
          </button>
          <button className="suggestion-card">
            <h3>Master DSA</h3>
            <p>Arrays, Trees, Graphs & DP</p>
          </button>
          <button className="suggestion-card">
            <h3>System Design</h3>
            <p>Scalability, Load Balancing</p>
          </button>
          <button className="suggestion-card">
            <h3>Python for AI</h3>
            <p>NumPy, Pandas, PyTorch</p>
          </button>
        </div>
      </div>

      {/* Input Area */}
      <div className="chat-input-container">
        <form onSubmit={handleSend} className="chat-input-wrapper">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a topic (e.g., 'I want to learn Machine Learning')..."
            className="chat-input"
          />
          <button type="submit" className="send-btn" disabled={!input.trim()}>
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
