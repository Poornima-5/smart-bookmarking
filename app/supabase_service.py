import os

from dotenv import load_dotenv
from supabase import Client, create_client

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_PUBLISHABLE_KEY = os.getenv("SUPABASE_PUBLISHABLE_KEY")
SUPABASE_SECRET_KEY = os.getenv("SUPABASE_SECRET_KEY")

# Scoped to the publishable key: safe for verifying user access tokens.
public_client: Client = create_client(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)

# Scoped to the secret key: bypasses RLS. Server-side use only, never exposed to callers.
admin_client: Client = create_client(SUPABASE_URL, SUPABASE_SECRET_KEY)
