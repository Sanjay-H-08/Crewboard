# Crewboard

> **Student Team Project Management & Contribution Tracking Platform**  
> *Collaborative clarity, transparent accountability, and objective workload analytics for academic group projects.*

---

## 1. Project Overview

**Crewboard** is a centralized web platform designed specifically for college student teams executing group coursework, capstones, and lab projects. It solves the chronic issues of fragmented communications, opaque contribution imbalances, and missed project deadlines through a refined **Warm Editorial Productivity** workspace.

### Core Capabilities
- **Team Isolation & Dynamic Join Codes**: Assemble teams securely with 6–8 character uppercase alphanumeric join codes.
- **Project & Milestone Tracking**: Create milestones with explicit deadlines and descriptions.
- **Kanban Execution Board**: Transition deliverables across **To Do**, **In Progress**, and **Done** states with priority tagging.
- **Cross-Team Assignment Security**: Enforces strict multi-tenant boundaries; members cannot access or assign tasks outside their verified team.
- **Automated Activity Auditing**: Automatically logs state transitions, reassignments, and updates.
- **Objective Contribution & Health Analytics**: Real-time project completion percentages, individual task completion tallies, workload distribution percentages, and automated workload concentration warnings.

---

## 2. Technology Stack

| Layer | Technology | Details |
| :--- | :--- | :--- |
| **Frontend** | React 18 + Vite | Tailwind CSS, Lucide React, React Router v6, Axios |
| **Backend** | Python 3.11 + FastAPI | SQLAlchemy 2.0, Pydantic v2, Alembic, JWT (Bearer) |
| **Security** | Argon2 / `pwdlib` | Industry-standard salted password hashing |
| **Database** | PostgreSQL 16 | ACID-compliant relational storage with UUIDv4 primary keys |
| **Testing** | Pytest + HTTPX | Synchronous test client, coverage analysis, and fixture harnesses |
| **DevOps** | Docker & Compose | Multi-stage containers, named persistent volumes, GitHub Actions CI |

---

## 3. Architecture & Documentation Index

Crewboard is structured as a **Modular Monolith** with a single monorepo design, separating concerns between client and server via a strict, frozen API contract.

Comprehensive documentation is maintained in the [`docs/`](./docs) directory:

- 📘 [**Project Overview & Vision**](docs/PROJECT_OVERVIEW.md): Problem statement, user journeys, scope boundaries, and system architecture.
- 🗄️ [**Database Architecture & Schema**](docs/DATABASE_SCHEMA.md): PostgreSQL tables, foreign keys, cascading rules, indexes, and ER diagram.
- 🔌 [**API Contract Specification**](docs/API_CONTRACT.md): Exhaustive endpoint definitions, payloads, status codes, and error formats.
- 🛠️ [**Development Workflow & Git Guide**](docs/DEVELOPMENT_WORKFLOW.md): Division of developer roles, branch model, local setups, and merge protocol.
- 📅 [**2–3 Day Implementation Plan**](docs/IMPLEMENTATION_PLAN.md): Milestone timeline, screen designs, dependency matrices, and acceptance criteria.

---

## 4. Repository Structure

```text
Crewboard/
├── .github/
│   └── workflows/
│       └── ci.yml               # GitHub Actions CI workflow
├── backend/
│   ├── app/
│   │   ├── api/                 # API routers and endpoints
│   │   ├── core/                # App settings, security, and auth dependencies
│   │   ├── db/                  # SQLAlchemy engine, sessionmaker, and Base
│   │   ├── models/              # Relational database models
│   │   ├── schemas/             # Pydantic request/response schemas
│   │   ├── services/            # Activity logging & analytics engines
│   │   ├── __init__.py
│   │   └── main.py              # FastAPI application entrypoint
│   ├── tests/
│   │   ├── conftest.py          # Pytest fixtures and TestClient
│   │   └── test_health.py       # Health check automated tests
│   ├── Dockerfile               # Backend Docker container definition
│   ├── pyproject.toml           # Toolchain configurations (Ruff, Pytest)
│   └── requirements.txt         # Pinned Python package dependencies
├── frontend/
│   ├── src/
│   │   ├── components/          # Reusable UI components & modals
│   │   ├── context/             # Authentication & user state context
│   │   ├── pages/               # 4 core screen views
│   │   ├── services/            # Axios API client & mock fixtures
│   │   ├── App.jsx              # Root component & route dispatcher
│   │   ├── index.css            # Tailwind directives & Warm Editorial theme
│   │   └── main.jsx             # React DOM mounting entrypoint
│   ├── Dockerfile               # Production multi-stage Nginx build
│   ├── index.html               # HTML wrapper with Manrope & Inter fonts
│   ├── package.json             # NPM dependencies and scripts
│   ├── tailwind.config.js       # Design tokens for Warm Editorial palette
│   └── vite.config.js           # Vite development server configuration
├── docs/                        # Complete architectural specifications
├── docker-compose.yml           # Full-stack local multi-container orchestration
├── .env.example                 # Environment configuration template
├── .gitignore                   # Comprehensive ignores for Python, Node & Docker
└── README.md                    # Root project documentation
```

---

## 5. Quickstart & Local Development

### 5.1 Prerequisites
- **Git**
- **Docker & Docker Compose** (Recommended for easiest setup)
- **Node.js 20+** & **npm** (for frontend local development)
- **Conda** (`crewboard` environment) or **Python 3.11** (for backend local development)

### 5.2 Initial Setup
Clone the repository and copy the environment template:
```bash
cp .env.example .env
```

---

### 5.3 Option A: Running with Docker Compose (Recommended)
Boot the database, backend API, and frontend in one command:
```bash
docker compose up --build -d
```
- **Frontend Web App**: [http://localhost:5173](http://localhost:5173)
- **FastAPI Documentation**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **API Health Check**: [http://localhost:8000/api/health](http://localhost:8000/api/health)

To view live container logs:
```bash
docker compose logs -f
```

To stop containers:
```bash
docker compose down
```

---

### 5.4 Option B: Running Locally for Independent Development

#### Backend (Developer B)
```bash
# 1. Activate conda environment
conda activate crewboard

# 2. Run PostgreSQL container only
docker compose up -d db

# 3. Enter backend directory and start server
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

#### Run Backend Tests
```bash
cd backend
pytest -v
```

#### Frontend (Developer A)
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 6. Visual Design System

Crewboard strictly uses the **Warm Editorial Productivity** aesthetic:
- **Background**: `#F4F2EC` (Warm tactile paper)
- **Surface**: `#FFFEFA` (Clean elevated parchment)
- **Primary Text**: `#263A32` (Deep forest slate)
- **Secondary Text**: `#5D6B62` (Muted lichen sage)
- **Primary Action**: `#477461` (Earthy deep spruce)
- **Terracotta Accent**: `#C8795B` (Warm focus accent)
- **Sand Accent**: `#D5B98A` (Muted amber highlight)
- **Subtle Border**: `#E5E1D8`
- **Typography**: Manrope (Headings), Inter (Body)

