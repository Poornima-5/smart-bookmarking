from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import MagicMock, patch
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.profiles_service import (
    get_or_create_profile,
    get_profile,
    update_profile,
)

client = TestClient(app)

USER_ID = "11111111-1111-1111-1111-111111111111"
OTHER_USER_ID = "22222222-2222-2222-2222-222222222222"
USER_EMAIL = "developer@example.com"


def auth_headers(token="valid.token.value"):
    return {"Authorization": f"Bearer {token}"}


def mock_authenticated_user(user_id=USER_ID, email=USER_EMAIL):
    fake_user = SimpleNamespace(id=user_id, email=email)
    fake_response = SimpleNamespace(user=fake_user)
    return patch("app.auth.public_client.auth.get_user", return_value=fake_response)


def make_profile_row(**overrides):
    now = datetime.now(timezone.utc).isoformat()
    row = {
        "id": USER_ID,
        "display_name": "Test User",
        "created_at": now,
        "updated_at": now,
    }
    row.update(overrides)
    return row


# =====================================================================
# 1. Unauthenticated / Invalid Token Tests (401)
# =====================================================================


def test_get_profile_without_token_returns_401():
    response = client.get("/profile")
    assert response.status_code == 401


def test_get_profile_invalid_token_returns_401():
    with patch(
        "app.auth.public_client.auth.get_user",
        side_effect=Exception("bad jwt"),
    ):
        response = client.get("/profile", headers=auth_headers("tampered.token"))
    assert response.status_code == 401


def test_put_profile_without_token_returns_401():
    response = client.put("/profile", json={"display_name": "New Name"})
    assert response.status_code == 401


def test_put_profile_invalid_token_returns_401():
    with patch(
        "app.auth.public_client.auth.get_user",
        side_effect=Exception("bad jwt"),
    ):
        response = client.put(
            "/profile",
            json={"display_name": "New Name"},
            headers=auth_headers("tampered.token"),
        )
    assert response.status_code == 401


# =====================================================================
# 2. Authenticated GET /profile Tests
# =====================================================================


def test_get_profile_authenticated_success():
    row = make_profile_row(display_name="Alice Developer")
    with mock_authenticated_user(user_id=USER_ID, email=USER_EMAIL), patch(
        "app.main.get_or_create_profile", return_value=row
    ) as mock_get_or_create:
        response = client.get("/profile", headers=auth_headers())

    assert response.status_code == 200
    data = response.json()
    assert data["id"] == USER_ID
    assert data["email"] == USER_EMAIL
    assert data["display_name"] == "Alice Developer"
    assert "created_at" in data
    assert "updated_at" in data
    mock_get_or_create.assert_called_once_with(user_id=USER_ID, email=USER_EMAIL)


# =====================================================================
# 3. Authenticated PUT /profile Tests
# =====================================================================


def test_put_profile_authenticated_success():
    updated_row = make_profile_row(display_name="Updated Name")
    with mock_authenticated_user(user_id=USER_ID, email=USER_EMAIL), patch(
        "app.main.update_profile", return_value=updated_row
    ) as mock_update:
        response = client.put(
            "/profile",
            json={"display_name": "Updated Name"},
            headers=auth_headers(),
        )

    assert response.status_code == 200
    data = response.json()
    assert data["id"] == USER_ID
    assert data["email"] == USER_EMAIL
    assert data["display_name"] == "Updated Name"
    mock_update.assert_called_once_with(user_id=USER_ID, display_name="Updated Name")


def test_put_profile_not_found_returns_404():
    with mock_authenticated_user(user_id=USER_ID, email=USER_EMAIL), patch(
        "app.main.update_profile", return_value=None
    ):
        response = client.put(
            "/profile",
            json={"display_name": "Updated Name"},
            headers=auth_headers(),
        )
    assert response.status_code == 404


# =====================================================================
# 4. Input Validation (Blank, Whitespace, Max Length)
# =====================================================================


def test_put_profile_empty_display_name_returns_422():
    with mock_authenticated_user():
        response = client.put(
            "/profile",
            json={"display_name": ""},
            headers=auth_headers(),
        )
    assert response.status_code == 422


def test_put_profile_whitespace_only_display_name_returns_422():
    with mock_authenticated_user():
        response = client.put(
            "/profile",
            json={"display_name": "    "},
            headers=auth_headers(),
        )
    assert response.status_code == 422


def test_put_profile_max_length_50_accepted():
    valid_name = "A" * 50
    row = make_profile_row(display_name=valid_name)
    with mock_authenticated_user(), patch(
        "app.main.update_profile", return_value=row
    ) as mock_update:
        response = client.put(
            "/profile",
            json={"display_name": valid_name},
            headers=auth_headers(),
        )
    assert response.status_code == 200
    assert response.json()["display_name"] == valid_name
    mock_update.assert_called_once_with(user_id=USER_ID, display_name=valid_name)


def test_put_profile_length_51_returns_422():
    too_long_name = "A" * 51
    with mock_authenticated_user():
        response = client.put(
            "/profile",
            json={"display_name": too_long_name},
            headers=auth_headers(),
        )
    assert response.status_code == 422


# =====================================================================
# 5. Ownership Isolation Tests
# =====================================================================


def test_put_profile_derives_user_from_jwt_not_body():
    """Client cannot supply or spoof user_id or id in request body."""
    updated_row = make_profile_row(id=USER_ID, display_name="Spoofed Name")
    with mock_authenticated_user(user_id=USER_ID, email=USER_EMAIL), patch(
        "app.main.update_profile", return_value=updated_row
    ) as mock_update:
        response = client.put(
            "/profile",
            json={
                "display_name": "Spoofed Name",
                "id": OTHER_USER_ID,
                "user_id": OTHER_USER_ID,
            },
            headers=auth_headers(),
        )

    assert response.status_code == 200
    # Must use USER_ID from JWT, never OTHER_USER_ID
    mock_update.assert_called_once_with(user_id=USER_ID, display_name="Spoofed Name")


# =====================================================================
# 6. Backend Profile Service Unit Tests
# =====================================================================


def test_get_or_create_profile_returns_existing():
    mock_client = MagicMock()
    table = mock_client.table.return_value
    existing_row = make_profile_row()
    table.select.return_value.eq.return_value.limit.return_value.execute.return_value = (
        SimpleNamespace(data=[existing_row])
    )

    with patch("app.profiles_service.admin_client", mock_client):
        result = get_or_create_profile(USER_ID, email="test@example.com")

    assert result == existing_row
    table.insert.assert_not_called()


def test_get_or_create_profile_lazily_inserts_when_missing():
    mock_client = MagicMock()
    table = mock_client.table.return_value
    # First select returns empty
    table.select.return_value.eq.return_value.limit.return_value.execute.return_value = (
        SimpleNamespace(data=[])
    )
    new_row = make_profile_row(display_name="test")
    table.insert.return_value.execute.return_value = SimpleNamespace(data=[new_row])

    with patch("app.profiles_service.admin_client", mock_client):
        result = get_or_create_profile(USER_ID, email="test@example.com")

    assert result == new_row
    table.insert.assert_called_once_with(
        {"id": USER_ID, "display_name": "test"}
    )


def test_update_profile_service_filters_by_user_id():
    mock_client = MagicMock()
    table = mock_client.table.return_value
    updated_row = make_profile_row(display_name="New Name")
    table.update.return_value.eq.return_value.execute.return_value = (
        SimpleNamespace(data=[updated_row])
    )

    with patch("app.profiles_service.admin_client", mock_client):
        result = update_profile(USER_ID, "New Name")

    assert result == updated_row
    table.update.assert_called_once_with({"display_name": "New Name"})
    table.update.return_value.eq.assert_called_once_with("id", USER_ID)
