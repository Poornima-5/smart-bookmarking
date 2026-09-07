"""Embedding client using the Hugging Face Inference Providers API.

get_embedding() calls the Hugging Face feature-extraction pipeline for
sentence-transformers/all-MiniLM-L6-v2 and returns a 384-dimensional vector.

Required environment variable:
    HF_TOKEN — Hugging Face API token used for authentication.
               Create one at https://huggingface.co/settings/tokens
"""

import os

import httpx
from dotenv import load_dotenv

load_dotenv()

_HF_API_URL = (
    "https://router.huggingface.co/hf-inference/models"
    "/sentence-transformers/all-MiniLM-L6-v2/pipeline/feature-extraction"
)
_TIMEOUT = 30.0  # seconds — inference is fast; 30 s is a generous ceiling


def get_embedding(text: str) -> list[float]:
    """Return a 384-dimensional embedding vector via the Hugging Face API.

    Args:
        text: The input text to embed.

    Returns:
        A list of 384 floats representing the semantic embedding.

    Raises:
        RuntimeError: If HF_TOKEN is missing, the request fails, the API
            returns a non-2xx status, or the response is not a valid embedding.
    """
    token = os.getenv("HF_TOKEN")
    if not token:
        raise RuntimeError(
            "HF_TOKEN is not set. "
            "Set it to your Hugging Face API token before starting the app."
        )

    try:
        response = httpx.post(
            _HF_API_URL,
            headers={"Authorization": f"Bearer {token}"},
            json={"inputs": text},
            timeout=_TIMEOUT,
        )
    except httpx.TimeoutException as exc:
        raise RuntimeError(
            f"Request to Hugging Face API timed out after {_TIMEOUT}s."
        ) from exc
    except httpx.RequestError as exc:
        raise RuntimeError(
            f"Network error while calling Hugging Face API: {exc}"
        ) from exc

    if response.status_code != 200:
        raise RuntimeError(
            f"Hugging Face API returned HTTP {response.status_code}: {response.text!r}"
        )

    try:
        data = response.json()
        # The feature-extraction pipeline returns a list[list[float]] when the
        # input is a single string — take the first (and only) element.
        if isinstance(data, list) and len(data) > 0 and isinstance(data[0], list):
            embedding = data[0]
        elif isinstance(data, list) and len(data) > 0 and isinstance(data[0], float):
            embedding = data
        else:
            raise ValueError(f"Unexpected shape: {type(data)}")
    except (ValueError, TypeError) as exc:
        raise RuntimeError(
            f"Unexpected response from Hugging Face API: {response.text!r}"
        ) from exc

    if not isinstance(embedding, list) or not all(
        isinstance(v, (int, float)) for v in embedding
    ):
        raise RuntimeError(
            f"Embedding is not a list of numbers: {embedding!r}"
        )

    return [float(v) for v in embedding]
