from sentence_transformers import SentenceTransformer

print("Loading model...")

model = SentenceTransformer(
    "all-MiniLM-L6-v2",
    local_files_only=True
)

print("Model loaded!")

def get_embedding(text: str):
    return model.encode(text).tolist()