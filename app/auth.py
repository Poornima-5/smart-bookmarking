from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.supabase_service import public_client

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user_data(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> dict:
    """Verifies a Supabase access token and returns dict with authenticated user's id and email."""
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing bearer token",
        )

    try:
        response = public_client.auth.get_user(credentials.credentials)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    if response is None or response.user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    return {
        "id": response.user.id,
        "email": getattr(response.user, "email", None),
    }


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> str:
    """Verifies a Supabase access token and returns the authenticated user's id."""
    user_data = get_current_user_data(credentials)
    return user_data["id"]
