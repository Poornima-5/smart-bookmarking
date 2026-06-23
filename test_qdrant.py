from app.embedding import get_embedding
from app.qdrant_service import client
from qdrant_client.models import PointStruct

text = "Transformers use self attention mechanisms"

vector = get_embedding(text)

client.upsert(
    collection_name="bookmarks",
    points=[
        PointStruct(
            id=1,
            vector=vector,
            payload={
                "title": "Transformer Notes",
                "content": text
            }
        )
    ]
)

print("Inserted successfully!")