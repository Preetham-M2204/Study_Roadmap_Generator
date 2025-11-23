/**
 * test-api.js - API Testing Script
 * 
 * LEARNING OBJECTIVES:
 * 1. How to test REST APIs programmatically
 * 2. Sequential API calls (register → login → chat)
 * 3. Token-based authentication testing
 * 4. Error handling and validation
 * 
 * ═══════════════════════════════════════════════════════════════════
 * HOW TO RUN THIS TEST:
 * ═══════════════════════════════════════════════════════════════════
 * 
 * 1. Make sure backend is running: npm run dev
 * 2. Make sure MongoDB is connected
 * 3. Make sure RAG service is running on port 8001
 * 4. Run this script: node test-api.js
 * 
 * This will test the complete flow:
 * - User registration
 * - User login
 * - Create chat
 * - Send 4 messages (triggers roadmap)
 * - Fetch roadmap
 * - Toggle progress
 */

const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:5000';
const RAG_URL = 'http://localhost:8001';

// Test user data
const testUser = {
  name: 'Test User',
  email: `test${Date.now()}@example.com`, // Unique email each run
  password: 'test123456'
};

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Helper: Pretty print
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logSection(message) {
  log(`\n${'='.repeat(60)}`, 'cyan');
  log(`  ${message}`, 'cyan');
  log(`${'='.repeat(60)}`, 'cyan');
}

// Helper: Sleep
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Test results tracker
const results = {
  passed: 0,
  failed: 0,
  tests: []
};

function recordTest(name, passed, error = null) {
  results.tests.push({ name, passed, error });
  if (passed) {
    results.passed++;
    logSuccess(`${name}`);
  } else {
    results.failed++;
    logError(`${name}: ${error}`);
  }
}

// ═══════════════════════════════════════════════════════════════════
// TEST 1: Check if servers are running
// ═══════════════════════════════════════════════════════════════════

async function testServerHealth() {
  logSection('TEST 1: Server Health Checks');
  
  try {
    // Test Express backend
    logInfo('Testing Express backend...');
    const expressHealth = await axios.get(`${BASE_URL}/health`, { timeout: 3000 });
    recordTest('Express backend is running', expressHealth.status === 200);
    
    // Test RAG service
    logInfo('Testing RAG service...');
    try {
      const ragHealth = await axios.get(`${RAG_URL}/health`, { timeout: 3000 });
      recordTest('RAG service is running', ragHealth.status === 200);
    } catch (error) {
      recordTest('RAG service is running', false, 'RAG service not responding');
      logWarning('RAG service is required for roadmap generation!');
    }
    
  } catch (error) {
    recordTest('Server health check', false, error.message);
    throw new Error('Servers are not running. Please start them first.');
  }
}

// ═══════════════════════════════════════════════════════════════════
// TEST 2: User Registration
// ═══════════════════════════════════════════════════════════════════

async function testRegistration() {
  logSection('TEST 2: User Registration');
  
  try {
    logInfo(`Registering user: ${testUser.email}`);
    
    const response = await axios.post(`${BASE_URL}/api/auth/register`, testUser);
    
    recordTest('User registration', response.status === 201);
    
    if (response.data.token) {
      logSuccess(`Token received: ${response.data.token.substring(0, 20)}...`);
    }
    
    return response.data.token;
    
  } catch (error) {
    recordTest('User registration', false, error.response?.data?.error || error.message);
    throw error;
  }
}

// ═══════════════════════════════════════════════════════════════════
// TEST 3: User Login
// ═══════════════════════════════════════════════════════════════════

async function testLogin() {
  logSection('TEST 3: User Login');
  
  try {
    logInfo(`Logging in: ${testUser.email}`);
    
    const response = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: testUser.email,
      password: testUser.password
    });
    
    recordTest('User login', response.status === 200);
    
    return response.data.token;
    
  } catch (error) {
    recordTest('User login', false, error.response?.data?.error || error.message);
    throw error;
  }
}

// ═══════════════════════════════════════════════════════════════════
// TEST 4: Create Chat Session
// ═══════════════════════════════════════════════════════════════════

async function testCreateChat(token) {
  logSection('TEST 4: Create Chat Session');
  
  try {
    logInfo('Creating new chat...');
    
    const response = await axios.post(
      `${BASE_URL}/api/chat/new`,
      { title: 'Test Chat - Learn DSA' },
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    
    recordTest('Create chat', response.status === 201);
    
    const chatId = response.data.chat.id;
    logSuccess(`Chat created with ID: ${chatId}`);
    
    return chatId;
    
  } catch (error) {
    recordTest('Create chat', false, error.response?.data?.error || error.message);
    throw error;
  }
}

// ═══════════════════════════════════════════════════════════════════
// TEST 5: Send Messages (4 messages to trigger roadmap)
// ═══════════════════════════════════════════════════════════════════

async function testSendMessages(token, chatId) {
  logSection('TEST 5: Send Messages & Trigger Roadmap');
  
  const messages = [
    "I want to learn Data Structures and Algorithms",
    "I'm a beginner with basic programming knowledge",
    "I can dedicate 2-3 hours daily for 3 months",
    "I want to focus on Arrays, Strings, and Dynamic Programming"
  ];
  
  let roadmap = null;
  
  for (let i = 0; i < messages.length; i++) {
    try {
      logInfo(`Sending message ${i + 1}/4: "${messages[i].substring(0, 50)}..."`);
      
      const response = await axios.post(
        `${BASE_URL}/api/chat/${chatId}/message`,
        { message: messages[i] },
        {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 70000 // 70 seconds (roadmap generation takes time)
        }
      );
      
      recordTest(`Message ${i + 1}`, response.status === 200);
      
      if (response.data.shouldGenerateRoadmap) {
        logSuccess('🎉 Roadmap generation triggered!');
        roadmap = response.data.roadmap;
      } else {
        logInfo(`AI Response: ${response.data.message.content.substring(0, 80)}...`);
        if (response.data.messagesUntilRoadmap !== undefined) {
          logInfo(`Messages until roadmap: ${response.data.messagesUntilRoadmap}`);
        }
      }
      
      // Wait 1 second between messages
      await sleep(1000);
      
    } catch (error) {
      recordTest(`Message ${i + 1}`, false, error.response?.data?.error || error.message);
      
      if (error.code === 'ECONNREFUSED') {
        logError('Connection refused. Is the backend running?');
      } else if (error.code === 'ETIMEDOUT') {
        logWarning('Request timeout. RAG service might be slow or down.');
      }
      
      throw error;
    }
  }
  
  if (!roadmap) {
    logWarning('Roadmap was not generated automatically. This might be expected if RAG service is down.');
  }
  
  return roadmap;
}

// ═══════════════════════════════════════════════════════════════════
// TEST 6: Fetch Roadmap
// ═══════════════════════════════════════════════════════════════════

async function testFetchRoadmap(token, roadmapId) {
  logSection('TEST 6: Fetch Roadmap');
  
  if (!roadmapId) {
    logWarning('Skipping roadmap fetch (no roadmap ID)');
    return null;
  }
  
  try {
    logInfo(`Fetching roadmap: ${roadmapId}`);
    
    const response = await axios.get(
      `${BASE_URL}/api/roadmap/${roadmapId}`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    
    recordTest('Fetch roadmap', response.status === 200);
    
    const roadmap = response.data.roadmap;
    logSuccess(`Roadmap: "${roadmap.title}"`);
    logInfo(`Total topics: ${roadmap.totalTopics}`);
    logInfo(`Total hours: ${roadmap.totalHours}`);
    logInfo(`Phases: ${roadmap.phases.length}`);
    
    return roadmap;
    
  } catch (error) {
    recordTest('Fetch roadmap', false, error.response?.data?.error || error.message);
    throw error;
  }
}

// ═══════════════════════════════════════════════════════════════════
// TEST 7: Toggle Progress
// ═══════════════════════════════════════════════════════════════════

async function testToggleProgress(token, roadmap) {
  logSection('TEST 7: Toggle Progress');
  
  if (!roadmap || !roadmap.phases || roadmap.phases.length === 0) {
    logWarning('Skipping progress toggle (no roadmap data)');
    return;
  }
  
  try {
    // Get first topic from first phase
    const firstPhase = roadmap.phases[0];
    const firstTopic = firstPhase.topics[0];
    
    logInfo(`Marking topic as complete: "${firstTopic.topic}"`);
    
    const response = await axios.post(
      `${BASE_URL}/api/progress/toggle`,
      {
        roadmapId: roadmap.id,
        topicId: firstTopic.id,
        topicIdentifier: firstTopic.topicId
      },
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    
    recordTest('Toggle progress', response.status === 200);
    
    logSuccess(`Progress: ${response.data.stats.completed}/${response.data.stats.total} (${response.data.stats.percentage}%)`);
    
  } catch (error) {
    recordTest('Toggle progress', false, error.response?.data?.error || error.message);
    throw error;
  }
}

// ═══════════════════════════════════════════════════════════════════
// TEST 8: Get User Stats
// ═══════════════════════════════════════════════════════════════════

async function testGetStats(token) {
  logSection('TEST 8: Get User Statistics');
  
  try {
    logInfo('Fetching user statistics...');
    
    const response = await axios.get(
      `${BASE_URL}/api/progress/stats`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    
    recordTest('Get user stats', response.status === 200);
    
    const stats = response.data.stats;
    logSuccess(`Total topics: ${stats.totalTopics}`);
    logSuccess(`Completed: ${stats.completedTopics} (${stats.percentage}%)`);
    logSuccess(`Active roadmaps: ${stats.activeRoadmaps}`);
    
  } catch (error) {
    recordTest('Get user stats', false, error.response?.data?.error || error.message);
    throw error;
  }
}

// ═══════════════════════════════════════════════════════════════════
// TEST 9: Get All Chats
// ═══════════════════════════════════════════════════════════════════

async function testGetAllChats(token) {
  logSection('TEST 9: Get All Chats');
  
  try {
    logInfo('Fetching all chats...');
    
    const response = await axios.get(
      `${BASE_URL}/api/chat`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    
    recordTest('Get all chats', response.status === 200);
    
    logSuccess(`Found ${response.data.chats.length} chats`);
    
  } catch (error) {
    recordTest('Get all chats', false, error.response?.data?.error || error.message);
    throw error;
  }
}

// ═══════════════════════════════════════════════════════════════════
// MAIN TEST RUNNER
// ═══════════════════════════════════════════════════════════════════

async function runAllTests() {
  log('\n\n🚀 STARTING API TESTS', 'cyan');
  log('='.repeat(60), 'cyan');
  
  const startTime = Date.now();
  
  try {
    // Test 1: Health checks
    await testServerHealth();
    
    // Test 2 & 3: Auth
    const token = await testRegistration();
    await testLogin();
    
    // Test 4: Chat creation
    const chatId = await testCreateChat(token);
    
    // Test 5: Send messages (triggers roadmap)
    const roadmap = await testSendMessages(token, chatId);
    
    // Test 6: Fetch roadmap
    const fullRoadmap = roadmap ? await testFetchRoadmap(token, roadmap.id) : null;
    
    // Test 7: Progress toggle
    if (fullRoadmap) {
      await testToggleProgress(token, fullRoadmap);
    }
    
    // Test 8: User stats
    await testGetStats(token);
    
    // Test 9: Get all chats
    await testGetAllChats(token);
    
  } catch (error) {
    logError(`\nTests stopped due to error: ${error.message}`);
  }
  
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);
  
  // Print summary
  logSection('TEST SUMMARY');
  log(`Total tests: ${results.passed + results.failed}`, 'cyan');
  log(`Passed: ${results.passed}`, 'green');
  log(`Failed: ${results.failed}`, results.failed > 0 ? 'red' : 'green');
  log(`Duration: ${duration}s`, 'cyan');
  
  if (results.failed > 0) {
    log('\nFailed tests:', 'red');
    results.tests.filter(t => !t.passed).forEach(test => {
      log(`  - ${test.name}: ${test.error}`, 'red');
    });
  }
  
  log('\n' + '='.repeat(60), 'cyan');
  
  // Exit with appropriate code
  process.exit(results.failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch(error => {
  logError(`\nUnexpected error: ${error.message}`);
  process.exit(1);
});
