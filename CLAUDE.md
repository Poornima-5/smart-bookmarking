# Final Product Vision

## What We Are Building

The final product is an AI-powered semantic bookmarking browser extension.

The fundamental problem it solves is bookmark retrieval.

Traditional bookmarks require users to remember:
- the exact page title
- keywords
- folders where they stored the bookmark

Our system should allow users to save a webpage once and later retrieve it using natural-language descriptions of what they remember.

Example:

User saved:
"Running Llama 3 Locally with Ollama"

Later searches:
"I remember an article about running an LLM locally on my laptop"

The system should retrieve the saved bookmark through semantic similarity.

The user should NOT need to know the original title or exact keywords.

---

## Final Product Capabilities

### 1. Bookmark Capture

The browser extension should allow users to save the current webpage.

The system should capture:
- URL
- title
- webpage description and/or useful page content

### 2. AI Bookmark Understanding

When a bookmark is saved, the system should automatically generate:
- concise summary
- useful semantic tags
- category/classification where appropriate

The system should use webpage content when available rather than relying only on title metadata.

### 3. Semantic Search

Users should be able to search using natural language.

Example:

"Find the article I saved about deploying machine learning models."

The system should retrieve semantically relevant bookmarks even when the query does not contain the exact words used in the bookmark.

### 4. Bookmark Organization

The long-term product should support:
- automatic categories
- tags
- duplicate/near-duplicate detection
- related bookmarks

These features should be built only after the core retrieval pipeline is reliable.

### 5. Bookmark Details

Users should be able to view:
- original URL
- title
- description
- AI summary
- tags
- creation date
- related bookmarks

### 6. Multi-user Support

The final system must support multiple users.

Each user's bookmarks must be isolated.

A user must never be able to retrieve or access another user's bookmarks.

Authentication will use Supabase Auth.

### 7. Browser Extension

The browser extension is the primary user interface.

The extension should provide:
- save current page
- search bookmarks
- view bookmarks
- view bookmark details
- delete bookmarks
- authentication/session handling

A separate standalone frontend is not a primary requirement.

---

# Final Architecture

Browser Extension
        |
        | HTTPS / authenticated requests
        v
FastAPI
        |
        +--------------------+
        |                    |
        v                    v
Supabase                 n8n
        |                    |
        |                    +--> webpage extraction
        |                    +--> Groq metadata generation
        |                    +--> embedding generation
        |                    +--> Qdrant indexing
        |
        v
Source of Truth

Qdrant
        |
        v
Vector Search Index

Search path:

Browser Extension
        |
        v
FastAPI
        |
        +--> authenticate user
        |
        +--> generate query embedding
        |
        +--> Qdrant semantic search
        |
        +--> retrieve bookmark IDs
        |
        +--> Supabase bookmark records
        |
        v
Search results

n8n MUST NOT be in the synchronous search path.

---

# Long-Term Feature Roadmap

## Phase 1 — Completed Prototype

- FastAPI backend
- Groq metadata generation
- SentenceTransformer embeddings
- Qdrant storage
- semantic search
- deterministic bookmark IDs

## Phase 2 — Product Architecture

- Supabase/Postgres
- authentication
- bookmark ownership
- API redesign
- asynchronous processing model
- n8n workflow
- Qdrant user-scoped indexing

## Phase 3 — Browser Extension

- authentication UI
- save current webpage
- bookmark processing status
- bookmark list
- semantic search
- bookmark details
- delete bookmark

## Phase 4 — Retrieval Quality

- create retrieval evaluation dataset
- evaluate semantic search
- analyze failures
- improve searchable representation
- consider hybrid retrieval if justified
- measure retrieval quality before/after changes

## Phase 5 — Intelligent Features

- duplicate detection
- related bookmarks
- automatic categories
- improved webpage content extraction
- bookmark recommendations

## Phase 6 — Production Hardening

- error handling
- retries
- observability/logging
- security review
- rate limiting where appropriate
- deployment
- documentation