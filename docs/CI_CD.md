# Crewboard — Continuous Integration & Continuous Delivery (CI/CD) Guide

This document describes the automated testing, verification, container packaging, and production continuous delivery pipelines implemented for **Crewboard** using GitHub Actions and GitHub Container Registry (GHCR).

---

## 1. CI/CD Pipeline Architecture

The release automation system consists of three dedicated, loosely-coupled GitHub Actions workflows:

1. **Continuous Integration (`.github/workflows/ci.yml`)**:
   - Executes automatically on every `push` to `main`, `pull_request` targeting `main`, or manual `workflow_dispatch`.
   - Validates code quality, runs test suites, checks Alembic migration consistency, validates Docker Compose topologies, and builds test container images with BuildKit.
   - **Never pushes container images or deploys during PR or commit checks.**

2. **Container Registry Release (`.github/workflows/release.yml`)**:
   - Executes on semantic version tags (`v*.*.*`) or manual `workflow_dispatch`.
   - **Gated behind prerequisite CI verification**: Backend tests, Alembic heads check, frontend tests, ESLint, Vite build, and Compose topologies must pass before image compilation.
   - Builds production container images for backend and frontend using BuildKit.
   - Publishes signed, tagged images to **GitHub Container Registry (GHCR)** (`ghcr.io`).

3. **Production Continuous Delivery (`.github/workflows/deploy.yml`)**:
   - **Manual execution only** via `workflow_dispatch` with an explicit target tag (e.g. `v1.0.0` or `sha-b60f1a2`).
   - Supports protected **GitHub Environment** approvals (e.g. `production` with required manual reviewer sign-off).
   - Executes a safe, planned-cutover deployment over secure SSH: creates an automated PostgreSQL database backup, pulls target images from GHCR, applies Alembic migrations, verifies health checks, and automatically rolls back if health checks fail. Single-node cutover window is ~5–15s during container restart.

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
  │                              │                              │
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
                                 ▼ (Release Tag v*.*.* or Dispatch)
  ┌─────────────────────────────────────────────────────────────┐
  │                 Release Pipeline (GHCR)                     │
  │  - Pre-flight CI Gate (backend + frontend + compose checks) │
  │  - Authenticate with GitHub Container Registry              │
  │  - Tag with Immutable Commit SHA (sha-xxxx)                 │
  │  - Tag with Semantic Version (v1.0.0) & latest              │
  │  - Push Images to ghcr.io/sanjay-h-08/crewboard-*           │
  └─────────────────────────────────────────────────────────────┘
                                 │
                                 ▼ (Manual Dispatch + Environment Approval)
  ┌─────────────────────────────────────────────────────────────┐
  │            Continuous Delivery Pipeline (deploy.yml)        │
  │  - SSH to Production VPS with Host Fingerprint Verification │
  │  - Pre-Deployment PostgreSQL Backup (scripts/backup.sh)     │
  │  - Pull Target Immutable Images from GHCR                   │
  │  - Safe Alembic Migration Upgrade                           │
  │  - Container Restart with Caddy Edge TLS Gateway            │
  │  - Health Check Probes (backend, frontend, caddy)           │
  │  - Automated Rollback on Failure (scripts/rollback.sh)      │
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

When a semantic version tag (e.g., `v1.0.0`) is pushed or the workflow is manually triggered:

1. **Validation Gates**: The workflow automatically executes `validate-backend`, `validate-frontend`, and `validate-docker-compose`. If any unit test, linter, or Compose configuration fails, the release **aborts immediately** without publishing images.
2. **Authentication & Permissions**:
   - The workflow uses the built-in `${{ secrets.GITHUB_TOKEN }}`.
   - Permissions are strictly minimized to `contents: read` and `packages: write`.
3. **Registry & Image Names**:
   Images are pushed to GitHub Container Registry (`ghcr.io`):
   - `ghcr.io/sanjay-h-08/crewboard-backend`
   - `ghcr.io/sanjay-h-08/crewboard-frontend`
4. **Image Tagging Strategy**:
   - **Immutable Commit SHA**: `sha-<git-commit-sha>` (never overwritten; ideal for deterministic production rollbacks).
   - **Semantic Version**: `v1.0.0` (matching the release tag).
   - **Floating Tag**: `latest` (updated only for official releases).
5. **Publishing a Release**:
   - **Method A (Git Tag)**:
     ```bash
     git tag v1.0.0
     git push origin v1.0.0
     ```
   - **Method B (GitHub Actions UI)**:
     Navigate to **Actions > Crewboard Release & Container Registry Publishing > Run workflow**, input the version tag (e.g. `v1.0.0`), select whether to tag as `latest`, and click **Run workflow**.

---

## 4. Production Continuous Delivery Workflow (`deploy.yml`)

The CD workflow automates deploying approved releases to your target host. It is never triggered automatically on push, guaranteeing that production deployments remain deliberate and controlled.

### Triggering a Deployment
1. In GitHub, navigate to **Actions > Crewboard Production Continuous Delivery (CD)**.
2. Click **Run workflow**.
3. Select inputs:
   - **Release Version Tag or Git SHA**: e.g., `v1.0.0` or `sha-b60f1a2`.
   - **Target Deployment Environment**: `production` (default) or `staging`.
   - **Create automated PostgreSQL database backup**: `true` (recommended).
4. Click **Run workflow**. If a protected GitHub Environment is configured, required reviewers will be prompted to approve the deployment.

### Required GitHub Secrets & Variables
To enable automated SSH deployment, configure the following secrets under **Settings > Secrets and variables > Actions** (or within the `production` Environment):

| Secret Name | Description | Example / Format |
| :--- | :--- | :--- |
| `SSH_PRIVATE_KEY` | Private SSH key of the deploy user | `-----BEGIN OPENSSH PRIVATE KEY-----...` |
| `DEPLOY_HOST` | Public IP or hostname of production server | `203.0.113.10` or `crewboard.yourdomain.edu` |
| `DEPLOY_USER` | Non-root deployment user on the server | `deploy` or `ubuntu` |
| `DEPLOY_PORT` | SSH port (defaults to 22) | `22` |
| `DEPLOY_PATH` | Installation path on production server | `/opt/crewboard` |
| `DOMAIN` | Production domain name for TLS and CORS | `crewboard.yourdomain.edu` |
| `SSH_KNOWN_HOSTS` | Target server SSH host key fingerprint | `crewboard.yourdomain.edu ssh-ed25519 AAAAC3...` |
| `GHCR_TOKEN` | Personal Access Token with `read:packages` scope | `ghp_...` (or repository GITHUB_TOKEN) |

---

## 5. Local Pre-Flight Verification

Before pushing code or creating a release tag, run the local equivalent of the CI pipeline:

```bash
# 1. Run Frontend Checks
cd frontend
npm ci
npm run lint
npm test
npm run build
cd ..

# 2. Run Backend Tests (inside Docker or Python virtualenv)
pytest -v backend/tests

# 3. Validate Docker Compose Topologies
docker compose config
docker compose -f docker-compose.yml -f docker-compose.prod.yml config

# 4. Validate Shell and Operations Scripts
bash -n scripts/deploy.sh
bash -n scripts/rollback.sh
bash -n scripts/backup.sh
```
