# Smart Bookmarking & Retrieval System


A full-stack platform for saving, organizing, and retrieving technical resources more efficiently.

The project extends traditional bookmarking with AI-generated metadata, embeddings, and semantic search, with the long-term goal of building a personal technical knowledge retrieval system.

## 🚀 Live Demo

**Deployed Application:** [DEPLOYED_URL](https://smart-bookmarking.onrender.com)


## ✨ Features

### 🔐 Authentication & Profiles

- User registration and login using Supabase Auth
- Email confirmation and resend confirmation flow
- JWT-based authentication
- User-scoped data access
- Profile management with display name
- Password update support

### 🔖 Bookmark Management

- Create, retrieve, update, and delete bookmarks
- URL normalization
- Duplicate bookmark detection
- Bookmark processing status tracking
- Automatic webpage title extraction and suggestion
- Persistent bookmark storage using PostgreSQL

### 🤖 AI-Powered Processing

- AI-generated bookmark summaries
- Automatic tags and categories
- Embedding generation using the Hugging Face Inference API
- Vector storage using Qdrant
- AI-assisted enrichment of saved technical resources

### 🔎 Semantic Search

- Natural-language search across saved bookmarks
- Vector similarity search using Qdrant
- Similarity scores for search results
- User-level filtering to ensure users only retrieve their own bookmarks

### 🎨 Frontend

- Responsive browser-based interface
- Light and dark themes
- Bookmark management dashboard
- Semantic search interface
- Profile and account management
- Loading, processing, empty, and error states

---

## 🏗️ Architecture

```text
                        Browser
                           │
                    HTML / CSS / JS
                           │
                           ▼
                       FastAPI
                      /       \
                     /         \
                    ▼           ▼
            Supabase          AI Processing
         Auth + PostgreSQL    Groq + Hugging Face
                                  │
                                  ▼
                               Qdrant
                           Vector Search
```

### Bookmark Processing

```text
User submits URL
       │
       ▼
FastAPI validation
       │
       ├── URL normalization
       ├── Duplicate check
       │
       ▼
Store bookmark in Supabase
       │
       ▼
AI processing
       │
       ├── Generate summary
       ├── Generate tags/category
       └── Generate embedding
                    │
                    ▼
                 Qdrant
                    │
                    ▼
          Bookmark becomes searchable
```

### Semantic Search

```text
Natural-language query
          │
          ▼
Generate query embedding
          │
          ▼
Qdrant similarity search
          │
          ▼
Filter by authenticated user
          │
          ▼
Relevant bookmarks + similarity scores
```

Supabase PostgreSQL acts as the primary source of truth for application data, while Qdrant is used for vector-based retrieval.

---

## 🛠️ Tech Stack

| Area | Technology |
|---|---|
| Language | Python |
| Backend | FastAPI |
| Frontend | HTML, CSS, JavaScript |
| Authentication | Supabase Auth |
| Database | Supabase PostgreSQL |
| Vector Database | Qdrant |
| Embeddings | Hugging Face Inference API |
| LLM | Groq |
| Testing | Pytest |
| Package Management | uv |
| Deployment | Render |

---

## 🔑 Key Engineering Decisions

- **FastAPI** provides a lightweight, API-focused Python backend.
- **Supabase Auth** handles authentication instead of maintaining a custom authentication system.
- **PostgreSQL** stores persistent relational application data.
- **Qdrant** is used separately for vector storage and similarity search.
- **Hugging Face Inference API** provides embeddings without loading a local embedding model into the deployed web service, keeping the deployment lightweight.
- **Groq** is used for AI-powered bookmark metadata processing.
- **User-scoped retrieval** ensures semantic search only operates on the authenticated user's bookmarks.
- **Vanilla HTML/CSS/JavaScript** keeps the current frontend lightweight while the backend and retrieval architecture evolve.

---

## 🔐 Security & Data Isolation

The application is designed around authenticated, user-scoped access.

- Authentication is handled through Supabase Auth.
- User identity is derived from the authenticated request.
- Bookmark operations are scoped to the current user.
- Users cannot retrieve or modify another user's bookmarks.
- Semantic search applies a user-level filter in Qdrant.
- Bookmark and profile inputs are validated by the backend.

---

## 🧪 Testing

The project includes automated tests covering:

- Authentication and JWT validation
- Bookmark CRUD operations
- Input validation
- Duplicate detection
- User isolation
- Semantic search
- Qdrant operations and filtering
- Bookmark processing
- URL normalization and title extraction
- Profile management

**Current status:**

```text
59 tests passed
```

Run the test suite with:

```powershell
uv run pytest -v
```

Additional checks:

```powershell
uv lock --check
git diff --check
```

---

## 📁 Project Structure

```text
smart-bookmarking/
│
├── app/
│   ├── auth.py
│   ├── main.py
│   ├── url_utils.py
│   ├── profiles_service.py
│   └── ...
│
├── static/
│   ├── index.html
│   ├── styles.css
│   └── app.js
│
├── db/
│   └── schema.sql
│
├── test_auth.py
├── test_bookmarks.py
├── test_bookmarks_service.py
├── test_bookmark_processing.py
├── test_profiles.py
│
├── pyproject.toml
├── uv.lock
└── README.md
```

---

## ⚙️ Local Setup

### Requirements

- Python 3.12+
- [uv](https://docs.astral.sh/uv/)
- Supabase project
- Qdrant collection
- Hugging Face API token
- Groq API key

### Install Dependencies

```powershell
uv sync
```

### Environment Variables

Create a `.env` file containing:

```env
SUPABASE_URL=...
SUPABASE_KEY=...

QDRANT_URL=...
QDRANT_API_KEY=...

HF_TOKEN=...

GROQ_API_KEY=...
GROQ_MODEL=...
```

### Run Locally

```powershell
uv run uvicorn app.main:app --reload
```

The application will be available at:

```text
http://127.0.0.1:8000
```

---

## ☁️ Deployment

The application is deployed as a lightweight web service on Render.

The deployment relies on managed external services for authentication, PostgreSQL, vector storage, embeddings, and LLM processing. This keeps the deployed API lightweight while supporting AI-powered bookmark processing and semantic retrieval.

**Production URL:** [[DEPLOYED_URL](https://smart-bookmarking.onrender.com)]

---

## 🔮 Future Scope

The project is being developed incrementally toward a more intelligent technical-resource retrieval system.

### 🌐 Browser Extension

- Chrome/Chromium extension for one-click bookmarking
- Automatic webpage metadata capture
- Trigger bookmark processing directly from the browser

### 🧠 Improved Retrieval

- Hybrid keyword + semantic search
- Improved relevance ranking
- Metadata-aware retrieval
- Related-resource discovery

### 📚 Knowledge Organization

- Collections and folders
- Smarter topic organization
- User-defined tags
- Related bookmark discovery

### ⚡ Scalable Processing

- Dedicated background workers
- Queue-based processing
- Retry and failure handling
- More efficient batch processing

### 🛡️ Security & Reliability

- Stronger prompt-injection defenses
- Malicious-content handling
- Rate limiting
- Improved monitoring and error handling

---

## 🎯 Project Vision

The long-term goal is to move beyond a traditional bookmark manager into an **AI-assisted technical knowledge retrieval system**.

Instead of remembering where a resource was saved or exactly what it was called, users should be able to describe what they need and retrieve the most relevant resources from their own personal knowledge base.

```text
Save resources
      ↓
Automatic enrichment
      ↓
Build a personal knowledge base
      ↓
Search using natural language
      ↓
Retrieve relevant resources
```
