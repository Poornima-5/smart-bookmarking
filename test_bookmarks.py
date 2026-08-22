from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import patch
from uuid import uuid4

from fastapi.testclient import TestClient

from app.bookmarks_service import DuplicateBookmarkError
from app.main import app

client = TestClient(app)

USER_ID = "11111111-1111-1111-1111-111111111111"
OTHER_USER_ID = "22222222-2222-2222-2222-222222222222"


def auth_headers(token="valid.token.value"):
    return {"Authorization": f"Bearer {token}"}


def mock_authenticated_user(user_id=USER_ID):
    fake_user = SimpleNamespace(id=user_id)
    fake_response = SimpleNamespace(user=fake_user)
    return patch("app.auth.public_client.auth.get_user", return_value=fake_response)


def make_bookmark_row(**overrides):
    now = datetime.now(timezone.utc).isoformat()
    row = {
        "id": str(uuid4()),
        "user_id": USER_ID,
        "url": "https://example.com/article",
        "normalized_url": "https://example.com/article",
        "title": "Example Article",
        "description": "",
        "raw_content": None,
        "summary": None,
        "tags": None,
        "category": None,
        "status": "pending",
        "error_message": None,
        "duplicate_of": None,
        "duplicate_score": None,
        "created_at": now,
        "updated_at": now,
    }
    row.update(overrides)
    return row


# ---- authentication is required on every bookmark endpoint ----


def test_create_bookmark_without_token_returns_401():
    response = client.post(
        "/bookmarks", json={"url": "https://example.com", "title": "x"}
    )
    assert response.status_code == 401


def test_list_bookmarks_without_token_returns_401():
    response = client.get("/bookmarks")
    assert response.status_code == 401


def test_get_bookmark_without_token_returns_401():
    response = client.get(f"/bookmarks/{uuid4()}")
    assert response.status_code == 401


def test_delete_bookmark_without_token_returns_401():
    response = client.delete(f"/bookmarks/{uuid4()}")
    assert response.status_code == 401


def test_create_bookmark_invalid_token_returns_401():
    with patch(
        "app.auth.public_client.auth.get_user", side_effect=Exception("bad jwt")
    ):
        response = client.post(
            "/bookmarks",
            json={"url": "https://example.com", "title": "x"},
            headers=auth_headers("tampered.token"),
        )
    assert response.status_code == 401


# ---- successful creation ----


def test_create_bookmark_success_returns_202_with_pending_status():
    row = make_bookmark_row()
    with mock_authenticated_user(), patch(
        "app.main.create_bookmark", return_value=row
    ) as mock_create:
        response = client.post(
            "/bookmarks",
            json={"url": "https://example.com/article", "title": "Example Article"},
            headers=auth_headers(),
        )

    assert response.status_code == 202
    body = response.json()
    assert body["id"] == row["id"]
    assert body["user_id"] == USER_ID
    assert body["status"] == "pending"
    mock_create.assert_called_once_with(
        user_id=USER_ID,
        url="https://example.com/article",
        title="Example Article",
        description="",
    )


# ---- duplicate handling ----


def test_create_bookmark_duplicate_returns_409():
    with mock_authenticated_user(), patch(
        "app.main.create_bookmark", side_effect=DuplicateBookmarkError
    ):
        response = client.post(
            "/bookmarks",
            json={"url": "https://example.com/article", "title": "Example Article"},
            headers=auth_headers(),
        )
    assert response.status_code == 409


def test_create_bookmark_same_url_allowed_for_different_user():
    row = make_bookmark_row(user_id=OTHER_USER_ID)
    with mock_authenticated_user(user_id=OTHER_USER_ID), patch(
        "app.main.create_bookmark", return_value=row
    ) as mock_create:
        response = client.post(
            "/bookmarks",
            json={"url": "https://example.com/article", "title": "Example Article"},
            headers=auth_headers(),
        )

    assert response.status_code == 202
    mock_create.assert_called_once_with(
        user_id=OTHER_USER_ID,
        url="https://example.com/article",
        title="Example Article",
        description="",
    )


# ---- listing is scoped to the caller ----


def test_list_bookmarks_passes_authenticated_user_to_service():
    rows = [make_bookmark_row(), make_bookmark_row()]
    with mock_authenticated_user(), patch(
        "app.main.list_bookmarks", return_value=rows
    ) as mock_list:
        response = client.get("/bookmarks", headers=auth_headers())

    assert response.status_code == 200
    assert len(response.json()) == 2
    mock_list.assert_called_once_with(USER_ID)


# ---- get by id / ownership ----


def test_get_bookmark_returns_200_for_owner():
    row = make_bookmark_row()
    with mock_authenticated_user(), patch(
        "app.main.get_bookmark", return_value=row
    ) as mock_get:
        response = client.get(f"/bookmarks/{row['id']}", headers=auth_headers())

    assert response.status_code == 200
    assert response.json()["id"] == row["id"]
    mock_get.assert_called_once_with(USER_ID, row["id"])


def test_get_bookmark_returns_404_when_not_owned():
    bookmark_id = str(uuid4())
    with mock_authenticated_user(user_id=OTHER_USER_ID), patch(
        "app.main.get_bookmark", return_value=None
    ):
        response = client.get(f"/bookmarks/{bookmark_id}", headers=auth_headers())
    assert response.status_code == 404


# ---- delete / ownership ----


def test_delete_bookmark_returns_204_for_owner():
    bookmark_id = str(uuid4())
    with mock_authenticated_user(), patch(
        "app.main.delete_bookmark", return_value=True
    ) as mock_delete:
        response = client.delete(f"/bookmarks/{bookmark_id}", headers=auth_headers())

    assert response.status_code == 204
    mock_delete.assert_called_once_with(USER_ID, bookmark_id)


def test_delete_bookmark_returns_404_when_not_owned():
    bookmark_id = str(uuid4())
    with mock_authenticated_user(user_id=OTHER_USER_ID), patch(
        "app.main.delete_bookmark", return_value=False
    ):
        response = client.delete(f"/bookmarks/{bookmark_id}", headers=auth_headers())
    assert response.status_code == 404
