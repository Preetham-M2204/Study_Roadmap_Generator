# StudyBuddy - AI-Powered Personalized Learning Roadmap Generator

> A full-stack MERN application with RAG (Retrieval-Augmented Generation) that creates personalized learning roadmaps based on user conversations.

[![MERN Stack](https://img.shields.io/badge/Stack-MERN-green)](https://github.com/Preetham-M2204/AI_Project)
[![FastAPI](https://img.shields.io/badge/RAG-FastAPI-blue)](https://github.com/Preetham-M2204/AI_Project)
[![LanceDB](https://img.shields.io/badge/VectorDB-LanceDB-orange)](https://github.com/Preetham-M2204/AI_Project)

---

## 📖 Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [System Design](#system-design)
- [Key Concepts Implemented](#key-concepts-implemented)
- [Setup Instructions](#setup-instructions)
- [Environment Variables](#environment-variables)
- [Project Structure](#project-structure)
- [API Documentation](#api-documentation)
- [Database Schema](#database-schema)
- [RAG Pipeline Explained](#rag-pipeline-explained)
- [Future Enhancements](#future-enhancements)

---

## 🎯 Overview

**StudyBuddy** is an intelligent learning companion that generates personalized roadmaps through natural conversation. Unlike traditional static roadmaps, StudyBuddy:

1. **Engages in conversation** to understand your learning goals, background, and constraints
2. **Searches a vector database** of curated learning topics using semantic search
3. **Generates structured roadmaps** with phases, topics, resources, and time estimates
4. **Tracks progress** with checkboxes, notes, and completion statistics

### Problem Solved
Traditional learning platforms provide one-size-fits-all roadmaps. StudyBuddy creates personalized plans by:
- Understanding context through multi-turn conversations
- Retrieving relevant topics from a curated knowledge base
- Generating adaptive roadmaps based on your specific needs

---

## ✨ Key Features

### 1. **Conversational Learning Advisor**
- Multi-turn chat interface powered by Google Gemini
- AI asks clarifying questions to understand your goals
- Context-aware responses based on conversation history

### 2. **Semantic Search (RAG)**
- Vector embeddings with BGE-M3 (1024 dimensions)
- LanceDB vector database for fast similarity search
- Retrieves most relevant topics based on meaning, not keywords

### 3. **Smart Roadmap Generation**
- Structured learning phases (Beginner → Intermediate → Advanced)
- Time estimates and difficulty levels
- Curated resources (YouTube, articles, practice problems)
- Prerequisites mapping between topics

### 4. **Progress Tracking**
- Check off completed topics
- Add personal notes and ratings
- View statistics (completion %, time spent)
- Dashboard with learning analytics

### 5. **Modern UI/UX**
- Futuristic neon-blue theme with glass morphism
- Dark/light mode support
- Responsive design
- Real-time updates

---

## 🏗️ Architecture

### Three-Tier Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  FRONTEND (React + Vite + TypeScript)                       │
│  Port: 5173                                                  │
│  - Chat Interface                                            │
│  - Roadmap Display                                           │
│  - Progress Tracking                                         │
└─────────────────────────────────────────────────────────────┘
                          ↕ HTTP/REST (Axios)
┌─────────────────────────────────────────────────────────────┐
│  BACKEND API (Express.js + Node.js)                         │
│  Port: 5000                                                  │
│  - User Authentication (JWT)                                 │
│  - Business Logic                                            │
│  - MongoDB CRUD Operations                                   │
└─────────────────────────────────────────────────────────────┘
         ↕ Mongoose                     ↕ Axios
┌──────────────────────────┐    ┌─────────────────────────────┐
│  DATABASE (MongoDB)      │    │  RAG SERVICE (FastAPI)      │
│  - Users                 │    │  Port: 8001                 │
│  - Chats                 │    │  - Semantic Search          │
│  - Roadmaps              │    │  - Gemini LLM Integration   │
│  - Progress              │    │  - Vector Embeddings        │
└──────────────────────────┘    └─────────────────────────────┘
                                         ↕
                                ┌─────────────────────────────┐
                                │  VECTOR DB (LanceDB)        │
                                │  - Topic Embeddings         │
                                │  - Fast ANN Search          │
                                └─────────────────────────────┘
```

### Data Flow Example

**User sends: "I want to learn Data Structures and Algorithms"**

```
1. React ChatInterface → POST /api/chat/:chatId/message
2. Express Backend:
   - Validates JWT token
   - Saves message to MongoDB (Chat collection)
   - Checks message count (4+ messages triggers roadmap)
3. Express → FastAPI: POST /rag/generate
4. FastAPI RAG Service:
   - Embeds query with BGE-M3 → [1024-dim vector]
   - Searches LanceDB for similar topic vectors
   - Retrieves top 15 relevant topics
   - Sends to Gemini: "Create roadmap with these topics..."
   - Gemini structures response (phases, time estimates, etc.)
5. FastAPI → Express: Returns structured roadmap JSON
6. Express:
   - Saves roadmap to MongoDB (Roadmap collection)
   - Creates progress records (Progress collection)
7. Express → React: Returns roadmap
8. React: Displays interactive roadmap with checkboxes
```

---

## 🛠️ Tech Stack

### Frontend
- **React 18** - Component-based UI library
- **TypeScript** - Type safety and better developer experience
- **Vite** - Fast build tool and dev server
- **Axios** - HTTP client with interceptors
- **React Router** - Client-side routing
- **Context API** - Global state management (authentication)
- **CSS3** - Custom styling with glass morphism and neon effects

### Backend (Express)
- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **MongoDB** - NoSQL database
- **Mongoose** - ODM for MongoDB
- **JWT (jsonwebtoken)** - Stateless authentication
- **bcrypt** - Password hashing
- **CORS** - Cross-origin resource sharing

### RAG Service (FastAPI)
- **FastAPI** - Modern Python web framework
- **LanceDB** - Vector database (Apache Arrow format)
- **BGE-M3** - Multilingual embedding model (1024 dimensions)
- **Google Gemini** - LLM for roadmap generation
- **FlagEmbedding** - Embedding library
- **Pydantic** - Data validation

---

## 🧠 System Design

### 1. Authentication System

**JWT-Based Authentication**
```
Login Flow:
1. User submits email + password
2. Express verifies password (bcrypt.compare)
3. Express generates JWT token with user ID
4. Frontend stores token in localStorage
5. All subsequent requests include token in Authorization header
6. Express middleware verifies token before processing requests
```

**Security Features:**
- Passwords hashed with bcrypt (10 salt rounds)
- JWT tokens expire after 30 days
- Protected routes require valid tokens
- Password never returned in API responses

### 2. Chat System

**Conversation Management**
- Each chat session stored as MongoDB document
- Messages stored as subdocuments array
- Auto-generated titles from first message
- Last message timestamp for sorting

**Roadmap Trigger Logic:**
```javascript
// After 4 user messages → Generate roadmap
if (userMessages.length >= 4 && !roadmapGenerated) {
  const conversationContext = buildContext(messages);
  const roadmap = await ragService.generate(conversationContext);
  saveRoadmap(roadmap);
}
```

### 3. RAG Pipeline

**Retrieval-Augmented Generation**

```python
# Step 1: Embed user query
query_vector = embed_text(query)  # [1024] dimensions

# Step 2: Vector similarity search
results = lancedb.search(query_vector, limit=15)
# Returns topics with cosine distance < 0.75 (relevance threshold)

# Step 3: Check relevance
if best_result['distance'] < 0.75:
    # Use retrieved topics (RAG mode)
    topics = format_topics(results)
else:
    # No relevant topics found (LLM-only mode)
    topics = None

# Step 4: Generate roadmap with Gemini
prompt = f"""
Create a learning roadmap for: {query}
Using these topics: {topics}
Structure: Phases with topics, resources, time estimates
"""
roadmap = gemini.generate(prompt)
```

**Why RAG?**
- **Accuracy**: Grounds AI responses in curated knowledge base
- **Consistency**: Same topics appear across similar queries
- **Control**: Can update knowledge base without retraining
- **Cost**: Cheaper than fine-tuning LLMs

### 4. Vector Search Explained

**How Semantic Search Works:**

```
Text: "graph algorithms" 
       ↓ BGE-M3 Model
Vector: [0.234, -0.456, 0.123, ..., 0.789]  (1024 numbers)

LanceDB compares with all topic vectors:
- "BFS/DFS" vector      → Distance: 0.42 (SIMILAR!)
- "Dynamic Programming" → Distance: 0.89 (NOT SIMILAR)

Returns top-K most similar (lowest distance)
```

**Distance Metric: Cosine Similarity**
- 0.0 = Identical meaning
- 0.5 = Somewhat similar
- 1.0+ = Very different

**Performance:**
- 259 topics searched in ~50ms
- LanceDB uses ANN (Approximate Nearest Neighbor)
- Results cached for repeated queries

### 5. Progress Tracking

**Many-to-Many Relationship**
```
User ←→ Progress ←→ Topic
 1         N         1

Progress document:
{
  userId: ObjectId,
  roadmapId: ObjectId,
  topicId: ObjectId,
  completed: true,
  completedAt: "2025-11-26T10:30:00Z",
  notes: "Found this tricky",
  rating: 4
}
```

**Statistics Calculation:**
- Aggregation pipelines for completion percentages
- Group by difficulty (easy/medium/hard)
- Total time spent tracking

---

## 🔑 Key Concepts Implemented

### 1. **MERN Stack Fundamentals**
- **MongoDB**: NoSQL database with Mongoose ODM
  - Schema design with validation
  - Subdocuments (messages in chats)
  - References (userId → User)
  - Indexes for query optimization
  - Pre-save hooks (password hashing)

- **Express.js**: RESTful API server
  - Middleware (CORS, JSON parsing, logging)
  - Route organization
  - Error handling middleware
  - Async/await for database operations

- **React**: Component-based frontend
  - Functional components with hooks
  - useState for local state
  - useEffect for side effects
  - useContext for global state (auth)
  - useRef for DOM manipulation
  - TypeScript for type safety

- **Node.js**: JavaScript runtime
  - CommonJS modules
  - Environment variables
  - Package management (npm)

### 2. **Advanced Backend Patterns**

**Middleware Pattern**
```javascript
// Logger middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();  // Pass to next middleware
});

// Auth middleware
const protect = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  const decoded = jwt.verify(token, SECRET);
  req.user = await User.findById(decoded.id);
  next();
};

// Usage
router.get('/profile', protect, getProfile);
```

**Repository Pattern**
- Models handle database operations
- Routes handle HTTP logic
- Separation of concerns

### 3. **Authentication & Security**

**JWT Token Flow**
```javascript
// Generate token
const token = jwt.sign({ id: userId }, SECRET, { expiresIn: '30d' });

// Verify token
const decoded = jwt.verify(token, SECRET);  // { id, iat, exp }

// Protect routes
router.get('/me', protect, (req, res) => {
  res.json({ user: req.user });  // req.user set by middleware
});
```

**Password Security**
```javascript
// Hash on save
const salt = await bcrypt.genSalt(10);
this.password = await bcrypt.hash(this.password, salt);

// Verify on login
const isMatch = await bcrypt.compare(enteredPassword, hashedPassword);
```

### 4. **React State Management**

**Local State (useState)**
```tsx
const [messages, setMessages] = useState([]);
const [loading, setLoading] = useState(false);
```

**Global State (Context)**
```tsx
// Create context
const AuthContext = createContext();

// Provider
<AuthContext.Provider value={{ user, login, logout }}>
  {children}
</AuthContext.Provider>

// Consumer
const { user, login } = useAuth();
```

**Derived State**
```tsx
// Don't store what can be calculated
const isLoggedIn = !!token;  // Derived from token
const messageCount = messages.length;  // Derived from messages
```

### 5. **API Communication**

**Axios Interceptors**
```typescript
// Request interceptor (add token)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor (handle errors)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired - logout
      localStorage.removeItem('token');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);
```

### 6. **Database Design**

**Schema Patterns**

1. **Embedded Documents** (1-to-Few)
```javascript
// Chat has messages embedded
const ChatSchema = new Schema({
  userId: ObjectId,
  messages: [MessageSchema]  // Embedded
});
```

2. **References** (1-to-Many)
```javascript
// Roadmap references user
const RoadmapSchema = new Schema({
  userId: { type: ObjectId, ref: 'User' }
});
```

3. **Join Table** (Many-to-Many)
```javascript
// Progress links users and topics
const ProgressSchema = new Schema({
  userId: ObjectId,
  topicId: ObjectId,
  completed: Boolean
});
```

### 7. **Vector Embeddings & Semantic Search**

**Embedding Process**
```python
# Text → Vector
model = FlagModel('BAAI/bge-m3')
vector = model.encode("graph algorithms")  # [1024 floats]

# Store in LanceDB
table.add([{
    "id": "graph_01",
    "topic": "BFS/DFS",
    "vector": vector
}])

# Search
results = table.search(query_vector).limit(5).to_list()
```

**Why 1024 Dimensions?**
- More dimensions = capture more semantic nuance
- BGE-M3 trained on multilingual data
- Balance between accuracy and performance

### 8. **Microservices Architecture**

**Service Separation**
- **Express**: User management, CRUD operations
- **FastAPI**: AI/ML operations (embedding, generation)
- **MongoDB**: User-specific data
- **LanceDB**: Shared knowledge base

**Inter-Service Communication**
```javascript
// Express → FastAPI
const response = await axios.post('http://localhost:8001/rag/generate', {
  query: userMessage,
  num_topics: 15
});
```

---

## 🚀 Setup Instructions

### Prerequisites
- **Node.js** 18+ ([Download](https://nodejs.org/))
- **Python** 3.11+ ([Download](https://www.python.org/))
- **MongoDB** Community Server ([Download](https://www.mongodb.com/try/download/community))
- **Git** ([Download](https://git-scm.com/))

### 1. Clone Repository
```bash
git clone https://github.com/Preetham-M2204/AI_Project.git
cd AI_Project
```

### 2. Setup Backend (Express)

```bash
cd backend

# Install dependencies
npm install

# Create .env file (see Environment Variables section)
# Add MongoDB URI and JWT secret

# Start server
npm run dev
```

Server runs on `http://localhost:5000`

### 3. Setup Frontend (React)

```bash
cd frontend

# Install dependencies
npm install

# Create .env file
echo "VITE_API_URL=http://localhost:5000" > .env

# Start dev server
npm run dev
```

App runs on `http://localhost:5173`

### 4. Setup RAG Service (FastAPI)

```bash
cd rag_service

# Create virtual environment
python -m venv .venv

# Activate virtual environment
# Windows PowerShell:
.\.venv\Scripts\Activate.ps1
# Windows CMD:
.\.venv\Scripts\activate.bat
# Linux/Mac:
source .venv/bin/activate

# Install dependencies
pip install -r app/requirements.txt

# Create .env file (see Environment Variables section)
# Add Gemini API key

# Start server
uvicorn app.main:app --reload --port 8001
```

Service runs on `http://localhost:8001`

---

## 🔐 Environment Variables

### Backend (.env in root directory)
```env
# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/studybuddy
# OR use MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/studybuddy

# JWT Secret (generate random string)
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production

# Server Config
PORT=5000
NODE_ENV=development

# RAG Service URL
RAG_SERVICE_URL=http://localhost:8001
```

### RAG Service (.env in rag_service directory)
```env
# Google Gemini API Key (REQUIRED)
# Get from: https://makersuite.google.com/app/apikey
GEMINI_API_KEY=your_gemini_api_key_here

# Model Configuration (Optional)
EMBEDDING_MODEL=BAAI/bge-m3
LLM_MODEL=gemini-1.5-pro
```

### Frontend (.env in frontend directory)
```env
# Backend API URL
VITE_API_URL=http://localhost:5000

# Debug mode (optional)
VITE_DEBUG=false
```

---

## 📂 Project Structure

```
AI_Project/
│
├── backend/                    # Express.js Backend
│   ├── config/
│   │   └── db.js              # MongoDB connection
│   ├── middleware/
│   │   └── auth.js            # JWT authentication middleware
│   ├── models/
│   │   ├── User.js            # User schema (name, email, password)
│   │   ├── Chat.js            # Chat sessions with messages
│   │   ├── Roadmap.js         # Generated roadmaps
│   │   └── Progress.js        # Topic completion tracking
│   ├── routes/
│   │   ├── auth.js            # Register, login, get user
│   │   ├── chat.js            # Chat CRUD, message handling
│   │   ├── roadmap.js         # Roadmap CRUD
│   │   └── progress.js        # Progress tracking, stats
│   ├── server.js              # Express app entry point
│   └── package.json
│
├── frontend/                   # React + TypeScript Frontend
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ChatInterface.tsx    # Chat UI
│   │   │   ├── RoadmapView.tsx      # Roadmap display
│   │   │   ├── Sidebar.tsx          # Navigation
│   │   │   ├── Layout.tsx           # App shell
│   │   │   └── LoginModal.tsx       # Auth UI
│   │   ├── context/
│   │   │   └── AuthContext.tsx      # Global auth state
│   │   ├── services/
│   │   │   └── api.ts               # Axios configuration
│   │   ├── App.tsx                  # Root component
│   │   └── main.tsx                 # Entry point
│   ├── package.json
│   └── vite.config.ts
│
├── rag_service/                # FastAPI RAG Service
│   ├── app/
│   │   ├── core/
│   │   │   ├── embeddings.py        # BGE-M3 embeddings
│   │   │   ├── lancedb_store.py     # Vector database operations
│   │   │   ├── rag_engine.py        # RAG pipeline orchestration
│   │   │   └── gemini_client.py     # Gemini API integration
│   │   ├── models/
│   │   │   └── rag_request.py       # Pydantic models
│   │   ├── utils/
│   │   │   └── loader.py            # JSON data loader
│   │   ├── data/
│   │   │   ├── dsa.json             # DSA topics (CUSTOMIZE THIS!)
│   │   │   └── interview.json       # Interview topics (ADD YOUR DATA!)
│   │   ├── lancedb_data/            # Vector database storage
│   │   ├── main.py                  # FastAPI app entry point
│   │   ├── config.py                # Configuration
│   │   └── requirements.txt
│   └── start_server.ps1
│
├── .env                        # Root environment variables
├── README.md                   # This file
├── MERN_CONCEPTS_USED.md      # Technical reference guide
└── package.json                # Root package.json
```

---

## 📡 API Documentation

### Authentication Endpoints

#### POST `/api/auth/register`
Register new user
```json
Request:
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securepassword"
}

Response:
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "...",
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

#### POST `/api/auth/login`
Login existing user
```json
Request:
{
  "email": "john@example.com",
  "password": "securepassword"
}

Response: (same as register)
```

#### GET `/api/auth/me`
Get current user (requires JWT token)
```json
Headers: { "Authorization": "Bearer <token>" }

Response:
{
  "user": {
    "id": "...",
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

### Chat Endpoints

#### POST `/api/chat/new`
Create new chat session
```json
Response:
{
  "chat": {
    "id": "...",
    "title": "New Chat",
    "messages": []
  }
}
```

#### POST `/api/chat/:chatId/message`
Send message in chat
```json
Request:
{
  "message": "I want to learn DSA"
}

Response (normal):
{
  "message": {
    "role": "assistant",
    "content": "Great! What's your current level?",
    "timestamp": "..."
  },
  "shouldGenerateRoadmap": false
}

Response (roadmap triggered):
{
  "shouldGenerateRoadmap": true,
  "roadmap": { /* full roadmap */ },
  "chat": { /* updated chat */ }
}
```

#### GET `/api/chat/:chatId`
Get chat with messages

#### GET `/api/chat`
Get all user's chats

#### DELETE `/api/chat/:chatId`
Delete chat (also deletes linked roadmap and progress)

### Roadmap Endpoints

#### GET `/api/roadmap`
Get all user's roadmaps

#### GET `/api/roadmap/:roadmapId`
Get specific roadmap

#### DELETE `/api/roadmap/:roadmapId`
Delete roadmap

### Progress Endpoints

#### POST `/api/progress/toggle`
Toggle topic completion
```json
Request:
{
  "roadmapId": "...",
  "topicId": "...",
  "topicIdentifier": "array_01"
}
```

#### GET `/api/progress/roadmap/:roadmapId`
Get progress for roadmap

#### GET `/api/progress/stats`
Get overall user statistics

### RAG Service Endpoints

#### POST `/rag/generate`
Generate roadmap with RAG
```json
Request:
{
  "query": "I want to master dynamic programming",
  "domain": "dsa",
  "num_topics": 15
}

Response:
{
  "title": "Dynamic Programming Mastery",
  "description": "...",
  "phases": [
    {
      "phase_number": 1,
      "phase_name": "Foundations",
      "topics": [
        {
          "id": "dp_01",
          "topic": "Fibonacci Numbers",
          "description": "...",
          "difficulty": "easy",
          "estimated_hours": 2,
          "resources": [...]
        }
      ]
    }
  ],
  "total_topics": 15,
  "total_hours": 45
}
```

#### POST `/chat`
Conversational chat (no roadmap generation)
```json
Request:
{
  "message": "What should I learn?",
  "conversation_history": [
    { "role": "user", "content": "Hi" },
    { "role": "assistant", "content": "Hello!" }
  ]
}

Response:
{
  "response": "Tell me about your goals...",
  "should_generate_roadmap": false,
  "context_completeness": 0.3
}
```

---

## 🗄️ Database Schema

### Users Collection
```javascript
{
  _id: ObjectId,
  name: String,
  email: String (unique),
  password: String (hashed),
  role: String (enum: ['user', 'admin']),
  createdAt: Date,
  updatedAt: Date
}
```

### Chats Collection
```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: User),
  title: String,
  messages: [
    {
      _id: ObjectId,
      role: String (enum: ['user', 'assistant', 'system']),
      content: String,
      timestamp: Date,
      metadata: Object
    }
  ],
  roadmapGenerated: Boolean,
  roadmapId: ObjectId (ref: Roadmap),
  status: String (enum: ['active', 'archived']),
  lastMessageAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### Roadmaps Collection
```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: User),
  chatId: ObjectId (ref: Chat),
  title: String,
  description: String,
  aiSummary: String,
  phases: [
    {
      _id: ObjectId,
      phaseNumber: Number,
      phaseName: String,
      description: String,
      totalHours: Number,
      topics: [
        {
          _id: ObjectId,
          topicId: String,
          topic: String,
          description: String,
          difficulty: String (enum: ['easy', 'medium', 'hard']),
          estimatedHours: Number,
          prerequisites: [String],
          resources: [
            {
              title: String,
              type: String (enum: ['video', 'article', 'practice']),
              url: String,
              platform: String
            }
          ],
          order: Number
        }
      ]
    }
  ],
  totalTopics: Number,
  totalHours: Number,
  metadata: {
    query: String,
    domain: String,
    mode: String,
    source: String,
    generatedAt: Date
  },
  status: String (enum: ['active', 'completed', 'archived']),
  createdAt: Date,
  updatedAt: Date
}
```

### Progress Collection
```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: User),
  roadmapId: ObjectId (ref: Roadmap),
  topicId: ObjectId,
  topicIdentifier: String,
  completed: Boolean,
  completedAt: Date,
  notes: String,
  rating: Number (1-5),
  timeSpent: Number,
  createdAt: Date,
  updatedAt: Date
}
```

---

## 🧪 RAG Pipeline Explained

### What is RAG?

**Retrieval-Augmented Generation** combines:
1. **Retrieval**: Search knowledge base for relevant information
2. **Generation**: Use LLM to generate response with retrieved context

**Why not just use LLM?**
- LLMs can hallucinate (make up facts)
- Limited knowledge cutoff
- Expensive to fine-tune

**Why not just use search?**
- Search returns raw documents
- No natural language generation
- No reasoning or synthesis

**RAG = Best of both worlds!**

### Pipeline Steps

#### 1. **Text Embedding**
```python
# Convert text to dense vector representation
text = "dynamic programming"
vector = model.encode(text)  # [0.234, -0.456, ..., 0.789]
```

**What are embeddings?**
- Dense vectors that capture semantic meaning
- Similar meanings → similar vectors
- Enables mathematical similarity comparison

#### 2. **Vector Search**
```python
# Find most similar topics in database
results = lancedb.search(vector, limit=15)
# Returns topics with distance < 0.75 (relevance threshold)
```

**How similarity search works:**
```
Query: "graph traversal"     → [0.8, 0.6, -0.2, ...]
Topic: "BFS/DFS"            → [0.9, 0.7, -0.1, ...]  Distance: 0.42 ✓
Topic: "Dynamic Programming" → [-0.3, 0.2, 0.9, ...] Distance: 0.89 ✗
```

#### 3. **Relevance Filtering**
```python
if best_match['distance'] < 0.75:
    # Relevant topics found - use RAG
    mode = "rag"
else:
    # No relevant topics - use LLM only
    mode = "llm_only"
```

#### 4. **Roadmap Generation**
```python
prompt = f"""
Create a learning roadmap for: {query}

Retrieved Topics:
{format_topics(retrieved_topics)}

Structure as:
- Phase 1: Foundations
  - Topic 1: ...
  - Resources: ...
- Phase 2: Intermediate
  ...
"""

roadmap = gemini.generate(prompt)
```

### RAG Dataset

**⚠️ IMPORTANT: You must create your own dataset!**

The RAG service uses JSON files in `rag_service/app/data/`:

**File Structure: `dsa.json` example**
```json
[
  {
    "id": "array_01",
    "topic": "Two Pointer Technique",
    "description": "Master solving array problems using two pointers...",
    "difficulty": "easy",
    "estimated_hours": 3,
    "domain": "dsa",
    "prerequisites": [],
    "resources": [
      {
        "title": "Two Pointers Explained - Striver",
        "type": "youtube",
        "url": "https://www.youtube.com/watch?v=...",
        "platform": "YouTube"
      },
      {
        "title": "Two Sum - LeetCode",
        "type": "practice",
        "url": "https://leetcode.com/problems/two-sum/",
        "platform": "LeetCode"
      }
    ]
  }
]
```

**How to create your dataset:**
1. Choose domains (dsa, ml, web-dev, etc.)
2. Research quality resources
3. Structure topics with prerequisites
4. Add difficulty and time estimates
5. Save as JSON in `rag_service/app/data/`

**On first startup, RAG service will:**
- Load all JSON files
- Generate embeddings for each topic
- Store in LanceDB
- Only new topics are embedded on subsequent runs

---

## 🔄 Future Enhancements

### Features to Add
- [ ] Social features (share roadmaps)
- [ ] Spaced repetition reminders
- [ ] Gamification (badges, streaks)
- [ ] Video tutorials integration
- [ ] Export to PDF/Notion
- [ ] Multi-language support
- [ ] Roadmap templates marketplace
- [ ] Study group collaboration

### Technical Improvements
- [ ] Redis caching for API responses
- [ ] WebSocket for real-time updates
- [ ] Elasticsearch for full-text search
- [ ] Docker containerization
- [ ] CI/CD pipeline
- [ ] Unit/integration tests
- [ ] Performance monitoring
- [ ] Rate limiting

---

## 🎓 Learning Resources

Built this project to learn:
- Full-stack development (MERN)
- Vector databases and semantic search
- LLM integration and prompt engineering
- RAG pipelines
- JWT authentication
- RESTful API design
- React hooks and TypeScript
- MongoDB schema design

**For detailed concept explanations, see:**
- `MERN_CONCEPTS_USED.md` - Comprehensive technical reference
- Code comments in each file - Inline explanations

---

## 📝 API Keys & Configuration

### Required API Keys

1. **Google Gemini API** (Required)
   - Get from: https://makersuite.google.com/app/apikey
   - Free tier: 60 requests/minute
   - Used for: Roadmap generation and chat

2. **MongoDB** (Required)
   - Local installation OR
   - MongoDB Atlas (free tier): https://www.mongodb.com/cloud/atlas
   - Used for: User data, chats, roadmaps, progress

### Alternative LLM APIs (Optional)

You can replace Gemini with:
- **OpenAI GPT-4** - Modify `rag_service/app/core/gemini_client.py`
- **Anthropic Claude** - Best for long context
- **Local models** - Ollama, LM Studio

**To change LLM:**
1. Update `gemini_client.py` imports
2. Replace API client initialization
3. Adjust prompt format if needed
4. Update environment variables

---

## 🤝 Contributing

This is a learning project. Feel free to:
- Fork and experiment
- Add new features
- Improve documentation
- Share your datasets (if public)

---

## 📄 License

This project is open source and available for educational purposes.

---

## 👨‍💻 Developer

**Preetham M**
- GitHub: [@Preetham-M2204](https://github.com/Preetham-M2204)

---

## 🙏 Acknowledgments

- **Striver (Raj Vikramaditya)** - Inspiration for structured learning paths
- **LanceDB** - Fast vector database
- **Google Gemini** - Powerful LLM API
- **BGE-M3** - High-quality multilingual embeddings

---

## 📊 Project Stats

- **Lines of Code**: ~5000+
- **Components**: 10 React components
- **API Endpoints**: 15+
- **Database Collections**: 4
- **Vector Dimensions**: 1024
- **Topics in Knowledge Base**: 259+ (customizable)

---

**Built with ❤️ for learners, by learners**
