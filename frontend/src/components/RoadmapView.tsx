import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Youtube, FileText, Code, CheckCircle2, Circle } from 'lucide-react';
import './RoadmapView.css';
import { roadmapAPI, progressAPI } from '../services/api';

/**
 * RoadmapView.tsx - Striver-Style Roadmap Display
 * 
 * LEARNING OBJECTIVES:
 * 1. Complex nested data rendering (Phases → Topics → Resources)
 * 2. Collapsible sections with state management
 * 3. Progress tracking with checkboxes
 * 4. Real-time progress calculations
 * 5. Icon-based resource links
 * 
 * ═══════════════════════════════════════════════════════════════
 * DESIGN REFERENCE: https://takeuforward.org/strivers-a2z-dsa-course
 * ═══════════════════════════════════════════════════════════════
 * 
 * FEATURES:
 * - Circular progress indicator (shows % completion)
 * - Difficulty breakdown (Easy/Medium/Hard counts)
 * - Expandable phases (Step 1, Step 2, etc.)
 * - Topic cards with checkboxes
 * - Resource icons (YouTube, Article, Practice)
 * - Progress bar per phase
 */

// ═══════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════

interface Resource {
  title: string;
  type: string;  // 'video', 'article', 'practice'
  url: string;
  platform?: string;
}

interface Topic {
  topicId: string;
  topic: string;
  description: string;
  difficulty: string;  // 'easy', 'medium', 'hard'
  estimatedHours: number;
  prerequisites: string[];
  resources: Resource[];
  order: number;
  completed?: boolean;  // Client-side state
}

interface Phase {
  phaseNumber: number;
  phaseName: string;
  description: string;
  totalHours: number;
  topics: Topic[];
}

interface Roadmap {
  _id: string;
  title: string;
  description: string;
  aiSummary: string;
  totalTopics: number;
  totalHours: number;
  phases: Phase[];
}

interface ProgressStats {
  totalTopics: number;
  completedTopics: number;
  percentageComplete: number;
  byDifficulty: {
    easy: { total: number; completed: number };
    medium: { total: number; completed: number };
    hard: { total: number; completed: number };
  };
}

interface RoadmapViewProps {
  roadmapId: string;
  onBack?: () => void;
}

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

const RoadmapView: React.FC<RoadmapViewProps> = ({ roadmapId, onBack }) => {
  // State
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [progress, setProgress] = useState<ProgressStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedPhases, setExpandedPhases] = useState<Set<number>>(new Set([1])); // Phase 1 expanded by default
  const [togglingTopic, setTogglingTopic] = useState<string | null>(null);

  const DEBUG = import.meta.env.VITE_DEBUG === 'true';
  const log = (...args: any[]) => { if (DEBUG) console.log('[RoadmapView]', ...args); };

  // ═══════════════════════════════════════════════════════════════
  // FETCH ROADMAP & PROGRESS
  // ═══════════════════════════════════════════════════════════════

  useEffect(() => {
    fetchRoadmapData();
  }, [roadmapId]);

  const fetchRoadmapData = async () => {
    try {
      setLoading(true);
      log('Fetching roadmap:', roadmapId);

      const response = await roadmapAPI.getRoadmap(roadmapId);
      log('📦 Full API response:', response.data);
      
      const roadmapData = response.data.roadmap;
      log('🗺️ Roadmap data keys:', roadmapData ? Object.keys(roadmapData) : 'null');
      log('📊 Progress in roadmap:', roadmapData?.progress);
      
      const progressData = response.data.progress || roadmapData?.progress;
      log('✅ Final progress data:', progressData);

      log('Roadmap loaded:', roadmapData?.title);
      log('Progress:', progressData);

      setRoadmap(roadmapData);
      setProgress(progressData);
      setError(null);
    } catch (err: any) {
      log('❌ Error loading roadmap:', err);
      log('❌ Error response:', err.response?.data);
      setError(err.response?.data?.error || 'Failed to load roadmap');
    } finally {
      setLoading(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // TOGGLE PHASE EXPAND/COLLAPSE
  // ═══════════════════════════════════════════════════════════════

  const togglePhase = (phaseNumber: number) => {
    setExpandedPhases(prev => {
      const next = new Set(prev);
      if (next.has(phaseNumber)) {
        next.delete(phaseNumber);
      } else {
        next.add(phaseNumber);
      }
      return next;
    });
  };

  // ═══════════════════════════════════════════════════════════════
  // TOGGLE TOPIC COMPLETION
  // ═══════════════════════════════════════════════════════════════

  const toggleTopicCompletion = async (topicId: string, topicName: string, currentlyCompleted: boolean) => {
    if (togglingTopic) return; // Prevent double-clicks

    try {
      setTogglingTopic(topicId);
      log('Toggling topic:', topicName, 'Currently completed:', currentlyCompleted);

      // Optimistic update
      setRoadmap(prev => {
        if (!prev) return prev;
        const updated = { ...prev };
        updated.phases = prev.phases.map(phase => ({
          ...phase,
          topics: phase.topics.map(topic =>
            topic.topicId === topicId
              ? { ...topic, completed: !currentlyCompleted }
              : topic
          )
        }));
        return updated;
      });

      // Update progress count optimistically
      setProgress(prev => {
        if (!prev) return prev;
        const delta = currentlyCompleted ? -1 : 1;
        return {
          ...prev,
          completedTopics: prev.completedTopics + delta,
          percentageComplete: Math.round(((prev.completedTopics + delta) / prev.totalTopics) * 100)
        };
      });

      // Call backend
      await progressAPI.toggleProgress(roadmapId, topicId, topicName);
      log('✓ Progress updated');

      // Refresh progress stats from backend
      const response = await progressAPI.getRoadmapProgress(roadmapId);
      setProgress(response.data.stats);

    } catch (err: any) {
      log('Error toggling progress:', err);
      // Revert optimistic update on error
      fetchRoadmapData();
    } finally {
      setTogglingTopic(null);
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // GET RESOURCE ICON
  // ═══════════════════════════════════════════════════════════════

  const getResourceIcon = (type: string) => {
    const normalized = type.toLowerCase();
    if (normalized.includes('video') || normalized.includes('youtube')) {
      return <Youtube size={16} className="resource-icon video" />;
    } else if (normalized.includes('practice') || normalized.includes('leetcode') || normalized.includes('problem')) {
      return <Code size={16} className="resource-icon practice" />;
    } else {
      return <FileText size={16} className="resource-icon article" />;
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // RENDER: LOADING STATE
  // ═══════════════════════════════════════════════════════════════

  if (loading) {
    return (
      <div className="roadmap-view">
        <div className="loading-state">
          <div className="spinner-large"></div>
          <p>Loading your roadmap...</p>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // RENDER: ERROR STATE
  // ═══════════════════════════════════════════════════════════════

  if (error || !roadmap || !progress) {
    return (
      <div className="roadmap-view">
        <div className="error-state">
          <h2>Failed to load roadmap</h2>
          <p>{error || 'Roadmap not found'}</p>
          <button onClick={fetchRoadmapData} className="retry-btn">Retry</button>
          {onBack && <button onClick={onBack} className="back-btn">Go Back</button>}
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // RENDER: ROADMAP VIEW
  // ═══════════════════════════════════════════════════════════════

  return (
    <div className="roadmap-view">
      {/* Back to Chat Button */}
      {onBack && (
        <button className="back-to-chat-btn" onClick={onBack} title="Back to Chat">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Back to Chat
        </button>
      )}

      {/* Header Section */}
      <div className="roadmap-header">
        <div className="roadmap-title-section">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <h1 className="roadmap-title">{roadmap.title}</h1>
            {/* RAG/LLM Source Indicator Badge */}
            <span 
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 12px',
                backgroundColor: roadmap.description?.includes('database') || roadmap.aiSummary?.includes('curated') ? '#3b82f6' : '#8b5cf6',
                color: 'white',
                borderRadius: '12px',
                fontSize: '13px',
                fontWeight: '500',
                whiteSpace: 'nowrap'
              }}
              title={roadmap.description?.includes('database') || roadmap.aiSummary?.includes('curated') 
                ? 'Generated using RAG: Retrieval-Augmented Generation (Database + AI)' 
                : 'Generated using LLM: Pure AI knowledge (no database match)'}
            >
              <span style={{ fontSize: '16px' }}>
                {roadmap.description?.includes('database') || roadmap.aiSummary?.includes('curated') ? '🎯' : '🤖'}
              </span>
              {roadmap.description?.includes('database') || roadmap.aiSummary?.includes('curated') ? 'RAG' : 'LLM'}
            </span>
          </div>
          <p className="roadmap-description">{roadmap.description}</p>
        </div>

        {/* Circular Progress Indicator (Striver-style) */}
        <div className="progress-circle-container">
          <svg className="progress-circle" width="120" height="120">
            <circle
              cx="60"
              cy="60"
              r="50"
              stroke="#e5e7eb"
              strokeWidth="10"
              fill="none"
            />
            <circle
              cx="60"
              cy="60"
              r="50"
              stroke="#2563eb"
              strokeWidth="10"
              fill="none"
              strokeDasharray={`${2 * Math.PI * 50}`}
              strokeDashoffset={`${2 * Math.PI * 50 * (1 - progress.percentageComplete / 100)}`}
              strokeLinecap="round"
              transform="rotate(-90 60 60)"
            />
            <text x="60" y="55" textAnchor="middle" className="progress-number">
              {progress.percentageComplete}%
            </text>
            <text x="60" y="75" textAnchor="middle" className="progress-label">
              {progress.completedTopics}/{progress.totalTopics}
            </text>
          </svg>
        </div>
      </div>

      {/* Difficulty Breakdown */}
      <div className="difficulty-breakdown">
        <div className="difficulty-item easy">
          <span className="difficulty-badge">Easy</span>
          <span className="difficulty-count">
            {progress.byDifficulty.easy.completed}/{progress.byDifficulty.easy.total} completed
          </span>
        </div>
        <div className="difficulty-item medium">
          <span className="difficulty-badge">Medium</span>
          <span className="difficulty-count">
            {progress.byDifficulty.medium.completed}/{progress.byDifficulty.medium.total} completed
          </span>
        </div>
        <div className="difficulty-item hard">
          <span className="difficulty-badge">Hard</span>
          <span className="difficulty-count">
            {progress.byDifficulty.hard.completed}/{progress.byDifficulty.hard.total} completed
          </span>
        </div>
      </div>

      {/* AI Summary */}
      {roadmap.aiSummary && (
        <div className="ai-summary">
          <h3>📚 Learning Path Overview</h3>
          <p>{roadmap.aiSummary}</p>
        </div>
      )}

      {/* Phases (Steps) */}
      <div className="phases-container">
        {roadmap.phases.map((phase) => {
          const isExpanded = expandedPhases.has(phase.phaseNumber);
          const phaseCompletedCount = phase.topics.filter(t => t.completed).length;
          const phaseProgress = (phaseCompletedCount / phase.topics.length) * 100;

          return (
            <div key={phase.phaseNumber} className="phase-card">
              {/* Phase Header */}
              <div
                className="phase-header"
                onClick={() => togglePhase(phase.phaseNumber)}
              >
                <div className="phase-header-left">
                  <h2 className="phase-name">
                    Step {phase.phaseNumber}: {phase.phaseName}
                  </h2>
                  <p className="phase-description">{phase.description}</p>
                  <div className="phase-meta">
                    <span>{phase.topics.length} topics</span>
                    <span>•</span>
                    <span>{phase.totalHours} hours</span>
                    <span>•</span>
                    <span className="phase-progress-text">
                      {phaseCompletedCount}/{phase.topics.length} completed
                    </span>
                  </div>
                </div>
                <div className="phase-header-right">
                  {isExpanded ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                </div>
              </div>

              {/* Phase Progress Bar */}
              <div className="phase-progress-bar">
                <div
                  className="phase-progress-fill"
                  style={{ width: `${phaseProgress}%` }}
                ></div>
              </div>

              {/* Topics (Collapsible) */}
              {isExpanded && (
                <div className="topics-container">
                  {phase.topics.map((topic) => (
                    <div key={topic.topicId} className={`topic-card ${topic.completed ? 'completed' : ''}`}>
                      {/* Topic Header with Checkbox */}
                      <div className="topic-header">
                        <button
                          className="topic-checkbox"
                          onClick={() => toggleTopicCompletion(topic.topicId, topic.topic, topic.completed || false)}
                          disabled={togglingTopic === topic.topicId}
                        >
                          {topic.completed ? (
                            <CheckCircle2 size={20} className="check-icon checked" />
                          ) : (
                            <Circle size={20} className="check-icon unchecked" />
                          )}
                        </button>
                        <div className="topic-info">
                          <h3 className="topic-name">{topic.topic}</h3>
                          <div className="topic-meta">
                            <span className={`difficulty-badge ${topic.difficulty}`}>
                              {topic.difficulty}
                            </span>
                            <span className="topic-hours">{topic.estimatedHours}h</span>
                          </div>
                        </div>
                      </div>

                      {/* Topic Description */}
                      <p className="topic-description">{topic.description}</p>

                      {/* Prerequisites */}
                      {topic.prerequisites.length > 0 && (
                        <div className="topic-prerequisites">
                          <strong>Prerequisites:</strong> {topic.prerequisites.join(', ')}
                        </div>
                      )}

                      {/* Resources */}
                      {topic.resources.length > 0 && (
                        <div className="topic-resources">
                          {topic.resources.map((resource, idx) => (
                            <a
                              key={idx}
                              href={resource.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="resource-link"
                            >
                              {getResourceIcon(resource.type)}
                              <span>{resource.title}</span>
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RoadmapView;
