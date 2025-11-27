"""
gemini_client.py
-----------------
This module handles communication with Google's Gemini AI API.

WHAT IS GEMINI?
- Gemini is Google's large language model (LLM)
- Similar to ChatGPT, but made by Google
- We use it to generate personalized learning roadmaps

WHY SEPARATE FILE?
- Keeps LLM logic isolated from RAG logic
- Easy to swap LLMs later (OpenAI, Claude, etc.)
- Clean separation of concerns

HOW IT WORKS:
1. We send retrieved topics + user query to Gemini
2. Gemini reads the context and generates a roadmap
3. Returns structured learning plan
"""

import logging
import google.generativeai as genai
from typing import List, Dict
from app.config import GEMINI_API_KEY, GEMINI_MODEL_NAME

logger = logging.getLogger(__name__)

# ============================================================
# INITIALIZE GEMINI API
# ============================================================
# Configure Gemini with API key (happens once at module import)
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    logger.info("✓ Gemini API configured successfully")
else:
    logger.warning("⚠️  GEMINI_API_KEY not set - /rag/generate will fail")


def format_topics_for_context(topics: List[Dict]) -> str:
    """
    Convert retrieved topic dictionaries into readable text for Gemini.
    
    WHY THIS IS NEEDED:
    - LLMs work best with clear, structured text
    - Raw JSON is harder for LLM to parse
    - We format it like a textbook would present topics
    
    INPUT: List of topic dicts from LanceDB
    OUTPUT: Formatted string with all topic details
    
    EXAMPLE OUTPUT:
    ---
    Topic: Array Basics
    Domain: DSA
    Difficulty: Easy (3 hours)
    Prerequisites: None
    Description: Covers how arrays work...
    Resources:
      - [Video] Arrays Tutorial: https://...
      - [Article] Array Guide: https://...
    ---
    """
    context_parts = []
    
    for i, topic in enumerate(topics, 1):
        # Extract fields with defaults if missing
        topic_name = topic.get('topic', 'Unknown')
        domain = topic.get('domain', 'N/A')
        difficulty = topic.get('difficulty', 'N/A')
        hours = topic.get('estimated_hours', 'N/A')
        prereqs = topic.get('prerequisites', [])
        description = topic.get('description', 'No description')
        resources = topic.get('resources', [])
        
        # Build formatted topic block
        topic_block = f"""
---
Topic {i}: {topic_name}
Domain: {domain}
Difficulty: {difficulty} ({hours} hours estimated)
Prerequisites: {', '.join(prereqs) if prereqs else 'None'}
Description: {description}

Resources:"""
        
        # Add resources (videos, articles, problems)
        for res in resources:
            res_title = res.get('title', 'Untitled')
            res_type = res.get('type', 'link')
            res_url = res.get('url', '#')
            topic_block += f"\n  - [{res_type.title()}] {res_title}: {res_url}"
        
        context_parts.append(topic_block)
    
    return "\n".join(context_parts)


def generate_roadmap_summary(query: str, retrieved_topics: List[Dict]) -> str:
    """
    Generate AI summary/overview for the roadmap using Gemini.
    
    This creates a personalized introduction explaining the learning path,
    what to expect, and strategic tips.
    """
    try:
        context = format_topics_for_context(retrieved_topics)
        
        prompt = f"""You are an expert learning advisor. Based on these topics, write a brief, motivating overview (2-3 paragraphs) for a student learning: "{query}"

AVAILABLE TOPICS:
{context}

Write a personalized introduction that:
1. Acknowledges their goal
2. Explains the learning progression
3. Provides encouragement and strategy tips
4. Mentions total time commitment

Keep it concise, actionable, and motivating."""

        model = genai.GenerativeModel(GEMINI_MODEL_NAME)
        response = model.generate_content(prompt)
        
        return response.text.strip()
        
    except Exception as e:
        logger.error(f"Error generating summary: {e}")
        return f"Master {query} through this structured learning path with {len(retrieved_topics)} carefully selected topics."


def organize_topics_into_phases(topics: List[Dict]) -> List[Dict]:
    """
    Organize topics into learning phases (like Striver's Steps).
    
    LOGIC:
    - Group by difficulty: easy → medium → hard
    - Respect prerequisites (basics before advanced)
    - Create 2-4 phases depending on topic count
    
    RETURNS: List of phase dicts with grouped topics
    """
    # Sort by difficulty, then by prerequisites
    difficulty_order = {"easy": 1, "medium": 2, "hard": 3}
    sorted_topics = sorted(topics, key=lambda t: (
        difficulty_order.get(t.get('difficulty', 'medium'), 2),
        len(t.get('prerequisites', []))
    ))
    
    # Split into phases based on count
    total = len(sorted_topics)
    if total <= 5:
        # Single phase for small roadmaps
        phases = [{
            "phase_number": 1,
            "phase_name": "Core Concepts",
            "description": "Master the fundamentals",
            "topics": sorted_topics
        }]
    elif total <= 10:
        # Two phases: Basics + Advanced
        mid = total // 2
        phases = [
            {
                "phase_number": 1,
                "phase_name": "Foundation",
                "description": "Build strong fundamentals",
                "topics": sorted_topics[:mid]
            },
            {
                "phase_number": 2,
                "phase_name": "Advanced Topics",
                "description": "Level up your skills",
                "topics": sorted_topics[mid:]
            }
        ]
    else:
        # Three phases: Basics + Intermediate + Advanced
        third = total // 3
        phases = [
            {
                "phase_number": 1,
                "phase_name": "Fundamentals",
                "description": "Start with the basics",
                "topics": sorted_topics[:third]
            },
            {
                "phase_number": 2,
                "phase_name": "Intermediate",
                "description": "Build problem-solving skills",
                "topics": sorted_topics[third:2*third]
            },
            {
                "phase_number": 3,
                "phase_name": "Advanced",
                "description": "Master complex concepts",
                "topics": sorted_topics[2*third:]
            }
        ]
    
    # Calculate total hours per phase
    for phase in phases:
        phase['total_hours'] = sum(t.get('estimated_hours', 3) for t in phase['topics'])
        # Add order numbers to topics
        for i, topic in enumerate(phase['topics'], 1):
            topic['order'] = i
    
    return phases


def generate_llm_only_roadmap(query: str, domain: str = None, num_topics: int = 5) -> Dict:
    """
    Generate complete roadmap using ONLY LLM knowledge (no database).
    
    Used when:
    - No relevant topics found in database
    - User asks about topics outside our corpus
    
    LLM will:
    1. Research and structure learning path
    2. Break into phases (beginner → advanced)
    3. Suggest topics with estimated hours
    4. Recommend free resources (YouTube, docs, articles)
    
    This takes longer (30-60s) but generates comprehensive roadmaps
    for ANY topic, not just what's in our database.
    """
    try:
        logger.info(f"Generating comprehensive roadmap from LLM for: {query}")
        
        prompt = f"""You are an expert learning advisor. A student wants to learn: "{query}"

Your database doesn't have specific resources for this topic, so you need to create a comprehensive learning roadmap from your own knowledge.

TASK:
Create a detailed, structured learning roadmap with {num_topics} topics organized into learning phases (like Striver's A2Z DSA Course format).

REQUIREMENTS:
1. Break the learning path into 2-4 phases (Fundamentals → Intermediate → Advanced)
2. Each phase should have 2-5 topics
3. For EACH topic, provide:
   - Clear topic name
   - Detailed description (what they'll learn, why it matters)
   - Difficulty level (easy/medium/hard)
   - Estimated hours to complete
   - 3-4 FREE learning resources (YouTube videos, documentation, articles, practice platforms)
   - Prerequisites (if any)

4. Resources MUST include:
   - At least 1 video tutorial (YouTube/Coursera/etc.)
   - At least 1 article/documentation link
   - At least 1 hands-on practice resource (if applicable)

5. Total topics: {num_topics}
6. Domain context: {domain if domain else "general"}

═══════════════════════════════════════════════════════════════
CRITICAL: URL GENERATION RULES (MUST FOLLOW STRICTLY)
═══════════════════════════════════════════════════════════════

You MUST generate ONLY valid, working, fully qualified URLs.

RULE 1 - NO HALLUCINATED LINKS:
Only use real, well-known domains:
- youtube.com
- google.com  
- github.com
- developer.mozilla.org (MDN)
- docs.python.org
- docs.oracle.com
- wikipedia.org
- geeksforgeeks.org
- w3schools.com
- freecodecamp.org
- leetcode.com
- hackerrank.com
- Official documentation websites

RULE 2 - USE SEARCH FALLBACKS WHEN UNCERTAIN:
If you are NOT 100% certain a specific page exists, use these SAFE fallback formats:

For YouTube (ALWAYS USE THIS FORMAT):
https://www.youtube.com/results?search_query=<topic+name+tutorial>

For Google:
https://www.google.com/search?q=<topic+name+tutorial>

For GeeksforGeeks:
https://www.geeksforgeeks.org/<topic-name-hyphenated>/

RULE 3 - URL FORMAT REQUIREMENTS:
Every URL MUST include:
- https:// prefix (never http://)
- Full domain name
- Complete path (no placeholders like "..." or "<insert>")
- No incomplete URLs
- No embed links (no youtube.com/embed/)

RULE 4 - VALIDATION BEFORE OUTPUT:
Before writing ANY link, verify:
- Is the domain real and well-known?
- Is the URL structure complete?
- If uncertain → USE SEARCH FALLBACK

RULE 5 - EXAMPLE VALID URLs:
Video: https://www.youtube.com/results?search_query=binary+search+tree+tutorial
Article: https://www.geeksforgeeks.org/binary-search-tree-data-structure/
Practice: https://leetcode.com/tag/binary-search-tree/
Docs: https://developer.mozilla.org/en-US/docs/Web/JavaScript

RULE 6 - NEVER OUTPUT:
- Dead links or broken URLs
- Made-up video IDs (like youtube.com/watch?v=abc123xyz)
- Placeholder text in URLs
- Experimental or new domains
- Embed links

═══════════════════════════════════════════════════════════════

FORMAT YOUR RESPONSE AS VALID JSON:
{{
  "title": "Learning Path: [Topic Name]",
  "description": "Brief overview of the roadmap",
  "total_hours": <sum of all estimated hours>,
  "ai_summary": "Motivating 2-3 paragraph overview explaining the learning path, progression, and tips",
  "phases": [
    {{
      "phase_number": 1,
      "phase_name": "Fundamentals",
      "description": "Phase description",
      "total_hours": <sum>,
      "topics": [
        {{
          "id": "topic_01",
          "topic": "Topic Name",
          "description": "Detailed description of what you'll learn and why it matters. Be comprehensive (3-4 sentences).",
          "difficulty": "easy",
          "estimated_hours": 5,
          "prerequisites": [],
          "resources": [
            {{
              "title": "Resource Title",
              "type": "video",
              "url": "https://www.youtube.com/results?search_query=topic+name+tutorial"
            }},
            {{
              "title": "Resource Title",
              "type": "article",
              "url": "https://www.geeksforgeeks.org/topic-name/"
            }},
            {{
              "title": "Resource Title",
              "type": "practice",
              "url": "https://leetcode.com/tag/topic-name/"
            }}
          ],
          "order": 1
        }}
      ]
    }}
  ],
  "metadata": {{
    "query": "{query}",
    "domain": "{domain}",
    "mode": "llm_only",
    "source": "ai_generated"
  }}
}}

IMPORTANT:
- Return ONLY valid JSON, no markdown formatting
- ALL URLs must follow the rules above - use search query fallbacks when uncertain
- Make descriptions detailed and educational
- Ensure logical progression from basics to advanced
- Total topics should be around {num_topics}

Generate the complete roadmap now:"""

        logger.info("Calling Gemini for comprehensive roadmap generation...")
        model = genai.GenerativeModel(GEMINI_MODEL_NAME)
        
        response = model.generate_content(prompt)
        roadmap_text = response.text.strip()
        
        # Clean up markdown code blocks if present
        if roadmap_text.startswith("```json"):
            roadmap_text = roadmap_text.replace("```json", "").replace("```", "").strip()
        elif roadmap_text.startswith("```"):
            roadmap_text = roadmap_text.replace("```", "").strip()
        
        # Sanitize JSON: fix control characters that break parsing
        import re
        # Replace unescaped control characters in strings (newlines, tabs, etc.)
        # This regex finds content within quotes and escapes control chars
        def escape_control_chars(match):
            text = match.group(1)
            # Escape newlines, tabs, carriage returns
            text = text.replace('\n', '\\n').replace('\r', '\\r').replace('\t', '\\t')
            return f'"{text}"'
        
        # Fix control chars inside quoted strings
        roadmap_text = re.sub(r'"([^"]*)"', escape_control_chars, roadmap_text)
        
        # Parse JSON response
        import json
        roadmap = json.loads(roadmap_text)
        
        # Calculate total topics
        total_topics = sum(len(phase.get('topics', [])) for phase in roadmap.get('phases', []))
        roadmap['total_topics'] = total_topics
        
        logger.info(f"✓ Generated LLM roadmap with {total_topics} topics across {len(roadmap.get('phases', []))} phases")
        
        return roadmap
        
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse LLM response as JSON: {e}")
        logger.error(f"Response was: {roadmap_text[:500]}...")
        
        # Fallback: return simple structure
        return {
            "title": f"Learning Path: {query}",
            "description": "AI-generated roadmap (parsing error, showing fallback)",
            "total_topics": 0,
            "total_hours": 0,
            "phases": [],
            "ai_summary": f"We're working on generating a roadmap for '{query}'. Please try again or contact support.",
            "metadata": {
                "query": query,
                "domain": domain,
                "mode": "llm_only",
                "source": "ai_generated",
                "error": "json_parse_failed"
            }
        }
        
    except Exception as e:
        logger.error(f"Error generating LLM-only roadmap: {e}", exc_info=True)
        raise
