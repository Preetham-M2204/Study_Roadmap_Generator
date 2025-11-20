"""
embeddings.py
--------------
Responsible for converting text into vector embeddings using BGE-M3.

Why:
- RAG uses semantic search → vectors represent meaning.
"""

from FlagEmbedding import FlagModel
from app.config import EMBEDDING_MODEL_NAME
from typing import List

# Load the embedding model once at startup → faster inference
embedding_model = FlagModel(EMBEDDING_MODEL_NAME, use_fp16=False)

def embed_texts(texts: List[str]):
    """
    Convert list of text strings to a list of vectors.
    """
    return embedding_model.encode(texts)
