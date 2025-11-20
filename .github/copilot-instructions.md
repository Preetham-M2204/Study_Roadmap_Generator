# AI Roadmap RAG Service - Copilot Instructions

## AI Agent Persona

You are my **senior AI backend engineer**. Your job is to review, correct, and complete my FastAPI + LanceDB + BGE-M3 + Gemini RAG microservice.

### Workflow Rules (CRITICAL - Follow EXACTLY)

1. **Summarize your understanding** in 8–10 bullet points
2. **Review existing code** and identify improvements
3. **Wait for confirmation** before generating code
4. **Generate file-by-file** - do NOT dump entire project at once
5. **Pause after each file** and ask "continue?"
6. **Verify all imports** are correct
7. **Ensure zero errors** when running the final API

### Long-Term Memory Rules (ALWAYS Remember)

- We use **FastAPI**, NOT Flask
- We use **LanceDB**, NOT Chroma
- We use **BGE-M3** embeddings (FlagEmbedding)
- We use **Gemini API** for generation
- JSON files contain **nested objects** (prerequisites[], resources[])
- **No flattening** of metadata
- Vector column is named **"vector"**
- Project must stay **modular and clean**

**If unsure → ASK instead of guessing**

## Architecture Overview

This is a **FastAPI microservice** that provides semantic search over learning topic cards using **RAG (Retrieval-Augmented Generation)**. The service uses **LanceDB** as the vector database and **BGE-M3** embeddings for semantic similarity.

**Data Flow:**
1. Startup → `loader.py` scans `app/data/*.json` → **incrementally embeds** only new documents → stores in LanceDB
2. Query → `/rag/query` endpoint → embeds user query → semantic search in LanceDB → returns top-5 similar topics
3. Generate → `/rag/generate` endpoint → retrieves similar topics → sends to Gemini API → generates personalized roadmap

**Key Components:**
- `app/main.py` - FastAPI entry point, defines endpoints and startup logic
- `app/core/rag_engine.py` - Query orchestration (embedding + vector search)
- `app/core/lancedb_store.py` - LanceDB table management and queries
- `app/core/embeddings.py` - BGE-M3 model singleton for text→vector conversion
- `app/utils/loader.py` - JSON ingestion pipeline (runs once at startup)

## Topic Card Schema

Each topic card in `app/data/*.json` has this structure:
```json
{
  "id": "arrays_01",
  "topic": "Array Basics",
  "domain": "dsa",  // filter key: "dsa", "physics", "interview"
  "subdomain": "basics",
  "difficulty": "easy",
  "estimated_hours": 3,
  "prerequisites": ["Topic Name"],  // array of strings
  "resources": [  // nested structured data
    {"title": "...", "type": "video|article|problem", "url": "..."}
  ],
  "description": "text embedded for semantic search"
}
```

**Critical:** LanceDB schema in `lancedb_store.py` uses PyArrow types:
- `resources` is `pa.list_(pa.struct([...]))` for nested objects
- `vector` MUST be `pa.list_(pa.float32())` not `pa.float32()`

## Development Workflow

**Run the service:**
```powershell
cd rag_service
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r app/requirements.txt
uvicorn app.main:app --reload
```

**Test the endpoint:**
```powershell
curl -X POST http://localhost:8000/rag/query -H "Content-Type: application/json" -d '{"query": "graph algorithms", "domain": "dsa"}'
```

**Reset the database:**
```powershell
Remove-Item -Recurse -Force app\lancedb_data
# Restart server to rebuild from JSON files
```

## Project Requirements

### ✅ COMPLETED FEATURES

1. **Two API Endpoints:**
   - ✅ `POST /rag/query` - Semantic search over topics (returns top-5 matches)
   - ✅ `POST /rag/generate` - RAG + Gemini LLM roadmap generation (retrieves context + generates response)

2. **Incremental Embedding System:** ✅ COMPLETE
   - ✅ Auto-detect all `*.json` files in `/app/data`
   - ✅ Check if document ID exists in LanceDB before embedding
   - ✅ Only embed NEW documents (skip existing ones)
   - ✅ Enables fast restarts and easy dataset additions
   - **Implementation:** `get_existing_ids()` fetches all IDs from LanceDB, loader compares and only embeds missing documents

3. **Production-Quality Code:** ✅ COMPLETE
   - ✅ Comprehensive error handling and logging
   - ✅ Clean, beginner-friendly comments in every file
   - ✅ Input validation with Pydantic models
   - ✅ Proper separation of concerns (embeddings/storage/logic)

### 🚧 PRODUCTION READINESS CHECKLIST

#### Must Do Before Production:
- [ ] **Environment Variables**: Set up `.env` file with `GEMINI_API_KEY`
- [ ] **Testing**: Test both endpoints with real queries
- [ ] **Error Validation**: Verify error handling works (try invalid requests)
- [ ] **Data Validation**: Ensure all JSON files follow schema
- [ ] **Performance Testing**: Test with large query loads

#### Should Do (Recommended):
- [ ] **Add CORS**: Enable frontend to call API from different origin
- [ ] **Add Rate Limiting**: Prevent API abuse (max requests per minute)
- [ ] **Add Authentication**: Protect endpoints with API keys
- [ ] **Add Monitoring**: Track errors, response times, API costs
- [ ] **Add Caching**: Cache common queries to reduce costs
- [ ] **Database Backup**: Backup LanceDB data regularly
- [ ] **Docker**: Containerize for easy deployment

#### Nice to Have (Future Enhancements):
- [ ] **Streaming Responses**: Stream roadmap generation in real-time
- [ ] **User Feedback**: Let users rate generated roadmaps
- [ ] **Multi-Language**: Support non-English queries
- [ ] **Cost Tracking**: Monitor Gemini API costs per user
- [ ] **A/B Testing**: Test different prompt strategies

4. **Server Launch Command:**
   ```powershell
   uvicorn app.main:app --reload --port 8001
   ```

### File Structure Requirements

```
/app
  /core
    embeddings.py      # BGE-M3 model singleton
    lancedb_store.py   # Vector DB operations
    rag_engine.py      # Query + Generation orchestration
  /utils
    loader.py          # Incremental JSON ingestion
  /models
    rag_request.py     # Pydantic request/response models
  /data
    dsa.json          # Auto-detected datasets
    *.json            # Add new domains here
  main.py             # FastAPI app + endpoints
  config.py           # Centralized settings
```

## Project-Specific Patterns

### 1. Singleton Pattern for Heavy Models
`embeddings.py` loads BGE-M3 once at module import (not per-request) to avoid startup overhead. Never instantiate models in request handlers.

### 2. Incremental Embedding on Startup
`@app.on_event("startup")` scans all JSON files but **only embeds new documents** by checking existing IDs in LanceDB. This prevents redundant embedding costs and enables fast restarts.

### 3. Domain Filtering
The `domain` field enables multi-tenant search (DSA, Physics, Interview prep). When adding new domains, update `app/data/` with matching JSON files and ensure `domain` field consistency.

### 4. LanceDB Vector Column Naming
Always use `vector_column_name="vector"` in `table.search()` calls. LanceDB requires explicit column specification for vector search.

### 5. Config Centralization
All paths and model names live in `app/config.py`. Never hardcode `EMBEDDING_MODEL_NAME` or `LANCE_DB_PATH` in other modules.

### 6. Gemini Integration Pattern
The `/rag/generate` endpoint follows this flow:
1. Embed user query with BGE-M3
2. Retrieve top-K similar topics from LanceDB
3. Format retrieved topics as context
4. Send context + query to Gemini API
5. Return generated roadmap to user

API key should be in environment variable `GEMINI_API_KEY` or `config.py`.

## Common Tasks

**Add a new topic domain:** Create `app/data/<domain>.json` with topic cards → restart server → topics auto-indexed

**Change embedding model:** Update `EMBEDDING_MODEL_NAME` in `config.py` → delete `lancedb_data/` → restart (rebuilds with new embeddings)

**Modify topic schema:** Update PyArrow schema in `lancedb_store.py` → update JSON files → delete existing table → restart

**Debug vector search:** Check `lancedb_store.query_similar()` - verify vector dimensions match model output (BGE-M3 = 1024-dim)

## Critical Constraints

- **LanceDB tables are immutable once created** - schema changes require table deletion and rebuild
- **BGE-M3 model requires ~2GB RAM** - ensure adequate memory in deployment
- **Vector dimensions must match** - BGE-M3 outputs 1024-dim; LanceDB schema must align
- **Startup blocking** - database build happens synchronously; server won't respond until complete (~10s for 1000 topics)

## Troubleshooting

**"Table already exists" error:** Delete `app/lancedb_data/topics.lance/` or entire `lancedb_data/` folder

**Empty search results:** Verify `domain` filter matches JSON data, check vector column name in query

**Model download hangs:** BGE-M3 downloads from HuggingFace on first run; may take 5-10 minutes depending on network

---

## 🚀 NEXT STEPS: Production Deployment

### Phase 1: Local Testing (Do This First!)

#### 1. Set Up Gemini API
```powershell
# Get API key from: https://makersuite.google.com/app/apikey
cd rag_service
echo 'GEMINI_API_KEY=your_actual_key_here' > .env
```

#### 2. Test Both Endpoints
```powershell
# Start server
.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --port 8001

# Test search endpoint (Postman or PowerShell)
Invoke-RestMethod -Uri http://localhost:8001/rag/query -Method POST -ContentType "application/json" -Body '{"query": "graph algorithms", "domain": "dsa"}'

# Test generate endpoint
Invoke-RestMethod -Uri http://localhost:8001/rag/generate -Method POST -ContentType "application/json" -Body '{"query": "I want to master dynamic programming in 3 weeks", "domain": "dsa", "num_topics": 8}'
```

#### 3. Verify Incremental Embedding
```powershell
# Add a new JSON file to test
# Restart server
# Should only embed NEW documents (check logs)
```

### Phase 2: Add Production Features

#### 1. CORS (For Frontend Integration)
```python
# Add to app/main.py
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

#### 2. Rate Limiting (Prevent Abuse)
```powershell
pip install slowapi
```
```python
# Add to app/main.py
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter

@app.post("/rag/generate")
@limiter.limit("10/minute")  # Max 10 requests per minute
def rag_generate_route(request: Request, body: RAGGenerate):
    ...
```

#### 3. API Key Authentication
```python
# Add to app/main.py
from fastapi import Header, HTTPException

async def verify_api_key(x_api_key: str = Header(...)):
    if x_api_key != os.getenv("API_KEY"):
        raise HTTPException(status_code=401, detail="Invalid API Key")

@app.post("/rag/generate", dependencies=[Depends(verify_api_key)])
def rag_generate_route(request: RAGGenerate):
    ...
```

### Phase 3: Deployment Options

#### Option A: Cloud Deployment (Recommended)

**Railway / Render / Fly.io (Easiest):**
1. Push code to GitHub
2. Connect Railway to your repo
3. Set environment variables in dashboard
4. Deploy automatically

**Docker + Cloud Run (Scalable):**
```dockerfile
# Create Dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY rag_service/app /app
COPY rag_service/app/requirements.txt /app/

RUN pip install --no-cache-dir -r requirements.txt

# Download BGE-M3 model at build time
RUN python -c "from FlagEmbedding import FlagModel; FlagModel('BAAI/bge-m3')"

EXPOSE 8001
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
```

```powershell
# Build and deploy
docker build -t rag-service .
docker run -p 8001:8001 --env-file .env rag-service
```

#### Option B: Local Server (Quick Start)

**Run as Windows Service:**
```powershell
# Install NSSM (Non-Sucking Service Manager)
# Create Windows service that auto-starts
nssm install RAGService "D:\AI_Project\rag_service\.venv\Scripts\python.exe" "D:\AI_Project\rag_service\.venv\Scripts\uvicorn" app.main:app --host 0.0.0.0 --port 8001
```

### Phase 4: Monitoring & Maintenance

#### 1. Add Logging to File
```python
# app/config.py
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("app.log"),
        logging.StreamHandler()
    ]
)
```

#### 2. Track API Costs
```python
# app/core/gemini_client.py
def generate_roadmap(query, topics):
    try:
        response = model.generate_content(prompt)
        
        # Log token usage for cost tracking
        usage = response.usage_metadata
        logger.info(f"Gemini API usage - Input: {usage.prompt_token_count}, Output: {usage.candidates_token_count}")
        
        return response.text
    except Exception as e:
        logger.error(f"Error: {e}")
```

#### 3. Database Backup
```powershell
# Backup LanceDB data
$date = Get-Date -Format "yyyy-MM-dd"
Copy-Item -Recurse app\lancedb_data "backups\lancedb_$date"
```

---

## 📋 IMMEDIATE ACTION ITEMS

**Right Now (5 minutes):**
1. Get Gemini API key: https://makersuite.google.com/app/apikey
2. Create `.env` file with key
3. Test `/rag/generate` endpoint in Postman

**Today (30 minutes):**
1. Add CORS for frontend integration
2. Test with 10-20 different queries
3. Verify error handling (try invalid inputs)

**This Week:**
1. Add rate limiting
2. Set up monitoring/logging
3. Create database backup script
4. Document API for frontend team

**Next Week:**
1. Choose deployment platform
2. Set up Docker (if needed)
3. Deploy to production
4. Monitor costs and performance
