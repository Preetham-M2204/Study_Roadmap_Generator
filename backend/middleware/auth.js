/**
 * auth.js - JWT Authentication Middleware
 * 
 * LEARNING OBJECTIVES:
 * 1. What is JWT (JSON Web Token)
 * 2. How authentication middleware works
 * 3. How to protect routes (require login)
 * 4. Token generation and verification
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * ============================================
 * CONCEPT: What is JWT?
 * ============================================
 * 
 * JWT (JSON Web Token) = Encrypted string that proves user is logged in
 * 
 * Alternative to traditional sessions:
 * - OLD WAY (Sessions): Server stores "user123 is logged in" in memory
 * - NEW WAY (JWT): Server gives user a token, user sends it with every request
 * 
 * JWT Structure (3 parts separated by dots):
 * xxxxx.yyyyy.zzzzz
 *   │     │     └─ Signature (verifies token wasn't tampered)
 *   │     └─────── Payload (user data: id, email)
 *   └─────────────Header (algorithm used: HS256)
 * 
 * Example JWT:
 * eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEyMyIsImVtYWlsIjoidGVzdEB0ZXN0LmNvbSJ9.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
 * 
 * Decoded payload:
 * {
 *   "id": "123",
 *   "email": "test@test.com",
 *   "iat": 1700000000,  // issued at (timestamp)
 *   "exp": 1700086400   // expires (timestamp)
 * }
 */

/**
 * ============================================
 * FUNCTION 1: Generate JWT Token
 * ============================================
 * 
 * Called after successful login/register
 * Creates encrypted token with user data
 */
const generateToken = (userId) => {
  /**
   * jwt.sign(payload, secret, options)
   * 
   * - payload: Data to encrypt (user ID)
   * - secret: Password to encrypt token (from .env)
   * - options: Expiration time
   * 
   * Returns: Encrypted string (JWT token)
   */
  return jwt.sign(
    { id: userId },                    // Payload (what data to include)
    process.env.JWT_SECRET,            // Secret key (from .env file)
    { expiresIn: '30d' }              // Token expires in 30 days
  );
  
  /**
   * How expiration works:
   * - User logs in → Gets token valid for 30 days
   * - After 30 days → Token expires → User must login again
   * - This is why you stay logged in even after closing browser
   */
};

/**
 * ============================================
 * FUNCTION 2: Protect Route Middleware
 * ============================================
 * 
 * CONCEPT: Middleware
 * 
 * Middleware = Function that runs BEFORE your route handler
 * Think of it as a "security guard" checking tickets before entry
 * 
 * Flow:
 * 1. User sends request: GET /api/user/profile
 * 2. Middleware runs FIRST: protect()
 * 3. If token valid → Allow access to route handler
 * 4. If token invalid → Reject request (401 Unauthorized)
 * 
 * Usage in routes:
 * router.get('/profile', protect, getUserProfile);
 *                        ^^^^^^^ This middleware runs first
 */
const protect = async (req, res, next) => {
  let token;

  /**
   * STEP 1: Extract token from request headers
   * 
   * Frontend sends token like this:
   * Headers: {
   *   "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
   * }
   * 
   * Format: "Bearer <token>"
   * - "Bearer" = Authentication scheme (standard HTTP auth)
   * - Token follows after space
   */
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      /**
       * Extract token from "Bearer eyJhbGci..."
       * Split by space → ["Bearer", "eyJhbGci..."]
       * Take second element → "eyJhbGci..."
       */
      token = req.headers.authorization.split(' ')[1];

      /**
       * STEP 2: Verify token is valid
       * 
       * jwt.verify(token, secret)
       * - Checks if token signature is valid (not tampered)
       * - Checks if token hasn't expired
       * - Decrypts payload data
       * 
       * Returns: Decoded payload { id: "123", iat: ..., exp: ... }
       * Throws error if: Token invalid, expired, or tampered
       */
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      /**
       * decoded looks like:
       * {
       *   id: "673f1234567890abcdef1234",  // User ID from generateToken()
       *   iat: 1700000000,                  // Issued at timestamp
       *   exp: 1700086400                   // Expiration timestamp
       * }
       */

      /**
       * STEP 3: Fetch user from database
       * 
       * Why fetch user again?
       * - Token only contains user ID (not full user data)
       * - User might be deleted/banned since token was issued
       * - Get latest user data (name, email might have changed)
       * 
       * .select('-password') = Don't return password field
       */
      req.user = await User.findById(decoded.id).select('-password');

      /**
       * STEP 4: Attach user to request object
       * 
       * Now in route handlers, you can access:
       * - req.user.id
       * - req.user.email
       * - req.user.name
       * 
       * Example route:
       * router.get('/profile', protect, (req, res) => {
       *   res.json({ user: req.user }); // User data available!
       * });
       */

      /**
       * STEP 5: Call next() to proceed to route handler
       * 
       * next() = Pass control to next middleware or route
       * Without this, request hangs forever!
       */
      next();
      
    } catch (error) {
      /**
       * Token verification failed (invalid/expired/tampered)
       */
      console.error('❌ Token verification failed:', error.message);
      return res.status(401).json({ 
        error: 'Not authorized, token failed',
        message: error.message 
      });
    }
  }

  /**
   * No token provided in request headers
   */
  if (!token) {
    return res.status(401).json({ 
      error: 'Not authorized, no token provided' 
    });
  }
};

/**
 * ============================================
 * FUNCTION 3: Admin-Only Middleware (Optional)
 * ============================================
 * 
 * For routes that only admins can access
 * Use AFTER protect middleware
 * 
 * Example:
 * router.delete('/user/:id', protect, admin, deleteUser);
 *                            ^^^^^^^ Check logged in
 *                                    ^^^^^ Then check if admin
 */
const admin = (req, res, next) => {
  /**
   * Check if user role is admin
   * req.user was set by protect() middleware
   */
  if (req.user && req.user.role === 'admin') {
    next(); // User is admin, allow access
  } else {
    res.status(403).json({ 
      error: 'Access denied. Admin only.' 
    });
  }
};

/**
 * ============================================
 * EXPORT FUNCTIONS
 * ============================================
 */
module.exports = { generateToken, protect, admin };

/**
 * ============================================
 * USAGE EXAMPLES
 * ============================================
 * 
 * 1. GENERATE TOKEN (in auth routes):
 * 
 * const { generateToken } = require('../middleware/auth');
 * 
 * router.post('/login', async (req, res) => {
 *   const user = await User.findOne({ email });
 *   const token = generateToken(user._id);
 *   res.json({ token, user });
 * });
 * 
 * 
 * 2. PROTECT ROUTES (require login):
 * 
 * const { protect } = require('../middleware/auth');
 * 
 * router.get('/profile', protect, (req, res) => {
 *   res.json({ user: req.user }); // req.user available!
 * });
 * 
 * 
 * 3. ADMIN-ONLY ROUTES:
 * 
 * const { protect, admin } = require('../middleware/auth');
 * 
 * router.delete('/user/:id', protect, admin, (req, res) => {
 *   // Only admins can delete users
 * });
 * 
 * 
 * ============================================
 * AUTHENTICATION FLOW (LOGIN → PROTECTED ROUTE)
 * ============================================
 * 
 * Step 1: User logs in
 * POST /api/auth/login
 * Body: { email: "john@test.com", password: "123456" }
 *   ↓
 * Server: Verify password → Generate JWT token
 *   ↓
 * Response: { token: "eyJhbGci...", user: { id, name, email } }
 * 
 * 
 * Step 2: React stores token
 * localStorage.setItem('token', token);
 * 
 * 
 * Step 3: User requests protected resource
 * GET /api/roadmap/my-roadmaps
 * Headers: { "Authorization": "Bearer eyJhbGci..." }
 *   ↓
 * protect() middleware:
 *   - Extract token from header
 *   - Verify token signature
 *   - Fetch user from database
 *   - Attach user to req.user
 *   ↓
 * Route handler runs:
 *   const roadmaps = await Roadmap.find({ userId: req.user.id });
 *   res.json(roadmaps);
 * 
 * 
 * ============================================
 * SECURITY NOTES
 * ============================================
 * 
 * 1. JWT_SECRET must be strong (in .env)
 *    - Bad:  "secret"
 *    - Good: "ai_roadmap_super_secret_jwt_key_2025..."
 * 
 * 2. Tokens expire after 30 days
 *    - User must login again after expiration
 *    - Change expiresIn: '7d' for 7 days, '1h' for 1 hour
 * 
 * 3. Never send JWT in URL parameters
 *    - Bad:  GET /api/profile?token=eyJhbGci...
 *    - Good: Header: "Authorization: Bearer eyJhbGci..."
 * 
 * 4. HTTPS in production
 *    - JWT in HTTP = Anyone can steal token
 *    - JWT in HTTPS = Encrypted connection
 */
