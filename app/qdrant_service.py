import os
from dotenv import load_dotenv

from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams

load_dotenv()

client = QdrantClient(
    url=os.getenv("QDRANT_URL"),
    api_key=os.getenv("QDRANT_API_KEY")
)

collections = client.get_collections()

if "bookmarks" not in [
    c.name for c in collections.collections
]:
    client.create_collection(
        collection_name="bookmarks",
        vectors_config=VectorParams(
            size=384,
            distance=Distance.COSINE
        )
    )

print("Connected!")
print(client.get_collections())