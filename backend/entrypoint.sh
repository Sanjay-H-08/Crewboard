#!/bin/sh
set -e

# Execute database migrations
echo "Applying database migrations via Alembic..."
alembic upgrade head

# Execute main container command (uvicorn)
exec "$@"
