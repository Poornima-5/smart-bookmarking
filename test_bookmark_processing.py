from types import SimpleNamespace
from unittest.mock import MagicMock, patch
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app.bookmarks_service import delete_bookmark, update_bookmark_metadata
from app.main import app, process_bookmark_task
from app.qdrant_service import search_bookmark_vectors

client = TestClient(app)

USER_ID = "11111111-1111-1111-1111-111111111111"
OTHER_USER_ID = "22222222-2222-2222-2222-222222222222"
BOOKMARK_ID = "33333333-3333-3333-3333-333333333333"


def auth_headers(token="valid.token.value"):
    return {"Authorization": f"Bearer {token}"}


def mock_authenticated_user(user_id=USER_ID):
    fake_user = SimpleNamespace(id=user_id)
    fake_response = SimpleNamespace(user=fake_user)
    return patch("app.auth.public_client.auth.get_user", return_value=fake_response)


# ---- 1. Background processing success ----


def test_process_bookmark_task_success():
    with patch(
        "app.main.update_bookmark_metadata"
    ) as mock_update, patch(
        "app.main.generate_metadata",
        return_value={"summary": "Useful summary", "tags": ["python", "ai"]},
    ) as mock_ai, patch(
        "app.main.get_embedding", return_value=[0.1] * 384
    ) as mock_embed, patch(
        "app.main.upsert_bookmark_vector"
    ) as mock_upsert:
        process_bookmark_task(
            bookmark_id=BOOKMARK_ID,
            user_id=USER_ID,
            url="https://example.com/test",
            title="Test Bookmark",
            description="A test description",
        )

    # Status set to processing first
    mock_update.assert_any_call(
        user_id=USER_ID,
        bookmark_id=BOOKMARK_ID,
        status="processing",
    )

    # Metadata & embedding called
    mock_ai.assert_called_once_with(
        title="Test Bookmark",
        description="A test description",
        url="https://example.com/test",
    )
    mock_embed.assert_called_once()
    assert "Title: Test Bookmark" in mock_embed.call_args[0][0]
    assert "Summary: Useful summary" in mock_embed.call_args[0][0]

    # Qdrant upserted with point ID and payload
    mock_upsert.assert_called_once_with(
        bookmark_id=BOOKMARK_ID,
        user_id=USER_ID,
        vector=[0.1] * 384,
        payload={
            "bookmark_id": BOOKMARK_ID,
            "user_id": USER_ID,
            "url": "https://example.com/test",
            "title": "Test Bookmark",
            "summary": "Useful summary",
            "tags": ["python", "ai"],
        },
    )

    # Status updated to completed with summary and tags
    mock_update.assert_any_call(
        user_id=USER_ID,
        bookmark_id=BOOKMARK_ID,
        status="completed",
        summary="Useful summary",
        tags=["python", "ai"],
    )


# ---- 2. Background processing failure ----


def test_process_bookmark_task_failure_marks_status_failed():
    with patch(
        "app.main.update_bookmark_metadata"
    ) as mock_update, patch(
        "app.main.generate_metadata", side_effect=RuntimeError("Groq service error")
    ):
        # Must not raise an unhandled exception
        process_bookmark_task(
            bookmark_id=BOOKMARK_ID,
            user_id=USER_ID,
            url="https://example.com/fail",
            title="Fail Bookmark",
            description="",
        )

    # First updated to processing
    mock_update.assert_any_call(
        user_id=USER_ID,
        bookmark_id=BOOKMARK_ID,
        status="processing",
    )

    # Then updated to failed with the error message
    mock_update.assert_any_call(
        user_id=USER_ID,
        bookmark_id=BOOKMARK_ID,
        status="failed",
        error_message="Groq service error",
    )


# ---- 3. Qdrant payload contains user_id and bookmark_id ----


def test_qdrant_payload_structure():
    with patch("app.main.update_bookmark_metadata"), patch(
        "app.main.generate_metadata",
        return_value={"summary": "Sample summary", "tags": ["tag1"]},
    ), patch("app.main.get_embedding", return_value=[0.2] * 384), patch(
        "app.main.upsert_bookmark_vector"
    ) as mock_upsert:
        process_bookmark_task(
            bookmark_id=BOOKMARK_ID,
            user_id=USER_ID,
            url="https://example.com/structure",
            title="Structure Test",
            description="",
        )

    payload = mock_upsert.call_args[1]["payload"]
    assert payload["bookmark_id"] == BOOKMARK_ID
    assert payload["user_id"] == USER_ID
    assert payload["url"] == "https://example.com/structure"
    assert payload["title"] == "Structure Test"
    assert payload["summary"] == "Sample summary"
    assert payload["tags"] == ["tag1"]


# ---- 4. Authenticated semantic search ----


def test_search_without_token_returns_401():
    response = client.post("/bookmarks/search", json={"query": "python"})
    assert response.status_code == 401


def test_search_blank_query_returns_422():
    with mock_authenticated_user():
        response = client.post(
            "/bookmarks/search",
            json={"query": "   "},
            headers=auth_headers(),
        )
    assert response.status_code == 422


def test_search_returns_results_with_scores():
    mock_results = [
        {
            "bookmark_id": BOOKMARK_ID,
            "title": "Found Article",
            "url": "https://example.com/article",
            "summary": "Summary of article",
            "tags": ["ml", "nlp"],
            "score": 0.89,
        }
    ]

    with mock_authenticated_user(), patch(
        "app.main.get_embedding", return_value=[0.3] * 384
    ) as mock_embed, patch(
        "app.main.search_bookmark_vectors", return_value=mock_results
    ) as mock_search:
        response = client.post(
            "/bookmarks/search",
            json={"query": "machine learning"},
            headers=auth_headers(),
        )

    assert response.status_code == 200
    results = response.json()
    assert len(results) == 1
    assert results[0]["bookmark_id"] == BOOKMARK_ID
    assert results[0]["title"] == "Found Article"
    assert results[0]["score"] == 0.89

    mock_embed.assert_called_once_with("machine learning")
    mock_search.assert_called_once_with(
        user_id=USER_ID,
        query_vector=[0.3] * 384,
        limit=10,
    )


# ---- 5. Search is scoped to the authenticated user's user_id ----


def test_search_is_scoped_to_authenticated_user():
    with mock_authenticated_user(user_id=OTHER_USER_ID), patch(
        "app.main.get_embedding", return_value=[0.1] * 384
    ), patch("app.main.search_bookmark_vectors", return_value=[]) as mock_search:
        response = client.post(
            "/bookmarks/search",
            json={"query": "databases"},
            headers=auth_headers(),
        )

    assert response.status_code == 200
    mock_search.assert_called_once_with(
        user_id=OTHER_USER_ID,
        query_vector=[0.1] * 384,
        limit=10,
    )


def test_qdrant_service_search_applies_user_id_filter():
    mock_qdrant = MagicMock()
    mock_qdrant.get_collections.return_value = SimpleNamespace(
        collections=[SimpleNamespace(name="bookmarks")]
    )
    mock_qdrant.get_collection.return_value = SimpleNamespace(
        payload_schema={"user_id": SimpleNamespace()}
    )
    mock_qdrant.query_points.return_value = SimpleNamespace(points=[])

    search_bookmark_vectors(
        user_id=USER_ID,
        query_vector=[0.5] * 384,
        limit=5,
        client=mock_qdrant,
    )

    mock_qdrant.query_points.assert_called_once()
    call_kwargs = mock_qdrant.query_points.call_args[1]
    query_filter = call_kwargs["query_filter"]
    assert query_filter is not None
    assert query_filter.must[0].key == "user_id"
    assert query_filter.must[0].match.value == USER_ID


# ---- 6. Bookmark deletion removes its Qdrant vector ----


def test_delete_bookmark_removes_qdrant_vector_on_success():
    mock_db = MagicMock()
    mock_db.table.return_value.delete.return_value.eq.return_value.eq.return_value.execute.return_value = SimpleNamespace(
        data=[{"id": BOOKMARK_ID}]
    )

    with patch("app.bookmarks_service.admin_client", mock_db), patch(
        "app.qdrant_service.delete_bookmark_vector"
    ) as mock_delete_vector:
        result = delete_bookmark(USER_ID, BOOKMARK_ID)

    assert result is True
    mock_delete_vector.assert_called_once_with(BOOKMARK_ID)


def test_delete_bookmark_does_not_remove_vector_when_not_owned():
    mock_db = MagicMock()
    mock_db.table.return_value.delete.return_value.eq.return_value.eq.return_value.execute.return_value = SimpleNamespace(
        data=[]
    )

    with patch("app.bookmarks_service.admin_client", mock_db), patch(
        "app.qdrant_service.delete_bookmark_vector"
    ) as mock_delete_vector:
        result = delete_bookmark(OTHER_USER_ID, BOOKMARK_ID)

    assert result is False
    mock_delete_vector.assert_not_called()


# ---- 7. Supabase update_bookmark_metadata service function ----


def test_update_bookmark_metadata_success():
    mock_db = MagicMock()
    updated_row = {
        "id": BOOKMARK_ID,
        "user_id": USER_ID,
        "status": "completed",
        "summary": "Done",
        "tags": ["ai"],
    }
    mock_db.table.return_value.update.return_value.eq.return_value.eq.return_value.execute.return_value = SimpleNamespace(
        data=[updated_row]
    )

    with patch("app.bookmarks_service.admin_client", mock_db):
        result = update_bookmark_metadata(
            user_id=USER_ID,
            bookmark_id=BOOKMARK_ID,
            status="completed",
            summary="Done",
            tags=["ai"],
        )

    assert result == updated_row
    update_call = mock_db.table.return_value.update.call_args[0][0]
    assert update_call["status"] == "completed"
    assert update_call["summary"] == "Done"
    assert update_call["tags"] == ["ai"]
