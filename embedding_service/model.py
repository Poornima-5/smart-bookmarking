from sentence_transformers import SentenceTransformer

print("Loading model...")
_model = SentenceTransformer("all-MiniLM-L6-v2")
print("Model loaded.")


def get_embedding(text: str) -> list[float]:
    """Return a 384-dimensional embedding vector for the given text.

    The model is loaded once at module import time and reused for every call.
    """
    return _model.encode(text).tolist()
