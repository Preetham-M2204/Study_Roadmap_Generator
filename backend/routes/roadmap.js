/**
 * roadmap.js - Roadmap Management Routes
 * 
 * LEARNING OBJECTIVES:
 * 1. CRUD operations for roadmaps
 * 2. Querying with population (joins)
 * 3. Aggregating progress data
 * 
 * ═══════════════════════════════════════════════════════════════════
 * ENDPOINTS:
 * ═══════════════════════════════════════════════════════════════════
 * 
 * GET    /api/roadmap              - Get all user's roadmaps
 * GET    /api/roadmap/:id          - Get single roadmap with progress
 * DELETE /api/roadmap/:id          - Delete roadmap
 * PUT    /api/roadmap/:id/archive  - Archive roadmap
 */

const express = require('express');
const router = express.Router();
const Roadmap = require('../models/Roadmap');
const Progress = require('../models/Progress');
const { protect } = require('../middleware/auth');

// ═══════════════════════════════════════════════════════════════════
// ROUTE 1: GET ALL USER'S ROADMAPS
// ═══════════════════════════════════════════════════════════════════

/**
 * GET /api/roadmap
 * 
 * Get all roadmaps for logged-in user
 * Includes progress summary for each roadmap
 */
router.get('/', protect, async (req, res) => {
  try {
    const roadmaps = await Roadmap.find({ 
      userId: req.user._id,
      status: { $ne: 'archived' }
    })
      .sort({ createdAt: -1 })
      .lean();
    
    // Attach progress to each roadmap
    const roadmapsWithProgress = await Promise.all(
      roadmaps.map(async (roadmap) => {
        const progress = await Progress.getProgressStats(req.user._id, roadmap._id);
        
        return {
          id: roadmap._id,
          title: roadmap.title,
          description: roadmap.description,
          totalTopics: roadmap.totalTopics,
          totalHours: roadmap.totalHours,
          phaseCount: roadmap.phases.length,
          progress,
          createdAt: roadmap.createdAt,
          status: roadmap.status
        };
      })
    );
    
    res.json({
      success: true,
      roadmaps: roadmapsWithProgress
    });
    
  } catch (error) {
    console.error('❌ Error fetching roadmaps:', error);
    res.status(500).json({
      error: 'Failed to fetch roadmaps',
      details: error.message
    });
  }
});

// ═══════════════════════════════════════════════════════════════════
// ROUTE 2: GET SINGLE ROADMAP WITH FULL DETAILS
// ═══════════════════════════════════════════════════════════════════

/**
 * GET /api/roadmap/:id
 * 
 * Get complete roadmap with all phases, topics, and progress
 * This is what frontend uses to display the Striver-style roadmap view
 */
router.get('/:id', protect, async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🔍 Fetching roadmap: ${id} for user: ${req.user._id}`);
    
    const roadmap = await Roadmap.findOne({
      _id: id,
      userId: req.user._id
    });
    
    if (!roadmap) {
      console.log('❌ Roadmap not found');
      return res.status(404).json({ error: 'Roadmap not found' });
    }
    
    console.log('✅ Roadmap found:', roadmap.title);
    
    // Get progress stats
    const progressStats = await Progress.getProgressStats(req.user._id, roadmap._id);
    console.log('📊 Progress stats:', progressStats);
    
    // Get completed topics list
    const completedTopics = await Progress.getCompletedTopics(req.user._id, roadmap._id);
    console.log('✓ Completed topics:', completedTopics.length);
    
    // Format response
    const response = {
      ...roadmap.toClientJSON(),
      progress: progressStats,
      completedTopicIds: completedTopics.map(p => p.topicId.toString())
    };
    
    console.log('📤 Sending roadmap response');
    console.log('📋 Response structure:', {
      hasId: !!response.id,
      hasTitle: !!response.title,
      hasPhases: !!response.phases,
      phasesCount: response.phases?.length,
      hasProgress: !!response.progress,
      progressKeys: response.progress ? Object.keys(response.progress) : [],
      hasCompletedTopicIds: !!response.completedTopicIds
    });
    
    res.json({
      success: true,
      roadmap: response
    });
    
  } catch (error) {
    console.error('❌ Error fetching roadmap:', error);
    res.status(500).json({
      error: 'Failed to fetch roadmap',
      details: error.message
    });
  }
});

// ═══════════════════════════════════════════════════════════════════
// ROUTE 3: DELETE ROADMAP
// ═══════════════════════════════════════════════════════════════════

/**
 * DELETE /api/roadmap/:id
 * 
 * Permanently delete roadmap and associated progress
 */
router.delete('/:id', protect, async (req, res) => {
  try {
    const { id } = req.params;
    
    const roadmap = await Roadmap.findOne({
      _id: id,
      userId: req.user._id
    });
    
    if (!roadmap) {
      return res.status(404).json({ error: 'Roadmap not found' });
    }
    
    // Delete associated progress records
    await Progress.deleteMany({ roadmapId: id });
    
    // Delete roadmap
    await roadmap.deleteOne();
    
    res.json({
      success: true,
      message: 'Roadmap deleted successfully'
    });
    
  } catch (error) {
    console.error('❌ Error deleting roadmap:', error);
    res.status(500).json({
      error: 'Failed to delete roadmap',
      details: error.message
    });
  }
});

// ═══════════════════════════════════════════════════════════════════
// ROUTE 4: ARCHIVE ROADMAP
// ═══════════════════════════════════════════════════════════════════

/**
 * PUT /api/roadmap/:id/archive
 * 
 * Archive roadmap (soft delete - can be restored)
 */
router.put('/:id/archive', protect, async (req, res) => {
  try {
    const { id } = req.params;
    
    const roadmap = await Roadmap.findOne({
      _id: id,
      userId: req.user._id
    });
    
    if (!roadmap) {
      return res.status(404).json({ error: 'Roadmap not found' });
    }
    
    roadmap.status = roadmap.status === 'archived' ? 'active' : 'archived';
    await roadmap.save();
    
    res.json({
      success: true,
      message: `Roadmap ${roadmap.status === 'archived' ? 'archived' : 'restored'}`,
      status: roadmap.status
    });
    
  } catch (error) {
    console.error('❌ Error archiving roadmap:', error);
    res.status(500).json({
      error: 'Failed to archive roadmap',
      details: error.message
    });
  }
});

// ═══════════════════════════════════════════════════════════════════
// EXPORT ROUTER
// ═══════════════════════════════════════════════════════════════════

module.exports = router;
