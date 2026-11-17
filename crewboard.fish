#!/usr/bin/env fish
# ==============================================================================
# CREWBOARD — UNIFIED ONE-COMMAND DOCKER RUNNER
# ==============================================================================
# Fast, reliable management script for Crewboard Docker Compose services.
# Supports start, stop, restart, status, logs, build, rebuild, help.
#
# CRITICAL PRESERVATION GUARANTEES:
# - NEVER deletes or recreates Docker volumes (crewboard_pgdata, crewboard_uploads).
# - NEVER executes database reset, volume prune, or data-affecting commands.
# ==============================================================================

# Auto-resolve repository root regardless of current working directory
set -l SCRIPT_DIR (status dirname)
if test -z "$SCRIPT_DIR"; or test "$SCRIPT_DIR" = "."
    set SCRIPT_DIR (pwd)
end
cd "$SCRIPT_DIR"
set -l REPO_ROOT (pwd)

# ------------------------------------------------------------------------------
# Helper Functions & Environment Detection
# ------------------------------------------------------------------------------

function print_header
    echo ""
    echo "=================================================================="
    echo "  CREWBOARD — Academic Collaboration & Project Management"
    echo "=================================================================="
    echo ""
end

function check_prerequisites
    # 1. Verify Docker CLI is installed
    if not command -v docker >/dev/null 2>&1
        echo "Error: 'docker' CLI is not installed or not in PATH." >&2
        echo "Please install Docker before running Crewboard." >&2
        exit 1
    end

    # 2. Determine Docker execution wrapper (support user's sudo docker setup)
    set -g DOCKER_BIN docker
    if not docker info >/dev/null 2>&1
        # Check if sudo allows docker execution
        if command -v sudo >/dev/null 2>&1
            set -g DOCKER_BIN sudo docker
        else
            echo "Error: Docker requires elevated privileges but 'sudo' is not found." >&2
            exit 1
        end
    end

    # 3. Verify Docker daemon is running
    if not $DOCKER_BIN info >/dev/null 2>&1
        echo "Error: Cannot connect to the Docker daemon." >&2
        echo "Please ensure the Docker service is running (e.g. 'sudo systemctl start docker')." >&2
        exit 1
    end

    # 4. Determine Docker Compose command
    if $DOCKER_BIN compose version >/dev/null 2>&1
        set -g COMPOSE_BIN $DOCKER_BIN compose
    else if command -v docker-compose >/dev/null 2>&1
        if test "$DOCKER_BIN[1]" = "sudo"
            set -g COMPOSE_BIN sudo docker-compose
        else
            set -g COMPOSE_BIN docker-compose
        end
    else
        echo "Error: Neither 'docker compose' nor 'docker-compose' was found." >&2
        exit 1
    end

    # 5. Verify .env configuration exists
    if not test -f "$REPO_ROOT/.env"
        if test -f "$REPO_ROOT/.env.example"
            echo "[Notice] .env file not found. Creating from .env.example template..."
            cp "$REPO_ROOT/.env.example" "$REPO_ROOT/.env"
            echo "[Notice] Generated default .env file. Review .env for custom configuration."
        else
            echo "Error: Missing .env and .env.example in $REPO_ROOT" >&2
            exit 1
        end
    end
end

function wait_for_services
    echo "Waiting for services to become healthy..."

    # 1. Wait for PostgreSQL
    echo -n "  Checking PostgreSQL database container..."
    set -l db_ready 0
    for i in (seq 1 30)
        set -l health_status ($COMPOSE_BIN ps --format json db 2>/dev/null | grep -o '"Health":"[^"]*"' | cut -d'"' -f4)
        if test "$health_status" = "healthy"
            set db_ready 1
            break
        end
        # Fallback check via pg_isready inside container
        if $COMPOSE_BIN exec -T db pg_isready -U crewboard_user -d crewboard >/dev/null 2>&1
            set db_ready 1
            break
        end
        sleep 2
    end

    if test $db_ready -eq 1
        echo " [Ready]"
    else
        echo " [Timeout waiting for database]"
    end

    # 2. Wait for FastAPI backend health check
    echo -n "  Checking FastAPI backend API (/api/health)..."
    set -l backend_ready 0
    for i in (seq 1 35)
        set -l status_code (curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/api/health 2>/dev/null)
        if test "$status_code" = "200"
            set backend_ready 1
            break
        end
        sleep 2
    end

    if test $backend_ready -eq 1
        echo " [Healthy]"
    else
        echo " [Timeout waiting for backend API]"
    end

    # 3. Check React frontend availability
    echo -n "  Checking React + Vite frontend..."
    set -l frontend_ready 0
    for i in (seq 1 15)
        set -l status_code (curl -s -o /dev/null -w "%{http_code}" http://localhost:5173/ 2>/dev/null)
        if test "$status_code" = "200"; or test "$status_code" = "304"
            set frontend_ready 1
            break
        end
        sleep 2
    end

    if test $frontend_ready -eq 1
        echo " [Available]"
    else
        echo " [Frontend not responding on port 5173]"
    end
end

function print_urls
    echo ""
    echo "=================================================================="
    echo "  Crewboard is running and ready!"
    echo "=================================================================="
    echo "  - Frontend Application:  http://localhost:5173"
    echo "  - Backend API:           http://localhost:8000"
    echo "  - API Health Check:      http://localhost:8000/api/health"
    echo "  - Interactive API Docs:  http://localhost:8000/docs"
    echo "=================================================================="
    echo "  Data Safety: Named volumes (crewboard_pgdata, crewboard_uploads)"
    echo "  and all classroom demo data are fully preserved."
    echo "=================================================================="
    echo ""
end

# ------------------------------------------------------------------------------
# Command Handlers
# ------------------------------------------------------------------------------

set -l action $argv[1]

switch "$action"
    case "" start
        print_header
        check_prerequisites
        echo "Starting Crewboard services (building when needed)..."
        $COMPOSE_BIN up -d --build
        if test $status -ne 0
            echo "Error: Failed to start Docker Compose services." >&2
            exit 1
        end
        wait_for_services
        print_urls

    case stop
        print_header
        check_prerequisites
        echo "Stopping Crewboard services (preserving all database and upload volumes)..."
        $COMPOSE_BIN stop
        echo "All Crewboard services stopped safely."

    case restart
        print_header
        check_prerequisites
        echo "Restarting Crewboard services (preserving all persistent data)..."
        $COMPOSE_BIN restart
        wait_for_services
        print_urls

    case status
        print_header
        check_prerequisites
        echo "Service Container Status:"
        $COMPOSE_BIN ps
        echo ""
        echo "Live Health Probes:"
        set -l db_probe (curl -s http://localhost:8000/api/health 2>/dev/null)
        if test -n "$db_probe"
            echo "  - Backend & DB Health: $db_probe"
        else
            echo "  - Backend & DB Health: Offline or unreachable at http://localhost:8000/api/health"
        end

        set -l fe_code (curl -s -o /dev/null -w "%{http_code}" http://localhost:5173/ 2>/dev/null)
        if test "$fe_code" = "200"; or test "$fe_code" = "304"
            echo "  - Frontend Status:     HTTP $fe_code (Healthy)"
        else
            echo "  - Frontend Status:     HTTP $fe_code (Unreachable on port 5173)"
        end
        echo ""

    case logs
        check_prerequisites
        set -l service $argv[2]
        if test -n "$service"
            if test "$service" = "db"
                echo "Viewing PostgreSQL logs (filtering sensitive patterns)..."
                $COMPOSE_BIN logs -f --tail=100 db | grep -v -i -E "password|secret|token"
            else
                echo "Viewing $service logs..."
                $COMPOSE_BIN logs -f --tail=100 $service
            end
        else
            echo "Viewing logs for all services (Ctrl+C to exit)..."
            $COMPOSE_BIN logs -f --tail=100
        end

    case build
        print_header
        check_prerequisites
        echo "Building Crewboard Docker images..."
        $COMPOSE_BIN build
        echo "Build completed successfully."

    case rebuild
        print_header
        check_prerequisites
        echo "Rebuilding and restarting Crewboard services (preserving all persistent data)..."
        $COMPOSE_BIN build --no-cache
        $COMPOSE_BIN up -d
        wait_for_services
        print_urls

    case help "-h" "--help"
        print_header
        echo "Usage: ./crewboard.fish [COMMAND]"
        echo ""
        echo "Commands:"
        echo "  start               Build when needed and start full application (default)"
        echo "  stop                Stop application containers without deleting volumes"
        echo "  restart             Restart application services without losing data"
        echo "  status              Display container status, uptime and live health probes"
        echo "  logs [service]      View logs (all services or: backend, frontend, db)"
        echo "  build               Build or update Docker images"
        echo "  rebuild             Rebuild images from scratch and restart services"
        echo "  help                Display this documentation"
        echo ""
        echo "Examples:"
        echo "  ./crewboard.fish              # Starts the complete stack"
        echo "  ./crewboard.fish status       # Checks container health and endpoints"
        echo "  ./crewboard.fish logs backend # Follows backend API logs"
        echo "  ./crewboard.fish stop         # Gracefully stops containers"
        echo ""
        echo "Data Safety:"
        echo "  Persistent named volumes 'crewboard_pgdata' and 'crewboard_uploads'"
        echo "  are never modified, wiped or removed by this script."
        echo ""

    case "*"
        echo "Error: Unknown command '$action'." >&2
        echo "Run './crewboard.fish help' for available commands." >&2
        exit 1
end
