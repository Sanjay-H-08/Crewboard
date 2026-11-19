# ==============================================================================
# CREWBOARD BACKEND DOCKERFILE
# Production-ready Python 3.11 runtime for FastAPI ASGI application
# ==============================================================================

FROM python:3.11-slim

# Prevent Python from writing .pyc files and enable unbuffered standard I/O
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# Install runtime utilities (curl for container health probes) and temporary build tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies reproducibly
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt \
    && apt-get purge -y --auto-remove build-essential \
    && rm -rf /var/lib/apt/lists/*

# Create dedicated application user (UID 1000) and set up uploads directory with secure 0750 permissions
RUN groupadd -g 1000 crewboard 2>/dev/null || true \
    && useradd -u 1000 -g 1000 -s /bin/sh -m crewboard 2>/dev/null || true \
    && mkdir -p /app/uploads \
    && chown -R 1000:1000 /app/uploads /app \
    && chmod 750 /app/uploads

# Copy application source
COPY . .
RUN chmod +x /app/entrypoint.sh

# Expose backend port
EXPOSE 8000

# Container health probe verifying API readiness and database connection
HEALTHCHECK --interval=15s --timeout=5s --retries=3 --start-period=15s \
    CMD curl -f http://localhost:8000/api/health || exit 1

# Entrypoint applies Alembic migrations after database readiness and execs uvicorn
ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
