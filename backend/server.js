/**
 * server.js - Express Backend Entry Point
 * 
 * This is the main file that starts the Express server.
 * 
 * What this file does:
 * 1. Load environment variables from .env
 * 2. Connect to MongoDB Atlas
 * 3. Set up Express middleware (CORS, JSON parsing)
 * 4. Define API routes
 * 5. Start server on port 5000
 */

// ============================================
// STEP 1: Import Required Packages
// ============================================

// Load environment variables from root .env file
require('dotenv').config({ path: '../.env' });

const express = require('express');      // Web framework
const cors = require('cors');            // Allow React (port 3000) to call API
const connectDB = require('./config/db'); // MongoDB connection function

// ============================================
// STEP 2: Connect to MongoDB
// ============================================

connectDB(); // Establish MongoDB Atlas connection

// ============================================
// STEP 3: Initialize Express App
// ============================================

const app = express(); // Create Express application

// ============================================
// STEP 4: Middleware Setup
// ============================================

/**
 * Middleware = Functions that run BEFORE your route handlers
 * Think of them as "security guards" or "preprocessors"
 */

// CORS: Allow React frontend to call this API
// Vite dev server runs on port 5173 by default
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173'], // Allow both Create React App and Vite
  credentials: true                 // Allow cookies/auth headers
}));

// JSON Parser: Convert incoming request body to JavaScript object
// Without this, req.body would be undefined
app.use(express.json());

// URL Encoder: Parse form data (if needed)
app.use(express.urlencoded({ extended: true }));

// Logger: Print every incoming request (helpful for debugging)
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} - ${new Date().toISOString()}`);
  next(); // Pass control to next middleware/route
});

// ============================================
// STEP 5: API Routes (TODO: Create these files)
// ============================================

/**
 * Routes define what happens when someone visits a URL
 * Example: POST /api/auth/login → runs login logic
 */

// Health check endpoint (test if server is running)
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    message: 'Express backend is running!',
    timestamp: new Date().toISOString()
  });
});

// Import routes
const authRoutes = require('./routes/auth');
// TODO: Create these route files next
// const chatRoutes = require('./routes/chat');
// const roadmapRoutes = require('./routes/roadmap');
// const progressRoutes = require('./routes/progress');

// Mount routes
app.use('/api/auth', authRoutes);       // /api/auth/register, /api/auth/login, /api/auth/me
// app.use('/api/chat', chatRoutes);       // /api/chat/message
// app.use('/api/roadmap', roadmapRoutes); // /api/roadmap/generate
// app.use('/api/progress', progressRoutes); // /api/progress/:topicId

// ============================================
// STEP 6: Error Handling Middleware
// ============================================

/**
 * This catches any errors that happen in routes
 * Runs if next(error) is called or if route throws error
 */
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// ============================================
// STEP 7: Start Server
// ============================================

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log('\n🚀 ============================================');
  console.log(`🚀 Express Backend Server is running!`);
  console.log(`🚀 Port: ${PORT}`);
  console.log(`🚀 Environment: ${process.env.NODE_ENV}`);
  console.log(`🚀 Health Check: http://localhost:${PORT}/health`);
  console.log('🚀 ============================================\n');
});
