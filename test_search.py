from app.embedding import get_embedding
from app.qdrant_service import client

query = "attention in neural networks"

query_vector = get_embedding(query)

results = client.query_points(
    collection_name="bookmarks",
    query=query_vector,
    limit=5
)

print(results)