"""
rag_engine.py
-------------
🧠 THIS IS THE BRAIN OF YOUR RAG SYSTEM!

═══════════════════════════════════════════════════════════════════
WHAT IS RAG? (Retrieval-Augmented Generation)
═══════════════════════════════════════════════════════════════════

Think of RAG like a SMART RESEARCH ASSISTANT:

WITHOUT RAG (Just LLM):
User: "Teach me dynamic programming"
LLM: *Generates generic answer from memory* ❌
Problem: No personalized resources, might hallucinate facts

WITH RAG (Retrieval + Generation):
User: "Teach me dynamic programming"
System:
  1. RETRIEVAL: Search your curated database for DP topics ✅
  2. AUGMENTATION: Give those topics to LLM as context ✅
  3. GENERATION: LLM organizes YOUR content into roadmap ✅
Result: Personalized roadmap using YOUR hand-picked resources!

═══════════════════════════════════════════════════════════════════
THIS FILE'S JOB:
═══════════════════════════════════════════════════════════════════

1. rag_query() → SEARCH your database (Retrieval only)
2. rag_generate() → SEARCH + ORGANIZE into roadmap (Full RAG)

Think of it as the "coordinator" that:
- Calls embeddings.py to convert text → vectors
- Calls lancedb_store.py to search vectors
- Calls gemini_client.py to generate roadmaps
- Returns final result to user
"""

import logging
from typing import List, Dict

# IMPORT OUR TOOLS:
# - embed_texts: Converts text → 1024 numbers (vector)
# - query_similar: Searches LanceDB for similar vectors
from app.core.embeddings import embed_texts
from app.core.lancedb_store import query_similar

logger = logging.getLogger(__name__)


def rag_query(query_text: str, domain: str = None, limit: int = 5) -> List[Dict]:
    """
    🔍 SEMANTIC SEARCH: Find topics similar to user's query
    
    ═══════════════════════════════════════════════════════════════════
    WHAT DOES THIS FUNCTION DO?
    ═══════════════════════════════════════════════════════════════════
    
    Imagine you're searching a library for books about "dragons":
    
    OLD WAY (Keyword search):
    - Only finds books with exact word "dragon" in title ❌
    - Misses books about "mythical creatures", "fire-breathing beasts"
    
    NEW WAY (Semantic search - what we do):
    - Understands MEANING of "dragon" ✅
    - Finds related concepts: mythology, fantasy, reptiles, fire
    - Returns all relevant books, even without exact word match
    
    ═══════════════════════════════════════════════════════════════════
    HOW IT WORKS:
    ═══════════════════════════════════════════════════════════════════
    
    Step 1: Convert query to vector (1024 numbers representing meaning)
    Step 2: Compare with all database vectors using math
    Step 3: Return top-5 most similar topics
    
    ═══════════════════════════════════════════════════════════════════
    EXAMPLE:
    ═══════════════════════════════════════════════════════════════════
    
    Input:  query_text = "graph algorithms"
    Output: [
              {"topic": "Graph BFS", "similarity": 0.92},
              {"topic": "Graph DFS", "similarity": 0.90},
              {"topic": "Dijkstra", "similarity": 0.88}
            ]
    
    Notice: Even though user didn't say "BFS", we found it!
    That's the power of semantic understanding.
    """
    try:
        # ═══════════════════════════════════════════════════════════════
        # STEP 1: CONVERT TEXT → VECTOR (Embedding)
        # ═══════════════════════════════════════════════════════════════
        
        logger.info(f"Embedding query: {query_text}")
        
        # Call embeddings.py to convert text → vector
        # Input:  ["graph algorithms"]
        # Output: [[0.234, -0.456, 0.789, ..., 0.123]]  (1024 numbers)
        vec = embed_texts([query_text])[0].tolist()
        
        # vec is now a list like: [0.234, -0.456, 0.789, ...]
        # These 1024 numbers capture the MEANING of "graph algorithms"
        
        logger.info(f"✓ Vector generated, dimensions: {len(vec)}")

        # ═══════════════════════════════════════════════════════════════
        # STEP 2: SEARCH DATABASE FOR SIMILAR VECTORS
        # ═══════════════════════════════════════════════════════════════
        
        logger.info(f"Searching LanceDB (domain filter: {domain})...")
        
        # Call lancedb_store.py to search for similar vectors
        # LanceDB compares our query vector with ALL topic vectors
        # Returns topics with most similar vectors (closest in meaning)
        results = query_similar(vec, limit=limit, domain=domain)
        
        # results is a list like:
        # [
        #   {"id": "graph_01", "topic": "Graph BFS", "_distance": 0.62},
        #   {"id": "graph_02", "topic": "Graph DFS", "_distance": 0.65},
        #   ...
        # ]
        # _distance: Lower = more similar (0.0 = identical)
        
        logger.info(f"✓ Search complete, found {len(results)} results")

        return results
        
    except Exception as e:
        logger.error(f"Error in rag_query: {str(e)}", exc_info=True)
        raise


def rag_generate(query_text: str, domain: str = None, num_topics: int = 5) -> Dict:
    """
    🚀 FULL RAG PIPELINE: Search + Generate Personalized Roadmap
    
    ═══════════════════════════════════════════════════════════════════
    WHAT IS THIS FUNCTION?
    ═══════════════════════════════════════════════════════════════════
    
    This is the COMPLETE RAG system in action!
    
    R - RETRIEVAL:  Find relevant topics from YOUR database
    A - AUGMENTED:  Give those topics to AI as context
    G - GENERATION: AI organizes them into a roadmap
    
    ═══════════════════════════════════════════════════════════════════
    REAL-WORLD ANALOGY:
    ═══════════════════════════════════════════════════════════════════
    
    User: "I want to learn dynamic programming in 3 weeks"
    
    What happens:
    1. System searches your database → Finds 10 DP topics ✅
    2. System gives topics to Gemini AI with instructions:
       "Hey Gemini, organize these 10 DP topics into a 3-week plan"
    3. Gemini returns structured roadmap:
       - Phase 1: Basics (Week 1)
       - Phase 2: Classic Problems (Week 2)
       - Phase 3: Advanced (Week 3)
    
    ═══════════════════════════════════════════════════════════════════
    WHY THIS IS POWERFUL:
    ═══════════════════════════════════════════════════════════════════
    
    ✅ Uses YOUR curated content (not generic AI knowledge)
    ✅ AI can't hallucinate (it only organizes what you provided)
    ✅ Always up-to-date (just edit JSON files)
    ✅ Personalized resources (your hand-picked YouTube/articles)
    
    ═══════════════════════════════════════════════════════════════════
    TWO MODES:
    ═══════════════════════════════════════════════════════════════════
    
    MODE 1: RAG (Database + AI)
    - User asks about topic in your database ✅
    - System retrieves YOUR content + AI organizes it
    
    MODE 2: LLM-Only (AI Knowledge)
    - User asks about topic NOT in database (e.g., "quantum computing") ❌
    - System asks AI to generate roadmap from its training
    
    System automatically chooses best mode!
    """
    try:
        logger.info(f"Starting RAG generation for: '{query_text}'")
        
        # ═══════════════════════════════════════════════════════════════
        # STEP 1: RETRIEVAL - Search database for relevant topics
        # ═══════════════════════════════════════════════════════════════
        
        logger.info(f"Retrieving top {num_topics} relevant topics...")
        
        # Call rag_query() to search database
        # This does: text → vector → search LanceDB → return topics
        retrieved_topics = rag_query(query_text, domain=domain, limit=num_topics)
        
        # retrieved_topics is now a list like:
        # [
        #   {
        #     "id": "dp_02",
        #     "topic": "Fibonacci DP",
        #     "description": "Learn DP with Fibonacci...",
        #     "resources": [...],
        #     "_distance": 0.62  ← How similar (lower = better)
        #   },
        #   {"id": "dp_05", "topic": "House Robber", "_distance": 0.65},
        #   ...
        # ]
        
        # ═══════════════════════════════════════════════════════════════
        # STEP 2: RELEVANCE CHECK - Are these topics actually useful?
        # ═══════════════════════════════════════════════════════════════
        
        # WHAT IS RELEVANCE THRESHOLD?
        # Distance between vectors ranges from 0 (identical) to 2 (opposite)
        # We set threshold at 0.75:
        #   - distance < 0.75 → Topics ARE relevant ✅
        #   - distance > 0.75 → Topics NOT relevant ❌
        
        relevance_threshold = 0.95
        
        if not retrieved_topics:
            # No topics in database at all (empty database)
            logger.warning("⚠️  No topics found in database")
            has_relevant_topics = False
        else:
            # Check if best match is actually relevant
            # Best match = first result (lowest distance)
            best_distance = retrieved_topics[0].get('_distance', 1.0)
            has_relevant_topics = best_distance < relevance_threshold
            
            # EXAMPLE:
            # User asks: "dynamic programming"
            # Best match: dp_02 with distance 0.62
            # 0.62 < 0.75 → RELEVANT! ✅
            #
            # User asks: "quantum computing" (not in database)
            # Best match: random_topic with distance 0.89
            # 0.89 > 0.75 → NOT RELEVANT! ❌ (use LLM instead)
            
            if has_relevant_topics:
                logger.info(f"✅ Found relevant topics (best distance: {best_distance:.3f})")
            else:
                logger.warning(f"⚠️  Retrieved topics not relevant enough (best distance: {best_distance:.3f}, threshold: {relevance_threshold})")
        
        # ═══════════════════════════════════════════════════════════════
        # STEP 3: GENERATE ROADMAP (Two possible paths)
        # ═══════════════════════════════════════════════════════════════
        
        # Import functions from gemini_client.py that talk to AI
        from app.core.gemini_client import (
            organize_topics_into_phases,   # Groups topics: easy → medium → hard
            generate_roadmap_summary,      # Asks AI to write overview
            generate_llm_only_roadmap      # Generates from AI knowledge (no database)
        )
        
        if has_relevant_topics:
            # ═══════════════════════════════════════════════════════════
            # PATH A: RAG MODE (Use YOUR database + AI)
            # ═══════════════════════════════════════════════════════════
            
            logger.info("📚 Using RAG mode (database + LLM)")
            
            # SUBSTEP 3A: Organize topics into phases
            # - Takes flat list of topics
            # - Groups by difficulty: Easy → Medium → Hard
            # - Creates Striver-style "Phase 1, Phase 2, Phase 3"
            logger.info("Organizing topics into learning phases...")
            phases = organize_topics_into_phases(retrieved_topics)
            
            # phases is now:
            # [
            #   {
            #     "phase_number": 1,
            #     "phase_name": "Fundamentals",
            #     "topics": [dp_01, dp_02, ...],
            #     "total_hours": 15
            #   },
            #   {"phase_number": 2, "phase_name": "Intermediate", ...},
            #   ...
            # ]
            
            # SUBSTEP 3B: Ask AI to write roadmap overview
            # - Sends retrieved topics to Gemini
            # - Asks: "Write a brief overview explaining this roadmap"
            # - Gemini returns 2-3 paragraph summary
            logger.info("Generating AI roadmap summary...")
            ai_summary = generate_roadmap_summary(query_text, retrieved_topics)
            
            # ai_summary is a string like:
            # "Dynamic Programming is essential for coding interviews.
            #  This roadmap covers 10 core topics starting with Fibonacci..."
            
            # SUBSTEP 3C: Calculate total hours
            # - Adds up estimated_hours from all topics
            total_hours = sum(phase['total_hours'] for phase in phases)
            
            logger.info("✓ RAG generation complete")
            
            # RETURN STRUCTURED JSON to frontend
            return {
                "title": f"Learning Path: {query_text.title()}",
                "description": f"Comprehensive roadmap with {len(retrieved_topics)} topics from our curated database",
                "total_topics": len(retrieved_topics),
                "total_hours": total_hours,
                "phases": phases,  # Array of phases with topics
                "ai_summary": ai_summary,  # AI-written overview
                "metadata": {
                    "query": query_text,
                    "domain": domain,
                    "mode": "rag",  # Indicates we used database
                    "source": "database"
                }
            }
        
        else:
            # ═══════════════════════════════════════════════════════════
            # PATH B: LLM-ONLY MODE (Generate from AI's knowledge)
            # ═══════════════════════════════════════════════════════════
            
            # WHY THIS PATH?
            # User asked about topic NOT in our database
            # Example: "quantum computing" or "blockchain development"
            # Database has DSA/DBMS/OS but not quantum computing
            
            logger.info("🤖 Using LLM-only mode (generating from AI knowledge)")
            logger.info("⏳ This may take 30-60 seconds for comprehensive roadmap...")
            
            # Call Gemini to generate ENTIRE roadmap from scratch
            # No database content - AI uses its training knowledge
            # Still returns same structure (phases, topics, hours)
            roadmap = generate_llm_only_roadmap(query_text, domain, num_topics)
            
            # roadmap has same structure as PATH A, but:
            # - metadata.mode = "llm_only"
            # - metadata.source = "ai_generated"
            # - No resource URLs (AI doesn't know your curated links)
            
            logger.info("✓ LLM-only generation complete")
            return roadmap
        
    except Exception as e:
        logger.error(f"Error in rag_generate: {str(e)}", exc_info=True)
        raise
