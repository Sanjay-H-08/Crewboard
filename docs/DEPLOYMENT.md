# Crewboard — Production Deployment & Operations Guide

This guide describes the recommended production architecture, hosting infrastructure options, security hardening, automated backup procedures, continuous delivery workflows, and disaster recovery runbooks for **Crewboard**.

---

## 1. Production Architecture Overview

In production, Crewboard is deployed as a secure, containerized system with strict network isolation and TLS termination:

```text
                             [ Public Internet ]
                                      │
                                      │ HTTPS (Port 443)
                                      ▼
                        +----------------------------+
                        |  Edge Reverse Proxy (TLS)  |
                        |   (Caddy / Let's Encrypt)  |
                        +----------------------------+
                                      │
                                      │ HTTP (Internal Bridge Network: crewboard_network)
                                      ▼
+-----------------------------------------------------------------------------------------+
| Host Server (VPS)                                                                       |
|                                                                                         |
|  +------------------------------+               +-------------------------------------+ |
|  | Container: crewboard_frontend|               | Container: crewboard_backend        | |
|  | - Image: GHCR crewboard-fe   | -- /api/ ---> | - Image: GHCR crewboard-be          | |
|  | - Nginx 1.27 Alpine          |               | - FastAPI (Python 3.11)             | |
|  | - Port 80 (Internal only)    |               | - Non-root user (UID 1000)          | |
|  | - Client Max Body: 128M      |               | - Secret Key: 64-char hex           | |
|  | - Security Headers Enabled   |               +-------------------------------------+ |
|  +------------------------------+                                  |                    |
|                                                                    | psycopg2           |
|                                                                    v                    |
|                                                 +-------------------------------------+ |
|                                                 | Container: crewboard_db             | |
|                                                 | - PostgreSQL 16 Alpine              | |
|                                                 | - Internal Only (No host port)      | |
|                                                 +-------------------------------------+ |
+--------------------------------------------------------------------|--------------------+
                                                                     |
                           +-----------------------------------------+--------------------+
                           | Host Persistent Named Volumes                                |
                           |  - crewboard_pgdata      (/var/lib/postgresql/data)          |
                           |  - crewboard_uploads     (/app/uploads, 0750 permissions)    |
                           |  - crewboard_caddy_data  (/data, Let's Encrypt certs)        |
                           |  - crewboard_caddy_config(/config, runtime state)            |
                           +--------------------------------------------------------------+
```

---

## 2. Infrastructure Sizing & Requirements

### Recommended Hardware Specifications
For university cohorts, capstone courses, or lab classes (up to 500 active students and teachers):

| Resource | Minimum | Recommended | Notes |
| :--- | :--- | :--- | :--- |
| **vCPU** | 1 Core | 2 Cores | Fast response times during peak submission hours |
| **RAM** | 2 GB | 4 GB | Accommodates PostgreSQL cache, ASGI workers, and Nginx |
| **Storage** | 20 GB SSD | 50 GB NVMe | Volume storage for PostgreSQL WAL and student file attachments |
| **Operating System** | Ubuntu 22.04 / 24.04 LTS or Debian 12 | Ubuntu 24.04 LTS | Standard Docker Engine & Docker Compose support |

---

## 3. Production Environment Configuration

Create a dedicated `.env` file on the production server under `/opt/crewboard/.env`. **Never commit this file to Git.**

```ini
# ==============================================================================
# CREWBOARD PRODUCTION CONFIGURATION (.env)
# ==============================================================================

# 1. Environment & Mode
ENVIRONMENT=production

# 2. Database Credentials (Generate strong random passwords)
POSTGRES_USER=crewboard_prod_user
POSTGRES_PASSWORD=GENERATE_STRONG_DB_PASSWORD_HERE
POSTGRES_DB=crewboard_prod

# 3. SQLAlchemy Database Connection URL
DATABASE_URL=postgresql+psycopg2://crewboard_prod_user:GENERATE_STRONG_DB_PASSWORD_HERE@db:5432/crewboard_prod

# 4. Backend Security & JWT
# Generate via: openssl rand -hex 32
SECRET_KEY=GENERATE_A_64_CHARACTER_RANDOM_HEX_KEY
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# 5. CORS Origins (Strict production domain whitelist)
CORS_ORIGINS=https://crewboard.yourdomain.edu

# 6. File Storage
UPLOAD_DIR=/app/uploads

# 7. Production Domain & Automated HTTPS (Caddy Edge Gateway)
DOMAIN=crewboard.yourdomain.edu
TLS_EMAIL=admin@yourdomain.edu

# 8. Optional Container Image Overrides (Defaults to latest on GHCR)
# BACKEND_IMAGE=ghcr.io/sanjay-h-08/crewboard-backend:v1.0.0
# FRONTEND_IMAGE=ghcr.io/sanjay-h-08/crewboard-frontend:v1.0.0
```

---

## 4. Reverse Proxy & Automated HTTPS Architecture (Caddy)

Production Crewboard uses **Caddy 2** as an automated TLS reverse proxy container defined in `docker-compose.prod.yml`.

### Key Architecture Guarantees:
1. **Single Entry Point**: The `caddy` container is the **only** service that binds host ports `80` and `443`.
2. **Network Isolation**: The `frontend` (Nginx), `backend` (FastAPI), and `db` (PostgreSQL) containers have **zero host ports bound**; they communicate strictly over the internal Docker bridge network (`crewboard_network`).
3. **Automatic HTTPS & Redirects**: Caddy automatically provisions and renews TLS certificates via Let's Encrypt / ZeroSSL and issues HTTP-to-HTTPS redirects (308).
4. **Certificate Persistence**: ACME certificates and private keys persist across container restarts in the named volume `crewboard_caddy_data` (`/data`).
5. **Streaming Deliverable Uploads**: Caddy does not impose request body limits by default, seamlessly passing multi-file deliverable uploads up to 25MB through to Nginx (which enforces `client_max_body_size 128M;`).

---

## 5. Persistence, Backups & Disaster Recovery

### A. Automated Backup Script (`scripts/backup.sh`)
Crewboard includes a robust database backup script that creates compressed, timestamped PostgreSQL dumps while setting strict `0600` permissions and automatically managing backup retention (14 days):

```bash
# Run manual backup
./scripts/backup.sh /opt/crewboard/backups
```

To schedule automatic daily backups via crontab:
```bash
# Add to root or deploy user crontab (crontab -e)
# Run daily at 02:00 AM UTC
0 2 * * * /opt/crewboard/scripts/backup.sh /opt/crewboard/backups >> /var/log/crewboard-backup.log 2>&1
```

### B. Persistent Storage Guarantees
- **Database (`crewboard_pgdata`)**: Stores all users, teams, projects, tasks, rubrics, and audit trails.
- **Deliverables (`crewboard_uploads`)**: Stores submitted files and presentations. Uploads directory uses secure `0750` permissions with backend UID 1000 ownership.
- **TLS Certificates (`crewboard_caddy_data`)**: Stores ACME keys and certificates to prevent rate-limiting by Let's Encrypt.

> [!CAUTION]
> **Data Safety Rule**: Never run `docker compose down -v` or `docker volume rm` on a production server. Volume destruction permanently deletes the PostgreSQL database and uploaded student files.

---

## 6. Step-by-Step Initial Deployment Runbook

### Step 1: Server Provisioning
On a fresh Ubuntu 24.04 LTS server:
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git ufw fail2ban
sudo apt install -y docker.io docker-compose-v2

# Configure firewall
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### Step 2: Clone Repository & Configure Environment
```bash
# Create deployment directory
sudo mkdir -p /opt/crewboard
sudo chown -R $USER:$USER /opt/crewboard
git clone https://github.com/Sanjay-H-08/Crewboard.git /opt/crewboard
cd /opt/crewboard

# Configure production .env
cp .env.example .env
chmod 600 .env
nano .env  # Enter production credentials, DOMAIN, and generate SECRET_KEY
```

### Step 3: Launch with Production Profile
```bash
# Execute automated deployment script with target release tag
./scripts/deploy.sh v1.0.0 sanjay-h-08
```

### Step 4: Provision Initial Teacher Account
```bash
docker exec -it crewboard_backend python -m app.cli.provision_teacher \
  --email "lead.teacher@university.edu" \
  --name "Prof. Supervising Lead"
```

### Step 5: Verify Deployment Readiness
```bash
# Inspect container health probes
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps

# Verify API health probe through Caddy
curl -f -k https://localhost/api/health
```

---

## 7. Automated Continuous Delivery (GitHub Actions)

Crewboard includes an automated Continuous Delivery workflow (`.github/workflows/deploy.yml`) triggered manually via `workflow_dispatch`.

### Automated Deployment Procedure:
1. Navigate to **Actions > Crewboard Production Continuous Delivery (CD)** on GitHub.
2. Click **Run workflow**.
3. Supply the release version tag (e.g., `v1.0.0` or `sha-b60f1a2`).
4. Select `production` and leave **Create automated PostgreSQL database backup** checked.
5. Click **Run workflow**.
6. The workflow will:
   - Verify connection and host fingerprint.
   - Synchronize Compose definitions and operations scripts.
   - Authenticate the Docker daemon to GHCR.
   - Execute `scripts/deploy.sh` on the server.
   - Run a pre-flight database backup.
   - Pull immutable container tags.
   - Safely run Alembic migrations.
   - Restart containers with planned cutover (~5–15s).
   - Verify health probes.
   - Trigger automated rollback via `scripts/rollback.sh` if any check fails.

---

## 8. Safe Rollback Runbook

### Planned Cutover Interruption Window
On a single-host Docker Compose deployment, restarting application containers incurs a brief **5 to 15 second planned cutover interruption** while Docker stops the old container, launches the new image, runs health checks, and binds to the network. For mission-critical environments requiring sub-second cutover, implement a blue-green reverse proxy routing topology across dual application containers.

### Automated Rollback
If a deployment fails during the `scripts/deploy.sh` execution, the script automatically executes `scripts/rollback.sh`, restoring the previous working image tags and verifying container health.

### Manual Rollback
To manually trigger a rollback at any time on the production server:
```bash
cd /opt/crewboard
./scripts/rollback.sh
```

### Rollback Safety Principles
- **No Destructive Database Downgrades**: Crewboard's database migrations follow the Expand & Contract pattern. Schema changes (such as added columns in 0002 and 0003) are non-destructive and backward compatible with previous application versions.
- **Volume Preservation**: Named volumes (`crewboard_pgdata`, `crewboard_uploads`, `crewboard_caddy_data`) are never deleted or unmounted.
- **Traceability**: Rollback events are recorded in `/opt/crewboard/.current_deployment`.
