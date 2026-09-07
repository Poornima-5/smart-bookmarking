import os
from dotenv import load_dotenv

from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance,
    FieldCondition,
    Filter,
    MatchValue,
    PayloadSchemaType,
    PointStruct,
    VectorParams,
)

load_dotenv()

COLLECTION_NAME = "bookmarks"
VECTOR_SIZE = 384

_client: QdrantClient | None = None


def get_qdrant_client() -> QdrantClient:
    """Return a shared QdrantClient instance, created lazily without import side effects."""
    global _client
    if _client is None:
        url = os.getenv("QDRANT_URL")
        api_key = os.getenv("QDRANT_API_KEY")
        _client = QdrantClient(url=url, api_key=api_key)
    return _client


def ensure_collection(client: QdrantClient | None = None) -> None:
    """Ensure the 'bookmarks' collection and required payload indexes exist."""
    target_client = client or get_qdrant_client()
    collections = target_client.get_collections()
    existing_names = [c.name for c in collections.collections]

    if COLLECTION_NAME not in existing_names:
        target_client.create_collection(
            collection_name=COLLECTION_NAME,
            vectors_config=VectorParams(
                size=VECTOR_SIZE,
                distance=Distance.COSINE,
            ),
        )

    # Ensure keyword payload index on user_id for multi-tenant filtering
    collection_info = target_client.get_collection(collection_name=COLLECTION_NAME)
    payload_schema = collection_info.payload_schema or {}
    if "user_id" not in payload_schema:
        target_client.create_payload_index(
            collection_name=COLLECTION_NAME,
            field_name="user_id",
            field_schema=PayloadSchemaType.KEYWORD,
        )


def upsert_bookmark_vector(
    bookmark_id: str,
    user_id: str,
    vector: list[float],
    payload: dict,
    client: QdrantClient | None = None,
) -> None:
    """Upsert a bookmark embedding into Qdrant using the Supabase UUID as point ID."""
    target_client = client or get_qdrant_client()
    ensure_collection(target_client)

    target_client.upsert(
        collection_name=COLLECTION_NAME,
        points=[
            PointStruct(
                id=bookmark_id,
                vector=vector,
                payload=payload,
            )
        ],
    )


def search_bookmark_vectors(
    user_id: str,
    query_vector: list[float],
    limit: int = 10,
    client: QdrantClient | None = None,
) -> list[dict]:
    """Search bookmark vectors filtered strictly to the given user_id."""
    target_client = client or get_qdrant_client()
    ensure_collection(target_client)

    query_filter = Filter(
        must=[
            FieldCondition(
                key="user_id",
                match=MatchValue(value=user_id),
            )
        ]
    )

    response = target_client.query_points(
        collection_name=COLLECTION_NAME,
        query=query_vector,
        query_filter=query_filter,
        limit=limit,
    )

    results = []
    for point in response.points:
        payload = point.payload or {}
        results.append({
            "bookmark_id": payload.get("bookmark_id", str(point.id)),
            "title": payload.get("title", ""),
            "url": payload.get("url", ""),
            "summary": payload.get("summary"),
            "tags": payload.get("tags") or [],
            "score": point.score,
        })
    return results


def delete_bookmark_vector(
    bookmark_id: str,
    client: QdrantClient | None = None,
) -> None:
    """Delete a bookmark vector from Qdrant by its Supabase UUID."""
    target_client = client or get_qdrant_client()
    target_client.delete(
        collection_name=COLLECTION_NAME,
        points_selector=[bookmark_id],
    )