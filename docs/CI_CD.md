# Crewboard — Continuous Integration & Deployment (CI/CD) Guide

This document describes the automated testing, verification, and container packaging pipelines implemented for **Crewboard** using GitHub Actions.

---

## 1. CI/CD Pipeline Architecture

The CI/CD system consists of two dedicated GitHub Actions workflows:

1. **Continuous Integration (`.github/workflows/ci.yml`)**:
   - Executes automatically on every `push` to `main`, `pull_request` targeting `main`, or manual `workflow_dispatch`.
   - Validates code quality, runs test suites, checks database migration consistency, and builds Docker images using BuildKit with GitHub Actions caching.
   - **Never pushes container images or deploys during PR checks.**

2. **Container Registry Release (`.github/workflows/release.yml`)**:
   - Executes on semantic version tags (`v*.*.*`) or manual dispatch.
   - Builds production container images for backend and frontend.
   - Publishes signed, tagged images to **GitHub Container Registry (GHCR)** (`ghcr.io`).

```text
  [ Developer Push / Pull Request ]
                 │
                 ▼
  ┌─────────────────────────────────────────────────────────────┐
  │                 GitHub Actions CI Pipeline                  │
  ├──────────────────────────────┬──────────────────────────────┤
  │       Job 1: Backend CI      │      Job 2: Frontend CI      │
  │  - Python 3.11 Setup         │  - Node.js 20 Setup          │
  │  - Pip Dependency Caching    │  - Npm Dependency Caching    │
  │  - Alembic Migration Check   │  - ESLint Validation         │
  │  - Full Pytest Test Suite    │  - Node Unit Test Suite      │
  │                              │  - Vite Production Build     │
  └──────────────────────────────┴──────────────────────────────┘
                                 │
                                 ▼ Both Pass
  ┌─────────────────────────────────────────────────────────────┐
  │                     Job 3: Docker CI                        │
  │  - Set up Docker Buildx (BuildKit)                          │
  │  - Validate Docker Compose Topology (Dev & Prod)            │
  │  - Build Backend Image (BuildKit + GHA Cache)               │
  │  - Build Frontend Image (BuildKit + GHA Cache)              │
  └─────────────────────────────────────────────────────────────┘
                                 │
                                 ▼ (Release Tag / Dispatch Only)
  ┌─────────────────────────────────────────────────────────────┐
  │                 Release Pipeline (GHCR)                     │
  │  - Authenticate with GitHub Container Registry              │
  │  - Tag with Immutable Commit SHA (sha-xxxx)                 │
  │  - Tag with Semantic Version (v1.0.0) & latest              │
  │  - Push Images to ghcr.io/<owner>/crewboard-*               │
  └─────────────────────────────────────────────────────────────┘
```

---

## 2. CI Workflow Specifications (`ci.yml`)

### A. Job 1: `backend-ci`
- **Runner**: `ubuntu-latest`
- **Environment**: Python 3.11 with pip caching based on `backend/requirements.txt`.
- **Steps**:
  1. **Dependency Installation**: `pip install -r requirements.txt`.
  2. **Alembic Consistency Check**:
     Validates that Alembic script directory configuration resolves to exactly **one migration head**, ensuring there are no branching migration conflicts.
     ```python
     from alembic.config import Config
     from alembic.script import ScriptDirectory
     cfg = Config('alembic.ini')
     script = ScriptDirectory.from_config(cfg)
     heads = script.get_heads()
     assert len(heads) == 1, f"Expected 1 head, found: {heads}"
     ```
  3. **Pytest Suite**:
     Executes all unit and integration tests against an in-memory SQLite database (`DATABASE_URL=sqlite:///:memory:`):
     ```bash
     pytest -v --tb=short
     ```

### B. Job 2: `frontend-ci`
- **Runner**: `ubuntu-latest`
- **Environment**: Node.js 20 with npm caching based on `frontend/package-lock.json`.
- **Steps**:
  1. **Clean Installation**: `npm ci` ensures exact, reproducible dependencies matching `package-lock.json`.
  2. **ESLint Verification**: `npm run lint` guarantees zero lint errors and zero unhandled warnings across all React components and utility files.
  3. **Unit Tests**: `npm test` executes the 14 Node test runner suites verifying date formatting, gamification algorithms, overdue calculations, and rubric assessment math.
  4. **Production Build**: `npm run build` compiles the React SPA via Vite into production-ready chunks under `dist/`.

### C. Job 3: `docker-ci`
- **Dependencies**: Requires both `backend-ci` and `frontend-ci` to pass.
- **Steps**:
  1. **Buildx Setup**: Uses `docker/setup-buildx-action@v3`.
  2. **Compose Validation**: Runs `docker compose config` against both `docker-compose.yml` and `docker-compose.prod.yml` to prevent syntax or topology regressions.
  3. **BuildKit Image Compilation**: Builds both backend and frontend container images using GitHub Actions caching (`type=gha`), validating that the Dockerfiles build cleanly in a fresh Linux environment without pushing to any registry.

---

## 3. Container Registry Release Workflow (`release.yml`)

When ready to publish a production container release:

1. **Authentication & Permissions**:
   - The workflow uses the built-in `${{ secrets.GITHUB_TOKEN }}`.
   - In GitHub repository settings under **Settings > Actions > General > Workflow permissions**, ensure:
     - Select **Read and write permissions** (or grant package write permissions).
   - Scoped strictly to `contents: read` and `packages: write` in the workflow file.
2. **Registry**: Images are pushed to GitHub Container Registry (`ghcr.io`):
   - `ghcr.io/<owner>/crewboard-backend`
   - `ghcr.io/<owner>/crewboard-frontend`
3. **Image Tagging Strategy**:
   - **Immutable Commit SHA**: `sha-<git-commit-sha>` (never overwritten; ideal for deterministic production rollbacks).
   - **Semantic Version**: `v1.0.0` (matching the release tag).
   - **Floating Tag**: `latest` (updated only when explicitly published from `main`).
4. **Publishing a Release**:
   - **Method A (Git Tag)**:
     ```bash
     git tag v1.0.0
     git push origin v1.0.0
     ```
   - **Method B (GitHub Actions UI)**:
     Navigate to **Actions > Crewboard Release & Container Registry Publishing > Run workflow**, input the version tag (e.g. `v1.0.0`), and click **Run workflow**.

---

## 4. Local Pre-Flight Verification

Before pushing code or opening a pull request, run the local equivalent of the CI pipeline:

```bash
# 1. Run Frontend Checks
cd frontend
npm run lint
npm test
npm run build
cd ..

# 2. Run Backend Tests
cd backend
pytest -v
cd ..

# 3. Validate Docker Compose
docker compose config
docker compose -f docker-compose.yml -f docker-compose.prod.yml config
```
