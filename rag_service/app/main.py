"""
main.py
--------
This is the ENTRY POINT for the FastAPI microservice.

What this file does:
- Creates the FastAPI app.
- Runs the loader when server starts (builds LanceDB database).
- Exposes API endpoints: /health, /rag/query, /rag/generate
"""

import logging
from fastapi import FastAPI

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    datefmt='%H:%M:%S'
)
logger = logging.getLogger(__name__)

# Import loader
from app.utils.loader import load_corpus_and_build_db

# Import models for request validation
from app.models.rag_request import RAGQuery, RAGGenerate

# Import RAG engine functions
from app.core.rag_engine import rag_query, rag_generate

# Create FastAPI application
app = FastAPI(
    title="AI Roadmap RAG Service",
    version="1.0.0"
)

# Run ONCE when server starts
@app.on_event("startup")
def startup_event():
    logger.info("="*60)
    logger.info("🚀 Starting RAG Microservice...")
    logger.info("="*60)
    load_corpus_and_build_db()
    logger.info("="*60)
    logger.info("✅ Server Ready! You can now send requests.")
    logger.info("="*60)

# Simple ping route
@app.get("/health")
def health():
    return {"status": "ok"}

# ============================================================
# ENDPOINT 1: SEMANTIC SEARCH
# ============================================================
@app.post("/rag/query")
def rag_query_route(request: RAGQuery):
    """
    Semantic search endpoint - finds similar topics using embeddings.
    
    HOW IT WORKS:
    1. User sends query: "graph algorithms"
    2. System embeds query into vector
    3. Finds topics with similar vectors in LanceDB
    4. Returns top-5 most relevant topics
    
    USE CASE: When you want raw search results without LLM generation
    
    REQUEST BODY:
    {
        "query": "graph algorithms",
        "domain": "dsa"  // optional filter
    }
    
    RESPONSE:
    {
        "topics": [
            {
                "topic": "Graph BFS",
                "difficulty": "medium",
                "resources": [...],
                ...
            }
        ]
    }
    """
    try:
        logger.info(f"📥 Query received: '{request.query}' | Domain: {request.domain}")
        topics = rag_query(request.query, request.domain)
        logger.info(f"✅ Found {len(topics)} matching topics")
        return {"topics": topics}
    except Exception as e:
        logger.error(f"❌ Error processing query: {str(e)}", exc_info=True)
        raise


# ============================================================
# ENDPOINT 2: AI ROADMAP GENERATION (RAG)
# ============================================================
@app.post("/rag/generate")
def rag_generate_route(request: RAGGenerate):
    """
    RAG endpoint - generates personalized learning roadmap using Gemini AI.
    
    HOW IT WORKS:
    1. User sends learning goal: "I want to prepare for coding interviews"
    2. System retrieves relevant topics from database (Retrieval)
    3. Sends topics + query to Gemini as context (Augmentation)
    4. Gemini generates structured roadmap (Generation)
    
    USE CASE: When you want an AI-generated learning plan
    
    REQUEST BODY:
    {
        "query": "Prepare for coding interviews in 3 months",
        "domain": "dsa",  // optional
        "num_topics": 10  // how many topics to retrieve for context
    }
    
    RESPONSE:
    {
        "query": "original query",
        "retrieved_topics": [...],  // topics used as context
        "roadmap": "# Learning Roadmap\n\nWeek 1: ...",  // markdown
        "num_topics_retrieved": 10
    }
    """
    try:
        logger.info(f"📥 Generate request: '{request.query}' | Domain: {request.domain}")
        result = rag_generate(
            query_text=request.query,
            domain=request.domain,
            num_topics=request.num_topics
        )
        logger.info(f"✅ Roadmap generated with {result['total_topics']} topics")
        return result
    except Exception as e:
        logger.error(f"❌ Error generating roadmap: {str(e)}", exc_info=True)
        raise
