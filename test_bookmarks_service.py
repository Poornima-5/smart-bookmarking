from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import pytest
from postgrest.exceptions import APIError

from app.bookmarks_service import (
    DuplicateBookmarkError,
    create_bookmark,
    delete_bookmark,
    get_bookmark,
    list_bookmarks,
)

USER_ID = "11111111-1111-1111-1111-111111111111"
OTHER_USER_ID = "22222222-2222-2222-2222-222222222222"
BOOKMARK_ID = "33333333-3333-3333-3333-333333333333"

ROW = {
    "id": BOOKMARK_ID,
    "user_id": USER_ID,
    "url": "https://example.com/article",
    "normalized_url": "https://example.com/article",
    "title": "Example Article",
    "status": "pending",
}


def build_mock_client():
    mock_client = MagicMock()
    table = mock_client.table.return_value

    table.insert.return_value.execute.return_value = SimpleNamespace(data=[ROW])
    table.select.return_value.eq.return_value.eq.return_value.limit.return_value.execute.return_value = (
        SimpleNamespace(data=[ROW])
    )
    table.select.return_value.eq.return_value.order.return_value.execute.return_value = (
        SimpleNamespace(data=[ROW])
    )
    table.delete.return_value.eq.return_value.eq.return_value.execute.return_value = (
        SimpleNamespace(data=[ROW])
    )
    return mock_client, table


def test_create_bookmark_inserts_normalized_url_and_pending_status():
    mock_client, table = build_mock_client()

    with patch("app.bookmarks_service.admin_client", mock_client):
        result = create_bookmark(
            user_id=USER_ID,
            url="https://WWW.Example.com/article/",
            title="Example Article",
            description="",
        )

    assert result == ROW
    inserted_payload = table.insert.call_args[0][0]
    assert inserted_payload["user_id"] == USER_ID
    assert inserted_payload["normalized_url"] == "https://example.com/article"
    assert inserted_payload["status"] == "pending"


def test_create_bookmark_duplicate_raises_duplicate_error():
    mock_client, table = build_mock_client()
    table.insert.return_value.execute.side_effect = APIError(
        {"code": "23505", "message": "duplicate key value violates unique constraint"}
    )

    with patch("app.bookmarks_service.admin_client", mock_client):
        with pytest.raises(DuplicateBookmarkError):
            create_bookmark(
                user_id=USER_ID,
                url="https://example.com/article",
                title="Example Article",
                description="",
            )


def test_create_bookmark_reraises_non_duplicate_api_errors():
    mock_client, table = build_mock_client()
    table.insert.return_value.execute.side_effect = APIError(
        {"code": "23502", "message": "null value in column violates not-null constraint"}
    )

    with patch("app.bookmarks_service.admin_client", mock_client):
        with pytest.raises(APIError):
            create_bookmark(
                user_id=USER_ID,
                url="https://example.com/article",
                title="",
                description="",
            )


def test_list_bookmarks_filters_by_user_id():
    mock_client, table = build_mock_client()

    with patch("app.bookmarks_service.admin_client", mock_client):
        result = list_bookmarks(USER_ID)

    assert result == [ROW]
    table.select.return_value.eq.assert_called_once_with("user_id", USER_ID)


def test_get_bookmark_scopes_query_to_owner():
    mock_client, table = build_mock_client()

    with patch("app.bookmarks_service.admin_client", mock_client):
        result = get_bookmark(USER_ID, BOOKMARK_ID)

    assert result == ROW
    table.select.return_value.eq.assert_called_once_with("user_id", USER_ID)
    table.select.return_value.eq.return_value.eq.assert_called_once_with("id", BOOKMARK_ID)


def test_get_bookmark_returns_none_when_not_found():
    mock_client, table = build_mock_client()
    table.select.return_value.eq.return_value.eq.return_value.limit.return_value.execute.return_value = (
        SimpleNamespace(data=[])
    )

    with patch("app.bookmarks_service.admin_client", mock_client):
        result = get_bookmark(OTHER_USER_ID, BOOKMARK_ID)

    assert result is None


def test_get_bookmark_returns_none_for_malformed_id():
    mock_client, table = build_mock_client()
    table.select.return_value.eq.return_value.eq.return_value.limit.return_value.execute.side_effect = (
        APIError({"code": "22P02", "message": "invalid input syntax for type uuid"})
    )

    with patch("app.bookmarks_service.admin_client", mock_client):
        result = get_bookmark(USER_ID, "not-a-uuid")

    assert result is None


def test_delete_bookmark_scopes_to_owner_and_returns_true_when_deleted():
    mock_client, table = build_mock_client()

    with patch("app.bookmarks_service.admin_client", mock_client):
        result = delete_bookmark(USER_ID, BOOKMARK_ID)

    assert result is True
    table.delete.return_value.eq.assert_called_once_with("user_id", USER_ID)
    table.delete.return_value.eq.return_value.eq.assert_called_once_with("id", BOOKMARK_ID)


def test_delete_bookmark_returns_false_when_not_owned_or_missing():
    mock_client, table = build_mock_client()
    table.delete.return_value.eq.return_value.eq.return_value.execute.return_value = (
        SimpleNamespace(data=[])
    )

    with patch("app.bookmarks_service.admin_client", mock_client):
        result = delete_bookmark(OTHER_USER_ID, BOOKMARK_ID)

    assert result is False
