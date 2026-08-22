from datetime import datetime
from pathlib import Path
from uuid import UUID
import os
import uuid

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, field_validator

from app.ai_service import generate_metadata
from app.auth import get_current_user
from app.bookmarks_service import (
    DuplicateBookmarkError,
    create_bookmark,
    delete_bookmark,
    get_bookmark,
    list_bookmarks,
)

app = FastAPI()

STATIC_DIR = Path(__file__).resolve().parent.parent / "static"


def _embeddings_enabled() -> bool:
    """Gates the legacy embedding/Qdrant endpoints.

    SentenceTransformer pulls in torch/transformers, which alone exceeds
    Render's 512MB free-tier limit. Off by default so the process never
    imports that stack; set EMBEDDINGS_ENABLED=true locally to use
    /bookmark and /search.
    """
    return os.getenv("EMBEDDINGS_ENABLED", "false").lower() == "true"


@app.get("/config")
def get_public_config():
    """Public, browser-safe config. Never expose SUPABASE_SECRET_KEY here."""
    return {
        "supabase_url": os.getenv("SUPABASE_URL"),
        "supabase_publishable_key": os.getenv("SUPABASE_PUBLISHABLE_KEY"),
    }


@app.get("/me")
def get_me(user_id: str = Depends(get_current_user)):
    return {"user_id": user_id}


class Bookmark(BaseModel):
    url: str
    title: str
    description: str = ""


class SearchQuery(BaseModel):
    query: str


class BookmarkCreate(BaseModel):
    url: str
    title: str
    description: str = ""

    @field_validator("url", "title")
    @classmethod
    def _not_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("must not be blank")
        return value


class BookmarkRecord(BaseModel):
    id: UUID
    user_id: UUID
    url: str
    normalized_url: str
    title: str
    description: str | None = None
    raw_content: str | None = None
    summary: str | None = None
    tags: list[str] | None = None
    category: str | None = None
    status: str
    error_message: str | None = None
    duplicate_of: UUID | None = None
    duplicate_score: float | None = None
    created_at: datetime
    updated_at: datetime


@app.post(
    "/bookmarks",
    status_code=status.HTTP_202_ACCEPTED,
    response_model=BookmarkRecord,
)
def create_bookmark_endpoint(
    bookmark: BookmarkCreate, user_id: str = Depends(get_current_user)
):
    try:
        return create_bookmark(
            user_id=user_id,
            url=bookmark.url,
            title=bookmark.title,
            description=bookmark.description,
        )
    except DuplicateBookmarkError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Bookmark already exists for this user",
        )


@app.get("/bookmarks", response_model=list[BookmarkRecord])
def list_bookmarks_endpoint(user_id: str = Depends(get_current_user)):
    return list_bookmarks(user_id)


@app.get("/bookmarks/{bookmark_id}", response_model=BookmarkRecord)
def get_bookmark_endpoint(
    bookmark_id: str, user_id: str = Depends(get_current_user)
):
    record = get_bookmark(user_id, bookmark_id)
    if record is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Bookmark not found"
        )
    return record


@app.delete("/bookmarks/{bookmark_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_bookmark_endpoint(
    bookmark_id: str, user_id: str = Depends(get_current_user)
):
    deleted = delete_bookmark(user_id, bookmark_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Bookmark not found"
        )


@app.post("/bookmark")
def add_bookmark(bookmark: Bookmark):
    if not _embeddings_enabled():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "Legacy embedding-based bookmark creation is disabled in this "
                "deployment. Use POST /bookmarks instead."
            ),
        )

    from app.embedding import get_embedding
    from app.qdrant_service import client
    from qdrant_client.models import PointStruct

    # 1. Generate AI metadata
    metadata = generate_metadata(
        title=bookmark.title,
        description=bookmark.description,
        url=bookmark.url,
    )

    # 2. Build text for semantic embedding
    searchable_text = f"""
    Title: {bookmark.title}
    Description: {bookmark.description}
    Summary: {metadata["summary"]}
    Tags: {", ".join(metadata["tags"])}
    """

    vector = get_embedding(searchable_text)

    # 3. Store everything in Qdrant
    client.upsert(
        collection_name="bookmarks",
        points=[
            PointStruct(
                id=str(uuid.uuid5(uuid.NAMESPACE_URL, bookmark.url)),
                vector=vector,
                payload={
                    "url": bookmark.url,
                    "title": bookmark.title,
                    "description": bookmark.description,
                    "summary": metadata["summary"],
                    "tags": metadata["tags"],
                },
            )
        ],
    )

    return {
        "message": "Bookmark added",
        "bookmark": {
            "url": bookmark.url,
            "title": bookmark.title,
            "summary": metadata["summary"],
            "tags": metadata["tags"],
        },
    }


@app.post("/search")
def search(query: SearchQuery):
    if not _embeddings_enabled():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Semantic search is temporarily unavailable in this deployment.",
        )

    from app.embedding import get_embedding
    from app.qdrant_service import client

    query_vector = get_embedding(query.query)

    results = client.query_points(
        collection_name="bookmarks",
        query=query_vector,
        limit=5,
    )

    return results


# Mounted last so it never shadows the API routes above; serves index.html at "/".
app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="frontend")