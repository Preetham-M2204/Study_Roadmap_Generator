/**
 * auth.js - Authentication Routes
 * 
 * LEARNING OBJECTIVES:
 * 1. How to create Express routes
 * 2. Request validation
 * 3. Error handling in async functions
 * 4. Using JWT for authentication
 */

const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { generateToken, protect } = require('../middleware/auth');

/**
 * ============================================
 * ROUTE 1: Register New User
 * ============================================
 * 
 * Endpoint: POST /api/auth/register
 * Access: Public (anyone can register)
 * 
 * Request body:
 * {
 *   "name": "John Doe",
 *   "email": "john@test.com",
 *   "password": "mypassword123"
 * }
 * 
 * Response:
 * {
 *   "token": "eyJhbGci...",
 *   "user": { "id": "...", "name": "...", "email": "..." }
 * }
 */
router.post('/register', async (req, res) => {
  try {
    // STEP 1: Extract data from request body
    const { name, email, password } = req.body;

    // STEP 2: Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({ 
        error: 'Please provide name, email, and password' 
      });
    }

    // STEP 3: Check if user already exists
    const userExists = await User.findOne({ email });
    
    if (userExists) {
      return res.status(400).json({ 
        error: 'User with this email already exists' 
      });
    }

    // STEP 4: Create new user
    // Password will be automatically hashed by pre-save hook
    const user = await User.create({
      name,
      email,
      password
    });

    // STEP 5: Generate JWT token
    const token = generateToken(user._id);

    // STEP 6: Return response (exclude password)
    res.status(201).json({
      token,
      user: user.getPublicProfile()
    });

  } catch (error) {
    // Catch validation errors or database errors
    console.error('Registration error:', error);
    res.status(500).json({ 
      error: 'Server error during registration',
      details: error.message 
    });
  }
});

/**
 * ============================================
 * ROUTE 2: Login User
 * ============================================
 * 
 * Endpoint: POST /api/auth/login
 * Access: Public
 * 
 * Request body:
 * {
 *   "email": "john@test.com",
 *   "password": "mypassword123"
 * }
 * 
 * Response:
 * {
 *   "token": "eyJhbGci...",
 *   "user": { "id": "...", "name": "...", "email": "..." }
 * }
 */
router.post('/login', async (req, res) => {
  try {
    // STEP 1: Extract credentials
    const { email, password } = req.body;

    // STEP 2: Validate input
    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Please provide email and password' 
      });
    }

    // STEP 3: Find user by email (include password field)
    // .select('+password') is needed because password has select: false in schema
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({ 
        error: 'Invalid credentials' 
      });
    }

    // STEP 4: Verify password using bcrypt
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({ 
        error: 'Invalid credentials' 
      });
    }

    // STEP 5: Generate JWT token
    const token = generateToken(user._id);

    // STEP 6: Return token and user data
    res.json({
      token,
      user: user.getPublicProfile()
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      error: 'Server error during login',
      details: error.message 
    });
  }
});

/**
 * ============================================
 * ROUTE 3: Get Current User
 * ============================================
 * 
 * Endpoint: GET /api/auth/me
 * Access: Protected (must be logged in)
 * 
 * Headers:
 * {
 *   "Authorization": "Bearer eyJhbGci..."
 * }
 * 
 * Response:
 * {
 *   "user": { "id": "...", "name": "...", "email": "...", "role": "..." }
 * }
 */
router.get('/me', protect, async (req, res) => {
  try {
    // req.user is set by protect middleware
    // Already fetched from database, so just return it
    res.json({
      user: req.user
    });

  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ 
      error: 'Server error',
      details: error.message 
    });
  }
});

/**
 * ============================================
 * ROUTE 4: Update User Profile (Optional)
 * ============================================
 * 
 * Endpoint: PUT /api/auth/profile
 * Access: Protected
 * 
 * Request body:
 * {
 *   "name": "John Updated"
 * }
 */
router.put('/profile', protect, async (req, res) => {
  try {
    const { name } = req.body;

    // Find and update user
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name },
      { new: true, runValidators: true }  // Return updated doc + run validation
    );

    res.json({
      user: user.getPublicProfile()
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ 
      error: 'Server error',
      details: error.message 
    });
  }
});

// Export router
module.exports = router;
