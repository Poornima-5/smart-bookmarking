from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from model import get_embedding

app = FastAPI(title="Embedding Service", version="0.1.0")


class EmbedRequest(BaseModel):
    text: str


class EmbedResponse(BaseModel):
    embedding: list[float]


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/embed", response_model=EmbedResponse)
def embed(request: EmbedRequest):
    if not request.text or not request.text.strip():
        raise HTTPException(
            status_code=422,
            detail="'text' must be a non-empty, non-whitespace string.",
        )
    return EmbedResponse(embedding=get_embedding(request.text))
