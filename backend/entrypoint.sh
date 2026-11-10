#!/bin/sh
set -e

# Execute database migrations if configured
echo "Applying database migrations via Alembic..."
alembic upgrade head || {
    echo "Warning: Alembic migration execution skipped or failed."
}

# Execute main container command (uvicorn)
exec "$@"
