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
from app.models.rag_request import RAGQuery, RAGGenerate, ChatRequest

# Import RAG engine functions
from app.core.rag_engine import rag_query, rag_generate

# Import Gemini for chat
import google.generativeai as genai
from app.config import GEMINI_API_KEY, GEMINI_MODEL_NAME

# Configure Gemini
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

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


# ============================================================
# ENDPOINT 3: CONVERSATIONAL CHAT (NEW!)
# ============================================================
@app.post("/chat")
def chat_route(request: ChatRequest):
    """
    Conversational chat endpoint - Gemini acts as intelligent learning advisor.
    
    HOW IT WORKS:
    1. User sends message with conversation history
    2. Gemini analyzes context and responds intelligently
    3. Asks clarifying questions to understand learning goals
    4. Once enough context gathered, suggests generating roadmap
    
    USE CASE: Natural conversation before roadmap generation
    
    REQUEST BODY:
    {
        "message": "I want to learn Data Structures",
        "conversation_history": [
            {"role": "user", "content": "Hi"},
            {"role": "assistant", "content": "Hello! What would you like to learn?"}
        ]
    }
    
    RESPONSE:
    {
        "response": "Great! Are you a complete beginner or do you have some experience?",
        "should_generate_roadmap": false,
        "context_completeness": 0.4  // 0-1 score of how ready we are
    }
    """
    try:
        logger.info(f"💬 Chat message: '{request.message[:50]}...'")
        
        # Build conversation context for Gemini
        conversation_context = []
        for msg in request.conversation_history:
            conversation_context.append(f"{msg.role.capitalize()}: {msg.content}")
        conversation_context.append(f"User: {request.message}")
        
        # System prompt - defines Gemini's role
        system_prompt = """You are an expert learning advisor for a STUDY PLANNING platform. Your ONLY purpose is to help students create personalized learning roadmaps.

CRITICAL FORMATTING RULE:
- DO NOT use any markdown formatting like **bold**, *italic*, or bullet points with asterisks
- Write in plain conversational text only
- Use numbered lists (1. 2. 3.) instead of bullet points
- Keep responses clean and readable without special characters

YOUR ROLE:
1. Have a natural conversation to understand their learning goals
2. Ask clarifying questions about:
   - What they want to learn (specific topic/subject)
   - Their current skill level (beginner/intermediate/advanced)
   - Time commitment (hours per day, total timeline)
   - Specific interests or focus areas within the topic
3. Be encouraging and supportive
4. After 3-4 focused exchanges, suggest creating their roadmap

CRITICAL - HANDLING BROAD TOPICS:
When user mentions a BROAD topic like "DSA", "Data Structures", "Algorithms", "Programming", "Web Development", etc:
- DO NOT immediately create a roadmap
- ASK specific questions to narrow down their focus:
  For DSA: "DSA is vast! Are you focusing on: Arrays and Strings? Linked Lists? Trees and Graphs? Dynamic Programming? Or preparing for FAANG interviews?"
  For Programming: "Which area interests you? Frontend? Backend? Mobile? Systems? Game dev?"
  For Web Dev: "Frontend (React, Vue)? Backend (Node, Python)? Full-stack? Or specific frameworks?"
- List out 4-5 sub-topics they can choose from
- Ask about their end goal (interviews, job switch, projects, college exams)

EXAMPLE CONVERSATION FOR BROAD TOPIC:
User: "I want to learn DSA"
You: "Great choice! DSA is a huge field. To create the best roadmap for you, I need to know more:
1. What is your end goal? (FAANG interviews, competitive programming, college placement, general knowledge)
2. Which areas interest you most? (Arrays, Trees, Graphs, Dynamic Programming, or all of them)
3. What is your current level? (complete beginner, know basics, intermediate)

Pick your goal first, and I will guide you from there!"

IMPORTANT - OFF-TOPIC HANDLING:
If user asks about ANYTHING unrelated to learning/studying (random questions, jokes, off-topic chat):
- Politely redirect them back to learning goals
- Example: "It seems like you might be in the wrong place! We are a study planning assistant. Would you like me to help you prepare for something challenging? What subject or skill would you like to master?"

CONVERSATION GUIDELINES:
- For broad topics: List specific sub-areas they can choose from
- Ask ONE focused question at a time (but can list options)
- Be conversational but stay on topic
- Show enthusiasm for their learning journey
- Reference their previous answers
- Keep responses concise (3-4 sentences max)
- REDIRECT off-topic conversations back to learning
- NEVER use asterisks or markdown formatting

CONTEXT ASSESSMENT:
After each response, evaluate if you have enough information:
- What they want to learn (SPECIFIC topic, not just "DSA" or "programming")
- Their current level
- Time availability  
- Specific focus areas or end goal

When you have all 4 pieces AND the topic is specific enough, say something like:
"Perfect! I have everything I need. Let me create a personalized roadmap for you!"

DO NOT generate roadmap for vague requests like "teach me DSA" without clarifying sub-topics first.

CURRENT CONVERSATION:
{conversation}

USER'S LATEST MESSAGE: {message}

Respond naturally (stay focused on learning goals, ask for specifics on broad topics):"""

        prompt = system_prompt.format(
            conversation="\n".join(conversation_context[:-1]),
            message=request.message
        )
        
        # Call Gemini
        model = genai.GenerativeModel(GEMINI_MODEL_NAME)
        response = model.generate_content(prompt)
        ai_response = response.text.strip()
        
        # Analyze context completeness (simple heuristic)
        total_user_messages = len([m for m in request.conversation_history if m.role == "user"]) + 1
        
        # Check if response indicates readiness for roadmap
        trigger_phrases = [
            "create a roadmap",
            "create your roadmap", 
            "generate a roadmap",
            "let me create",
            "i have everything",
            "ready to create"
        ]
        should_generate = any(phrase in ai_response.lower() for phrase in trigger_phrases)
        
        # Context completeness score (0-1)
        context_score = min(total_user_messages / 4.0, 1.0)
        
        logger.info(f"✅ AI response generated | Should generate: {should_generate}")
        
        return {
            "response": ai_response,
            "should_generate_roadmap": should_generate,
            "context_completeness": context_score,
            "total_messages": total_user_messages
        }
        
    except Exception as e:
        logger.error(f"❌ Error in chat: {str(e)}", exc_info=True)
        raise
