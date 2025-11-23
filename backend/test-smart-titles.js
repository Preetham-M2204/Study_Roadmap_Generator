/**
 * TEST: Smart Title Generation + Chat Loading Flow
 * 
 * This script tests:
 * 1. Creating new chat with first message
 * 2. Smart title generation from first message
 * 3. Roadmap generation with matching title
 * 4. Loading existing chat by ID
 * 5. Sidebar data (recent chats with titles)
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';
let authToken = '';
let testUserId = '';

// Test credentials
const TEST_USER = {
  email: `test_${Date.now()}@example.com`,
  password: 'TestPassword123!',
  name: 'Smart Title Tester'
};

// ANSI color codes for pretty output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'bold');
  console.log('='.repeat(60) + '\n');
}

async function register() {
  logSection('TEST 1: User Registration');
  try {
    const response = await axios.post(`${BASE_URL}/auth/register`, TEST_USER);
    authToken = response.data.token;
    testUserId = response.data.user.id;  // Use 'id' not '_id'
    log('✅ Registration successful', 'green');
    log(`User ID: ${testUserId}`, 'blue');
    log(`Token: ${authToken.substring(0, 20)}...`, 'blue');
    return true;
  } catch (error) {
    log('❌ Registration failed', 'red');
    console.error(error.response?.data || error.message);
    return false;
  }
}

async function createChatWithMessage(message) {
  logSection('TEST 2: Create Chat with First Message (Smart Title)');
  try {
    // Create chat
    log(`Creating new chat...`, 'yellow');
    const createResponse = await axios.post(
      `${BASE_URL}/chat/new`,
      {},
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    const chatId = createResponse.data.chat.id;  // Use 'id' not '_id'
    log(`✅ Chat created: ${chatId}`, 'green');

    // Send first message (should trigger smart title generation)
    log(`\nSending first message: "${message}"`, 'yellow');
    const messageResponse = await axios.post(
      `${BASE_URL}/chat/${chatId}/message`,
      { 
        message,
        shouldGenerateRoadmap: true  // Request roadmap generation
      },
      { headers: { Authorization: `Bearer ${authToken}` } }
    );

    log(`✅ Message sent`, 'green');
    
    // Fetch the updated chat to see the title
    const chatResponse = await axios.get(
      `${BASE_URL}/chat/${chatId}`,
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    const chat = chatResponse.data.chat;
    
    log(`📝 Smart Title Generated: "${chat.title}"`, 'blue');
    log(`Original Message: "${message}"`, 'blue');
    
    // Check if roadmap was generated
    if (messageResponse.data.shouldGenerateRoadmap && messageResponse.data.roadmap) {
      log(`✅ Roadmap generated automatically`, 'green');
      log(`🗺️  Roadmap Title: "${messageResponse.data.roadmap.title}"`, 'blue');
      log(`Total Topics: ${messageResponse.data.roadmap.totalTopics}`, 'blue');
      log(`Phases: ${messageResponse.data.roadmap.phases.length}`, 'blue');
      
      // Verify titles match
      if (chat.title === messageResponse.data.roadmap.title) {
        log(`✅ Chat and Roadmap titles match! (Duo linked correctly)`, 'green');
      } else {
        log(`⚠️  Title mismatch:`, 'yellow');
        log(`   Chat: "${chat.title}"`, 'yellow');
        log(`   Roadmap: "${messageResponse.data.roadmap.title}"`, 'yellow');
      }
    }

    return chatId;
  } catch (error) {
    log('❌ Chat creation/message failed', 'red');
    console.error(error.response?.data || error.message);
    return null;
  }
}

async function loadExistingChat(chatId) {
  logSection('TEST 3: Load Existing Chat by ID');
  try {
    log(`Loading chat: ${chatId}`, 'yellow');
    const response = await axios.get(
      `${BASE_URL}/chat/${chatId}`,
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    
    const chat = response.data.chat;
    log(`✅ Chat loaded successfully`, 'green');
    log(`Title: "${chat.title}"`, 'blue');
    log(`Messages: ${chat.messages.length}`, 'blue');
    log(`Roadmap Generated: ${chat.roadmapGenerated}`, 'blue');
    
    return true;
  } catch (error) {
    log('❌ Failed to load chat', 'red');
    console.error(error.response?.data || error.message);
    return false;
  }
}

async function checkSidebarData() {
  logSection('TEST 4: Sidebar Recent Chats (Smart Titles)');
  try {
    log(`Fetching recent chats...`, 'yellow');
    const response = await axios.get(
      `${BASE_URL}/chat`,
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    
    log(`✅ Found ${response.data.chats.length} chat(s)`, 'green');
    response.data.chats.forEach((chat, index) => {
      log(`\nChat ${index + 1}:`, 'bold');
      log(`  ID: ${chat.id}`, 'blue');  // Use 'id' not '_id'
      log(`  Title: "${chat.title}"`, 'blue');
      log(`  Messages: ${chat.messageCount}`, 'blue');
      log(`  Roadmap: ${chat.roadmapGenerated ? '✅ Generated' : '❌ Not generated'}`, 'blue');
    });
    
    return true;
  } catch (error) {
    log('❌ Failed to fetch chats', 'red');
    console.error(error.response?.data || error.message);
    return false;
  }
}

async function testSmartTitleVariations() {
  logSection('TEST 5: Smart Title Generation Variations');
  
  const testMessages = [
    'I want to learn DSA in 3 weeks',
    'Please help me learn system design',
    'Can you help me with machine learning fundamentals',
    'Hey, I need to master React in 2 months',
    'I\'m trying to learn cloud computing for my new job'
  ];
  
  log(`Testing ${testMessages.length} different message formats...\n`, 'yellow');
  
  for (let i = 0; i < testMessages.length; i++) {
    const message = testMessages[i];
    log(`Test ${i + 1}: "${message}"`, 'yellow');
    
    try {
      // Create chat
      const createResponse = await axios.post(
        `${BASE_URL}/chat/new`,
        {},
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      const chatId = createResponse.data.chat.id;  // Use 'id' not '_id'
      
      // Send message
      await axios.post(
        `${BASE_URL}/chat/${chatId}/message`,
        { message, shouldGenerateRoadmap: false },  // No roadmap for title tests
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      
      // Fetch chat to see title
      const chatResponse = await axios.get(
        `${BASE_URL}/chat/${chatId}`,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      
      const generatedTitle = chatResponse.data.chat.title;
      log(`   → Generated: "${generatedTitle}"`, 'green');
      
      // Verify title quality
      if (generatedTitle.toLowerCase().includes('learn') || 
          generatedTitle.toLowerCase().includes('master')) {
        log(`   ✅ Title looks good!`, 'green');
      } else {
        log(`   ⚠️  Title might need improvement`, 'yellow');
      }
      
    } catch (error) {
      log(`   ❌ Failed: ${error.response?.data?.error || error.message}`, 'red');
    }
    
    console.log('');  // Spacing
  }
}

// Main test runner
async function runAllTests() {
  log('\n🚀 Starting Smart Title Generation Tests\n', 'bold');
  
  // Test 1: Register user
  const registered = await register();
  if (!registered) {
    log('\n❌ Tests aborted - registration failed', 'red');
    return;
  }
  
  // Test 2: Create chat with message (triggers smart title + roadmap)
  const chatId = await createChatWithMessage('I want to learn DSA in 3 weeks');
  if (!chatId) {
    log('\n❌ Tests aborted - chat creation failed', 'red');
    return;
  }
  
  // Test 3: Load existing chat
  await loadExistingChat(chatId);
  
  // Test 4: Check sidebar data
  await checkSidebarData();
  
  // Test 5: Test title generation with different messages
  await testSmartTitleVariations();
  
  // Summary
  logSection('🎉 ALL TESTS COMPLETED');
  log('Check the results above to verify:', 'blue');
  log('  ✅ Smart titles generated from first message', 'blue');
  log('  ✅ Chat and roadmap titles match (duo)', 'blue');
  log('  ✅ Existing chats can be loaded by ID', 'blue');
  log('  ✅ Sidebar shows chats with smart titles', 'blue');
}

// Run tests
runAllTests().catch(error => {
  log('\n💥 Test runner crashed', 'red');
  console.error(error);
  process.exit(1);
});
