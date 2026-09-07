"""Manual smoke-test for get_embedding().

Run with:
    uv run python test_embedding.py

Requires HF_TOKEN to be set in the environment or .env file.
Expected output:
    <class 'list'>
    384
    [<five floats>]
"""
from app.embedding import get_embedding

embedding = get_embedding("hello world")

print(type(embedding))
print(len(embedding))
print(embedding[:5])