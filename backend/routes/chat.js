/**
 * chat.js - Chat & Roadmap Generation Routes
 * 
 * LEARNING OBJECTIVES:
 * 1. Multi-turn conversation management
 * 2. Integration with external API (FastAPI RAG service)
 * 3. Complex business logic (when to trigger roadmap)
 * 4. Error handling for external dependencies
 * 
 * ═══════════════════════════════════════════════════════════════════
 * WHAT THIS FILE DOES:
 * ═══════════════════════════════════════════════════════════════════
 * 
 * Handles the CORE WORKFLOW:
 * 
 * 1. User sends message → Save to chat history
 * 2. Forward to AI → Get response
 * 3. Check if roadmap needed → After 4-5 messages
 * 4. Generate roadmap → Call RAG service
 * 5. Save roadmap → MongoDB
 * 6. Return to frontend → Display results
 * 
 * ═══════════════════════════════════════════════════════════════════
 * ENDPOINTS IN THIS FILE:
 * ═══════════════════════════════════════════════════════════════════
 * 
 * POST   /api/chat/new           - Create new chat session
 * POST   /api/chat/:chatId/message - Send message in existing chat
 * GET    /api/chat/:chatId       - Get chat with all messages
 * GET    /api/chat               - Get all user's chats
 * POST   /api/chat/:chatId/generate-roadmap - Manually trigger roadmap
 * DELETE /api/chat/:chatId       - Delete chat
 */

const express = require('express');
const router = express.Router();
const axios = require('axios');
const Chat = require('../models/Chat');
const Roadmap = require('../models/Roadmap');
const Progress = require('../models/Progress');
const { protect } = require('../middleware/auth');

// ═══════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════

// RAG Service URL (FastAPI backend)
const RAG_SERVICE_URL = process.env.RAG_SERVICE_URL || 'http://localhost:8001';

// Minimum messages before auto-generating roadmap
const MIN_MESSAGES_FOR_ROADMAP = 4;

// ═══════════════════════════════════════════════════════════════════
// HELPER FUNCTION: Call RAG Service
// ═══════════════════════════════════════════════════════════════════

/**
 * CONCEPT: Service Integration
 * 
 * Our Express backend doesn't generate roadmaps itself.
 * It DELEGATES to the specialized RAG service (FastAPI).
 * 
 * Why separate services?
 * - Express: Good at routing, auth, CRUD operations
 * - FastAPI: Good at ML, embeddings, AI generation
 * 
 * Each service does what it's best at!
 */

/**
 * Helper: Add delay to prevent rate limiting
 * @param {number} ms - Milliseconds to wait
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function callRAGGenerate(query, domain = null, numTopics = 15) {
  try {
    console.log(`📡 Calling RAG service: ${RAG_SERVICE_URL}/rag/generate`);
    console.log(`📊 Topic count: ${numTopics}`);
    
    const response = await axios.post(`${RAG_SERVICE_URL}/rag/generate`, {
      query,
      domain,
      num_topics: numTopics
    }, {
      timeout: 90000  // 90 second timeout (roadmap generation takes time)
    });
    
    console.log('✅ RAG service responded successfully');
    return response.data;
    
  } catch (error) {
    console.error('❌ RAG service error:', error.message);
    
    // Provide helpful error message
    if (error.code === 'ECONNREFUSED') {
      throw new Error('RAG service is not running. Please start it on port 8001.');
    } else if (error.response) {
      throw new Error(`RAG service error: ${error.response.data.detail || error.message}`);
    } else {
      throw new Error('Failed to connect to RAG service');
    }
  }
}

/**
 * Helper: Generate smart chat title from first message (like ChatGPT)
 * 
 * Extracts key learning goal and creates concise title
 * Example: "I want to learn DSA in 3 weeks" → "Learn DSA in 3 weeks"
 */
function generateSmartTitle(firstMessage) {
  // Remove common filler words and extract core intent
  let title = firstMessage
    .replace(/^(hi|hello|hey|yo)[,\s]*/i, '')
    .replace(/please/gi, '')
    .replace(/i want to learn/gi, 'Learn')
    .replace(/i need to learn/gi, 'Learn')
    .replace(/can you help me (learn|with)/gi, 'Learn')
    .replace(/i'm trying to learn/gi, 'Learn')
    .trim();
  
  // Capitalize first letter
  title = title.charAt(0).toUpperCase() + title.slice(1);
  
  // Limit length (ChatGPT-style)
  if (title.length > 50) {
    title = title.substring(0, 47) + '...';
  }
  
  // Fallback if title is too short or empty
  if (title.length < 3) {
    title = 'New Learning Path';
  }
  
  return title;
}

/**
 * Helper: Build context from chat history for AI
 * 
 * Takes recent messages and formats them for better AI understanding
 */
function buildContextFromMessages(messages, limit = 10) {
  // Get last N messages
  const recentMessages = messages.slice(-limit);
  
  // Format as conversation string
  const contextParts = recentMessages.map(msg => {
    if (msg.role === 'user') {
      return `User: ${msg.content}`;
    } else if (msg.role === 'assistant') {
      return `Assistant: ${msg.content}`;
    }
    return '';
  }).filter(Boolean);
  
  return contextParts.join('\n');
}

// ═══════════════════════════════════════════════════════════════════
// ROUTE 1: CREATE NEW CHAT SESSION
// ═══════════════════════════════════════════════════════════════════

/**
 * POST /api/chat/new
 * 
 * Creates a new chat session for the user
 * 
 * Request body: (optional)
 * {
 *   "title": "Learn DSA"
 * }
 * 
 * Response:
 * {
 *   "chat": { id, title, messages: [], ... }
 * }
 */
router.post('/new', protect, async (req, res) => {
  try {
    const { title } = req.body;
    
    // Create new chat document
    const chat = new Chat({
      userId: req.user._id,
      title: title || 'New Chat',
      messages: [],
      roadmapGenerated: false
    });
    
    await chat.save();
    
    console.log(`✅ New chat created: ${chat._id}`);
    
    res.status(201).json({
      success: true,
      chat: chat.toPublicJSON()
    });
    
  } catch (error) {
    console.error('❌ Error creating chat:', error);
    res.status(500).json({
      error: 'Failed to create chat session',
      details: error.message
    });
  }
});

// ═══════════════════════════════════════════════════════════════════
// ROUTE 2: SEND MESSAGE IN CHAT
// ═══════════════════════════════════════════════════════════════════

/**
 * POST /api/chat/:chatId/message
 * 
 * Send a message in existing chat and get AI response
 * 
 * THIS IS THE MAIN ENDPOINT FOR CONVERSATION!
 * 
 * Flow:
 * 1. Save user's message
 * 2. Check if roadmap should be generated (after 4-5 messages)
 * 3. If yes: Generate roadmap, return special response
 * 4. If no: Generate simple AI reply, continue conversation
 * 
 * Request body:
 * {
 *   "message": "I want to learn DSA"
 * }
 * 
 * Response (Normal conversation):
 * {
 *   "message": { role: 'assistant', content: '...', timestamp: '...' },
 *   "shouldGenerateRoadmap": false
 * }
 * 
 * Response (Roadmap trigger):
 * {
 *   "message": { role: 'assistant', content: 'Generating roadmap...', ... },
 *   "shouldGenerateRoadmap": true,
 *   "roadmap": { ... full roadmap data ... }
 * }
 */
router.post('/:chatId/message', protect, async (req, res) => {
  try {
    const { chatId } = req.params;
    const { message } = req.body;
    
    // Validation
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    // Find chat and verify ownership
    const chat = await Chat.findOne({ _id: chatId, userId: req.user._id });
    
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }
    
    console.log(`💬 Message received in chat ${chatId}`);
    
    // ═══════════════════════════════════════════════════════════════
    // STEP 1: Save user's message & Generate Smart Title
    // ═══════════════════════════════════════════════════════════════
    
    await chat.addMessage('user', message);
    
    // Generate smart title from first message (like ChatGPT)
    if (chat.messages.filter(m => m.role === 'user').length === 1) {
      // Extract key learning goal from first message
      const smartTitle = generateSmartTitle(message);
      chat.title = smartTitle;
      await chat.save();
      console.log(`📝 Smart title generated: "${smartTitle}"`);
    }
    
    // ═══════════════════════════════════════════════════════════════
    // STEP 2: Check if roadmap generation is needed
    // ═══════════════════════════════════════════════════════════════
    
    const userMessageCount = chat.messages.filter(m => m.role === 'user').length;
    const shouldGenerate = chat.shouldGenerateRoadmap();
    
    console.log(`📊 User messages: ${userMessageCount}, Should generate: ${shouldGenerate}`);
    
    if (shouldGenerate) {
      // ═══════════════════════════════════════════════════════════
      // PATH A: GENERATE ROADMAP
      // ═══════════════════════════════════════════════════════════
      
      console.log('🚀 Triggering roadmap generation...');
      
      // Add loading message
      await chat.addMessage(
        'assistant',
        'I have enough information! Let me create a personalized learning roadmap for you. This will take a moment...',
        { type: 'roadmap_trigger', loading: true }
      );
      
      try {
        // Build comprehensive query from conversation
        const conversationContext = buildContextFromMessages(chat.messages);
        
        // Call RAG service to generate roadmap (dynamic topic count)
        console.log('📡 Calling RAG service for roadmap generation...');
        console.log('Context:', conversationContext.substring(0, 200) + '...');
        
        // Use null for numTopics to let dynamic allocation decide
        const ragResponse = await callRAGGenerate(conversationContext, null, null);
        
        console.log('✅ RAG service responded');
        console.log('Response type:', typeof ragResponse);
        console.log('Response keys:', Object.keys(ragResponse || {}));
        
        // Save roadmap to database
        console.log('💾 Saving roadmap to database...');
        const roadmap = await Roadmap.createFromRAG(
          req.user._id,
          chat._id,
          ragResponse
        );
        
        // Sync roadmap title with chat title (keep duo together)
        roadmap.title = chat.title;
        await roadmap.save();
        console.log(`🔗 Synced roadmap title with chat: "${chat.title}"`);
        console.log(`📊 Data Source: RAG (Retrieved from LanceDB + Gemini)`);
        
        // Update chat with roadmap info
        chat.roadmapGenerated = true;
        chat.roadmapId = roadmap._id;
        await chat.save();
        
        // Add success message
        await chat.addMessage(
          'assistant',
          `Perfect! I've created your personalized roadmap: "${roadmap.title}". It contains ${roadmap.totalTopics} topics organized into ${roadmap.phases.length} learning phases. Let's get started!`,
          { type: 'roadmap_generated', roadmap_id: roadmap._id.toString() }
        );
        
        console.log('✅ Roadmap generated and saved successfully');
        
        // Return response with roadmap
        return res.json({
          success: true,
          shouldGenerateRoadmap: true,
          roadmap: roadmap.toClientJSON(),
          chat: chat.toPublicJSON(),
          generationSource: 'RAG' // Dev indicator: RAG vs LLM
        });
        
      } catch (ragError) {
        console.error('❌ Roadmap generation failed:', ragError);
        
        // Add error message to chat
        await chat.addMessage(
          'assistant',
          'I encountered an error generating your roadmap. Please try again or rephrase your learning goals.',
          { type: 'error' }
        );
        
        return res.status(500).json({
          error: 'Failed to generate roadmap',
          details: ragError.message
        });
      }
      
    } else {
      // ═══════════════════════════════════════════════════════════
      // PATH B: CONTINUE CONVERSATION WITH GEMINI AI
      // ═══════════════════════════════════════════════════════════
      
      console.log('💬 Continuing conversation with AI...');
      
      // Add 5-second delay to prevent rate limiting
      console.log('⏳ Adding 5-second delay to prevent rate limiting...');
      await delay(5000);
      
      try {
        // Build conversation history for RAG service
        const conversationHistory = chat.messages
          .slice(0, -1) // Exclude the message we just added
          .map(msg => ({
            role: msg.role,
            content: msg.content
          }));
        
        // Call RAG service chat endpoint
        console.log('📡 Calling RAG /chat endpoint...');
        const chatResponse = await axios.post(`${RAG_SERVICE_URL}/chat`, {
          message: message,
          conversation_history: conversationHistory
        }, {
          timeout: 30000  // 30 second timeout
        });
        
        const aiResponse = chatResponse.data.response;
        const shouldGenerateRoadmap = chatResponse.data.should_generate_roadmap;
        const contextCompleteness = chatResponse.data.context_completeness;
        
        console.log(`✅ AI responded | Context: ${(contextCompleteness * 100).toFixed(0)}% | Generate: ${shouldGenerateRoadmap}`);
        
        // Save AI response
        await chat.addMessage('assistant', aiResponse, {
          context_completeness: contextCompleteness,
          should_generate: shouldGenerateRoadmap
        });
        
        // Get the last message (AI's response)
        const lastMessage = chat.messages[chat.messages.length - 1];
        
        // If AI suggests roadmap generation, trigger it
        if (shouldGenerateRoadmap) {
          console.log('🚀 AI suggested roadmap generation - triggering...');
          
          try {
            // Build comprehensive query from conversation
            const conversationContext = buildContextFromMessages(chat.messages);
            
            // Call RAG service to generate roadmap (dynamic topic count)
            console.log('📡 Calling RAG service for roadmap generation...');
            const ragResponse = await callRAGGenerate(conversationContext, null, null);
            
            // Save roadmap to database
            console.log('💾 Saving roadmap to database...');
            const roadmap = await Roadmap.createFromRAG(
              req.user._id,
              chat._id,
              ragResponse
            );
            
            // Sync roadmap title with chat title (keep duo together)
            roadmap.title = chat.title;
            await roadmap.save();
            console.log(`🔗 Synced roadmap title with chat: "${chat.title}"`);
            console.log(`📊 Data Source: RAG (Retrieved from LanceDB + Gemini)`);
            
            // Update chat with roadmap info
            chat.roadmapGenerated = true;
            chat.roadmapId = roadmap._id;
            await chat.save();
            
            // Add success message
            await chat.addMessage(
              'assistant',
              `Perfect! I've created your personalized roadmap: "${roadmap.title}". It contains ${roadmap.totalTopics} topics organized into ${roadmap.phases.length} learning phases. Let's get started!`,
              { type: 'roadmap_generated', roadmap_id: roadmap._id.toString() }
            );
            
            console.log('✅ Roadmap generated and saved successfully');
            
            // Return response with roadmap
            return res.json({
              success: true,
              shouldGenerateRoadmap: true,
              roadmap: roadmap.toClientJSON(),
              chat: chat.toPublicJSON(),
              generationSource: 'RAG' // Dev indicator: RAG vs LLM
            });
            
          } catch (ragError) {
            console.error('❌ Roadmap generation failed:', ragError);
            
            // Add error message to chat
            await chat.addMessage(
              'assistant',
              'I encountered an error generating your roadmap. Please try again or rephrase your learning goals.',
              { type: 'error' }
            );
            
            return res.status(500).json({
              error: 'Failed to generate roadmap',
              details: ragError.message
            });
          }
        }
        
        return res.json({
          success: true,
          message: {
            role: lastMessage.role,
            content: lastMessage.content,
            timestamp: lastMessage.timestamp
          },
          shouldGenerateRoadmap: false,
          contextCompleteness: contextCompleteness
        });
        
      } catch (chatError) {
        console.error('❌ AI chat error:', chatError);
        
        // Fallback to simple response if RAG service fails
        const fallbackResponse = "I'm having trouble connecting to the AI service. Could you tell me more about what you'd like to learn?";
        await chat.addMessage('assistant', fallbackResponse, { type: 'fallback' });
        
        const lastMessage = chat.messages[chat.messages.length - 1];
        
        return res.json({
          success: true,
          message: {
            role: lastMessage.role,
            content: lastMessage.content,
            timestamp: lastMessage.timestamp
          },
          shouldGenerateRoadmap: false
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Error in message route:', error);
    res.status(500).json({
      error: 'Failed to process message',
      details: error.message
    });
  }
});

// ═══════════════════════════════════════════════════════════════════
// ROUTE 3: GET CHAT WITH MESSAGES
// ═══════════════════════════════════════════════════════════════════

/**
 * GET /api/chat/:chatId
 * 
 * Retrieve full chat with all messages
 */
router.get('/:chatId', protect, async (req, res) => {
  try {
    const { chatId } = req.params;
    
    const chat = await Chat.findOne({ _id: chatId, userId: req.user._id });
    
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }
    
    res.json({
      success: true,
      chat: {
        id: chat._id,
        title: chat.title,
        messages: chat.messages,
        roadmapGenerated: chat.roadmapGenerated,
        roadmapId: chat.roadmapId,
        createdAt: chat.createdAt,
        lastMessageAt: chat.lastMessageAt
      }
    });
    
  } catch (error) {
    console.error('❌ Error fetching chat:', error);
    res.status(500).json({
      error: 'Failed to fetch chat',
      details: error.message
    });
  }
});

// ═══════════════════════════════════════════════════════════════════
// ROUTE 4: GET ALL USER'S CHATS
// ═══════════════════════════════════════════════════════════════════

/**
 * GET /api/chat
 * 
 * Get all chats for current user (for sidebar history)
 */
router.get('/', protect, async (req, res) => {
  try {
    const chats = await Chat.findRecentByUser(req.user._id, 50);
    
    // Format for frontend
    const formattedChats = chats.map(chat => ({
      id: chat._id,
      title: chat.title,
      lastMessageAt: chat.lastMessageAt,
      messageCount: chat.messages.length,
      roadmapGenerated: chat.roadmapGenerated,
      // Get preview of last message
      lastMessage: chat.messages.length > 0 
        ? chat.messages[chat.messages.length - 1].content.slice(0, 50) + '...'
        : ''
    }));
    
    res.json({
      success: true,
      chats: formattedChats
    });
    
  } catch (error) {
    console.error('❌ Error fetching chats:', error);
    res.status(500).json({
      error: 'Failed to fetch chats',
      details: error.message
    });
  }
});

// ═══════════════════════════════════════════════════════════════════
// ROUTE 5: DELETE CHAT (and linked roadmap/progress)
// ═══════════════════════════════════════════════════════════════════

/**
 * DELETE /api/chat/:chatId
 * 
 * Delete a chat and its associated roadmap and progress
 */
router.delete('/:chatId', protect, async (req, res) => {
  try {
    const { chatId } = req.params;
    
    // Find chat and verify ownership
    const chat = await Chat.findOne({ _id: chatId, userId: req.user._id });
    
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }
    
    console.log(`Delete chat: ${chat.title}`);
    
    // If chat has roadmap, delete it too
    if (chat.roadmapId) {
      await Roadmap.findByIdAndDelete(chat.roadmapId);
      console.log(`Deleted linked roadmap: ${chat.roadmapId}`);
      
      // Delete all progress for this roadmap
      await Progress.deleteMany({ roadmapId: chat.roadmapId });
      console.log(`Deleted progress records for roadmap`);
    }
    
    // Delete the chat
    await Chat.findByIdAndDelete(chatId);
    console.log(`Chat deleted successfully`);
    
    res.json({
      success: true,
      message: 'Chat and associated data deleted'
    });
    
  } catch (error) {
    console.error('Error deleting chat:', error);
    res.status(500).json({
      error: 'Failed to delete chat',
      details: error.message
    });
  }
});

// ROUTE 6: MANUALLY TRIGGER ROADMAP GENERATION
// ═══════════════════════════════════════════════════════════════════

/**
 * POST /api/chat/:chatId/generate-roadmap
 * 
 * Manually generate roadmap (if user wants it before 4 messages)
 */
router.post('/:chatId/generate-roadmap', protect, async (req, res) => {
  try {
    const { chatId } = req.params;
    
    const chat = await Chat.findOne({ _id: chatId, userId: req.user._id });
    
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }
    
    if (chat.roadmapGenerated) {
      return res.status(400).json({ error: 'Roadmap already generated for this chat' });
    }
    
    // Build query from conversation
    const conversationContext = buildContextFromMessages(chat.messages);
    
    // Generate roadmap
    const ragResponse = await callRAGGenerate(conversationContext, null, 25);
    
    // Save roadmap
    const roadmap = await Roadmap.createFromRAG(req.user._id, chat._id, ragResponse);
    
    // Sync roadmap title with chat title (keep duo together)
    roadmap.title = chat.title;
    await roadmap.save();
    console.log(`🔗 Synced roadmap title with chat: "${chat.title}"`);
    console.log(`📊 Data Source: RAG (Retrieved from LanceDB + Gemini)`);
    
    // Update chat
    chat.roadmapGenerated = true;
    chat.roadmapId = roadmap._id;
    await chat.save();
    
    res.json({
      success: true,
      roadmap: roadmap.toClientJSON(),
      generationSource: 'RAG' // Dev indicator: RAG vs LLM
    });
    
  } catch (error) {
    console.error('❌ Error generating roadmap:', error);
    res.status(500).json({
      error: 'Failed to generate roadmap',
      details: error.message
    });
  }
});
// ═══════════════════════════════════════════════════════════════════
// EXPORT ROUTER
// ═══════════════════════════════════════════════════════════════════

module.exports = router;
