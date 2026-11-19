#!/bin/sh
set -e

# ==============================================================================
# CREWBOARD BACKEND ENTRYPOINT SCRIPT
# ==============================================================================

# Ensure persistent uploads directory exists
mkdir -p /app/uploads 2>/dev/null || true

# Secure least-privilege permission strategy (0750: owner rwx, group r-x, others none)
# Replaces world-writable permissions (777). Supports non-root user (UID 1000).
if [ "$(id -u)" = "0" ]; then
    # When starting as root, ensure UID 1000 owns the volume mount point
    chown 1000:1000 /app/uploads 2>/dev/null || true
    chmod 750 /app/uploads 2>/dev/null || true
    # Ensure immediate team/task subdirectories are writable by UID 1000 without deep recursive chown
    find /app/uploads -maxdepth 2 -not -user 1000 -exec chown 1000:1000 {} + 2>/dev/null || true

    # Drop privileges to non-root crewboard user (UID 1000) preserving environment
    if command -v runuser >/dev/null 2>&1; then
        exec runuser -u crewboard -m -- "$0" "$@"
    elif command -v gosu >/dev/null 2>&1; then
        exec gosu crewboard "$0" "$@"
    fi
else
    # When running directly as non-root (UID 1000)
    chmod 750 /app/uploads 2>/dev/null || true
fi

# Wait for PostgreSQL database to be reachable before applying migrations
echo "Checking database connectivity..."
python3 - << 'EOF'
import os
import sys
import time
from sqlalchemy import create_engine, text

db_url = os.getenv("DATABASE_URL")
if not db_url:
    print("WARNING: DATABASE_URL is not set. Skipping pre-flight database connection check.")
    sys.exit(0)

# Mask credentials when logging database host
safe_target = db_url.split("@")[-1] if "@" in db_url else "database"
max_retries = 30
retry_interval = 1

for attempt in range(1, max_retries + 1):
    try:
        engine = create_engine(db_url, connect_args={"connect_timeout": 3})
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        print(f"Database connection verified successfully ({safe_target}).")
        sys.exit(0)
    except Exception as exc:
        if attempt == max_retries:
            print(f"ERROR: Could not establish database connection after {max_retries} seconds: {exc}", file=sys.stderr)
            sys.exit(1)
        time.sleep(retry_interval)
EOF

# Execute database migrations
echo "Applying database migrations via Alembic..."
alembic upgrade head

# Execute container command (defaults to uvicorn in Dockerfile)
echo "Starting FastAPI application as non-root user (UID $(id -u))..."
exec "$@"
