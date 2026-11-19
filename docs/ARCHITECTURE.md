# Crewboard — System Architecture & Domain Model

This document details the architectural design, academic collaboration domain model, data flow patterns, role-based access control (RBAC), and telemetry pipelines of **Crewboard**.

---

## 1. High-Level System Architecture

Crewboard is structured around a decoupled modern web stack: a client-side React SPA served via Nginx, communicating over REST with a FastAPI ASGI service backed by PostgreSQL 16:

```text
+-----------------------------------------------------------------------------------------+
|                                     FRONTEND LAYER                                      |
|                                                                                         |
|  React 18 SPA (Vite)                                                                    |
|  ├── Pages: Dashboard, Kanban, Progress, Teams, Projects, Achievements, Teacher Portal  |
|  ├── Components: Modern Flowboard UI, Visual Analytics, Rubrics, Chat Drawer, Modals   |
|  └── State & Services: Axios API client, Auth Context, Gamification Calculators         |
+-----------------------------------------------------------------------------------------+
                                           │
                                           │ HTTPS / JSON REST
                                           ▼
+-----------------------------------------------------------------------------------------+
|                                     GATEWAY & PROXY                                     |
|                                                                                         |
|  Nginx 1.27 Alpine                                                                      |
|  ├── Static Asset Delivery (Vite Hashed Chunks, 1-Year Immutable Caching)               |
|  ├── Security Headers (nosniff, SAMEORIGIN, XSS-Protection, Referrer-Policy)            |
|  ├── Reverse Proxy /api/* -> Backend:8000 with 128MB Client Max Body Size               |
|  └── SPA Fallback Routing (try_files $uri /index.html)                                  |
+-----------------------------------------------------------------------------------------+
                                           │
                                           │ HTTP Forwarding
                                           ▼
+-----------------------------------------------------------------------------------------+
|                                     BACKEND LAYER                                       |
|                                                                                         |
|  FastAPI (Python 3.11 ASGI)                                                             |
|  ├── Routers: /api/auth, /api/tasks, /api/projects, /api/teams, /api/teacher, /api/chat|
|  ├── Services: GamificationService, FileStorageService, AssessmentEngine                |
|  ├── Security: Argon2 Password Hashing, JWT Bearer Token Authentication, Granular RBAC  |
|  └── Data Layer: SQLAlchemy 2.0 ORM, Alembic Migrations, psycopg2 Connection Pool       |
+-----------------------------------------------------------------------------------------+
                                           │
                                           │ TCP :5432
                                           ▼
+-----------------------------------------------------------------------------------------+
|                                    PERSISTENCE LAYER                                    |
|                                                                                         |
|  PostgreSQL 16 Alpine                                                                   |
|  ├── Relational Schema: users, teams, projects, tasks, submissions, assessments         |
|  ├── Constraints: UUIDv4 Primary Keys, Foreign Keys with Cascades, Unique Indices       |
|  └── Storage: Named Volume crewboard_pgdata (Tables) & crewboard_uploads (Deliverables) |
+-----------------------------------------------------------------------------------------+
```

---

## 2. Academic Role-Based Access Control (RBAC)

Crewboard enforces strict academic boundaries across four distinct user roles:

| Role | Scope | Permissions & Capabilities |
| :--- | :--- | :--- |
| **Student** | Assigned Team & Tasks | - Create and update personal tasks within team projects.<br>- Submit deliverables (PDF, PPTX, DOCX, ZIP, code) up to 25 MB.<br>- Participate in real-time team discussions.<br>- View personal XP, level, punctuality streaks, and rubric assessments. |
| **Peer Reviewer** | Assigned Team Tasks | - Review peer submissions with structured feedback.<br>- Approve or request revisions.<br>- Earn capped peer-review XP (preventing gaming/farming). |
| **Team Leader** | Entire Team Project | - Coordinate task assignments across the team.<br>- Conduct formal reviews on all team deliverables.<br>- Track team milestone progress and workload distribution. |
| **Teacher** | Supervised Classes | - Create and assign projects/topics to student teams.<br>- Extend project deadlines with audit trails.<br>- Review student contribution dossiers (completed tasks, revision loops).<br>- Perform **Individual Rubric Assessments** (15-point scale across 3 criteria).<br>- Export comprehensive academic CSV reports. |

---

## 3. Key Domain Lifecycles & Data Flows

### A. Deliverables & Review Workflow
```text
[ To Do ] ──> Student Starts Work ──> [ In Progress ]
                                              │
                                              ▼ Upload Deliverable (File + Notes)
                                      [ In Review ]
                                              │
                         ┌────────────────────┴────────────────────┐
                         │                                         │
                 Peer / Leader Approves                    Leader Requests Revision
                         │                                         │
                         ▼                                         ▼
                   [ Completed ]                            [ In Progress ]
              (Awards XP to Student)               (Increments Revision Cycle Count)
```

### B. Teacher Individual Rubric Assessment
Teachers evaluate students individually using evidence-based metrics combined with a standardized 15-point rubric:
1. **Technical Execution & Deliverable Depth** (1–5 points)
2. **Documentation Quality & Revision Economy** (1–5 points)
3. **Collaboration, Punctuality & Peer Review** (1–5 points)

Assessments are stored in the `rubric_assessments` table linked by `(project_id, student_id)`. Re-submitting an assessment performs an **in-place update**, preserving history without creating duplicate records.

---

## 4. Gamification & Workload Telemetry Engine

The gamification engine (`backend/app/services/gamification_service.py`) calculates deterministic XP, levels, and streak metrics:
- **Base Task Completion**: 100 XP per approved deliverable.
- **First-Pass Quality Bonus**: 50 bonus XP when a task is approved without revision loops.
- **Punctuality Bonus**: 30 bonus XP for completions on or before the deadline.
- **Peer Review Reward**: 25 XP per meaningful peer review (strictly capped per task).
- **Streak Calculation**: Calculated on UTC calendar days to ensure timezone consistency.

---

## 5. Deployment & Release Architecture

```text
GitHub Push (main) ──> CI Pipeline (.github/workflows/ci.yml)
                             │ (All tests, linter, builds pass)
                             ▼
Release Tag (v*.*.*) ──> GHCR Release (.github/workflows/release.yml)
                             │ (Gated behind CI checks)
                             ▼
                    ghcr.io/sanjay-h-08/crewboard-backend
                    ghcr.io/sanjay-h-08/crewboard-frontend
                             │
                             ▼ (Manual workflow_dispatch + Approval)
                    CD Pipeline (.github/workflows/deploy.yml)
                             │
                             ├── Pre-deploy Backup (scripts/backup.sh)
                             ├── Safe Alembic Migrations
                             ├── Container Swap & Health Probes
                             └── Automated Rollback on Failure (scripts/rollback.sh)
```
