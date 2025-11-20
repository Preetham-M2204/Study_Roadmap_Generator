"""
lancedb_store.py
----------------
🗄️ THIS FILE MANAGES YOUR VECTOR DATABASE!

═══════════════════════════════════════════════════════════════════
WHAT IS LANCEDB?
═══════════════════════════════════════════════════════════════════

Think of LanceDB as a SPECIAL LIBRARY CATALOG:

REGULAR DATABASE (PostgreSQL, MySQL):
- Stores: Text, numbers, dates
- Searches: Exact matches (WHERE name = 'John')
- Cannot understand MEANING ❌

VECTOR DATABASE (LanceDB):
- Stores: Vectors (arrays of 1024 numbers)
- Searches: Similarity (find topics LIKE "graph algorithms")
- Understands MEANING ✅

═══════════════════════════════════════════════════════════════════
REAL-WORLD ANALOGY:
═══════════════════════════════════════════════════════════════════

Imagine a library with 1000 books. You ask:
"Show me books about space exploration"

REGULAR DATABASE:
- Searches book titles for exact words "space exploration"
- Finds: 2 books ❌

VECTOR DATABASE (LanceDB):
- Understands you want books about: rockets, astronauts, NASA, planets
- Finds: 50 relevant books ✅

That's the power of vector search!

═══════════════════════════════════════════════════════════════════
WHY LANCEDB SPECIFICALLY?
═══════════════════════════════════════════════════════════════════

✅ File-based (no server needed - stores in folders)
✅ Handles nested data (resources[], prerequisites[])
✅ Fast searches (millions of vectors in milliseconds)
✅ Production-ready (used by real companies)

Alternatives: Chroma, Pinecone, Weaviate (we chose LanceDB for simplicity)

═══════════════════════════════════════════════════════════════════
THIS FILE'S JOB:
═══════════════════════════════════════════════════════════════════

1. get_or_create_table() → Create database table if doesn't exist
2. add_documents()        → Save topics with vectors to database
3. query_similar()        → Search for similar topics
4. get_existing_ids()     → Get list of topics already in DB (for incremental updates)
"""

import lancedb      # The vector database library
from app.config import LANCE_DB_PATH  # Path where DB files are stored
import pyarrow as pa  # Apache Arrow - defines table schema (structure)
import logging

logger = logging.getLogger(__name__)

# Table name inside the database
# Like a "folder" that holds all our topic vectors
TABLE_NAME = "topics"

# Global variable to keep database connection open
# Faster than reconnecting for every search
_table = None


def get_or_create_table():
    """
    🏗️ CREATE OR OPEN THE DATABASE TABLE
    
    ═══════════════════════════════════════════════════════════════════
    WHAT DOES THIS FUNCTION DO?
    ═══════════════════════════════════════════════════════════════════
    
    Think of this as creating a new Excel spreadsheet:
    - If spreadsheet exists → Open it
    - If doesn't exist → Create it with column headers
    
    Same here:
    - If table exists → Open it
    - If doesn't exist → Create it with schema (column definitions)
    
    ═══════════════════════════════════════════════════════════════════
    WHAT IS A SCHEMA?
    ═══════════════════════════════════════════════════════════════════
    
    Schema = Blueprint defining what data each row can store
    
    Like an Excel spreadsheet with these columns:
    | id    | topic        | domain | difficulty | vector (1024 cols) |
    |-------|--------------|--------|------------|-------------------|
    | dp_01 | DP Basics    | dsa    | easy       | [0.1, -0.2, ...]  |
    | dp_02 | Fibonacci DP | dsa    | easy       | [0.3, 0.5, ...]   |
    
    ═══════════════════════════════════════════════════════════════════
    """
    global _table
    
    # ═══════════════════════════════════════════════════════════════
    # STEP 1: CONNECT TO DATABASE
    # ═══════════════════════════════════════════════════════════════
    
    # LANCE_DB_PATH = "app/lancedb_data/"
    # This creates a folder structure to store vector data
    # No server needed - everything is stored as files!
    db = lancedb.connect(LANCE_DB_PATH)

    # ═══════════════════════════════════════════════════════════════
    # STEP 2: CHECK IF TABLE ALREADY EXISTS
    # ═══════════════════════════════════════════════════════════════
    
    if TABLE_NAME in db.table_names():
        # Table already exists (database was created before)
        # Just open and return it
        _table = db.open_table(TABLE_NAME)
        logger.debug(f"Opened existing table: {TABLE_NAME}")
        return _table

    # ═══════════════════════════════════════════════════════════════
    # STEP 3: CREATE NEW TABLE WITH SCHEMA
    # ═══════════════════════════════════════════════════════════════
    
    logger.info(f"Creating new table: {TABLE_NAME}")
    
    # WHAT IS PYARROW?
    # PyArrow is like a "type system" for databases
    # It defines exactly what type of data goes in each column
    
    # Define schema (table structure)
    schema = pa.schema([
        # BASIC FIELDS (simple text/numbers)
        ("id", pa.string()),              # "dp_01", "graph_02", etc.
        ("topic", pa.string()),           # "Dynamic Programming Basics"
        ("domain", pa.string()),          # "dsa" / "oops" / "computer_networks"
        ("subdomain", pa.string()),       # "basics" / "advanced" / "optimization"
        ("difficulty", pa.string()),      # "easy" / "medium" / "hard"
        ("estimated_hours", pa.int32()),  # 3, 5, 8 (integer number)
        ("description", pa.string()),     # Full text that gets embedded

        # NESTED ARRAY (list of strings)
        # Example: ["Array Basics", "Sorting Algorithms"]
        ("prerequisites", pa.list_(pa.string())),

        # NESTED OBJECTS (array of dictionaries)
        # Example: [
        #   {"title": "GFG Article", "type": "article", "url": "https://..."},
        #   {"title": "YouTube Video", "type": "youtube", "url": "https://..."}
        # ]
        ("resources", pa.list_(
            pa.struct([
                ("title", pa.string()),   # Resource name
                ("type", pa.string()),    # "video" / "article" / "problem"
                ("url", pa.string())      # Link to resource
            ])
        )),

        # 🚀 THE MAGIC: VECTOR COLUMN
        # This is where we store the 1024 numbers from BGE-M3
        #
        # WHY pa.list_(pa.float32(), 1024)?
        # - pa.float32() = Each number is a 32-bit float (decimal)
        # - 1024 = Fixed size (always exactly 1024 numbers)
        # - This creates a "FixedSizeList" required for vector search
        #
        # WRONG: pa.list_(pa.float32())  ❌ (variable size - search fails!)
        # RIGHT: pa.list_(pa.float32(), 1024)  ✅ (fixed size - search works!)
        ("vector", pa.list_(pa.float32(), 1024))
    ])

    # Create the table with this schema
    # From now on, all data added MUST match this structure
    _table = db.create_table(TABLE_NAME, schema=schema)
    logger.info(f"✓ Table created successfully")
    return _table


def get_existing_ids():
    """
    🔍 GET LIST OF DOCUMENTS ALREADY IN DATABASE
    
    ═══════════════════════════════════════════════════════════════════
    WHY DO WE NEED THIS?
    ═══════════════════════════════════════════════════════════════════
    
    PROBLEM: Server restarts happen often during development
    - Without this: Re-embed all 259 topics every restart (60 seconds!) ❌
    - With this: Only embed NEW topics (5 seconds!) ✅
    
    ═══════════════════════════════════════════════════════════════════
    HOW IT WORKS:
    ═══════════════════════════════════════════════════════════════════
    
    1. Check database for existing IDs
    2. loader.py compares JSON files with this list
    3. Only embeds topics NOT in this list
    
    Example:
    - Database has: ["dp_01", "dp_02", "dp_03"]
    - JSON file has: ["dp_01", "dp_02", "dp_03", "dp_04"]
    - We only embed: ["dp_04"] ← NEW topic!
    
    ═══════════════════════════════════════════════════════════════════
    RETURNS:
    ═══════════════════════════════════════════════════════════════════
    
    set of strings like: {"dp_01", "dp_02", "graph_01", ...}
    
    Why set? Sets have O(1) lookup time (super fast!)
    - Check if "dp_04" in set → instant
    - Check if "dp_04" in list → slow (searches whole list)
    """
    try:
        table = get_or_create_table()
        
        # ═══════════════════════════════════════════════════════════
        # CONVERT LANCEDB TABLE → PANDAS DATAFRAME
        # ═══════════════════════════════════════════════════════════
        
        # Pandas = Python library for working with tables (like Excel)
        # to_pandas() converts LanceDB data to pandas format
        existing_data = table.to_pandas()
        
        # existing_data now looks like:
        #       id         topic      domain  ...
        # 0   dp_01    DP Basics       dsa     ...
        # 1   dp_02    Fibonacci DP    dsa     ...
        # 2   graph_01 Graph BFS       dsa     ...
        
        if existing_data.empty:
            # Database is empty (first run)
            logger.info("Database is empty - no existing IDs")
            return set()  # Return empty set
        
        # ═══════════════════════════════════════════════════════════
        # EXTRACT ID COLUMN → CONVERT TO SET
        # ═══════════════════════════════════════════════════════════
        
        # existing_data['id'] → Get just the 'id' column
        # .tolist() → Convert to Python list ["dp_01", "dp_02", ...]
        # set() → Convert list to set for fast lookups
        existing_ids = set(existing_data['id'].tolist())
        
        logger.info(f"Found {len(existing_ids)} existing documents in database")
        return existing_ids
        
    except Exception as e:
        # If anything goes wrong (database corrupted, etc.)
        # Return empty set → system will re-embed everything
        logger.warning(f"Could not fetch existing IDs: {e}")
        return set()


def add_documents(records):
    """
    💾 SAVE TOPICS (WITH VECTORS) TO DATABASE
    
    ═══════════════════════════════════════════════════════════════════
    WHAT DOES THIS FUNCTION DO?
    ═══════════════════════════════════════════════════════════════════
    
    Takes a list of topics (each with a 1024-number vector) and saves
    them to the LanceDB database.
    
    Think of it like inserting rows into Excel:
    - Each topic = 1 row
    - Each field (id, topic, vector, etc.) = 1 column
    
    ═══════════════════════════════════════════════════════════════════
    EXAMPLE INPUT:
    ═══════════════════════════════════════════════════════════════════
    
    records = [
        {
            "id": "dp_01",
            "topic": "DP Basics",
            "domain": "dsa",
            "subdomain": "basics",
            "difficulty": "easy",
            "estimated_hours": 3,
            "description": "Master dynamic programming fundamentals...",
            "prerequisites": [],
            "resources": [
                {"title": "GFG DP", "type": "article", "url": "https://..."},
                {"title": "YouTube", "type": "video", "url": "https://..."}
            ],
            "vector": [0.234, -0.456, 0.789, ..., 0.123]  ← 1024 numbers
        },
        {
            "id": "dp_02",
            "topic": "Fibonacci DP",
            ...
            "vector": [0.567, 0.891, -0.234, ..., 0.456]  ← Different 1024 numbers
        }
    ]
    
    ═══════════════════════════════════════════════════════════════════
    WHAT HAPPENS:
    ═══════════════════════════════════════════════════════════════════
    
    1. Check if records list is empty (nothing to save)
    2. Get database table (create if doesn't exist)
    3. Add all records in one batch (fast!)
    4. Database now has these topics with their vectors
    
    ═══════════════════════════════════════════════════════════════════
    IMPORTANT: This function does NOT check for duplicates!
    Duplicate checking happens in loader.py BEFORE calling this function
    """
    if not records:
        # Empty list - nothing to save
        logger.warning("add_documents called with empty records list")
        return
    
    # Get database table (creates if doesn't exist)
    table = get_or_create_table()
    
    # Add all records at once (batch insert)
    # LanceDB automatically validates each record matches the schema
    # If any field is wrong type → ERROR!
    table.add(records)
    
    logger.info(f"✓ Added {len(records)} documents to LanceDB")
    
    # Now database file structure looks like:
    # lancedb_data/
    # └── topics.lance/
    #     ├── data/            ← Actual vector data stored here
    #     ├── _versions/       ← Version history for rollback
    #     └── _transactions/   ← Track changes for consistency


def query_similar(vector, limit=5, domain=None):
    """
    🔎 SEARCH FOR SIMILAR TOPICS (THE MAGIC HAPPENS HERE!)
    
    ═══════════════════════════════════════════════════════════════════
    WHAT DOES THIS FUNCTION DO?
    ═══════════════════════════════════════════════════════════════════
    
    This is THE CORE of semantic search!
    
    Takes your query vector and finds topics with SIMILAR vectors.
    "Similar vectors" = "similar meaning"
    
    ═══════════════════════════════════════════════════════════════════
    HOW SIMILARITY WORKS (SIMPLE EXPLANATION):
    ═══════════════════════════════════════════════════════════════════
    
    Imagine vectors as ARROWS in 1024-dimensional space:
    
    Query:   "graph algorithms" → [0.8, 0.6, -0.2, ...]
    Topic 1: "Graph BFS"        → [0.9, 0.7, -0.1, ...]  ← Similar direction!
    Topic 2: "Dynamic Programming" → [-0.3, 0.2, 0.9, ...] ← Different direction
    
    Math used: COSINE SIMILARITY
    - Arrows pointing same direction → score close to 1.0 (very similar)
    - Arrows pointing opposite → score close to 0.0 (not similar)
    
    LanceDB calculates this for ALL topics in database and returns top-K!
    
    ═══════════════════════════════════════════════════════════════════
    EXAMPLE:
    ═══════════════════════════════════════════════════════════════════
    
    Input:
        vector = [0.234, -0.456, ...]  ← Query "dynamic programming"
        limit = 5
        domain = "dsa"
    
    Output:
        [
            {
                "id": "dp_02",
                "topic": "Fibonacci DP",
                "description": "...",
                "resources": [...],
                "_distance": 0.62  ← Lower = more similar (0.0 = identical)
            },
            {
                "id": "dp_05",
                "topic": "House Robber II",
                "_distance": 0.65
            },
            ... (3 more topics)
        ]
    
    ═══════════════════════════════════════════════════════════════════
    WHAT IS "_distance"?
    ═══════════════════════════════════════════════════════════════════
    
    Distance between vectors (opposite of similarity):
    - 0.0 = Identical (same exact meaning)
    - 0.5 = Somewhat similar
    - 1.0 = Very different
    - 2.0 = Completely opposite
    
    We use threshold 0.75:
    - < 0.75 → Relevant ✅
    - > 0.75 → Not relevant ❌
    """
    table = get_or_create_table()
    
    # ═══════════════════════════════════════════════════════════════
    # CREATE SEARCH QUERY
    # ═══════════════════════════════════════════════════════════════
    
    # table.search() tells LanceDB:
    # "Compare this vector with all vectors in 'vector' column"
    # 
    # vector_column_name="vector" → Which column has the embeddings
    # .limit(limit) → Return only top 5 results
    q = table.search(vector, vector_column_name="vector").limit(limit)
    
    # What happens internally:
    # 1. LanceDB loads all 259 topic vectors from disk
    # 2. Calculates distance between query and each topic (259 calculations)
    # 3. Sorts by distance (smallest first)
    # 4. Returns top 5
    #
    # This happens in MILLISECONDS even with millions of vectors!
    # (Thanks to optimized C++ code and vector indexing)

    # ═══════════════════════════════════════════════════════════════
    # OPTIONAL: FILTER BY DOMAIN
    # ═══════════════════════════════════════════════════════════════
    
    if domain:
        # Only search topics where domain = "dsa" (or whatever specified)
        # SQL-like syntax: WHERE domain = 'dsa'
        q = q.where(f"domain = '{domain}'")
        logger.debug(f"Filtering results by domain: {domain}")
        
        # Example: If user asks about OOP, we filter to domain="oops"
        # This way DSA topics don't pollute results

    # ═══════════════════════════════════════════════════════════════
    # EXECUTE QUERY & RETURN RESULTS
    # ═══════════════════════════════════════════════════════════════
    
    # .to_list() converts LanceDB result to Python list of dicts
    # Each dict contains ALL fields from the schema + _distance
    return q.to_list()
