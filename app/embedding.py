"""HTTP client for the standalone embedding service.

The main application no longer runs SentenceTransformer in-process.
Instead, get_embedding() calls the separate embedding service over HTTP.

Required environment variable:
    EMBEDDING_SERVICE_URL — base URL of the embedding service,
                            e.g. http://localhost:8001 (local dev)
                            or   https://your-embedding-service.onrender.com (prod)

The variable has a local default so local development works out of the box,
but it should be set explicitly in any deployed environment.
"""

import os

import httpx
from dotenv import load_dotenv

load_dotenv()

_EMBEDDING_SERVICE_URL = os.getenv("EMBEDDING_SERVICE_URL", "http://localhost:8001")

# Warn loudly if nothing was configured — helps catch misconfigured deployments
# early rather than getting confusing connection-refused errors at request time.
if not _EMBEDDING_SERVICE_URL:
    raise RuntimeError(
        "EMBEDDING_SERVICE_URL is not set. "
        "Start the embedding service (see embedding_service/) and set "
        "EMBEDDING_SERVICE_URL to its base URL before starting the main app."
    )

_EMBED_ENDPOINT = f"{_EMBEDDING_SERVICE_URL}/embed"
_TIMEOUT = 30.0  # seconds — model inference is fast; 30 s is a generous ceiling


def get_embedding(text: str) -> list[float]:
    """Return a 384-dimensional embedding vector by calling the embedding service.

    Raises:
        httpx.ConnectError / httpx.TimeoutException — if the embedding service
            is unreachable or too slow.  These propagate so callers can wrap them
            in an appropriate HTTP 502/503 response.
        RuntimeError — if the response is not valid JSON or lacks the
            'embedding' key (indicates a service-side bug or version mismatch).
        httpx.HTTPStatusError — if the embedding service returns a 4xx/5xx.
    """
    try:
        response = httpx.post(
            _EMBED_ENDPOINT,
            json={"text": text},
            timeout=_TIMEOUT,
        )
        response.raise_for_status()
    except httpx.ConnectError as exc:
        raise httpx.ConnectError(
            f"Cannot reach the embedding service at {_EMBEDDING_SERVICE_URL}. "
            "Is it running? Check EMBEDDING_SERVICE_URL."
        ) from exc
    except httpx.TimeoutException as exc:
        raise httpx.TimeoutException(
            f"Embedding service at {_EMBEDDING_SERVICE_URL} timed out after {_TIMEOUT}s."
        ) from exc

    try:
        return response.json()["embedding"]
    except (KeyError, ValueError) as exc:
        raise RuntimeError(
            f"Unexpected response from embedding service: {response.text!r}"
        ) from exc
