"""
rag_request.py
---------------
Defines the request body structures for RAG endpoints.
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

class RAGQuery(BaseModel):
    """
    Request model for /rag/query endpoint (semantic search)
    """
    query: str                      # user input text
    domain: Optional[str] = None    # optional: dsa / physics / interview


class RAGGenerate(BaseModel):
    """
    Request model for /rag/generate endpoint (LLM roadmap generation)
    
    Why separate model?
    - Generate needs more parameters than simple search
    - Allows for future expansion (temperature, max_tokens, etc.)
    """
    query: str = Field(..., description="User's learning goal or question")
    domain: Optional[str] = Field(None, description="Domain filter: dsa, ml, physics, etc.")
    num_topics: Optional[int] = Field(5, description="Number of topics to retrieve for context", ge=1, le=20)


class RoadmapTopic(BaseModel):
    """Single topic in the roadmap"""
    id: str
    topic: str
    description: str
    difficulty: str
    estimated_hours: int
    prerequisites: List[str]
    resources: List[Dict[str, str]]
    order: int  # Position in learning sequence


class RoadmapPhase(BaseModel):
    """Learning phase (like Striver's Step 1, Step 2, etc.)"""
    phase_number: int
    phase_name: str
    description: str
    topics: List[RoadmapTopic]
    total_hours: int


class RoadmapResponse(BaseModel):
    """Structured roadmap response for frontend"""
    title: str
    description: str
    total_topics: int
    total_hours: int
    phases: List[RoadmapPhase]
    ai_summary: str  # LLM-generated overview
    metadata: Dict[str, Any]


# ============================================================
# CONVERSATIONAL CHAT MODELS (NEW!)
# ============================================================

class ChatMessage(BaseModel):
    """
    Single message in conversation history
    
    EXAMPLE:
    {
        "role": "user",
        "content": "I want to learn DSA"
    }
    """
    role: str  # "user" or "assistant"
    content: str  # Message text


class ChatRequest(BaseModel):
    """
    Request body for /chat endpoint
    
    EXAMPLE:
    {
        "message": "I want to learn Data Structures",
        "conversation_history": [
            {"role": "user", "content": "Hi"},
            {"role": "assistant", "content": "Hello! What would you like to learn?"}
        ]
    }
    """
    message: str  # Current user message
    conversation_history: List[ChatMessage] = []  # Previous messages for context
