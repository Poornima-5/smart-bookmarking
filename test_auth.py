from types import SimpleNamespace
from unittest.mock import patch

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_me_without_token_returns_401():
    response = client.get("/me")
    assert response.status_code == 401


def test_me_with_invalid_token_returns_401():
    with patch(
        "app.auth.public_client.auth.get_user",
        side_effect=Exception("invalid jwt"),
    ):
        response = client.get(
            "/me", headers={"Authorization": "Bearer tampered.token.value"}
        )
    assert response.status_code == 401


def test_me_with_valid_token_returns_user_id():
    fake_user = SimpleNamespace(id="11111111-1111-1111-1111-111111111111")
    fake_get_user_response = SimpleNamespace(user=fake_user)

    with patch(
        "app.auth.public_client.auth.get_user",
        return_value=fake_get_user_response,
    ):
        response = client.get(
            "/me", headers={"Authorization": "Bearer valid.token.value"}
        )

    assert response.status_code == 200
    assert response.json() == {"user_id": "11111111-1111-1111-1111-111111111111"}
