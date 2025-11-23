# MERN Stack Learning Guide - Quick Reference

**Date:** November 23, 2025  
**Project:** AI Roadmap Learning Platform  
**Stack:** MongoDB, Express.js, React, Node.js + FastAPI (RAG Service)

> 📖 **Note:** This is a BRIEF overview. Full explanations are in code file comments!

---

## 📁 Project Structure & File Purposes

### Backend Files (Express.js)

| File | Purpose | Key Concepts |
|------|---------|--------------|
| `backend/server.js` | Express app entry point | Middleware, Routes, CORS |
| `backend/config/db.js` | MongoDB connection | Mongoose, async/await |
| `backend/models/User.js` | User database schema | Mongoose Schema, bcrypt, pre-save hooks |
| `backend/middleware/auth.js` | JWT verification | JWT, protect middleware, token generation |
| `backend/routes/auth.js` | Register/Login endpoints | Express Router, Controllers, Error handling |
| `backend/routes/chat.js` | Multi-turn conversation + roadmap trigger | Axios, RAG integration, Context building |
| `backend/routes/roadmap.js` | CRUD operations for roadmaps | Mongoose queries, Progress aggregation |
| `backend/routes/progress.js` | Toggle completion, stats | Many-to-many relationships |
| `backend/models/Chat.js` | Chat sessions with messages | Subdocuments, Instance methods |
| `backend/models/Roadmap.js` | Learning roadmaps structure | Nested schemas (Phases → Topics → Resources) |
| `backend/models/Progress.js` | Topic completion tracking | Join table pattern, Statistics |

### Frontend Files (React + TypeScript)

| File | Purpose | Key Concepts |
|------|---------|--------------|
| `frontend/src/main.tsx` | React app entry point | StrictMode, ReactDOM.render |
| `frontend/src/App.tsx` | Root component wrapper | Providers, theme |
| `frontend/src/components/Layout.tsx` | Main App Shell | View-based navigation, state management |
| `frontend/src/components/Sidebar.tsx` | Left navigation panel | Recent chats/roadmaps, theme toggle |
| `frontend/src/components/ChatInterface.tsx` | Multi-turn chat UI | Message history, roadmap generation |
| `frontend/src/components/RoadmapView.tsx` | Striver-style roadmap display | Phases, topics, progress, resource links |
| `frontend/src/components/LoginModal.tsx` | Authentication overlay | JWT auth, form validation |
| `frontend/src/components/ThemeToggle.tsx` | Dark/Light mode switch | localStorage persistence, CSS variables |
| `frontend/src/context/AuthContext.tsx` | Global auth state | JWT storage, token refresh |
| `frontend/src/services/api.ts` | Axios API client | HTTP interceptors, auth headers |
| `frontend/src/index.css` | Global styles + theme | CSS variables for dark mode |

---

## 📚 Core Concepts Summary

### 1. Password Security (bcrypt)
- **File:** `backend/models/User.js`
- **Concept:** Hash passwords before storing (one-way encryption)
- **Key Functions:** `bcrypt.hash()`, `bcrypt.compare()`, pre-save hook

### 2. JWT Authentication
- **File:** `backend/middleware/auth.js`
- **Concept:** Stateless authentication using encrypted tokens
- **Key Functions:** `generateToken()`, `protect()` middleware, `jwt.verify()`

### 3. Express Routes
- **File:** `backend/routes/auth.js`
- **Concept:** Map URLs to controller functions
- **Key Endpoints:** POST `/register`, POST `/login`, GET `/me`

---

## 🔄 Authentication Flow

```
1. Register/Login → Generate JWT token
2. React stores token → localStorage
3. Protected request → Send token in header
4. Middleware verifies → Attach user to req.user
5. Route handler → Access req.user data
```

---

## ✅ Completed Features

**Backend (Express + MongoDB):**
- ✅ User authentication (JWT, bcrypt)
- ✅ Chat system with message history
- ✅ Smart title generation (ChatGPT-style)
- ✅ Roadmap generation via RAG service
- ✅ Progress tracking (topic completion)
- ✅ Recent chats/roadmaps API
- ✅ MongoDB models (User, Chat, Roadmap, Progress)

**Frontend (React + TypeScript):**
- ✅ View-based navigation (no router lib)
- ✅ Multi-turn chat interface
- ✅ Striver-style roadmap display
- ✅ Progress tracking with checkboxes
- ✅ Dark/Light theme toggle
- ✅ Sidebar with recent history
- ✅ Authentication modal
- ✅ Smart title in sidebar (auto-refresh)

**RAG Service (FastAPI + Python):**
- ✅ LanceDB vector database (259 topics)
- ✅ BGE-M3 embeddings
- ✅ Gemini AI integration
- ✅ Semantic search
- ✅ RAG + LLM hybrid generation
- ✅ RAG/LLM source indicator

---

## 🎨 Features Highlight

**Smart Titles:**
- "I want to learn DSA in 3 weeks" → "Learn DSA in 3 weeks"
- Auto-appears in sidebar after first message

**Dark Mode:**
- CSS variables for theme switching
- Persists in localStorage
- Moon/Sun toggle in sidebar

**RAG Indicator:**
- Console log shows data source (RAG vs LLM)
- Visual badge in roadmap UI (coming)

**Progress Tracking:**
- Checkbox next to each topic
- Auto-save to MongoDB
- Progress percentage display

---

**📖 Remember:** Full explanations with examples are INSIDE each code file!  
**Last Updated:** November 23, 2025

---

## 1. Password Security with bcrypt

### 🔐 The Problem: Storing Passwords Safely

**Never store passwords in plaintext!**

```javascript
// ❌ TERRIBLE - Database hacked = all passwords stolen
{ email: "john@test.com", password: "mypassword123" }

// ✅ GOOD - Even if hacked, passwords are encrypted
{ email: "john@test.com", password: "$2a$10$N9qo8uLOickgx2ZMRZoMye..." }
```

### 🛡️ What is Hashing?

**Hashing** = One-way mathematical function that converts text to encrypted string

```
Input:  "mypassword123"
        ↓ (bcrypt algorithm)
Output: "$2a$10$N9qo8uLOickgx2ZMRZoMye7jAuRJhI3wQj8s"
```

**Key Properties:**
- ✅ **One-way** - Can't reverse hash to get original password
- ✅ **Deterministic** - Same input + same salt = same output
- ✅ **Slow** - Protects against brute force (intentionally slow)
- ✅ **Unique** - Salt makes each hash different

### 🧂 What is Salt?

**Salt** = Random string added to password before hashing

**Problem without salt:**
```javascript
User1: password123 → hash: abc123...
User2: password123 → hash: abc123... (SAME HASH!)
// Attacker uses rainbow tables to crack both instantly
```

**Solution with salt:**
```javascript
User1: password123 + salt1 → hash: xyz789...
User2: password123 + salt2 → hash: abc456... (DIFFERENT!)
// Each password requires separate brute force attack
```

**Salt is stored IN the hash:**
```
$2a$10$N9qo8uLOickgx2ZMRZoMye7jAuRJhI3wQj8s
 │   │  └─────┬─────┘ └──────┬──────┘
 │   │        │               └─ Actual hash (22 chars)
 │   │        └───────────────── Salt (22 chars)
 │   └────────────────────────── Cost factor (10 = 2^10 = 1,024 rounds)
 └────────────────────────────── Algorithm version (2a)
```

### 🔢 Cost Factor Explained

```javascript
bcrypt.genSalt(10) // 10 = cost factor
```

**Cost factor = Number of hashing rounds**

| Cost | Rounds | Speed | Use Case |
|------|--------|-------|----------|
| 4 | 16 | Very fast | Testing only |
| 10 | 1,024 | Balanced | **Default (recommended)** |
| 12 | 4,096 | Slower | High security |
| 14 | 16,384 | Very slow | Maximum security |

**Why this matters:**
- **For you:** Hash once during registration (100ms is fine)
- **For attacker:** Must hash billions of guesses (takes years!)

### 📝 How bcrypt Works in Code

#### **Registration (Hashing Password):**

```javascript
// 1. User submits form
POST /api/auth/register
Body: { name: "John", email: "john@test.com", password: "mypassword123" }

// 2. Create User document
const user = new User({ name, email, password: "mypassword123" });

// 3. Save triggers pre-save hook
await user.save();

// 4. Pre-save hook runs BEFORE saving to MongoDB
UserSchema.pre('save', async function(next) {
  // Only hash if password is new or changed
  if (!this.isModified('password')) return next();
  
  // Generate random salt
  const salt = await bcrypt.genSalt(10);
  // Example salt: "$2a$10$abcXYZ..."
  
  // Hash password with salt
  this.password = await bcrypt.hash(this.password, salt);
  // Result: "$2a$10$abcXYZ...def456"
  
  next(); // Continue to save
});

// 5. MongoDB saves user with HASHED password
{
  _id: ObjectId("..."),
  name: "John",
  email: "john@test.com",
  password: "$2a$10$abcXYZ...def456", // Encrypted!
  createdAt: "2025-11-22T..."
}
```

#### **Login (Comparing Password):**

```javascript
// 1. User submits login
POST /api/auth/login
Body: { email: "john@test.com", password: "mypassword123" }

// 2. Find user in database
const user = await User.findOne({ email }).select('+password');
// user.password = "$2a$10$abcXYZ...def456"

// 3. Compare entered password with hash
const isMatch = await user.comparePassword("mypassword123");

// 4. Inside comparePassword method
UserSchema.methods.comparePassword = async function(enteredPassword) {
  // bcrypt.compare() process:
  // 1. Extract salt from stored hash: "$2a$10$abcXYZ..."
  // 2. Hash entered password with SAME salt
  // 3. Compare new hash with stored hash
  // 4. Return true if match, false if not
  
  return await bcrypt.compare(enteredPassword, this.password);
  // compare("mypassword123", "$2a$10$abcXYZ...") → true ✅
  // compare("wrongpassword", "$2a$10$abcXYZ...") → false ❌
};

// 5. If match → Generate JWT, log user in
// 6. If no match → Return error
```

### ❓ Common Misconception: "Can bcrypt.compare() Decrypt Hash?"

**NO! bcrypt.compare() does NOT decrypt or reverse the hash!**

```javascript
// ❌ These functions DON'T EXIST
const password = bcrypt.decrypt(hash); // ERROR!
const password = bcrypt.reverse(hash);  // IMPOSSIBLE!

// ✅ This is all you can do (only returns true/false)
const isMatch = bcrypt.compare("guess", hash);
```

**Why it's secure:**

```javascript
// Attacker sees hash in database
hash = "$2a$10$abcXYZ...def456"

// Attacker must GUESS every possible password
bcrypt.compare("password1", hash) → false ❌ (0.1 seconds)
bcrypt.compare("password2", hash) → false ❌ (0.1 seconds)
bcrypt.compare("password3", hash) → false ❌ (0.1 seconds)
... (tries 1 billion more)
bcrypt.compare("mypassword123", hash) → true ✅ (FOUND after years!)

// Why it takes years:
// 1 billion guesses × 0.1 seconds each = 3 YEARS
// Strong password = 44 quadrillion combinations = 140 MILLION YEARS
```

### 🎯 Key Takeaways

1. **bcrypt.hash()** - Encrypts password with salt (one-way, irreversible)
2. **bcrypt.compare()** - Checks if guess matches hash (doesn't decrypt!)
3. **Salt** - Random string that makes each hash unique
4. **Cost factor** - Higher = more secure but slower (default: 10)
5. **Pre-save hook** - Automatically hashes password before saving to MongoDB
6. **Even with bcrypt library, attacker must guess password** - Takes years/decades

---

## 2. JWT Authentication

### 🔑 What is JWT (JSON Web Token)?

**JWT** = Encrypted string that proves "I'm logged in"

**Old Way vs New Way:**

```
OLD WAY (Session-based):
User logs in → Server stores "user123 is logged in" in memory
Problem: 
- Server must remember millions of users (memory intensive)
- Doesn't work with multiple servers (load balancing issues)

NEW WAY (JWT-based):
User logs in → Server generates encrypted token → Gives to user
User sends token with every request
Server verifies token (no memory needed!)
Benefits:
- ✅ Stateless (server doesn't store anything)
- ✅ Scales easily (works with multiple servers)
- ✅ Works with mobile apps and APIs
```

### 📦 JWT Structure (3 Parts)

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEyMyIsImV4cCI6MTcwMDAwMDAwMH0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
└──────────────┬─────────────────┘ └────────────┬──────────┘ └──────────────┬─────────────┘
            Header                      Payload                   Signature
```

**1. Header (Algorithm info):**
```json
{
  "alg": "HS256",  // Algorithm used (HMAC SHA-256)
  "typ": "JWT"     // Token type
}
```

**2. Payload (Your data):**
```json
{
  "id": "673f1234567890abcdef",  // User ID
  "iat": 1700000000,              // Issued At (timestamp)
  "exp": 1702592000               // Expires (timestamp)
}
```

**3. Signature (Verification):**
```javascript
HMACSHA256(
  base64UrlEncode(header) + "." + base64UrlEncode(payload),
  JWT_SECRET  // Secret key from .env
)
```

**How signature proves token is valid:**
- Server generates token with SECRET key
- Attacker tries to change payload (change user ID to access other accounts)
- Signature becomes invalid (doesn't match header + payload)
- Server rejects tampered token

### 🔐 JWT Generation (generateToken)

```javascript
const generateToken = (userId) => {
  return jwt.sign(
    { id: userId },              // Payload (data to encrypt)
    process.env.JWT_SECRET,      // Secret key (from .env)
    { expiresIn: '30d' }        // Token expires in 30 days
  );
};

// Usage after login:
const token = generateToken(user._id);
// Returns: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

// User receives this token and stores it:
localStorage.setItem('token', token); // In React
```

**Expiration explained:**
```javascript
{ expiresIn: '30d' }  // Token valid for 30 days
{ expiresIn: '7d' }   // 7 days
{ expiresIn: '24h' }  // 24 hours
{ expiresIn: '1h' }   // 1 hour

// After expiration:
// - Token becomes invalid
// - User must login again
// - This is why you stay logged in even after closing browser
```

### 🛡️ JWT Verification (protect middleware)

**What is Middleware?**

Middleware = Function that runs BEFORE your route handler

```javascript
// Think of it as a security checkpoint
router.get('/profile', protect, getProfile);
                       ^^^^^^^ Checkpoint (checks if user logged in)
                                ^^^^^^^^^^^ Route handler (runs if checkpoint passes)
```

**Flow:**
```
Request → Middleware 1 → Middleware 2 → Route Handler → Response
          (CORS)         (JWT verify)    (Your code)
```

**How protect() middleware works:**

```javascript
const protect = async (req, res, next) => {
  // STEP 1: Extract token from request header
  // Frontend sends: Headers: { "Authorization": "Bearer eyJhbGci..." }
  
  if (req.headers.authorization?.startsWith('Bearer')) {
    // Split "Bearer eyJhbGci..." → ["Bearer", "eyJhbGci..."]
    token = req.headers.authorization.split(' ')[1];
    
    // STEP 2: Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // decoded = { id: "673f123...", iat: 1700000000, exp: 1702592000 }
    
    // jwt.verify() checks:
    // ✅ Signature is valid (not tampered)
    // ✅ Token hasn't expired
    // ✅ Secret key matches
    // ❌ If any check fails → Throws error
    
    // STEP 3: Fetch user from database
    req.user = await User.findById(decoded.id).select('-password');
    // Attach user to request object
    
    // STEP 4: Continue to route handler
    next(); // Pass control to next middleware/route
  } else {
    // No token provided
    res.status(401).json({ error: 'Not authorized' });
  }
};
```

### 🔄 Complete Authentication Flow

**1. User Logs In:**
```
User → POST /api/auth/login
      Body: { email: "john@test.com", password: "mypassword123" }
      ↓
Express Server:
1. Find user: await User.findOne({ email })
2. Compare password: await user.comparePassword(password)
3. Generate token: generateToken(user._id)
      ↓
Response:
{
  token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  user: { id: "673f...", name: "John", email: "john@test.com" }
}
      ↓
React Frontend:
localStorage.setItem('token', token);
// Token stored in browser, persists even after closing tab
```

**2. User Accesses Protected Route:**
```
User → GET /api/roadmap/my-roadmaps
      Headers: { "Authorization": "Bearer eyJhbGci..." }
      ↓
protect() middleware:
1. Extract token from header
2. Verify signature: jwt.verify(token, secret)
3. Check expiration: decoded.exp > Date.now()
4. Fetch user: User.findById(decoded.id)
5. Attach to request: req.user = user
      ↓
Route handler:
const roadmaps = await Roadmap.find({ userId: req.user.id });
res.json(roadmaps);
// Can access req.user because middleware attached it!
```

### 🔒 Security Best Practices

**1. Strong JWT_SECRET:**
```javascript
// ❌ BAD
JWT_SECRET=secret

// ✅ GOOD
JWT_SECRET=ai_roadmap_super_secret_jwt_key_2025_change_in_production
```

**2. Always use HTTPS in production:**
```
HTTP:  Token sent in plaintext → Anyone can intercept
HTTPS: Token encrypted during transmission → Safe
```

**3. Send token in Authorization header (not URL):**
```javascript
// ❌ BAD - Token visible in browser history
GET /api/profile?token=eyJhbGci...

// ✅ GOOD - Token in header (not logged)
GET /api/profile
Headers: { "Authorization": "Bearer eyJhbGci..." }
```

**4. Reasonable expiration time:**
```javascript
// Banking app: 1 hour (high security)
{ expiresIn: '1h' }

// Social media: 30 days (convenience)
{ expiresIn: '30d' }

// Admin panel: 7 days (balanced)
{ expiresIn: '7d' }
```

### 🎯 Key Takeaways

1. **JWT = Stateless authentication** - Server doesn't store sessions
2. **3 parts: Header.Payload.Signature** - Signature prevents tampering
3. **generateToken()** - Creates JWT after successful login
4. **protect() middleware** - Verifies token and attaches user to request
5. **Token in Authorization header** - Standard HTTP authentication
6. **Expiration** - Tokens expire after specified time (default: 30 days)
7. **req.user available in protected routes** - Middleware attaches user data

---

## 3. Express Routes & Controllers

### 🛣️ What are Routes?

**Routes** = Mapping of URLs to functions

```javascript
// Route definition
router.post('/login', loginController);
          ↑          ↑
        URL path   Function to run
```

**HTTP Methods:**
```javascript
GET    /api/users       // Fetch all users
GET    /api/users/:id   // Fetch user by ID
POST   /api/users       // Create new user
PUT    /api/users/:id   // Update user
DELETE /api/users/:id   // Delete user
```

### 📋 Route Structure

```javascript
const express = require('express');
const router = express.Router();

// Public routes (no authentication needed)
router.post('/register', registerUser);
router.post('/login', loginUser);

// Protected routes (must be logged in)
router.get('/me', protect, getCurrentUser);
//                ^^^^^^^ Middleware runs first
//                        ^^^^^^^^^^^^^^^ Then route handler

module.exports = router;
```

### 🎮 What are Controllers?

**Controllers** = Business logic (what to do when route is called)

```javascript
// Controller function
const loginUser = async (req, res) => {
  // 1. Get data from request body
  const { email, password } = req.body;
  
  // 2. Validate data
  if (!email || !password) {
    return res.status(400).json({ error: 'Please provide email and password' });
  }
  
  // 3. Check database
  const user = await User.findOne({ email });
  
  // 4. Verify password
  const isMatch = await user.comparePassword(password);
  
  // 5. Generate token
  const token = generateToken(user._id);
  
  // 6. Send response
  res.json({ token, user });
};
```

### 📊 Request/Response Objects

**req (request) - Data FROM user:**
```javascript
req.body        // POST/PUT data: { email: "...", password: "..." }
req.params      // URL parameters: /users/:id → req.params.id
req.query       // Query string: /search?q=test → req.query.q
req.headers     // HTTP headers: { "Authorization": "Bearer ..." }
req.user        // Attached by middleware (if protected route)
```

**res (response) - Data TO user:**
```javascript
res.json({ data })           // Send JSON response
res.status(404).json({ error })  // Set status code + JSON
res.send('text')             // Send plain text
```

### 🔄 Complete Request Flow

```
1. User makes request
   POST /api/auth/login
   Body: { email: "john@test.com", password: "mypassword123" }
   ↓
2. Express matches route
   router.post('/login', loginUser);
   ↓
3. Controller function runs
   const loginUser = async (req, res) => {
     const { email, password } = req.body;
     // ... business logic
   };
   ↓
4. Response sent
   res.json({ token, user });
   ↓
5. User receives response
   { token: "eyJhbGci...", user: {...} }
```

---

## 📚 Next Topics Coming

- **Auth Routes** - Register, Login, Get Current User
- **Chat Routes** - Conversation with Gemini AI
- **Roadmap Routes** - Generate and retrieve roadmaps
- **Progress Routes** - Track completed topics
- **React Frontend** - UI components and API integration

---

## 4. Modern Frontend Design Concepts

### 🎨 CSS Variables (Theming)
**Concept:** Store colors in variables to ensure consistency across the app.
```css
:root {
  --primary-blue: #2563eb;
  --secondary-gray: #64748b;
  --bg-color: #f8fafc;
}
.button {
  background-color: var(--primary-blue);
}
```

### 📱 Responsive Design
**Concept:** Layout adapts to screen size (Mobile vs Desktop).
- **Flexbox:** Aligns items in rows/columns (`display: flex`).
- **Media Queries:** Apply styles only on specific screen sizes.
```css
@media (max-width: 768px) {
  .container {
    flex-direction: column; /* Stack items on mobile */
  }
}
```

### 🧩 Modular Component Structure
**Concept:** Break UI into reusable pieces.
- **Layout Wrapper:** Common header/sidebar for all pages.
- **Card Component:** Reusable container for content.
- **Full-screen Layout:** Use `min-height: 100vh` to fill screen.

### 🖼️ Modal/Overlay Pattern (New!)
**Concept:** Show content on top of the current page without leaving it.
- **Z-Index:** Controls vertical stacking order (higher number = on top).
- **Backdrop Filter:** Creates the blur effect behind the modal (`backdrop-filter: blur(8px)`).
- **Fixed Positioning:** Keeps the modal centered even when scrolling.

### ⚛️ Context API (Global State)
**Concept:** Share data (like "is user logged in?") across the ENTIRE app without passing props down 10 levels.
- **Provider:** Wraps the app (`<AuthProvider>`).
- **Hook:** Consumes the data (`useAuth()`).

---

**Last Updated:** November 23, 2025 20:45 IST
