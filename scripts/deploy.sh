#!/usr/bin/env bash
# ==============================================================================
# CREWBOARD — AUTOMATED PRODUCTION DEPLOYMENT SCRIPT
# ==============================================================================
# Executes an automated, planned-cutover production deployment.
# 1. Validates prerequisites & environment configuration.
# 2. Records current deployment state for automated rollback.
# 3. Performs an automated PostgreSQL backup before applying migrations.
# 4. Pulls exact immutable container image tags from GHCR.
# 5. Executes Alembic database migrations safely.
# 6. Restarts production stack with Caddy edge TLS.
# 7. Verifies end-to-end container and API health probes.
# 8. Automatically triggers rollback if any health check fails.
#
# Usage: ./scripts/deploy.sh <IMAGE_TAG> [REPO_OWNER] [RUN_BACKUP]
# Example: ./scripts/deploy.sh v1.0.0 sanjay-h-08 true
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

IMAGE_TAG="${1:-${RELEASE_TAG:-}}"
REPO_OWNER="${2:-${GITHUB_REPOSITORY_OWNER:-sanjay-h-08}}"
REPO_OWNER="$(echo "$REPO_OWNER" | tr '[:upper:]' '[:lower:]')"
RUN_BACKUP="${3:-true}"

if [[ -z "$IMAGE_TAG" ]]; then
    echo "ERROR: Release image tag must be specified as argument 1 or via \$RELEASE_TAG." >&2
    echo "Usage: $0 <IMAGE_TAG> [REPO_OWNER] [RUN_BACKUP]" >&2
    exit 1
fi

export BACKEND_IMAGE="ghcr.io/${REPO_OWNER}/crewboard-backend:${IMAGE_TAG}"
export FRONTEND_IMAGE="ghcr.io/${REPO_OWNER}/crewboard-frontend:${IMAGE_TAG}"

PREV_DEPLOY_FILE="${PROJECT_ROOT}/.previous_deployment"
CURR_DEPLOY_FILE="${PROJECT_ROOT}/.current_deployment"
ENV_FILE="${PROJECT_ROOT}/.env"

echo "======================================================================"
echo " Crewboard — Production Deployment Automation"
echo " Date: $(date -u +"%Y-%m-%d %H:%M:%S UTC")"
echo " Target Release Tag: ${IMAGE_TAG}"
echo " Backend Image:      ${BACKEND_IMAGE}"
echo " Frontend Image:     ${FRONTEND_IMAGE}"
echo " Project Directory:  ${PROJECT_ROOT}"
echo "======================================================================"

# ------------------------------------------------------------------------------
# STEP 1: Verify Prerequisites & Environment Configuration
# ------------------------------------------------------------------------------
echo "Phase 1: Validating deployment prerequisites..."

if ! command -v docker >/dev/null 2>&1; then
    echo "ERROR: Docker CLI is required but not installed." >&2
    exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
    echo "ERROR: Docker Compose v2 is required but not installed." >&2
    exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
    echo "ERROR: Production environment file (.env) was not found at ${ENV_FILE}." >&2
    echo "Please configure .env from .env.example before running deployment." >&2
    exit 1
fi

# Verify critical environment variables are defined and non-empty
for var in POSTGRES_PASSWORD SECRET_KEY; do
    if ! grep -E "^${var}=" "$ENV_FILE" | grep -qv "^\s*${var}=\s*$"; then
        echo "ERROR: Required variable '${var}' is missing or empty in ${ENV_FILE}." >&2
        exit 1
    fi
done

# Extract database credentials dynamically from .env
POSTGRES_USER="$(grep -E '^POSTGRES_USER=' "$ENV_FILE" | cut -d '=' -f2- | tr -d '\"'\'' ' || true)"
POSTGRES_DB="$(grep -E '^POSTGRES_DB=' "$ENV_FILE" | cut -d '=' -f2- | tr -d '\"'\'' ' || true)"
POSTGRES_USER="${POSTGRES_USER:-crewboard_user}"
POSTGRES_DB="${POSTGRES_DB:-crewboard}"

# ------------------------------------------------------------------------------
# STEP 2: Record Current Deployment State for Rollback Protection
# ------------------------------------------------------------------------------
echo "Phase 2: Recording existing container state for rollback protection..."

CURRENT_BACKEND="$(docker inspect --format='{{.Config.Image}}' crewboard_backend 2>/dev/null || echo "")"
CURRENT_FRONTEND="$(docker inspect --format='{{.Config.Image}}' crewboard_frontend 2>/dev/null || echo "")"

if [[ -n "$CURRENT_BACKEND" && -n "$CURRENT_FRONTEND" ]]; then
    cat <<EOF > "$PREV_DEPLOY_FILE"
BACKEND_IMAGE="${CURRENT_BACKEND}"
FRONTEND_IMAGE="${CURRENT_FRONTEND}"
RECORDED_AT="$(date -u +"%Y-%m-%d %H:%M:%S UTC")"
PREV_STATUS="ACTIVE"
EOF
    echo "✓ Previous deployment state saved to ${PREV_DEPLOY_FILE}."
else
    echo "Notice: No currently running stack detected; initial deployment mode active."
fi

# ------------------------------------------------------------------------------
# STEP 3: Create Pre-Deployment PostgreSQL Backup
# ------------------------------------------------------------------------------
if [[ "$RUN_BACKUP" == "true" ]]; then
    echo "Phase 3: Creating pre-deployment database backup..."
    if docker ps --format '{{.Names}}' | grep -q "^crewboard_db$"; then
        if [[ ! -f "${SCRIPT_DIR}/backup.sh" || ! -x "${SCRIPT_DIR}/backup.sh" ]]; then
            echo "CRITICAL: Backup script (${SCRIPT_DIR}/backup.sh) is missing or not executable." >&2
            echo "Aborting deployment immediately to prevent unbacked database modifications." >&2
            exit 1
        fi

        "${SCRIPT_DIR}/backup.sh" || {
            echo "CRITICAL: Pre-deployment database backup failed! Aborting deployment to protect data." >&2
            exit 1
        }
    else
        echo "Notice: Database container not running yet. Skipping pre-deployment backup."
    fi
else
    echo "Phase 3: Pre-deployment backup skipped by operator request."
fi

# ------------------------------------------------------------------------------
# STEP 4: Pull Target Container Images from GHCR
# ------------------------------------------------------------------------------
echo "Phase 4: Pulling target release container images..."
docker compose -f "${PROJECT_ROOT}/docker-compose.yml" -f "${PROJECT_ROOT}/docker-compose.prod.yml" pull backend frontend || {
    echo "ERROR: Failed to pull images from GHCR. Check network, tag, and authentication." >&2
    exit 1
}

# ------------------------------------------------------------------------------
# STEP 5: Start Database & Apply Alembic Migrations
# ------------------------------------------------------------------------------
echo "Phase 5: Applying database schema migrations..."
# Ensure database service is up and healthy
docker compose -f "${PROJECT_ROOT}/docker-compose.yml" -f "${PROJECT_ROOT}/docker-compose.prod.yml" up -d db

echo "Waiting for database readiness (User: ${POSTGRES_USER}, DB: ${POSTGRES_DB})..."
DB_READY=false
for i in {1..30}; do
    if docker compose -f "${PROJECT_ROOT}/docker-compose.yml" -f "${PROJECT_ROOT}/docker-compose.prod.yml" exec -T db pg_isready -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" >/dev/null 2>&1; then
        DB_READY=true
        break
    fi
    sleep 1
done

if [[ "$DB_READY" != "true" ]]; then
    echo "ERROR: PostgreSQL database did not become ready in time." >&2
    exit 1
fi

echo "Applying Alembic migrations via dedicated ephemeral migration container..."
if ! docker compose -f "${PROJECT_ROOT}/docker-compose.yml" -f "${PROJECT_ROOT}/docker-compose.prod.yml" run --rm --no-deps backend alembic upgrade head; then
    echo "ERROR: Alembic migration upgrade failed! Stopping deployment to prevent inconsistency." >&2
    exit 1
fi
echo "✓ Database migrations applied successfully."

# ------------------------------------------------------------------------------
# STEP 6: Deploy Services & Restart with Edge Caddy TLS
# ------------------------------------------------------------------------------
echo "Phase 6: Launching updated services (cutover window ~5-15s)..."
docker compose -f "${PROJECT_ROOT}/docker-compose.yml" -f "${PROJECT_ROOT}/docker-compose.prod.yml" up -d --remove-orphans

# ------------------------------------------------------------------------------
# STEP 7: Comprehensive Health Check Verification
# ------------------------------------------------------------------------------
echo "Phase 7: Verifying application health checks..."
MAX_WAIT=60
START_TIME=$(date +%s)
ALL_HEALTHY=false

while true; do
    CURRENT_TIME=$(date +%s)
    ELAPSED=$((CURRENT_TIME - START_TIME))
    if [[ $ELAPSED -ge $MAX_WAIT ]]; then
        break
    fi

    BACKEND_STATUS="$(docker inspect --format='{{.State.Health.Status}}' crewboard_backend 2>/dev/null || echo 'starting')"
    FRONTEND_STATUS="$(docker inspect --format='{{.State.Health.Status}}' crewboard_frontend 2>/dev/null || echo 'starting')"
    CADDY_RUNNING="$(docker inspect --format='{{.State.Running}}' crewboard_caddy 2>/dev/null || echo 'false')"

    if [[ "$BACKEND_STATUS" == "healthy" && "$FRONTEND_STATUS" == "healthy" && "$CADDY_RUNNING" == "true" ]]; then
        # Perform real HTTP/HTTPS request through Caddy edge reverse proxy using configured production domain
        PROD_DOMAIN="$(grep -E '^DOMAIN=' "$ENV_FILE" 2>/dev/null | cut -d '=' -f2- | tr -d '\"'\'' ' || echo 'localhost')"
        PROD_DOMAIN="${PROD_DOMAIN:-localhost}"

        HEALTH_BODY="$(curl -fsSL -k \
            --resolve "${PROD_DOMAIN}:443:127.0.0.1" \
            --resolve "${PROD_DOMAIN}:80:127.0.0.1" \
            -H "Host: ${PROD_DOMAIN}" \
            "https://${PROD_DOMAIN}/api/health" 2>/dev/null || \
            curl -fsSL -k \
            -H "Host: ${PROD_DOMAIN}" \
            "http://127.0.0.1/api/health" 2>/dev/null || \
            curl -fsSL -k "http://localhost/api/health" 2>/dev/null || echo "")"

        # Verify response body confirms active database connection, guaranteeing end-to-end execution
        if echo "$HEALTH_BODY" | grep -q '"database"[[:space:]]*:[[:space:]]*"connected"'; then
            ALL_HEALTHY=true
            break
        fi
    fi

    echo "Status: backend=${BACKEND_STATUS}, frontend=${FRONTEND_STATUS}, caddy_running=${CADDY_RUNNING} (${ELAPSED}s elapsed)..."
    sleep 3
done

if [[ "$ALL_HEALTHY" != "true" ]]; then
    echo "======================================================================"
    echo "CRITICAL: Health checks failed after ${MAX_WAIT} seconds!"
    echo "Initiating automatic rollback to preserve production availability..."
    echo "======================================================================"

    if [[ -f "$PREV_DEPLOY_FILE" && -x "${SCRIPT_DIR}/rollback.sh" ]]; then
        "${SCRIPT_DIR}/rollback.sh"
    else
        echo "ERROR: Rollback script unavailable or no prior state recorded." >&2
    fi
    exit 1
fi

# ------------------------------------------------------------------------------
# STEP 8: Record Successful Deployment
# ------------------------------------------------------------------------------
cat <<EOF > "$CURR_DEPLOY_FILE"
DEPLOYED_AT="$(date -u +"%Y-%m-%d %H:%M:%S UTC")"
STATUS="SUCCESS"
RELEASE_TAG="${IMAGE_TAG}"
BACKEND_IMAGE="${BACKEND_IMAGE}"
FRONTEND_IMAGE="${FRONTEND_IMAGE}"
EOF

echo "======================================================================"
echo "✓ DEPLOYMENT SUCCEEDED!"
echo "Version: ${IMAGE_TAG}"
echo "Backend:  ${BACKEND_IMAGE}"
echo "Frontend: ${FRONTEND_IMAGE}"
echo "All health probes and end-to-end API checks verified successfully."
echo "======================================================================"
exit 0
