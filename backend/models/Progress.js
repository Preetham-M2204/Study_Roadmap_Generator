/**
 * Progress.js - MongoDB Schema for Topic Completion Tracking
 * 
 * LEARNING OBJECTIVES:
 * 1. Simple join table pattern (Many-to-Many relationship)
 * 2. Tracking user actions over time
 * 3. Efficient queries for progress statistics
 * 
 * ═══════════════════════════════════════════════════════════════════
 * WHAT IS PROGRESS TRACKING?
 * ═══════════════════════════════════════════════════════════════════
 * 
 * Like checking off items on a TODO list:
 * 
 * User checks: "Two Pointer Technique" ✅
 * → We create Progress record:
 *   - User: John (user123)
 *   - Roadmap: "Master DSA" (roadmap456)
 *   - Topic: "Two Pointer" (topic789)
 *   - Completed: true
 *   - When: 2025-11-23 14:30
 * 
 * ═══════════════════════════════════════════════════════════════════
 * WHY SEPARATE COLLECTION?
 * ═══════════════════════════════════════════════════════════════════
 * 
 * OPTION A: Store completion in Roadmap document ❌
 * Problem: Multiple users might use same roadmap template
 * 
 * OPTION B: Separate Progress collection ✅
 * Each user has their own progress records
 * Same roadmap can be used by 1000 users with different progress
 */

const mongoose = require('mongoose');

const ProgressSchema = new mongoose.Schema({
  // Which user?
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Which roadmap?
  roadmapId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Roadmap',
    required: true,
    index: true
  },
  
  // Which topic? (the _id from Topic subdocument in Roadmap)
  topicId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
    // This matches topic._id in Roadmap.phases.topics
  },
  
  // Topic identifier from RAG (for reference)
  topicIdentifier: {
    type: String,
    required: true
    // Example: "array_01", "dp_05"
    // Helps cross-reference with original data source
  },
  
  // Is this topic completed?
  completed: {
    type: Boolean,
    default: false
  },
  
  // When did user complete it?
  completedAt: {
    type: Date,
    default: null
  },
  
  // Optional: User notes on this topic
  notes: {
    type: String,
    maxlength: 1000,
    default: ''
    // User can add personal notes: "Found this tricky, review again"
  },
  
  // Optional: Self-rating (how well did they understand?)
  rating: {
    type: Number,
    min: 1,
    max: 5,
    default: null
    // 1 = "Didn't understand", 5 = "Mastered"
  },
  
  // Time spent on this topic (in minutes)
  timeSpent: {
    type: Number,
    default: 0,
    min: 0
    // User can optionally track time spent
  }
  
}, {
  timestamps: true  // createdAt, updatedAt
});

// ═══════════════════════════════════════════════════════════════════
// COMPOUND INDEXES (for faster queries)
// ═══════════════════════════════════════════════════════════════════

/**
 * CONCEPT: Compound Index
 * 
 * Index on multiple fields together
 * Makes specific query patterns VERY fast
 */

// Primary lookup: Find user's progress on a roadmap
ProgressSchema.index({ userId: 1, roadmapId: 1 });

// Unique constraint: User can't complete same topic twice
ProgressSchema.index({ userId: 1, roadmapId: 1, topicId: 1 }, { unique: true });

// Quick stats: Count completed topics for a user
ProgressSchema.index({ userId: 1, completed: 1 });

// ═══════════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════════

/**
 * Mark topic as complete (or toggle if already exists)
 * 
 * Usage:
 *   await Progress.markComplete(userId, roadmapId, topicId, topicIdentifier);
 */
ProgressSchema.statics.markComplete = async function(userId, roadmapId, topicId, topicIdentifier) {
  // Try to find existing progress record
  let progress = await this.findOne({ userId, roadmapId, topicId });
  
  if (progress) {
    // Toggle completion
    progress.completed = !progress.completed;
    progress.completedAt = progress.completed ? new Date() : null;
  } else {
    // Create new progress record
    progress = new this({
      userId,
      roadmapId,
      topicId,
      topicIdentifier,
      completed: true,
      completedAt: new Date()
    });
  }
  
  await progress.save();
  return progress;
};

/**
 * Get user's progress on a specific roadmap
 * 
 * Returns:
 * {
 *   total: 50,
 *   completed: 12,
 *   percentage: 24,
 *   byDifficulty: { easy: 5/10, medium: 5/20, hard: 2/20 }
 * }
 */
ProgressSchema.statics.getProgressStats = async function(userId, roadmapId) {
  // Get the roadmap to know total topics
  const Roadmap = mongoose.model('Roadmap');
  const roadmap = await Roadmap.findById(roadmapId);
  
  if (!roadmap) {
    throw new Error('Roadmap not found');
  }
  
  // Get all progress records for this user + roadmap
  const progressRecords = await this.find({ userId, roadmapId });
  
  // Count completed topics
  const completedCount = progressRecords.filter(p => p.completed).length;
  
  // Calculate by difficulty
  const stats = {
    easy: { total: 0, completed: 0 },
    medium: { total: 0, completed: 0 },
    hard: { total: 0, completed: 0 }
  };
  
  // Count totals from roadmap
  for (const phase of roadmap.phases) {
    for (const topic of phase.topics) {
      stats[topic.difficulty].total++;
      
      // Check if this topic is completed
      const isCompleted = progressRecords.some(
        p => p.topicId.toString() === topic._id.toString() && p.completed
      );
      
      if (isCompleted) {
        stats[topic.difficulty].completed++;
      }
    }
  }
  
  return {
    totalTopics: roadmap.totalTopics,
    completedTopics: completedCount,
    percentageComplete: Math.round((completedCount / roadmap.totalTopics) * 100),
    byDifficulty: stats
  };
};

/**
 * Get user's overall progress across all roadmaps
 */
ProgressSchema.statics.getUserOverallStats = async function(userId) {
  const allProgress = await this.find({ userId });
  
  const totalTopics = allProgress.length;
  const completedTopics = allProgress.filter(p => p.completed).length;
  const totalTimeSpent = allProgress.reduce((sum, p) => sum + p.timeSpent, 0);
  
  return {
    totalTopics,
    completedTopics,
    percentage: totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0,
    totalTimeSpent,  // in minutes
    totalTimeSpentHours: Math.round(totalTimeSpent / 60)
  };
};

/**
 * Get completed topics list for a roadmap
 */
ProgressSchema.statics.getCompletedTopics = async function(userId, roadmapId) {
  return this.find({ 
    userId, 
    roadmapId, 
    completed: true 
  })
    .select('topicId topicIdentifier completedAt rating')
    .lean();
};

// ═══════════════════════════════════════════════════════════════════
// INSTANCE METHODS
// ═══════════════════════════════════════════════════════════════════

/**
 * Toggle completion status
 */
ProgressSchema.methods.toggle = async function() {
  this.completed = !this.completed;
  this.completedAt = this.completed ? new Date() : null;
  await this.save();
  return this;
};

// ═══════════════════════════════════════════════════════════════════
// MIDDLEWARE
// ═══════════════════════════════════════════════════════════════════

/**
 * PRE-SAVE: Automatically set completedAt when marking as complete
 * 
 * Note: In Mongoose 6.x+, synchronous pre-save hooks don't need next()
 */
ProgressSchema.pre('save', function() {
  // If marking as complete for first time
  if (this.isModified('completed') && this.completed && !this.completedAt) {
    this.completedAt = new Date();
  }
  
  // If unmarking as complete
  if (this.isModified('completed') && !this.completed) {
    this.completedAt = null;
  }
});

// ═══════════════════════════════════════════════════════════════════
// EXPORT MODEL
// ═══════════════════════════════════════════════════════════════════

module.exports = mongoose.model('Progress', ProgressSchema);
