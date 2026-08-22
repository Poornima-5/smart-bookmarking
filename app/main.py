from fastapi import FastAPI
from pydantic import BaseModel

from app.ai_service import generate_metadata
from app.embedding import get_embedding
from app.qdrant_service import client
from qdrant_client.models import PointStruct

app = FastAPI()


class Bookmark(BaseModel):
    url: str
    title: str
    description: str = ""


class SearchQuery(BaseModel):
    query: str


@app.post("/bookmark")
def add_bookmark(bookmark: Bookmark):

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
                id=hash(bookmark.url) % 1000000,
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

    query_vector = get_embedding(query.query)

    results = client.query_points(
        collection_name="bookmarks",
        query=query_vector,
        limit=5,
    )

    return results