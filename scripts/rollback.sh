#!/usr/bin/env bash
# ==============================================================================
# CREWBOARD — SAFE PRODUCTION ROLLBACK SCRIPT
# ==============================================================================
# Restores the application to the previously recorded working container images.
# Strictly preserves PostgreSQL database data, persistent volumes, and uploads.
# Does NOT execute destructive database schema downgrades.
# Usage: ./scripts/rollback.sh
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
PREV_DEPLOY_FILE="${PROJECT_ROOT}/.previous_deployment"
CURR_DEPLOY_FILE="${PROJECT_ROOT}/.current_deployment"

echo "======================================================================"
echo " Crewboard — Automated Production Rollback Procedure"
echo " Date: $(date -u +"%Y-%m-%d %H:%M:%S UTC")"
echo " Project Root: ${PROJECT_ROOT}"
echo "======================================================================"

# 1. Verify Existence of Previous Deployment State
if [[ ! -f "$PREV_DEPLOY_FILE" ]]; then
    echo "ERROR: Previous deployment record (${PREV_DEPLOY_FILE}) not found." >&2
    echo "Cannot perform an automatic rollback without a verified prior state." >&2
    echo "Please inspect running containers and Docker image history manually." >&2
    exit 1
fi

# 2. Extract Previous Image Tags Safely
PREV_BACKEND_IMAGE="$(grep -E '^BACKEND_IMAGE=' "$PREV_DEPLOY_FILE" | cut -d '=' -f2- | tr -d '\"'\'' ' || true)"
PREV_FRONTEND_IMAGE="$(grep -E '^FRONTEND_IMAGE=' "$PREV_DEPLOY_FILE" | cut -d '=' -f2- | tr -d '\"'\'' ' || true)"
PREV_TAG="$(grep -E '^RELEASE_TAG=' "$PREV_DEPLOY_FILE" | cut -d '=' -f2- | tr -d '\"'\'' ' || true)"
PREV_SHA="$(grep -E '^COMMIT_SHA=' "$PREV_DEPLOY_FILE" | cut -d '=' -f2- | tr -d '\"'\'' ' || true)"

if [[ -z "$PREV_BACKEND_IMAGE" || -z "$PREV_FRONTEND_IMAGE" ]]; then
    echo "ERROR: Incomplete previous deployment record in ${PREV_DEPLOY_FILE}." >&2
    echo "BACKEND_IMAGE or FRONTEND_IMAGE is missing." >&2
    exit 1
fi

echo "Previous Deployment State Found:"
echo " - Release Tag:    ${PREV_TAG:-unknown}"
echo " - Commit SHA:     ${PREV_SHA:-unknown}"
echo " - Backend Image:  ${PREV_BACKEND_IMAGE}"
echo " - Frontend Image: ${PREV_FRONTEND_IMAGE}"
echo "----------------------------------------------------------------------"

# 3. Ensure Database Service is Running & Healthy
echo "Verifying database service status..."
docker compose -f "${PROJECT_ROOT}/docker-compose.yml" -f "${PROJECT_ROOT}/docker-compose.prod.yml" up -d db

# 4. Pull / Verify Target Images Exist
echo "Ensuring previous container images are available locally..."
export BACKEND_IMAGE="${PREV_BACKEND_IMAGE}"
export FRONTEND_IMAGE="${PREV_FRONTEND_IMAGE}"

docker compose -f "${PROJECT_ROOT}/docker-compose.yml" -f "${PROJECT_ROOT}/docker-compose.prod.yml" pull backend frontend || {
    echo "WARNING: Docker pull from registry failed. Attempting to use existing local image cache..."
}

# 5. Re-deploy Previous Container Versions
echo "Switching application containers to previous image tags..."
docker compose -f "${PROJECT_ROOT}/docker-compose.yml" -f "${PROJECT_ROOT}/docker-compose.prod.yml" up -d backend frontend caddy

# 6. Verify Health Checks (Up to 60 seconds)
echo "Waiting for rolled-back services to report healthy..."
MAX_WAIT=60
START_TIME=$(date +%s)
HEALTHY=false

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
        ENV_FILE="${PROJECT_ROOT}/.env"
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
            HEALTHY=true
            break
        fi
    fi

    echo "Status: backend=${BACKEND_STATUS}, frontend=${FRONTEND_STATUS}, caddy_running=${CADDY_RUNNING} (${ELAPSED}s elapsed)..."
    sleep 3
done

if [[ "$HEALTHY" != "true" ]]; then
    echo "ERROR: Services failed to reach healthy status within ${MAX_WAIT} seconds after rollback!" >&2
    docker compose -f "${PROJECT_ROOT}/docker-compose.yml" -f "${PROJECT_ROOT}/docker-compose.prod.yml" ps
    exit 1
fi

# 7. Record Rollback Execution
cat <<EOF > "$CURR_DEPLOY_FILE"
DEPLOYED_AT="$(date -u +"%Y-%m-%d %H:%M:%S UTC")"
STATUS="ROLLED_BACK"
RELEASE_TAG="${PREV_TAG:-unknown}"
COMMIT_SHA="${PREV_SHA:-unknown}"
BACKEND_IMAGE="${PREV_BACKEND_IMAGE}"
FRONTEND_IMAGE="${PREV_FRONTEND_IMAGE}"
EOF

echo "======================================================================"
echo "✓ Rollback completed successfully!"
echo "All application services restored to prior stable release: ${PREV_TAG:-unknown}."
echo "Database volumes (crewboard_pgdata) and uploads (crewboard_uploads) were preserved."
echo "======================================================================"
exit 0
