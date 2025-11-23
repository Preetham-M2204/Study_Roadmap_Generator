/**
 * Simplified API Test - Chat Only
 * Tests basic chat functionality without roadmap generation
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

const logSuccess = (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`);
const logError = (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`);
const logInfo = (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`);
const logSection = (msg) => console.log(`\n${colors.cyan}============================================================\n  ${msg}\n============================================================${colors.reset}\n`);

let results = { passed: 0, failed: 0, tests: [] };

async function runTest(name, testFn) {
  try {
    await testFn();
    results.passed++;
    results.tests.push({ name, status: 'PASS' });
  } catch (error) {
    results.failed++;
    results.tests.push({ name, status: 'FAIL', error: error.message });
    logError(`${name}: ${error.message}`);
    throw error;
  }
}

async function main() {
  const startTime = Date.now();
  
  console.log(`\n${colors.cyan}🚀 STARTING CHAT API TESTS${colors.reset}`);
  console.log('============================================================\n');

  let token, chatId;
  const testEmail = `test${Date.now()}@example.com`;

  try {
    // Test 1: Health Check
    logSection('TEST 1: Server Health Check');
    await runTest('Server health', async () => {
      const response = await axios.get(`${BASE_URL}/health`);
      if (response.status !== 200) throw new Error('Server not responding');
      logSuccess('Express backend is running');
    });

    // Test 2: Register
    logSection('TEST 2: User Registration');
    await runTest('User registration', async () => {
      logInfo(`Registering user: ${testEmail}`);
      const response = await axios.post(`${BASE_URL}/api/auth/register`, {
        name: 'Test User',
        email: testEmail,
        password: 'Test123!@#'
      });
      token = response.data.token;
      if (!token) throw new Error('No token received');
      logSuccess('User registered successfully');
    });

    // Test 3: Login
    logSection('TEST 3: User Login');
    await runTest('User login', async () => {
      logInfo(`Logging in: ${testEmail}`);
      const response = await axios.post(`${BASE_URL}/api/auth/login`, {
        email: testEmail,
        password: 'Test123!@#'
      });
      if (!response.data.token) throw new Error('Login failed');
      logSuccess('Login successful');
    });

    // Test 4: Create Chat
    logSection('TEST 4: Create Chat Session');
    await runTest('Create chat', async () => {
      logInfo('Creating new chat...');
      const response = await axios.post(
        `${BASE_URL}/api/chat/new`,
        { title: 'Test Chat - Learn DSA' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      chatId = response.data.chat.id;
      if (!chatId) throw new Error('No chat ID received');
      logSuccess(`Chat created: ${chatId}`);
    });

    // Test 5: Send Messages
    logSection('TEST 5: Send Messages');
    await runTest('Send messages', async () => {
      const messages = [
        "I want to learn Data Structures and Algorithms",
        "I'm a beginner with basic programming knowledge"
      ];
      
      for (let i = 0; i < messages.length; i++) {
        logInfo(`Sending message ${i + 1}/${messages.length}`);
        const response = await axios.post(
          `${BASE_URL}/api/chat/${chatId}/message`,
          { message: messages[i] },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        if (!response.data.success) throw new Error('Message failed');
        logSuccess(`Message ${i + 1}: "${messages[i].slice(0, 40)}..."`);
        logInfo(`AI: "${response.data.message.content.slice(0, 60)}..."`);
      }
    });

    // Test 6: Get Chat
    logSection('TEST 6: Retrieve Chat');
    await runTest('Get chat', async () => {
      const response = await axios.get(
        `${BASE_URL}/api/chat/${chatId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!response.data.chat) throw new Error('Chat not found');
      logSuccess(`Chat retrieved: ${response.data.chat.messages.length} messages`);
    });

    // Test 7: Get All Chats
    logSection('TEST 7: Get All Chats');
    await runTest('Get all chats', async () => {
      const response = await axios.get(
        `${BASE_URL}/api/chat`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!response.data.chats) throw new Error('Failed to get chats');
      logSuccess(`Found ${response.data.chats.length} chat(s)`);
    });

  } catch (error) {
    logError(`\nTests stopped due to error: ${error.message}`);
  }

  // Summary
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  
  logSection('TEST SUMMARY');
  console.log(`Total tests: ${results.passed + results.failed}`);
  console.log(`${colors.green}Passed: ${results.passed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${results.failed}${colors.reset}`);
  console.log(`Duration: ${duration}s\n`);

  if (results.failed > 0) {
    console.log('Failed tests:');
    results.tests.filter(t => t.status === 'FAIL').forEach(t => {
      console.log(`  ${colors.red}- ${t.name}: ${t.error}${colors.reset}`);
    });
  }

  console.log('============================================================\n');
  process.exit(results.failed > 0 ? 1 : 0);
}

main();
