# Crewboard — Containerization & Docker Architecture Guide

This document provides a comprehensive technical overview of the Docker configuration, container topology, persistent storage architecture, and health monitoring for **Crewboard**.

---

## 1. Container Topology & Architecture

Crewboard executes as a multi-tier containerized stack orchestrated via Docker Compose:

```text
                               +----------------------------------------+
                               |              Web Browser               |
                               +----------------------------------------+
                                                   |
                                                   | HTTP (Port 5173 or 80)
                                                   v
+---------------------------------------------------------------------------------------------------+
|  Docker Network: crewboard_network (bridge)                                                       |
|                                                                                                   |
|  +-------------------------------------+                +---------------------------------------+ |
|  | Container: crewboard_frontend       |                | Container: crewboard_backend          | |
|  | Image: crewboard-frontend:latest    |                | Image: crewboard-backend:latest       | |
|  | Server: Nginx 1.27 Alpine           |                | Runtime: Python 3.11 Slim (FastAPI)   | |
|  | Ports: 5173:80                      | -- /api/ --->  | Internal Port: 8000                   | |
|  | Static Assets: Vite React Build     |                | User: crewboard (UID 1000)            | |
|  +-------------------------------------+                +---------------------------------------+ |
|                                                                     |                             |
|                                                                     | SQLAlchemy / psycopg2       |
|                                                                     v                             |
|                                                         +---------------------------------------+ |
|                                                         | Container: crewboard_db               | |
|                                                         | Image: postgres:16-alpine             | |
|                                                         | Port: 127.0.0.1:5432:5432 (Local dev) | |
|                                                         +---------------------------------------+ |
+---------------------------------------------------------------------|-----------------------------+
                                                                      |
                   +--------------------------------------------------+-----------------------+
                   | Persistent Named Volumes                                                 |
                   |                                                                          |
                   |  - crewboard_pgdata   --> /var/lib/postgresql/data (PostgreSQL Tables)  |
                   |  - crewboard_uploads  --> /app/uploads (Student Deliverables)            |
                   +--------------------------------------------------------------------------+
```

---

## 2. Service Specifications

### A. Backend Service (`crewboard_backend`)
- **Base Image**: `python:3.11-slim`
- **Build Pattern**:
  - Compiles dependencies with temporary build tools (`build-essential`, `libpq-dev`).
  - Purges build compilers post-installation to keep the final image minimal and secure.
  - Installs `curl` strictly for health checks.
  - Sets `PYTHONUNBUFFERED=1` and `PYTHONDONTWRITEBYTECODE=1`.
- **Pre-Flight Entrypoint (`backend/entrypoint.sh`)**:
  1. Ensures `/app/uploads` exists with writable permissions.
  2. Executes an active Python loop checking database connectivity with retries up to 30 seconds.
  3. Applies pending database migrations via `alembic upgrade head`.
  4. Launches `uvicorn app.main:app --host 0.0.0.0 --port 8000` via `exec "$@"`, guaranteeing that Uvicorn runs as PID 1 and receives OS shutdown signals (`SIGTERM`, `SIGINT`) cleanly.
- **Health Check Probe**:
  - `CMD curl -f http://localhost:8000/api/health || exit 1`
  - Runs every 10 seconds; verifies database query execution.

### B. Frontend Service (`crewboard_frontend`)
- **Multi-Stage Build**:
  - **Stage 1 (Build)**: `node:20-alpine`. Deterministic installation via `npm ci`, compiles React/Vite assets to `/app/dist`.
  - **Stage 2 (Runtime)**: `nginx:alpine`. Minimal web server hosting static assets.
- **Reverse Proxy & Edge Configuration (`frontend/nginx.conf`)**:
  - **Large Deliverable Upload Support**: Configured with `client_max_body_size 128M;` to support multi-file submissions and presentations up to 25 MB per deliverable.
  - **API Forwarding**: Reverse proxies `/api/*` requests directly to `http://backend:8000`.
  - **SPA Fallback**: `try_files $uri $uri/ /index.html;` ensures React Router client-side routes resolve properly.
  - **Security Headers**: Hides server version (`server_tokens off;`), adds `X-Frame-Options`, `X-Content-Type-Options`, `X-XSS-Protection`, and `Referrer-Policy`.
  - **Gzip Compression**: Compresses text, CSS, JavaScript, JSON, and SVG.
- **Health Check Probe**:
  - `CMD wget --quiet --tries=1 --spider http://localhost:80/ || exit 1`
  - Runs every 15 seconds.

### C. Database Service (`crewboard_db`)
- **Base Image**: `postgres:16-alpine`
- **Network Isolation**:
  - In `docker-compose.yml` (development), port `5432` binds exclusively to `127.0.0.1` to prevent exposure over LAN or public network interfaces.
  - In `docker-compose.prod.yml` (production), database ports are completely omitted from host publishing and isolated strictly on `crewboard_network`.
- **Health Check Probe**:
  - `CMD-SHELL pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}`
  - Runs every 5 seconds.

---

## 3. Persistent Volume Safety Guarantees

The Crewboard Docker architecture guarantees total persistence across container rebuilds, image upgrades, and service restarts:

1. **`crewboard_pgdata`**:
   - Stores PostgreSQL database files (WAL logs, relation tables, user accounts, audit trails).
   - Survives `docker compose restart`, `docker compose stop`, `docker compose down`, and image updates.
2. **`crewboard_uploads`**:
   - Stores submitted student deliverables, project slides, and rubric attachments.
   - Mounted directly at `/app/uploads` in the backend container.

> [!CAUTION]
> **Data Safety Rule**: Never execute `docker compose down -v` or `docker volume rm crewboard_pgdata crewboard_uploads` on an environment with active or demo data. Volume destruction irreversibly deletes the PostgreSQL database and deliverables.

---

## 4. Development vs. Production Configurations

### Development / Unified Configuration (`docker-compose.yml`)
- Provides host port bindings for direct debugging:
  - Frontend: `http://localhost:5173`
  - Backend API: `http://localhost:8000`
  - Database: `127.0.0.1:5432` (accessible via `psql` or database clients)
- Used by `./crewboard.fish`.

### Production Configuration (`docker-compose.prod.yml`)
- Applied on top of the base compose file:
  ```bash
  docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
  ```
- **Changes in Production**:
  - Database, backend, and frontend host ports are **completely unmapped** from the host; zero direct external access.
  - A containerized **Caddy 2** edge reverse proxy binds host ports `80` and `443` as the sole public gateway.
  - Caddy automatically provisions and renews Let's Encrypt TLS certificates, stored in the persistent volume `crewboard_caddy_data`.
  - Sets `ENVIRONMENT=production`, triggering strict runtime verification (rejects default secrets).
  - Configures JSON log rotation (`max-size: 20m`, `max-file: 5`) to prevent disk exhaustion.
  - Restart policy elevated to `always`.

---

## 5. Life-Cycle Management with `crewboard.fish`

Crewboard includes a one-command management runner (`crewboard.fish`) that handles all Docker operations safely:

```bash
# Start all containers with health check verification
./crewboard.fish start

# Check live container status, memory and health probes
./crewboard.fish status

# View streaming logs
./crewboard.fish logs backend
./crewboard.fish logs frontend
./crewboard.fish logs db

# Gracefully stop containers without touching volumes
./crewboard.fish stop

# Rebuild containers from scratch without data loss
./crewboard.fish rebuild
```
