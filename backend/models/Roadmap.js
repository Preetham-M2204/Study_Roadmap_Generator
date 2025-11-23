/**
 * Roadmap.js - MongoDB Schema for Generated Learning Roadmaps
 * 
 * LEARNING OBJECTIVES:
 * 1. Complex nested schemas (Phases → Topics → Resources)
 * 2. Data modeling for hierarchical structures
 * 3. Progress tracking integration
 * 
 * ═══════════════════════════════════════════════════════════════════
 * WHAT IS A ROADMAP?
 * ═══════════════════════════════════════════════════════════════════
 * 
 * Think of Striver's A2Z DSA Sheet:
 * 
 * Roadmap: "Master DSA in 3 Months"
 *   ├─ Phase 1: Arrays (Fundamentals)
 *   │   ├─ Topic: Two Pointer Technique
 *   │   │   ├─ YouTube: "Two Pointers Explained"
 *   │   │   ├─ Article: GeeksForGeeks article
 *   │   │   └─ Practice: LeetCode #167
 *   │   └─ Topic: Sliding Window
 *   │
 *   ├─ Phase 2: Strings (Intermediate)
 *   └─ Phase 3: Dynamic Programming (Advanced)
 * 
 * ═══════════════════════════════════════════════════════════════════
 * DATA STRUCTURE:
 * ═══════════════════════════════════════════════════════════════════
 * 
 * Roadmap (1)
 *   → Phases (Array of objects)
 *       → Topics (Array of objects)
 *           → Resources (Array of objects)
 */

const mongoose = require('mongoose');

// ═══════════════════════════════════════════════════════════════════
// RESOURCE SUBDOCUMENT (YouTube, Article, Practice Problem)
// ═══════════════════════════════════════════════════════════════════

const ResourceSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
    // Example: "Two Pointer Technique - Striver"
  },
  
  type: {
    type: String,
    enum: ['video', 'youtube', 'playlist', 'article', 'practice', 'problem', 'documentation', 'book'],
    required: true
    // Maps to icons in frontend:
    // 'video' → YouTube icon
    // 'youtube' → YouTube icon (RAG uses this term)
    // 'playlist' → YouTube playlist (same as 'video')
    // 'article' → Document icon
    // 'practice' → Code icon
    // 'problem' → Practice problems (same as 'practice', RAG uses both terms)
  },
  
  url: {
    type: String,
    required: true,
    trim: true
    // Direct link to resource
  },
  
  platform: {
    type: String,
    trim: true
    // Example: "YouTube", "LeetCode", "GeeksForGeeks"
  },
  
  isPaid: {
    type: Boolean,
    default: false
    // Mark if resource requires payment
  }
}, { _id: false });  // Don't create separate IDs for resources

// ═══════════════════════════════════════════════════════════════════
// TOPIC SUBDOCUMENT (Individual Learning Unit)
// ═══════════════════════════════════════════════════════════════════

const TopicSchema = new mongoose.Schema({
  // Unique identifier from RAG service (e.g., "dp_01", "array_05")
  topicId: {
    type: String,
    required: true
    // This matches IDs in your dsa.json / interview.json files
  },
  
  // Topic name
  topic: {
    type: String,
    required: true,
    trim: true
    // Example: "Two Pointer Technique"
  },
  
  // Detailed description
  description: {
    type: String,
    required: true
    // Example: "Learn to solve array problems using two pointers..."
  },
  
  // Difficulty level
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    required: true
  },
  
  // Time estimate in hours
  estimatedHours: {
    type: Number,
    required: true,
    min: 0
    // Example: 4 (means 4 hours to complete)
  },
  
  // Prerequisites (array of topic IDs)
  prerequisites: {
    type: [String],
    default: []
    // Example: ["array_01", "array_02"]
    // Must complete these topics first
  },
  
  // Learning resources
  resources: {
    type: [ResourceSchema],
    default: []
  },
  
  // Position in learning sequence
  order: {
    type: Number,
    required: true
    // 1, 2, 3, 4... (order within phase)
  }
  
}, { _id: true });  // Each topic gets its own ID for progress tracking

// ═══════════════════════════════════════════════════════════════════
// PHASE SUBDOCUMENT (Learning Phase/Step)
// ═══════════════════════════════════════════════════════════════════

/**
 * CONCEPT: Learning Phases
 * 
 * Like Striver's "Step 1, Step 2, Step 3":
 * - Phase 1: Fundamentals (Easy topics)
 * - Phase 2: Intermediate (Medium topics)
 * - Phase 3: Advanced (Hard topics)
 * 
 * Users progress through phases sequentially
 */

const PhaseSchema = new mongoose.Schema({
  phaseNumber: {
    type: Number,
    required: true
    // 1, 2, 3, 4...
  },
  
  phaseName: {
    type: String,
    required: true,
    trim: true
    // Example: "Arrays and Hashing"
  },
  
  description: {
    type: String,
    trim: true
    // Brief overview of what this phase covers
  },
  
  topics: {
    type: [TopicSchema],
    default: []
  },
  
  totalHours: {
    type: Number,
    required: true,
    min: 0
    // Sum of all topic hours in this phase
  }
  
}, { _id: true });

// ═══════════════════════════════════════════════════════════════════
// MAIN ROADMAP SCHEMA
// ═══════════════════════════════════════════════════════════════════

const RoadmapSchema = new mongoose.Schema({
  // Owner of this roadmap
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Link back to chat that generated this
  chatId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chat',
    default: null
  },
  
  // Roadmap title
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
    // Example: "DSA Mastery in 3 Months"
    // Increased to 500 to handle longer AI-generated titles
  },
  
  // Brief description
  description: {
    type: String,
    trim: true
    // Example: "Comprehensive roadmap with 50 topics from database"
  },
  
  // AI-generated summary (2-3 paragraphs)
  aiSummary: {
    type: String,
    trim: true
    // Generated by Gemini explaining the roadmap
  },
  
  // All learning phases
  phases: {
    type: [PhaseSchema],
    default: []
  },
  
  // Total statistics
  totalTopics: {
    type: Number,
    required: true,
    min: 0
  },
  
  totalHours: {
    type: Number,
    required: true,
    min: 0
  },
  
  // Metadata from RAG service
  metadata: {
    query: String,        // Original user query
    domain: String,       // dsa, ml, etc.
    mode: String,         // 'rag' or 'llm_only'
    source: String,       // 'database' or 'ai_generated'
    generatedAt: {
      type: Date,
      default: Date.now
    }
  },
  
  // Roadmap status
  status: {
    type: String,
    enum: ['active', 'completed', 'archived'],
    default: 'active'
  },
  
  // Is this roadmap public/shareable?
  isPublic: {
    type: Boolean,
    default: false
  }
  
}, {
  timestamps: true
});

// ═══════════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════════

// Find user's roadmaps quickly
RoadmapSchema.index({ userId: 1, createdAt: -1 });

// Find roadmap by chat
RoadmapSchema.index({ chatId: 1 });

// ═══════════════════════════════════════════════════════════════════
// VIRTUAL FIELDS (computed, not stored in DB)
// ═══════════════════════════════════════════════════════════════════

/**
 * CONCEPT: Virtuals
 * 
 * Computed properties that don't take up database space
 * Calculated on-the-fly when you access them
 */

// Get progress percentage (calculated from Progress collection)
RoadmapSchema.virtual('progress', {
  ref: 'Progress',
  localField: '_id',
  foreignField: 'roadmapId',
  count: true  // Just count, don't load full documents
});

// ═══════════════════════════════════════════════════════════════════
// INSTANCE METHODS
// ═══════════════════════════════════════════════════════════════════

/**
 * Get all topic IDs in this roadmap (flattened)
 * 
 * WHY?
 * For progress tracking - we need list of all topics to check completion
 * 
 * Usage:
 *   const allTopicIds = roadmap.getAllTopicIds();
 *   // ["array_01", "array_02", "dp_01", ...]
 */
RoadmapSchema.methods.getAllTopicIds = function() {
  const topicIds = [];
  
  // Loop through phases
  for (const phase of this.phases) {
    // Loop through topics in each phase
    for (const topic of phase.topics) {
      topicIds.push(topic.topicId);
    }
  }
  
  return topicIds;
};

/**
 * Get statistics summary
 */
RoadmapSchema.methods.getStats = function() {
  // Count topics by difficulty
  let easy = 0, medium = 0, hard = 0;
  
  for (const phase of this.phases) {
    for (const topic of phase.topics) {
      if (topic.difficulty === 'easy') easy++;
      else if (topic.difficulty === 'medium') medium++;
      else if (topic.difficulty === 'hard') hard++;
    }
  }
  
  return {
    totalPhases: this.phases.length,
    totalTopics: this.totalTopics,
    totalHours: this.totalHours,
    byDifficulty: { easy, medium, hard }
  };
};

/**
 * Convert to frontend-friendly format
 */
RoadmapSchema.methods.toClientJSON = function() {
  return {
    id: this._id,
    title: this.title,
    description: this.description,
    aiSummary: this.aiSummary,
    phases: this.phases.map(phase => ({
      phaseNumber: phase.phaseNumber,
      phaseName: phase.phaseName,
      description: phase.description,
      totalHours: phase.totalHours,
      topics: phase.topics.map(topic => ({
        id: topic._id,
        topicId: topic.topicId,
        topic: topic.topic,
        description: topic.description,
        difficulty: topic.difficulty,
        estimatedHours: topic.estimatedHours,
        prerequisites: topic.prerequisites,
        resources: topic.resources,
        order: topic.order
      }))
    })),
    stats: this.getStats(),
    status: this.status,
    createdAt: this.createdAt,
    metadata: this.metadata
  };
};

// ═══════════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════════

/**
 * Find user's roadmaps with progress
 */
RoadmapSchema.statics.findByUserWithProgress = async function(userId) {
  return this.find({ userId, status: { $ne: 'archived' } })
    .sort({ createdAt: -1 })
    .populate('progress')  // Include progress virtual
    .lean();
};

/**
 * Create roadmap from RAG response
 * 
 * This is a helper to transform RAG service response into our schema
 */
RoadmapSchema.statics.createFromRAG = async function(userId, chatId, ragResponse) {
  try {
    console.log('🔧 Creating roadmap from RAG response...');
    console.log('RAG Response keys:', Object.keys(ragResponse));
    
    // Handle both snake_case and camelCase field names
    let title = ragResponse.title || 'Learning Roadmap';
    // Truncate title if too long (max 500 chars)
    if (title.length > 500) {
      title = title.substring(0, 497) + '...';
    }
    const description = ragResponse.description || '';
    const aiSummary = ragResponse.ai_summary || ragResponse.aiSummary || '';
    const totalTopics = ragResponse.total_topics || ragResponse.totalTopics || 0;
    const totalHours = ragResponse.total_hours || ragResponse.totalHours || 0;
    const phases = ragResponse.phases || [];
    
    console.log(`📊 Roadmap stats: ${totalTopics} topics, ${totalHours} hours, ${phases.length} phases`);
    
    // Transform RAG response to our schema format
    const roadmap = new this({
      userId,
      chatId,
      title,
      description,
      aiSummary,
      totalTopics,
      totalHours,
      phases: phases.map((phase, phaseIdx) => {
        console.log(`📝 Processing Phase ${phaseIdx + 1}: ${phase.phase_name || phase.phaseName}`);
        
        return {
          phaseNumber: phase.phase_number || phase.phaseNumber || (phaseIdx + 1),
          phaseName: phase.phase_name || phase.phaseName || `Phase ${phaseIdx + 1}`,
          description: phase.description || '',
          totalHours: phase.total_hours || phase.totalHours || 0,
          topics: (phase.topics || []).map((topic, topicIdx) => ({
            topicId: topic.id || topic.topicId || `topic_${phaseIdx}_${topicIdx}`,
            topic: topic.topic || 'Untitled Topic',
            description: topic.description || '',
            difficulty: topic.difficulty || 'medium',
            estimatedHours: topic.estimated_hours || topic.estimatedHours || 1,
            prerequisites: topic.prerequisites || [],
            resources: (topic.resources || []).map(res => {
              // Normalize resource types for frontend consistency
              let resourceType = res.type || 'article';
              if (resourceType === 'problem') {
                resourceType = 'practice';
              } else if (resourceType === 'youtube' || resourceType === 'playlist') {
                resourceType = 'video';
              }
              
              return {
                title: res.title || 'Resource',
                type: resourceType,
                url: res.url || '#',
                platform: res.platform
              };
            }),
            order: topic.order || (topicIdx + 1)
          }))
        };
      }),
      metadata: {
        query: ragResponse.metadata?.query || '',
        domain: ragResponse.metadata?.domain || '',
        mode: ragResponse.metadata?.mode || 'rag',
        source: ragResponse.metadata?.source || 'rag_service',
        generatedAt: new Date()
      }
    });
    
    await roadmap.save();
    console.log('✅ Roadmap saved to database');
    return roadmap;
    
  } catch (error) {
    console.error('❌ Error creating roadmap from RAG:', error);
    console.error('RAG Response summary:', {
      title: ragResponse.title?.substring(0, 100),
      phases: ragResponse.phases?.length,
      totalTopics: ragResponse.total_topics || ragResponse.totalTopics
    });
    // Full response with vectors is too large for logs
    throw error;
  }
};

// ═══════════════════════════════════════════════════════════════════
// EXPORT MODEL
// ═══════════════════════════════════════════════════════════════════

module.exports = mongoose.model('Roadmap', RoadmapSchema);
