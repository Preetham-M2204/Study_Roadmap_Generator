/**
 * progress.js - Progress Tracking Routes
 * 
 * LEARNING OBJECTIVES:
 * 1. Toggle operations (mark complete/incomplete)
 * 2. Statistics aggregation
 * 3. Real-time progress updates
 * 
 * ═══════════════════════════════════════════════════════════════════
 * ENDPOINTS:
 * ═══════════════════════════════════════════════════════════════════
 * 
 * POST   /api/progress/toggle       - Toggle topic completion
 * GET    /api/progress/roadmap/:id  - Get progress for roadmap
 * GET    /api/progress/stats        - Get overall user stats
 * PUT    /api/progress/:id/notes    - Update topic notes
 * PUT    /api/progress/:id/rating   - Rate topic understanding
 */

const express = require('express');
const router = express.Router();
const Progress = require('../models/Progress');
const Roadmap = require('../models/Roadmap');
const { protect } = require('../middleware/auth');

// ═══════════════════════════════════════════════════════════════════
// ROUTE 1: TOGGLE TOPIC COMPLETION
// ═══════════════════════════════════════════════════════════════════

/**
 * POST /api/progress/toggle
 * 
 * Mark topic as complete or incomplete (checkbox behavior)
 * 
 * THIS IS THE MAIN ENDPOINT - Called when user checks/unchecks topic
 * 
 * Request body:
 * {
 *   "roadmapId": "673f123...",
 *   "topicId": "673f456...",      // MongoDB _id from Roadmap.phases.topics
 *   "topicIdentifier": "array_01" // Original ID from JSON
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "progress": { completed: true, completedAt: "2025-11-23..." },
 *   "stats": { total: 50, completed: 13, percentage: 26 }
 * }
 */
router.post('/toggle', protect, async (req, res) => {
  try {
    const { roadmapId, topicId, topicIdentifier } = req.body;
    
    // Validation
    if (!roadmapId || !topicId || !topicIdentifier) {
      return res.status(400).json({
        error: 'Missing required fields: roadmapId, topicId, topicIdentifier'
      });
    }
    
    // Verify roadmap belongs to user
    const roadmap = await Roadmap.findOne({
      _id: roadmapId,
      userId: req.user._id
    });
    
    if (!roadmap) {
      return res.status(404).json({ error: 'Roadmap not found' });
    }
    
    // Toggle progress
    const progress = await Progress.markComplete(
      req.user._id,
      roadmapId,
      topicId,
      topicIdentifier
    );
    
    // Get updated stats
    const stats = await Progress.getProgressStats(req.user._id, roadmapId);
    
    console.log(`✅ Topic ${topicIdentifier} marked as ${progress.completed ? 'complete' : 'incomplete'}`);
    
    res.json({
      success: true,
      progress: {
        id: progress._id,
        completed: progress.completed,
        completedAt: progress.completedAt
      },
      stats
    });
    
  } catch (error) {
    console.error('❌ Error toggling progress:', error);
    res.status(500).json({
      error: 'Failed to update progress',
      details: error.message
    });
  }
});

// ═══════════════════════════════════════════════════════════════════
// ROUTE 2: GET PROGRESS FOR ROADMAP
// ═══════════════════════════════════════════════════════════════════

/**
 * GET /api/progress/roadmap/:roadmapId
 * 
 * Get detailed progress statistics for a roadmap
 * Includes per-difficulty breakdown
 */
router.get('/roadmap/:roadmapId', protect, async (req, res) => {
  try {
    const { roadmapId } = req.params;
    
    // Verify ownership
    const roadmap = await Roadmap.findOne({
      _id: roadmapId,
      userId: req.user._id
    });
    
    if (!roadmap) {
      return res.status(404).json({ error: 'Roadmap not found' });
    }
    
    // Get stats
    const stats = await Progress.getProgressStats(req.user._id, roadmapId);
    
    // Get completed topics with timestamps
    const completedTopics = await Progress.getCompletedTopics(req.user._id, roadmapId);
    
    res.json({
      success: true,
      stats,
      completedTopics: completedTopics.map(p => ({
        topicId: p.topicId,
        topicIdentifier: p.topicIdentifier,
        completedAt: p.completedAt,
        rating: p.rating
      }))
    });
    
  } catch (error) {
    console.error('❌ Error fetching progress:', error);
    res.status(500).json({
      error: 'Failed to fetch progress',
      details: error.message
    });
  }
});

// ═══════════════════════════════════════════════════════════════════
// ROUTE 3: GET OVERALL USER STATISTICS
// ═══════════════════════════════════════════════════════════════════

/**
 * GET /api/progress/stats
 * 
 * Get user's overall learning statistics across all roadmaps
 * Used for dashboard/profile display
 */
router.get('/stats', protect, async (req, res) => {
  try {
    const stats = await Progress.getUserOverallStats(req.user._id);
    
    // Get roadmap count
    const roadmapCount = await Roadmap.countDocuments({
      userId: req.user._id,
      status: { $ne: 'archived' }
    });
    
    res.json({
      success: true,
      stats: {
        ...stats,
        activeRoadmaps: roadmapCount
      }
    });
    
  } catch (error) {
    console.error('❌ Error fetching stats:', error);
    res.status(500).json({
      error: 'Failed to fetch statistics',
      details: error.message
    });
  }
});

// ═══════════════════════════════════════════════════════════════════
// ROUTE 4: UPDATE TOPIC NOTES
// ═══════════════════════════════════════════════════════════════════

/**
 * PUT /api/progress/:progressId/notes
 * 
 * Add/update personal notes for a topic
 * 
 * Request body:
 * {
 *   "notes": "Found this tricky, need to review recursion"
 * }
 */
router.put('/:progressId/notes', protect, async (req, res) => {
  try {
    const { progressId } = req.params;
    const { notes } = req.body;
    
    const progress = await Progress.findOne({
      _id: progressId,
      userId: req.user._id
    });
    
    if (!progress) {
      return res.status(404).json({ error: 'Progress record not found' });
    }
    
    progress.notes = notes || '';
    await progress.save();
    
    res.json({
      success: true,
      progress: {
        id: progress._id,
        notes: progress.notes
      }
    });
    
  } catch (error) {
    console.error('❌ Error updating notes:', error);
    res.status(500).json({
      error: 'Failed to update notes',
      details: error.message
    });
  }
});

// ═══════════════════════════════════════════════════════════════════
// ROUTE 5: RATE TOPIC UNDERSTANDING
// ═══════════════════════════════════════════════════════════════════

/**
 * PUT /api/progress/:progressId/rating
 * 
 * Rate how well user understood the topic (1-5 stars)
 * 
 * Request body:
 * {
 *   "rating": 4
 * }
 */
router.put('/:progressId/rating', protect, async (req, res) => {
  try {
    const { progressId } = req.params;
    const { rating } = req.body;
    
    // Validation
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }
    
    const progress = await Progress.findOne({
      _id: progressId,
      userId: req.user._id
    });
    
    if (!progress) {
      return res.status(404).json({ error: 'Progress record not found' });
    }
    
    progress.rating = rating;
    await progress.save();
    
    res.json({
      success: true,
      progress: {
        id: progress._id,
        rating: progress.rating
      }
    });
    
  } catch (error) {
    console.error('❌ Error updating rating:', error);
    res.status(500).json({
      error: 'Failed to update rating',
      details: error.message
    });
  }
});

// ═══════════════════════════════════════════════════════════════════
// EXPORT ROUTER
// ═══════════════════════════════════════════════════════════════════

module.exports = router;
