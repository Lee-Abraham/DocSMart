import os
import psycopg2
from psycopg2.extras import RealDictCursor

def get_connection():
    conn_str = os.environ.get("DATABASE_URL")
    if not conn_str:
        raise RuntimeError("DATABASE_URL is not set")

    return psycopg2.connect(
        conn_str,
        sslmode="require",
        cursor_factory=RealDictCursor
    )