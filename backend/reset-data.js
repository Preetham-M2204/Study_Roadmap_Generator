/**
 * RESET SCRIPT - Clear Chats and Roadmaps
 * 
 * Clears all chats, roadmaps, and progress from MongoDB
 * Keeps user accounts intact
 */

const mongoose = require('mongoose');
const Chat = require('./models/Chat');
const Roadmap = require('./models/Roadmap');
const Progress = require('./models/Progress');
require('dotenv').config({ path: '../.env' });

const MONGODB_URI = process.env.MONGODB_URI;

async function resetData() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Delete all chats
    const deletedChats = await Chat.deleteMany({});
    console.log(`🗑️  Deleted ${deletedChats.deletedCount} chats`);

    // Delete all roadmaps
    const deletedRoadmaps = await Roadmap.deleteMany({});
    console.log(`🗑️  Deleted ${deletedRoadmaps.deletedCount} roadmaps`);

    // Delete all progress
    const deletedProgress = await Progress.deleteMany({});
    console.log(`🗑️  Deleted ${deletedProgress.deletedCount} progress records`);

    console.log('\n✅ Database reset complete!');
    console.log('👤 User accounts remain intact');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error resetting database:', error);
    process.exit(1);
  }
}

resetData();
