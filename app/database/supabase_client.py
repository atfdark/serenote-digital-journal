import os
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Supabase configuration
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")

if not SUPABASE_URL or not SUPABASE_ANON_KEY:
    # If not configured, don't create a client — caller code should handle None.
    print("Warning: SUPABASE_URL or SUPABASE_ANON_KEY not set; Supabase disabled")
    supabase = None
else:
    try:
        # Attempt to create Supabase client. If library incompatibilities exist,
        # fall back to None so the app can still run with limited functionality.
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
    except Exception as e:
        print(f"Warning: failed to create Supabase client: {e}")
        supabase = None