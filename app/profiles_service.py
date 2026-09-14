from postgrest.exceptions import APIError

from app.supabase_service import admin_client

INVALID_TEXT_REPRESENTATION = "22P02"


def get_profile(user_id: str) -> dict | None:
    """Retrieve an existing profile by user_id."""
    try:
        response = (
            admin_client.table("profiles")
            .select("*")
            .eq("id", user_id)
            .limit(1)
            .execute()
        )
    except APIError as e:
        if e.code == INVALID_TEXT_REPRESENTATION:
            return None
        raise

    return response.data[0] if response.data else None


def get_or_create_profile(user_id: str, email: str | None = None) -> dict:
    """Retrieve profile by user_id, or lazily create it if it doesn't exist."""
    profile = get_profile(user_id)
    if profile is not None:
        return profile

    # Derive sensible default display name from email or "User"
    default_name = "User"
    if email and "@" in email:
        default_name = email.split("@")[0]

    payload = {
        "id": user_id,
        "display_name": default_name,
    }

    response = admin_client.table("profiles").insert(payload).execute()
    return response.data[0]


def update_profile(user_id: str, display_name: str) -> dict | None:
    """Update profile display_name scoped strictly to user_id."""
    payload = {"display_name": display_name}
    try:
        response = (
            admin_client.table("profiles")
            .update(payload)
            .eq("id", user_id)
            .execute()
        )
    except APIError as e:
        if e.code == INVALID_TEXT_REPRESENTATION:
            return None
        raise

    return response.data[0] if response.data else None
