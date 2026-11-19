# Crewboard — Production Deployment & Operations Guide

This guide describes the recommended production architecture, hosting infrastructure options, security hardening, automated backup procedures, and deployment runbooks for **Crewboard**.

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
                                      │ HTTP (Internal Loopback / Docker)
                                      ▼
+-----------------------------------------------------------------------------------------+
| Host Server (VPS)                                                                       |
|                                                                                         |
|  +------------------------------+               +-------------------------------------+ |
|  | Container: crewboard_frontend|               | Container: crewboard_backend        | |
|  | - Nginx 1.27 Alpine          | -- /api/ ---> | - FastAPI (Python 3.11)             | |
|  | - Port 80 (Internal)         |               | - Environment: production           | |
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
                           | Host Persistent Volumes                                      |
                           |  - crewboard_pgdata   (/var/lib/postgresql/data)             |
                           |  - crewboard_uploads  (/app/uploads)                         |
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

## 3. Hosting Evaluation & Recommendations

### Option A: Single VPS with Docker Compose (**Recommended**)
- **Providers**: Hetzner Cloud (CX22 / CPX21), DigitalOcean Droplet, Linode, AWS EC2 (t4g.medium).
- **Pros**:
  - Extremely cost-effective ($4–$10/month).
  - Complete control over data persistence, volumes, and backups.
  - Zero external third-party dependencies; entire stack runs reproducibly.
  - Simple operational model matching local development and `./crewboard.fish`.
- **Cons**: Single server; requires automated offsite backups.
- **Verdict**: **Best fit** for academic demonstration, university courses, and capstone team collaboration.

### Option B: Managed Database + Application VPS
- **Providers**: Supabase / AWS RDS PostgreSQL + VPS for frontend/backend.
- **Pros**: Automatic point-in-time recovery, managed database upgrades.
- **Cons**: Higher monthly cost ($25–$50+/month); extra network latency between backend and database.
- **Verdict**: Suitable if university IT mandates centralized managed databases.

### Option C: Platform-as-a-Service (PaaS)
- **Providers**: Render, Railway, Fly.io.
- **Pros**: Automated Git deployment, built-in TLS.
- **Cons**: Volume storage for persistent uploads is expensive and requires complex S3 integration; sleeping containers cause cold starts.
- **Verdict**: Not recommended unless file uploads are refactored to an external S3/Cloud Storage bucket.

---

## 4. Production Environment Configuration

Create a dedicated `.env` file on the production server. **Never commit this file to Git.**

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
POSTGRES_PORT=5432

# 3. Backend Security & JWT
# Generate via: openssl rand -hex 32
SECRET_KEY=GENERATE_A_64_CHARACTER_RANDOM_HEX_KEY
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# 4. CORS Origins (Strict production domain whitelist)
CORS_ORIGINS=https://crewboard.yourdomain.edu

# 5. File Storage
UPLOAD_DIR=/app/uploads

# 6. Production Domain & Automated HTTPS (Caddy Edge Gateway)
DOMAIN=crewboard.yourdomain.edu
TLS_EMAIL=admin@yourdomain.edu
```

---

## 5. Reverse Proxy & Automated HTTPS Architecture (Caddy)

Production Crewboard uses **Caddy 2** as an automated TLS reverse proxy container defined in `docker-compose.prod.yml`.

### Key Architecture Guarantees:
1. **Single Entry Point**: The `caddy` container is the **only** service that binds host ports `80` and `443`.
2. **Network Isolation**: The `frontend` (Nginx), `backend` (FastAPI), and `db` (PostgreSQL) containers have **zero host ports bound**; they communicate strictly over the internal Docker bridge network (`crewboard_network`).
3. **Automatic HTTPS & Redirects**: Caddy automatically provisions and renews TLS certificates via Let's Encrypt / ZeroSSL and issues HTTP-to-HTTPS redirects (308).
4. **Certificate Persistence**: ACME certificates and private keys persist across container restarts in the named volume `crewboard_caddy_data` (`/data`).
5. **Streaming Deliverable Uploads**: Caddy does not impose request body limits by default, seamlessly passing multi-file deliverable uploads up to 25MB through to Nginx (which enforces `client_max_body_size 128M;`).

### Domain & DNS Setup:
1. Create a DNS **A record** pointing `crewboard.yourdomain.edu` to your VPS public IPv4 address.
2. (Optional) Create an **AAAA record** if your VPS supports IPv6.
3. Configure `DOMAIN=crewboard.yourdomain.edu` and `TLS_EMAIL=your-email@domain.edu` in `.env`.
4. Launch the stack:
   ```bash
   docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
   ```
   Caddy will automatically contact Let's Encrypt, solve the HTTP-01 challenge, obtain a TLS certificate, and start serving HTTPS within seconds.

---

## 6. Persistence & Automated Backup Strategy

### A. Automated Daily PostgreSQL Backup Script
Create `/usr/local/bin/backup-crewboard.sh`:

```bash
#!/bin/bash
set -euo pipefail

BACKUP_DIR="/var/backups/crewboard"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p "$BACKUP_DIR"

# 1. Dump PostgreSQL database safely from running container
docker exec crewboard_db pg_dump -U crewboard_prod_user crewboard_prod | gzip > "$BACKUP_DIR/crewboard_db_$DATE.sql.gz"

# 2. Archive student uploaded deliverables
docker run --rm -v crewboard_uploads:/data -v "$BACKUP_DIR":/backup alpine tar czf "/backup/crewboard_uploads_$DATE.tar.gz" -C /data .

# 3. Enforce 30-day retention (purge older backups)
find "$BACKUP_DIR" -type f -name "*.tar.gz" -mtime +30 -delete
find "$BACKUP_DIR" -type f -name "*.sql.gz" -mtime +30 -delete

echo "Crewboard backup completed successfully at $DATE."
```

Make it executable and register in crontab:
```bash
chmod +x /usr/local/bin/backup-crewboard.sh
# Run daily at 02:30 AM
0 2 * * * /usr/local/bin/backup-crewboard.sh >> /var/log/crewboard-backup.log 2>&1
```

---

## 7. Step-by-Step Deployment Runbook

### Step 1: Server Provisioning
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git ufw fail2ban
sudo apt install -y docker.io docker-compose-v2
```

### Step 2: Clone Repository & Configure Environment
```bash
git clone https://github.com/Sanjay-H-08/Crewboard.git /opt/crewboard
cd /opt/crewboard
cp .env.example .env
nano .env  # Enter production credentials & generate SECRET_KEY
```

### Step 3: Launch with Production Profile
```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

### Step 4: Provision Initial Teacher Account
```bash
docker exec -it crewboard_backend python -m app.cli.provision_teacher \
  --email "lead.teacher@university.edu" \
  --name "Prof. Supervising Lead"
```

### Step 5: Verify Deployment Readiness
```bash
# Verify container health probes
docker compose ps

# Check API health endpoint
curl -f http://localhost:8000/api/health
```

---

## 8. Update & Zero-Downtime Rollback Runbook

### Updating to a New Release
```bash
cd /opt/crewboard
git pull origin main

# Rebuild and restart services safely (named volumes are preserved)
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

# Verify migrations and health
docker compose ps
docker compose logs --tail=50 backend
```

### Rolling Back to a Previous Release
If an issue arises after an update:
```bash
cd /opt/crewboard
git checkout <PREVIOUS_COMMIT_SHA>
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```
