"""
config.py
---------
This file stores configuration (settings) for the RAG service.

Why this is needed:
- So we don't hardcode paths or model names inside other files.
- If you change directories, you update only this file.
"""
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Path where LanceDB stores its tables
LANCE_DB_PATH = os.path.join(BASE_DIR, "lancedb_data")

# Embedding model (converts text to vectors for semantic search)
EMBEDDING_MODEL_NAME = "BAAI/bge-m3"

# Corpus folder (where JSON datasets live)
CORPUS_DIR = os.path.join(BASE_DIR, "data")

# ============================================================
# GEMINI API CONFIGURATION (for roadmap generation)
# ============================================================
# Get API key from environment variable for security
# How to get key: https://makersuite.google.com/app/apikey
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

# Gemini model to use (updated to latest stable model)
# Options: gemini-2.5-flash (faster), gemini-2.5-pro (more capable)
GEMINI_MODEL_NAME = "gemini-2.0-flash"

