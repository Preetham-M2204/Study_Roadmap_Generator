# Testing Guide

## 🧪 Backend API Testing

### Prerequisites
1. **MongoDB** - Running on `mongodb://localhost:27017`
2. **Express Backend** - Running on `http://localhost:5000`
3. **RAG Service** - Running on `http://localhost:8001`

### Run Complete API Test Suite

```powershell
# From backend directory
cd backend
npm test
```

This will test:
- ✅ Server health checks
- ✅ User registration
- ✅ User login
- ✅ Chat creation
- ✅ Multi-turn conversation
- ✅ Automatic roadmap generation (after 4 messages)
- ✅ Roadmap retrieval
- ✅ Progress tracking
- ✅ User statistics

### Expected Output

```
🚀 STARTING API TESTS
============================================================

============================================================
  TEST 1: Server Health Checks
============================================================
ℹ️  Testing Express backend...
✅ Express backend is running
ℹ️  Testing RAG service...
✅ RAG service is running

============================================================
  TEST 2: User Registration
============================================================
ℹ️  Registering user: test1234567890@example.com
✅ User registration
✅ Token received: eyJhbGciOiJIUzI1NiI...

... (continues with all tests)

============================================================
  TEST SUMMARY
============================================================
Total tests: 15
Passed: 15
Failed: 0
Duration: 45.32s
```

### Troubleshooting

**If RAG service test fails:**
```powershell
# Start RAG service first
cd rag_service
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --port 8001
```

**If MongoDB connection fails:**
- Check MongoDB is running
- Verify connection string in `backend/.env`

**If backend not responding:**
```powershell
cd backend
npm run dev
```

## 🎨 Frontend Debugging

### Enable Debug Mode

Debug mode is already enabled in `frontend/.env`:
```
VITE_DEBUG=true
```

### What Gets Logged

With debug mode ON, you'll see in browser console:

**AuthContext:**
```
[AuthContext] Initializing auth state...
[AuthContext] Found stored credentials: { token: "eyJhbGci...", user: {...} }
```

**API Calls:**
```
🚀 API Request: {
  method: 'POST',
  url: '/api/auth/login',
  data: { email: "...", password: "[HIDDEN]" }
}
✅ API Response: { status: 200, data: {...} }
```

**LoginModal:**
```
[LoginModal] Form submitted: { isLogin: true, email: "..." }
[LoginModal] Attempting login...
[LoginModal] Authentication successful: { user: {...} }
```

### Disable Debug Logs

Edit `frontend/.env`:
```
VITE_DEBUG=false
```

## 📊 Backend Request Logging

Enhanced logging is automatically enabled in development mode.

Every request shows:
```
============================================================
📥 POST /api/chat/123/message
⏰ 2025-11-23T14:30:00.000Z
📦 Body: {
  "message": "I want to learn DSA"
}
🔐 Auth: Bearer eyJhbGciOiJIUzI...
============================================================
```

Errors show detailed trace:
```
❌ ERROR OCCURRED ❌
============================================================
📍 Route: POST /api/chat/123/message
💥 Message: Chat not found
🔢 Status: 404
📚 Stack trace:
    at ChatController.sendMessage (routes/chat.js:145:11)
    ...
============================================================
```

## 🔍 Common Issues & Solutions

### Issue: "ECONNREFUSED" in tests
**Solution:** Backend not running. Start with `npm run dev`

### Issue: "Roadmap not generated"
**Solution:** RAG service not running. Start FastAPI service.

### Issue: "401 Unauthorized"
**Solution:** Token expired or invalid. Clear localStorage and login again.

### Issue: "MongooseError: Operation timed out"
**Solution:** MongoDB not running or wrong connection string.

## 📝 Manual Testing with Postman/Thunder Client

### 1. Register User
```
POST http://localhost:5000/api/auth/register
Body: {
  "name": "John Doe",
  "email": "john@test.com",
  "password": "test123456"
}
```

### 2. Login
```
POST http://localhost:5000/api/auth/login
Body: {
  "email": "john@test.com",
  "password": "test123456"
}
```
Copy the `token` from response.

### 3. Create Chat
```
POST http://localhost:5000/api/chat/new
Headers: {
  "Authorization": "Bearer YOUR_TOKEN_HERE"
}
Body: {
  "title": "Learn DSA"
}
```

### 4. Send Message
```
POST http://localhost:5000/api/chat/CHAT_ID/message
Headers: {
  "Authorization": "Bearer YOUR_TOKEN_HERE"
}
Body: {
  "message": "I want to learn data structures"
}
```

Repeat 4 times to trigger roadmap generation!
