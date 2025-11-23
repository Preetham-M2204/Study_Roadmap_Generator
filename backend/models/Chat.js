/**
 * Chat.js - MongoDB Schema for Chat Sessions
 * 
 * LEARNING OBJECTIVES:
 * 1. Understanding chat session management
 * 2. Mongoose subdocuments for nested data (messages array)
 * 3. Timestamps for tracking conversation history
 * 
 * ═══════════════════════════════════════════════════════════════════
 * WHAT IS A CHAT SESSION?
 * ═══════════════════════════════════════════════════════════════════
 * 
 * Think of it like a WhatsApp conversation:
 * - Each conversation has multiple messages
 * - You can have multiple conversations (sessions) with the AI
 * - Each session has a title (like "Learn DSA", "System Design")
 * 
 * STRUCTURE:
 * Chat Session (like a folder)
 *   ├─ Message 1: User asks question
 *   ├─ Message 2: AI responds
 *   ├─ Message 3: User follows up
 *   └─ Message 4: AI responds
 * 
 * ═══════════════════════════════════════════════════════════════════
 * WHY STORE CONVERSATIONS?
 * ═══════════════════════════════════════════════════════════════════
 * 
 * 1. Context Memory: AI remembers what you discussed
 * 2. History: View past conversations in sidebar
 * 3. Resume: Continue conversation later
 * 4. Roadmap Trigger: After 4-5 messages, generate roadmap
 */

const mongoose = require('mongoose');

// ═══════════════════════════════════════════════════════════════════
// MESSAGE SUBDOCUMENT SCHEMA
// ═══════════════════════════════════════════════════════════════════

/**
 * CONCEPT: Subdocument
 * 
 * Instead of separate Messages collection, we embed messages
 * inside Chat document. Why?
 * 
 * ✅ Faster queries (one DB call gets everything)
 * ✅ Data locality (messages belong to chat)
 * ✅ Atomic updates (save entire chat in one operation)
 */

const MessageSchema = new mongoose.Schema({
  // Who sent the message?
  role: {
    type: String,
    enum: ['user', 'assistant', 'system'],  // Only these 3 allowed
    required: true
    // 'user' = human typed this
    // 'assistant' = AI generated this
    // 'system' = app notification (e.g., "Roadmap generated")
  },
  
  // Message content
  content: {
    type: String,
    required: true,
    trim: true  // Remove extra whitespace
  },
  
  // When was this sent?
  timestamp: {
    type: Date,
    default: Date.now  // Auto-set to current time
  },
  
  // Optional: Metadata for special messages
  metadata: {
    type: mongoose.Schema.Types.Mixed,  // Can store any JSON structure
    default: {}
    // Examples:
    // { type: 'roadmap_trigger' } - Message that triggered roadmap
    // { loading: true } - Show loading indicator
    // { roadmap_id: '123' } - Link to generated roadmap
  }
}, { 
  _id: true  // Each message gets its own ID
});

// ═══════════════════════════════════════════════════════════════════
// CHAT SESSION SCHEMA
// ═══════════════════════════════════════════════════════════════════

const ChatSchema = new mongoose.Schema({
  // Which user owns this chat?
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',  // Reference to User model
    required: true,
    index: true   // Index for faster queries: "find all chats by user123"
  },
  
  // Chat title (auto-generated from first message or set by user)
  title: {
    type: String,
    default: 'New Chat',
    trim: true,
    maxlength: 100
    // Example: "Learn DSA in 3 Months"
  },
  
  // Array of all messages in this conversation
  messages: [MessageSchema],  // Array of subdocuments
  
  // Has a roadmap been generated for this chat?
  roadmapGenerated: {
    type: Boolean,
    default: false
    // After 4-5 messages, we generate roadmap and set this to true
  },
  
  // If roadmap generated, link to it
  roadmapId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Roadmap',
    default: null
  },
  
  // Is this chat still active or archived?
  status: {
    type: String,
    enum: ['active', 'archived', 'deleted'],
    default: 'active'
  },
  
  // Last activity time (updated every message)
  lastMessageAt: {
    type: Date,
    default: Date.now
  }
  
}, {
  timestamps: true  // Auto-add createdAt and updatedAt fields
});

// ═══════════════════════════════════════════════════════════════════
// INDEXES FOR PERFORMANCE
// ═══════════════════════════════════════════════════════════════════

/**
 * CONCEPT: Database Index
 * 
 * Like a book's index - helps find data faster!
 * 
 * WITHOUT INDEX:
 * "Find all chats by user123" → Check ALL 1 million chats ❌ (slow!)
 * 
 * WITH INDEX:
 * "Find all chats by user123" → Jump directly to user123's chats ✅ (fast!)
 */

// Compound index: userId + lastMessageAt (for "recent chats" query)
ChatSchema.index({ userId: 1, lastMessageAt: -1 });
// 1 = ascending, -1 = descending
// This makes: "Find user123's chats, newest first" VERY fast

// ═══════════════════════════════════════════════════════════════════
// INSTANCE METHODS
// ═══════════════════════════════════════════════════════════════════

/**
 * Add a new message to this chat
 * 
 * Usage:
 *   await chat.addMessage('user', 'I want to learn DSA');
 *   await chat.addMessage('assistant', 'Great! What is your current level?');
 */
ChatSchema.methods.addMessage = async function(role, content, metadata = {}) {
  // Push new message to messages array
  this.messages.push({
    role,
    content,
    metadata,
    timestamp: new Date()
  });
  
  // Update last activity time
  this.lastMessageAt = new Date();
  
  // Auto-generate title from first user message (if still "New Chat")
  if (this.title === 'New Chat' && role === 'user' && this.messages.length === 1) {
    // Use first 50 chars of message as title
    this.title = content.slice(0, 50) + (content.length > 50 ? '...' : '');
  }
  
  // Save to database
  await this.save();
  
  return this;
};

/**
 * Get last N messages (for context window)
 * 
 * WHY?
 * When calling AI, we don't send ALL messages (might be 100+)
 * We send last 10 messages as context
 * 
 * Usage:
 *   const recentMessages = chat.getRecentMessages(10);
 */
ChatSchema.methods.getRecentMessages = function(limit = 10) {
  // Return last N messages
  return this.messages.slice(-limit);
};

/**
 * Check if chat needs roadmap generation
 * 
 * LOGIC:
 * - Must have at least 4 user messages (enough context)
 * - Roadmap not already generated
 * 
 * Usage:
 *   if (chat.shouldGenerateRoadmap()) {
 *     // Trigger roadmap generation
 *   }
 */
ChatSchema.methods.shouldGenerateRoadmap = function() {
  // Count user messages (exclude assistant/system messages)
  const userMessages = this.messages.filter(msg => msg.role === 'user');
  
  // Generate roadmap if:
  // 1. At least 4 user messages (sufficient context)
  // 2. Roadmap not already generated
  return userMessages.length >= 4 && !this.roadmapGenerated;
};

/**
 * Get public-safe representation (exclude sensitive data)
 */
ChatSchema.methods.toPublicJSON = function() {
  return {
    id: this._id,
    title: this.title,
    messageCount: this.messages.length,
    roadmapGenerated: this.roadmapGenerated,
    roadmapId: this.roadmapId,
    status: this.status,
    lastMessageAt: this.lastMessageAt,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

// ═══════════════════════════════════════════════════════════════════
// STATIC METHODS (called on Model, not instance)
// ═══════════════════════════════════════════════════════════════════

/**
 * Find user's recent chats
 * 
 * Usage:
 *   const chats = await Chat.findRecentByUser(userId, 10);
 */
ChatSchema.statics.findRecentByUser = async function(userId, limit = 20) {
  return this.find({ 
    userId, 
    status: { $ne: 'deleted' }  // Exclude deleted chats
  })
    .sort({ lastMessageAt: -1 })  // Newest first
    .limit(limit)
    .select('title lastMessageAt roadmapGenerated messages')  // Only return these fields
    .lean();  // Return plain JS objects (faster)
};

// ═══════════════════════════════════════════════════════════════════
// PRE-SAVE HOOK
// ═══════════════════════════════════════════════════════════════════

/**
 * Runs BEFORE saving to database
 * 
 * Use case: Update lastMessageAt if messages changed
 * 
 * Note: In Mongoose 6.x+, synchronous pre-save hooks don't need next()
 */
ChatSchema.pre('save', function() {
  // If messages array was modified, update lastMessageAt
  if (this.isModified('messages') && this.messages.length > 0) {
    this.lastMessageAt = this.messages[this.messages.length - 1].timestamp;
  }
});

// ═══════════════════════════════════════════════════════════════════
// EXPORT MODEL
// ═══════════════════════════════════════════════════════════════════

module.exports = mongoose.model('Chat', ChatSchema);
