#!/usr/bin/env bash
# ==============================================================================
# CREWBOARD — AUTOMATED POSTGRESQL DATABASE BACKUP SCRIPT
# ==============================================================================
# Creates a compressed, timestamped pg_dump of the PostgreSQL database.
# Preserves existing backups and applies strict 0600 file permissions.
# Usage: ./scripts/backup.sh [optional_destination_dir]
# ==============================================================================

set -euo pipefail

# 1. Determine Project Directory and Load Environment
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
BACKUP_DIR="${1:-${PROJECT_ROOT}/backups}"

ENV_FILE="${PROJECT_ROOT}/.env"
if [[ -f "$ENV_FILE" ]]; then
    # Safely extract PostgreSQL credentials without executing arbitrary shell code
    POSTGRES_USER="$(grep -E '^POSTGRES_USER=' "$ENV_FILE" | cut -d '=' -f2- | tr -d '\"'\'' ' || true)"
    POSTGRES_DB="$(grep -E '^POSTGRES_DB=' "$ENV_FILE" | cut -d '=' -f2- | tr -d '\"'\'' ' || true)"
fi

POSTGRES_USER="${POSTGRES_USER:-crewboard_user}"
POSTGRES_DB="${POSTGRES_DB:-crewboard}"
CONTAINER_NAME="crewboard_db"

echo "======================================================================"
echo " Crewboard — Database Backup Procedure"
echo " Date: $(date -u +"%Y-%m-%d %H:%M:%S UTC")"
echo " Target Database: ${POSTGRES_DB} (User: ${POSTGRES_USER})"
echo "======================================================================"

# 2. Verify Database Container Status
if ! command -v docker >/dev/null 2>&1; then
    echo "ERROR: Docker CLI is not installed or not in PATH." >&2
    exit 1
fi

if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo "ERROR: Database container '${CONTAINER_NAME}' is not currently running." >&2
    echo "Please ensure the database container is started before initiating a backup." >&2
    exit 1
fi

# 3. Create Backup Directory with Secure Permissions (0700)
mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR" 2>/dev/null || true

TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP_FILE="${BACKUP_DIR}/crewboard_backup_${TIMESTAMP}.sql.gz"

echo "Creating compressed backup at: ${BACKUP_FILE}..."

# 4. Stream pg_dump through gzip to avoid uncompressed intermediate disk writes
if docker exec "${CONTAINER_NAME}" pg_dump -U "${POSTGRES_USER}" "${POSTGRES_DB}" | gzip -9 > "${BACKUP_FILE}"; then
    # Verify backup archive integrity
    if ! gzip -t "${BACKUP_FILE}" 2>/dev/null; then
        echo "ERROR: Backup archive failed gzip integrity check! Deleting corrupt archive." >&2
        rm -f "${BACKUP_FILE}"
        exit 1
    fi

    # Verify uncompressed content is strictly non-empty (a blank stream creates a ~25-byte gzip header/footer)
    UNCOMPRESSED_SIZE="$(gzip -dc "${BACKUP_FILE}" 2>/dev/null | wc -c || echo "0")"
    if [[ "$UNCOMPRESSED_SIZE" -le 0 ]]; then
        echo "ERROR: Database dump produced 0 uncompressed bytes! Deleting empty backup." >&2
        rm -f "${BACKUP_FILE}"
        exit 1
    fi

    # Set strict least-privilege permissions (read/write for owner only)
    chmod 600 "${BACKUP_FILE}"
    BACKUP_SIZE="$(du -h "${BACKUP_FILE}" | cut -f1)"
    echo "✓ Backup created successfully! Compressed size: ${BACKUP_SIZE} (Uncompressed bytes: ${UNCOMPRESSED_SIZE})"
else
    echo "ERROR: pg_dump command failed during backup creation." >&2
    rm -f "${BACKUP_FILE}"
    exit 1
fi

# 5. Backup Retention Management (Keep minimum 3 backups; prune older than 14 days)
RETENTION_DAYS=14
MIN_BACKUPS_TO_RETAIN=3

TOTAL_BACKUPS="$(find "${BACKUP_DIR}" -name "crewboard_backup_*.sql.gz" -type f | wc -l)"
echo "Total existing valid backups: ${TOTAL_BACKUPS}"

if [[ "$TOTAL_BACKUPS" -gt "$MIN_BACKUPS_TO_RETAIN" ]]; then
    echo "Pruning backups older than ${RETENTION_DAYS} days while retaining at least ${MIN_BACKUPS_TO_RETAIN}..."
    # Find candidates older than RETENTION_DAYS
    OLD_BACKUPS=$(find "${BACKUP_DIR}" -name "crewboard_backup_*.sql.gz" -type f -mtime "+${RETENTION_DAYS}" | sort)
    for old_file in $OLD_BACKUPS; do
        CURRENT_COUNT="$(find "${BACKUP_DIR}" -name "crewboard_backup_*.sql.gz" -type f | wc -l)"
        if [[ "$CURRENT_COUNT" -gt "$MIN_BACKUPS_TO_RETAIN" ]]; then
            rm -f "$old_file"
        else
            echo "Preserving ${old_file} to ensure minimum safety threshold of ${MIN_BACKUPS_TO_RETAIN} backups."
            break
        fi
    done
else
    echo "Notice: Backup count (${TOTAL_BACKUPS}) is within safety threshold (${MIN_BACKUPS_TO_RETAIN}). Skipping pruning."
fi

echo "Backup operation completed successfully."
exit 0
