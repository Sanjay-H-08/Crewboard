# Crewboard

> **Academic Collaboration & Student Team Project Management Platform**  
> *Structured student execution, transparent deliverables workflow, real-time workload analytics, and supervisory teacher oversight.*

---

## 1. Executive Overview

**Crewboard** is an academic project management and team collaboration system engineered for university engineering courses, capstone teams, and collaborative lab modules. It unifies project milestone planning, deliverable submissions with peer/leader reviews, real-time team discussions, and supervisory teacher dashboards into an **Apple/Flowboard-inspired productivity interface** with native Light and Dark theme support.

### Key Capabilities

1. **Academic Role Separation & Authorization**
   - **Public Registration**: Strictly creates student accounts (`system_role="student"`).
   - **Teacher Supervision**: Separate backend-controlled administrative provisioning (`python -m app.cli.provision_teacher`). Teachers supervise class projects, view submission deliverables, extend deadlines, and export audit reports with read-only protection over student task execution.
   - **Team Leadership & Peer Review**: Team leaders and designated student reviewers approve or reject task submissions with actionable revision feedback.

2. **Deliverables & Submission Workflow**
   - Direct file uploads (up to 25 MB per deliverable) with persistent volume storage (`crewboard_uploads`).
   - Revision tracking with submission history and status lifecycles: `to_do` → `in_progress` → `in_review` → `completed` (or back to `in_progress` on rejection).

3. **Team Communication & Audit Activity**
   - Real-time team discussion drawer with message polling and user badges.
   - Granular activity audit trail tracking task transitions, assignments, and reviews.

4. **Objective Contribution & Workload Analytics**
   - Real-time milestone progress metrics and task completion tallies.
   - Workload distribution percentages with automated imbalance alerts to highlight unequal effort.

5. **Apple / Flowboard Visual Design**
   - Light Theme (`#F5F6F8` canvas, rounded island container, solid charcoal primary accents).
   - Dark Theme (`#0F1115` deep canvas, subtle borders, high legibility).
   - Seamless one-click theme toggle with local preference persistence.

---

## 2. Technology Stack

| Layer | Technologies | Key Libraries / Frameworks |
| :--- | :--- | :--- |
| **Frontend** | React 18, Vite | Tailwind CSS, Lucide React, React Router v6, Axios |
| **Backend** | Python 3.11, FastAPI | SQLAlchemy 2.0 (ORM), Pydantic v2, Alembic, Uvicorn |
| **Database** | PostgreSQL 16 | UUIDv4 primary keys, relational schema with cascades |
| **Security** | Argon2 / `pwdlib`, PyJWT | Salted password hashing, JWT Bearer tokens |
| **Storage** | Docker Named Volumes | `crewboard_pgdata` (Database), `crewboard_uploads` (Deliverables) |
| **Runner** | Fish Shell Script | `./crewboard.fish` (Start, Stop, Restart, Status, Logs, Build) |
| **Containerization** | Docker, Docker Compose, Nginx | Multi-stage frontend build, reverse-proxy routing |

---

## 3. Architecture & Container Orchestration

Crewboard is structured as a robust modular service system orchestrated via Docker Compose:

```text
[ Browser Client ]
       │
       ▼
[ Nginx Reverse Proxy (Frontend Container :80 -> :5173) ]
  ├── Static Assets (Vite React SPA)
  └── /api/* Proxy Pass
       │
       ▼
[ FastAPI Backend (:8000) ]
  ├── JWT Auth & Role Authorization
  ├── Academic Collaboration & Review Engine
  ├── Task, Chat & Analytics Routers
  └── Uploads Manager (/app/uploads -> crewboard_uploads volume)
       │
       ▼
[ PostgreSQL 16 (:5432 -> crewboard_pgdata volume) ]
```

### Persistent Named Volumes
- `crewboard_pgdata`: Houses all relational database tables, users, teams, projects, tasks, reviews, and activity history.
- `crewboard_uploads`: Houses all uploaded assignment files and project deliverables.

---

## 4. One-Command Runner (`crewboard.fish`)

Crewboard includes an executable Fish-compatible runner at the repository root that manages all Docker lifecycle operations safely without manual Docker commands.

### Supported Commands

| Command | Action |
| :--- | :--- |
| `./crewboard.fish` | Default: Builds if needed, boots all services, waits for health checks, and prints live URLs. |
| `./crewboard.fish start` | Explicit startup with container health verification. |
| `./crewboard.fish stop` | Gracefully stops containers (**strictly preserves all database and upload volumes**). |
| `./crewboard.fish restart` | Restarts all containers and verifies service health. |
| `./crewboard.fish status` | Displays container status, port bindings, and live HTTP health check responses. |
| `./crewboard.fish logs` | Streams consolidated logs for all services (`--tail=100`). |
| `./crewboard.fish logs backend` | Follows backend FastAPI and Uvicorn logs. |
| `./crewboard.fish logs frontend` | Follows Nginx frontend web server logs. |
| `./crewboard.fish logs db` | Follows PostgreSQL logs (automatically masks credential patterns). |
| `./crewboard.fish build` | Builds or updates application Docker images. |
| `./crewboard.fish rebuild` | Performs a clean rebuild (`--no-cache`) and restarts services without deleting volumes. |
| `./crewboard.fish help` | Displays full command usage guide and safety documentation. |

### Docker Permissions Note
The runner automatically detects whether Docker commands require `sudo` privileges and wraps commands safely, maintaining system security without altering host user groups.

---

## 5. Local Setup & Quickstart

### Prerequisites
- **Git**
- **Docker & Docker Compose**
- **Fish Shell** (or standard Docker Compose CLI)
- Optional for local non-Docker development: Node.js 20+, Python 3.11 / Conda (`crewboard` environment).

### 1. Clone & Configure Environment
```bash
git clone https://github.com/Sanjay-H-08/Crewboard.git
cd Crewboard

# Copy template configuration (safe defaults provided)
cp .env.example .env
```

### 2. Launch with One Command
```bash
./crewboard.fish
```
The script boots PostgreSQL, the FastAPI backend, runs database migrations automatically, launches the Nginx-hosted React frontend, and verifies all health probes:

- **Frontend Application**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:8000](http://localhost:8000)
- **Backend Health Check**: [http://localhost:8000/api/health](http://localhost:8000/api/health)
- **Interactive OpenAPI Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)

---

## 6. Demo Classroom Dataset & Teacher Provisioning

Crewboard includes support for supervisory teacher accounts and pre-seeded academic cohorts:

### Teacher Provisioning CLI
To securely provision a new Teacher account or elevate an existing account without exposing passwords in history:
```bash
# Run inside the backend directory or container:
python -m app.cli.provision_teacher --email teacher@university.edu --name "Dr. Professor"
# Prompts for interactive no-echo password entry (minimum 8 characters)
```

### Realistic DSA Cohort
The database includes a 60-student Data Structures & Algorithms cohort (10 teams of 6 students, supervised by `Dr. T` at `teacher79@gmail.com`) with active deliverables, reviews, and activity trails.

---

## 7. Database Migrations & Data Safety

Alembic handles database migrations deterministically.
- Current Migration Head: `0002_academic_collaboration` (`backend/alembic/versions/0002_academic_collaboration_schema.py`).
- Automatic Migration on Startup: Handled safely in `backend/entrypoint.sh` via `alembic upgrade head`.

### Critical Data Preservation Rule
**Never run `docker compose down -v` on production or demo instances.** Volume removal wipes `crewboard_pgdata` and `crewboard_uploads`. To stop services safely, use `./crewboard.fish stop` or `docker compose stop`.

### Backup Instructions

#### 1. Relational Database Backup
```bash
# Create timestamped SQL dump from running db container
docker exec crewboard_db pg_dump -U crewboard_user crewboard > backup_$(date +%Y%m%d_%H%M%S).sql
```

#### 2. File Uploads Backup
```bash
# Archive all deliverables from the persistent upload volume
docker run --rm -v crewboard_uploads:/data -v $(pwd):/backup alpine tar czf /backup/uploads_$(date +%Y%m%d).tar.gz -C /data .
```

---

## 8. Verification & Test Suite

### Backend Test Suite (31 Automated Tests)
Covers authentication, student/teacher RBAC, deliverables submission, reviewer approvals/rejections, file size limits, project deadlines, and chat messaging:
```bash
cd backend
pytest -v
```

### Frontend Linting, Tests & Production Build
```bash
cd frontend
# 1. Lint code with ESLint
npm run lint

# 2. Run unit tests
npm test

# 3. Compile optimized production Vite bundle
npm run build
```

---

## 9. Security & Hardening Highlights

- **JWT Claims Derived from DB**: Roles and user claims are verified on every request against the database, never trusted from client payloads.
- **Strict File Upload Validation**: Files are checked for allowed MIME types/extensions with a 25 MB max size threshold, stored using randomized UUID paths preventing path traversal.
- **Granular RBAC**: Teachers cannot modify, approve, or delete student subtasks; Team Leaders and designated student reviewers have scoped approval rights within their teams only.
- **Zero Committed Secrets**: `.env` and uploaded files are excluded via `.gitignore`. Production environments enforce a minimum 32-character high-entropy `SECRET_KEY`.

---

## 10. Repository & Contribution

- **GitHub Repository**: [https://github.com/Sanjay-H-08/Crewboard.git](https://github.com/Sanjay-H-08/Crewboard.git)
- **Primary Branch**: `main`
