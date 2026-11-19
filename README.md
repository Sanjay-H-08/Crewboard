# Crewboard

> **Academic Collaboration & Student Team Project Management Platform**  
> *Structured student execution, transparent deliverables workflow, evidence-based contribution telemetry, and teacher-controlled rubric assessments.*

[![CI/CD Pipeline](https://github.com/Sanjay-H-08/Crewboard/actions/workflows/ci.yml/badge.svg)](https://github.com/Sanjay-H-08/Crewboard/actions/workflows/ci.yml)
[![Docker](https://img.shields.io/badge/Docker-Compose%20v2-blue?logo=docker)](docs/DOCKER.md)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688?logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://react.dev)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql)](https://www.postgresql.org)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## 1. Executive Overview

**Crewboard** is an academic collaboration and project management system designed for university engineering courses, capstone teams, and collaborative lab modules. It bridges the gap between unstructured student teamwork and rigorous academic assessment by unifying milestone tracking, multi-stage deliverable reviews, team discussions, balanced gamification, and supervisory teacher oversight into an **Apple/Flowboard-inspired productivity interface** with native Light and Dark theme support.

### Key Capabilities

1. **Academic Role Separation & Authorization**
   - **Student Accounts**: Public registration creates student accounts with scoped team access.
   - **Team Leadership & Peer Review**: Students collaborate in teams; designated peer reviewers and team leaders review deliverables with structured approval/revision loops.
   - **Supervisory Teacher Portal**: Backend-provisioned teacher accounts supervise assigned cohorts, view submission archives, extend deadlines, evaluate students via 15-point rubrics, and export audit reports.

2. **Deliverables & Submission Review Lifecycle**
   - Direct file uploads (up to 25 MB per deliverable) with persistent volume storage (`crewboard_uploads`).
   - Supports PDF, DOCX, PPTX, JPG, JPEG, PNG, WEBP, and ZIP files.
   - Transparent lifecycle: `To Do` → `In Progress` → `In Review` → `Completed` (or back to `In Progress` upon revision request).

3. **Balanced Gamification & Workload Telemetry**
   - Deterministic XP awards for approved deliverables, first-pass quality, and punctuality.
   - Timezone-safe streak counters and milestone unlocking.
   - Capped peer-review rewards preventing XP farming.
   - Evidence-based student contribution telemetry (tasks completed, files uploaded, revision cycles, reviews performed).

4. **Teacher Rubric Assessment & Academic Reports**
   - Standardized 15-point individual assessment across 3 core criteria:
     1. Technical Execution & Deliverable Depth (1–5)
     2. Documentation Quality & Revision Economy (1–5)
     3. Collaboration, Punctuality & Peer Review (1–5)
   - Qualitative written feedback with in-place record updates.
   - One-click CSV export of complete cohort grades and rubric breakdowns.

5. **Visual Analytics & Modern Flowboard Interface**
   - Seven-day completed work activity bar charts, deliverable distribution donut charts, and team contribution trends.
   - Light Theme (`#F5F6F8` canvas) and Dark Theme (`#0F1115` deep canvas) with instant preference persistence.

---

## 2. Technology Stack

| Layer | Technologies | Key Libraries & Frameworks |
| :--- | :--- | :--- |
| **Frontend** | React 18, Vite | Tailwind CSS, Lucide React, React Router v6, Axios |
| **Backend** | Python 3.11, FastAPI | SQLAlchemy 2.0 (ORM), Pydantic v2, Alembic, Uvicorn |
| **Database** | PostgreSQL 16 | UUIDv4 primary keys, relational schema with foreign cascades |
| **Security** | Argon2 / `pwdlib`, PyJWT | Salted password hashing, JWT Bearer tokens, granular RBAC |
| **Storage** | Docker Named Volumes | `crewboard_pgdata` (Database), `crewboard_uploads` (Deliverables) |
| **Web Server** | Nginx 1.27 Alpine | Multi-stage production build, reverse proxy, 128 MB upload threshold |
| **One-Command Runner** | Fish Shell Script | `./crewboard.fish` (Start, Stop, Restart, Status, Logs, Build) |
| **CI / CD** | GitHub Actions | Automated Pytest, ESLint, Node unit tests, BuildKit Docker builds |

---

## 3. Repository Structure

```text
Crewboard/
├── .github/
│   └── workflows/
│       ├── ci.yml                 # Automated CI (Pytest, ESLint, Unit Tests, BuildKit)
│       └── release.yml            # Container image publishing to GHCR
├── backend/
│   ├── alembic/                   # Database migration environment and revisions
│   │   └── versions/              # Migration scripts (0001, 0002, 0003_rubric_assessment)
│   ├── app/
│   │   ├── api/                   # FastAPI route controllers (auth, tasks, teacher, etc.)
│   │   ├── cli/                   # Administrative CLI commands (provision_teacher)
│   │   ├── core/                  # Configuration, security, and RBAC dependencies
│   │   ├── db/                    # SQLAlchemy database session management
│   │   ├── models/                # SQLAlchemy ORM models
│   │   ├── schemas/               # Pydantic data validation schemas
│   │   └── services/              # Gamification, storage, and analytics business logic
│   ├── tests/                     # Automated Pytest suite
│   ├── Dockerfile                 # Hardened Python 3.11 container runtime
│   ├── entrypoint.sh              # Pre-flight DB check, Alembic migration runner & Uvicorn exec
│   └── requirements.txt           # Python backend dependencies
├── frontend/
│   ├── src/
│   │   ├── components/            # Reusable UI components (Kanban, Teacher, Dashboard, etc.)
│   │   ├── pages/                 # Route pages (Dashboard, Kanban, Teacher, Progress, etc.)
│   │   ├── services/              # Axios API service client
│   │   └── utils/                 # Formatting, gamification, and analytics utilities
│   ├── Dockerfile                 # Multi-stage build (Node 20 -> Nginx Alpine)
│   ├── nginx.conf                 # Hardened reverse proxy & SPA router configuration
│   └── package.json               # Frontend dependencies and scripts
├── docs/                          # In-depth architectural and operational guides
│   ├── ARCHITECTURE.md            # Domain model, RBAC and system architecture
│   ├── CI_CD.md                   # GitHub Actions pipeline documentation
│   ├── DEPLOYMENT.md              # Production deployment runbooks and server setup
│   └── DOCKER.md                  # Container topology, volumes and networking
├── .dockerignore                  # Docker build context exclusion rules
├── .env.example                   # Sanitized environment template
├── .gitignore                     # Git tracking exclusion rules
├── Caddyfile                      # Production automated TLS reverse proxy configuration
├── crewboard.fish                 # Unified management runner script
├── docker-compose.yml             # Base container topology (services, networks, volumes)
├── docker-compose.override.yml    # Development port mappings (loaded automatically)
└── docker-compose.prod.yml        # Production override with Caddy edge TLS gateway
```

---

## 4. Prerequisites

Before running Crewboard, ensure your host system has:
- **Git** (version 2.30+)
- **Docker** (version 24.0+) & **Docker Compose** (Compose V2)
- **Fish Shell** (optional, recommended for `./crewboard.fish`) or standard Bash
- **Node.js 20+** & **Python 3.11** (only required if developing outside Docker)

---

## 5. Local Setup & Quickstart

### 1. Clone the Repository
```bash
git clone https://github.com/Sanjay-H-08/Crewboard.git
cd Crewboard
```

### 2. Configure Environment Variables
Copy the template configuration file. The default placeholder values work out-of-the-box for local container development:
```bash
cp .env.example .env
```

### 3. Launch the Complete Stack with One Command
Crewboard provides a unified runner that handles container builds, health probes, and migration execution automatically:
```bash
./crewboard.fish
```
*(Alternatively, run with standard Docker Compose: `docker compose up -d --build`)*

Once healthy, the runner outputs the live endpoints:
- **Frontend Application**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:8000](http://localhost:8000)
- **API Health Check**: [http://localhost:8000/api/health](http://localhost:8000/api/health)
- **Interactive OpenAPI Documentation**: [http://localhost:8000/docs](http://localhost:8000/docs)

---

## 6. Service Management Commands

The `./crewboard.fish` runner guarantees that **persistent Docker volumes (`crewboard_pgdata`, `crewboard_uploads`) are never destroyed**:

| Command | Action |
| :--- | :--- |
| `./crewboard.fish` | Starts all services, monitors container health, and displays URLs. |
| `./crewboard.fish status` | Shows container status, port bindings, and live HTTP health check probes. |
| `./crewboard.fish stop` | Gracefully stops containers (**strictly preserves all database and upload volumes**). |
| `./crewboard.fish restart` | Restarts all services and re-verifies health. |
| `./crewboard.fish logs` | Consolidated streaming logs across all containers. |
| `./crewboard.fish logs backend` | Follows backend FastAPI and Uvicorn logs. |
| `./crewboard.fish logs frontend` | Follows Nginx frontend web server logs. |
| `./crewboard.fish logs db` | Follows PostgreSQL logs (automatically masks credential patterns). |
| `./crewboard.fish build` | Builds or updates application Docker images. |
| `./crewboard.fish rebuild` | Performs a clean rebuild (`--no-cache`) and restarts services without deleting volumes. |

---

## 7. Teacher Account Provisioning

Teacher accounts possess supervisory authority and cannot be created through the public registration interface. To provision a teacher account securely:

```bash
# Execute within the backend container or local virtual environment:
docker exec -it crewboard_backend python -m app.cli.provision_teacher \
  --email "teacher@university.edu" \
  --name "Dr. Professor"
# Prompts for interactive, masked password entry (minimum 8 characters)
```

---

## 8. Database Migrations & Data Safety

Alembic manages database schema evolutions deterministically.
- Current Migration Head: `0003_rubric_assessment_schema.py`
- Automatic Migration on Startup: Handled safely in `backend/entrypoint.sh` via `alembic upgrade head`.

### Data Safety Guarantee
> [!IMPORTANT]
> **Never run `docker compose down -v`** on instances containing active or demonstration data. Removing volumes destroys `crewboard_pgdata` (PostgreSQL) and `crewboard_uploads` (Deliverables). Use `./crewboard.fish stop` or `docker compose stop`.

### Creating Backups
```bash
# 1. PostgreSQL Database Dump
docker exec crewboard_db pg_dump -U crewboard_user crewboard > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. File Uploads Archive
docker run --rm -v crewboard_uploads:/data -v $(pwd):/backup alpine tar czf /backup/uploads_$(date +%Y%m%d).tar.gz -C /data .
```

---

## 9. Testing & Quality Verification

### Backend Pytest Suite
Covers authentication, student/teacher RBAC, deliverable reviews, streak math, and rubric UUID validation:
```bash
cd backend
pytest -v
```

### Frontend Linting, Unit Tests & Production Build
```bash
cd frontend
# 1. Run ESLint check
npm run lint

# 2. Execute unit tests (14 test suites)
npm test

# 3. Compile optimized Vite production build
npm run build
```

---

## 10. Automated CI/CD & Production Deployment

- **Continuous Integration (`.github/workflows/ci.yml`)**: Every pull request and push to `main` runs automated backend pytest, frontend unit tests, ESLint, Alembic consistency checks, and BuildKit container builds.
- **Container Registry Releases (`.github/workflows/release.yml`)**: Publishes production container images (`ghcr.io/sanjay-h-08/crewboard-backend` and `ghcr.io/sanjay-h-08/crewboard-frontend`) tagged with semantic versions and immutable commit SHAs to GitHub Container Registry (GHCR), gated strictly behind passing CI tests.
- **Continuous Delivery (`.github/workflows/deploy.yml`)**: Manual, approval-gated CD pipeline that automates zero-downtime SSH deployment, pre-deployment database backups, safe Alembic migrations, container health verification, and automatic rollback.
- **Operations & Disaster Recovery Scripts**:
  - `./scripts/deploy.sh <tag>`: Automated production deployment with pre-flight checks and rollback.
  - `./scripts/rollback.sh`: Instant rollback to the previous stable release.
  - `./scripts/backup.sh`: Compressed, timestamped PostgreSQL dumps with 14-day retention.
- **Documentation Guides**:
  - [Continuous Integration & CD Pipeline](docs/CI_CD.md)
  - [Production Deployment & Server Guide](docs/DEPLOYMENT.md)
  - [Containerization & Docker Architecture](docs/DOCKER.md)
  - [System Architecture & Domain Model](docs/ARCHITECTURE.md)

---

## 11. Troubleshooting

| Issue | Cause | Resolution |
| :--- | :--- | :--- |
| `HTTP 413 Payload Too Large` on upload | Nginx client request size exceeded default limit | Fixed: `client_max_body_size 128M;` is configured in `frontend/nginx.conf`. Verify container is using updated image. |
| `Input should be a valid UUID` in rubric modal | Client passed `"undefined"` in URL path parameter | Fixed: Dual camelCase/snake_case property resolution and RFC 4122 regex validation are enforced in `RubricAssessmentModal.jsx`. |
| Port 5432 or 8000 already in use | Another local service is bound to that port | Change `BACKEND_PORT` or `POSTGRES_PORT` in `.env`. |
| Cannot connect to Docker daemon | Current user requires elevated permissions | `./crewboard.fish` automatically detects and uses `sudo` if necessary. |

---

## 12. Documentation Index

- [Architecture & Domain Model](docs/ARCHITECTURE.md)
- [Containerization & Docker Guide](docs/DOCKER.md)
- [CI/CD Pipeline Specifications](docs/CI_CD.md)
- [Production Deployment Guide](docs/DEPLOYMENT.md)
- [API Contract Specification](docs/API_CONTRACT.md)
- [Database Schema Reference](docs/DATABASE_SCHEMA.md)
