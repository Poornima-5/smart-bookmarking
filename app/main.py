from fastapi import FastAPI
from pydantic import BaseModel

from app.embedding import get_embedding
from app.qdrant_service import client
from qdrant_client.models import PointStruct

app = FastAPI()


class Bookmark(BaseModel):
    title: str
    content: str


class SearchQuery(BaseModel):
    query: str


@app.post("/bookmark")
def add_bookmark(bookmark: Bookmark):

    vector = get_embedding(bookmark.content)

    client.upsert(
        collection_name="bookmarks",
        points=[
            PointStruct(
                id=hash(bookmark.title) % 1000000,
                vector=vector,
                payload={
                    "title": bookmark.title,
                    "content": bookmark.content
                }
            )
        ]
    )

    return {"message": "Bookmark added"}


@app.post("/search")
def search(query: SearchQuery):

    query_vector = get_embedding(query.query)

    results = client.query_points(
        collection_name="bookmarks",
        query=query_vector,
        limit=5
    )

    return results