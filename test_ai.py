from app.ai_service import generate_metadata

result = generate_metadata(
    title="Attention Is All You Need",
    description="The paper introduces the Transformer architecture based entirely on attention mechanisms.",
    url="https://arxiv.org/abs/1706.03762",
)

print(result)