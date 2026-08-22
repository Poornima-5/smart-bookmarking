from postgrest.exceptions import APIError

from app.supabase_service import admin_client
from app.url_utils import normalize_url

UNIQUE_VIOLATION = "23505"
INVALID_TEXT_REPRESENTATION = "22P02"  # e.g. malformed UUID


class DuplicateBookmarkError(Exception):
    """Raised when (user_id, normalized_url) already exists."""


def create_bookmark(user_id: str, url: str, title: str, description: str) -> dict:
    payload = {
        "user_id": user_id,
        "url": url,
        "normalized_url": normalize_url(url),
        "title": title,
        "description": description,
        "status": "pending",
    }

    try:
        response = admin_client.table("bookmarks").insert(payload).execute()
    except APIError as e:
        if e.code == UNIQUE_VIOLATION:
            raise DuplicateBookmarkError from e
        raise

    return response.data[0]


def list_bookmarks(user_id: str) -> list[dict]:
    response = (
        admin_client.table("bookmarks")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .execute()
    )
    return response.data


def get_bookmark(user_id: str, bookmark_id: str) -> dict | None:
    try:
        response = (
            admin_client.table("bookmarks")
            .select("*")
            .eq("user_id", user_id)
            .eq("id", bookmark_id)
            .limit(1)
            .execute()
        )
    except APIError as e:
        if e.code == INVALID_TEXT_REPRESENTATION:
            return None
        raise

    return response.data[0] if response.data else None


def delete_bookmark(user_id: str, bookmark_id: str) -> bool:
    try:
        response = (
            admin_client.table("bookmarks")
            .delete()
            .eq("user_id", user_id)
            .eq("id", bookmark_id)
            .execute()
        )
    except APIError as e:
        if e.code == INVALID_TEXT_REPRESENTATION:
            return False
        raise

    return bool(response.data)
