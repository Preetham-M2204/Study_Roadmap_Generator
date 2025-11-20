"""
loader.py
---------
Incremental data loader for RAG system.

Key Feature: ONLY embeds NEW documents!
- Checks which documents already exist in LanceDB
- Skips embedding for existing documents (saves time & money)
- Only embeds documents that aren't in the database yet
- Makes server restarts instant after first run

This is critical for production:
- First startup: Embeds all documents (~10-30 seconds for 200 topics)
- Subsequent startups: Skips if nothing new (~1 second)
- Adding new topics: Only embeds the new ones
"""

import json
import os
import logging
from app.config import CORPUS_DIR
from app.core.embeddings import embed_texts
from app.core.lancedb_store import add_documents, get_existing_ids

# Setup logger
logger = logging.getLogger(__name__)


def load_corpus_and_build_db():
    """
    Main function that runs on server startup.
    
    Workflow:
    1. Scan /app/data/*.json files
    2. Get list of IDs already in LanceDB
    3. Filter out documents that already exist
    4. Embed only NEW documents
    5. Insert new documents into LanceDB
    
    This makes the system efficient - you can restart the server
    without re-embedding everything!
    """
    
    logger.info("🔍 Scanning for JSON datasets...")
    all_cards = []

    # Step 1: Load all JSON files from /app/data directory
    # Automatically detects any .json file (dsa.json, physics.json, etc.)
    for file in os.listdir(CORPUS_DIR):
        if file.endswith(".json"):
            file_path = os.path.join(CORPUS_DIR, file)
            with open(file_path, "r", encoding="utf-8") as f:
                items = json.load(f)
                all_cards.extend(items)
                logger.info(f"  ✓ Loaded {len(items)} topics from {file}")

    if not all_cards:
        logger.warning("⚠️  No topics found in data directory!")
        return

    logger.info(f"\n📊 Total topics in JSON files: {len(all_cards)}")
    
    # Step 2: Check which documents already exist in LanceDB
    # This is the KEY to incremental embedding!
    logger.info("🔎 Checking for existing documents in database...")
    existing_ids = get_existing_ids()  # Returns set like {"arrays_01", "arrays_02"}
    
    # Step 3: Filter to get only NEW documents
    # Compare JSON document IDs with database IDs
    new_cards = [card for card in all_cards if card["id"] not in existing_ids]
    
    # Log what we found
    if len(existing_ids) > 0:
        logger.info(f"  ✓ Found {len(existing_ids)} existing documents (will skip)")
    
    if not new_cards:
        # All documents already exist - nothing to do!
        logger.info("✅ All documents already embedded - database is up to date!")
        return
    
    # We have new documents to embed
    logger.info(f"  ⚡ Found {len(new_cards)} NEW documents to embed")
    
    # Step 4: Embed only the NEW documents
    # Extract descriptions from new documents
    descriptions = [card["description"] for card in new_cards]
    
    logger.info("🚀 Starting embedding process...")
    logger.info(f"   (Embedding {len(new_cards)} documents, ~{len(new_cards)//10} seconds)")
    
    # Call BGE-M3 model to convert text → vectors
    vectors = embed_texts(descriptions)
    logger.info("  ✓ Embedding complete!")

    # Step 5: Prepare records for LanceDB
    # Each record needs ALL schema fields including the vector
    logger.info("💾 Preparing records for LanceDB...")
    records = []

    for card, vec in zip(new_cards, vectors):
        # Convert numpy array to Python list (required by LanceDB)
        card["vector"] = vec.tolist()
        records.append(card)

    # Step 6: Insert into database
    logger.info(f"  ✓ Inserting {len(records)} new records into LanceDB...")
    add_documents(records)
    
    # Success!
    logger.info("✅ Database update complete!")
    logger.info(f"   Total documents in database: {len(existing_ids) + len(new_cards)}")
