from app.embedding import get_embedding

embedding = get_embedding("hello world")

print(type(embedding))
print(len(embedding))
print(embedding[:5])