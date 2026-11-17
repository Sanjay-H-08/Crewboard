#!/bin/sh
set -e

# Ensure persistent uploads directory exists
mkdir -p /app/uploads

# Execute database migrations
echo "Applying database migrations via Alembic..."
alembic upgrade head

# Execute main container command (uvicorn)
exec "$@"
