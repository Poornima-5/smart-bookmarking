import json
import os

from dotenv import load_dotenv
from groq import Groq

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))
MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-20b")


def generate_metadata(title: str, description: str, url: str) -> dict:
    prompt = f"""
You are a bookmarking assistant.

Analyze the following webpage metadata and generate useful information
for organizing the bookmark.

Title:
{title}

Description:
{description}

URL:
{url}

Return ONLY valid JSON with this structure:

{{
    "summary": "A concise 2-3 sentence summary",
    "tags": ["tag1", "tag2", "tag3", "tag4"]
}}

Rules:
- Generate 3-5 useful tags.
- Tags should describe the main topics, not generic words like "article".
- Do not invent information that isn't supported by the metadata.
"""

    response = client.chat.completions.create(
        model=MODEL,
        messages=[
            {
                "role": "system",
                "content": "You generate structured metadata for saved bookmarks."
            },
            {
                "role": "user",
                "content": prompt
            }
        ],
        temperature=0.2,
    )

    content = response.choices[0].message.content

    return json.loads(content)