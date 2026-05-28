#!/usr/bin/env bash
# deploy-vps.sh — First-run + update deploy script for VPS production
# Usage:
#   First deploy:  bash scripts/deploy-vps.sh --first-run
#   Update deploy: bash scripts/deploy-vps.sh
#
# Prerequisites on VPS:
#   - Docker + Docker Compose v2
#   - /opt/batarasec-portal/.env already populated (see gen-secrets.sh)
#   - SSH access as ubuntu (key: ~/.ssh/batarasec_portal_prod)
#   - Git installed on VPS
#
# Run from LOCAL machine (WSL):
#   ssh batarasec-portal-prod 'bash -s' < scripts/deploy-vps.sh
set -euo pipefail

REPO_URL="https://github.com/novanovn/batarasec-portal.git"
DEPLOY_DIR="/opt/batarasec-portal"
BRANCH="main"
FIRST_RUN="${1:-}"

echo "=== BataraSec Portal VPS Deploy ==="
echo "Target: $DEPLOY_DIR | Branch: $BRANCH"
date -u

# --- 1. Clone or pull repo ---
if [ ! -d "$DEPLOY_DIR/.git" ]; then
  echo ">>> Cloning repo..."
  sudo git clone --branch "$BRANCH" "$REPO_URL" "$DEPLOY_DIR"
  sudo chown -R ubuntu:ubuntu "$DEPLOY_DIR"
else
  echo ">>> Pulling latest from $BRANCH..."
  cd "$DEPLOY_DIR"
  git fetch origin
  git checkout "$BRANCH"
  git pull origin "$BRANCH"
fi

cd "$DEPLOY_DIR"

# --- 2. Verify .env exists ---
if [ ! -f "$DEPLOY_DIR/.env" ]; then
  echo "ERROR: .env not found at $DEPLOY_DIR/.env"
  echo "Run gen-secrets.sh, populate .env, then retry."
  exit 1
fi

echo ">>> .env found."

# --- 3. Build and start containers ---
echo ">>> Building Docker images and starting services..."
docker compose down --remove-orphans || true
docker compose up -d --build

# --- 4. Wait for postgres to be healthy ---
echo ">>> Waiting for PostgreSQL to be healthy..."
for i in $(seq 1 20); do
  if docker compose exec -T postgres pg_isready -U batarasec_portal -d batarasec_portal > /dev/null 2>&1; then
    echo "    PostgreSQL healthy after ${i}s"
    break
  fi
  sleep 1
done

# --- 5. Run migrations ---
echo ">>> Running DB migrations..."
docker compose exec -T portal pnpm db:migrate

# --- 6. Seed admin (first run only, idempotent) ---
if [ "$FIRST_RUN" = "--first-run" ]; then
  echo ">>> Seeding admin account..."
  docker compose exec -T portal pnpm seed
fi

# --- 7. Verify portal health ---
echo ">>> Verifying portal health endpoint..."
sleep 2
HEALTH=$(docker compose exec -T portal wget -qO- http://localhost:4000/api/health 2>/dev/null || echo "FAIL")

if echo "$HEALTH" | grep -q '"status":"ok"'; then
  echo "    Portal health check: OK"
else
  echo "    Portal health check: FAIL — response: $HEALTH"
  exit 1
fi

# --- 8. Verify MinIO health ---
echo ">>> Verifying MinIO..."
for i in $(seq 1 15); do
  if docker compose exec -T minio mc ready local > /dev/null 2>&1; then
    echo "    MinIO healthy after ${i}s"
    break
  fi
  sleep 1
done

# --- 9. Run deploy:check ---
echo ">>> Running deploy:check..."
docker compose exec -T portal pnpm deploy:check

echo ""
echo "=== Deploy complete ==="
echo "Portal   : http://localhost:4000 (Docker internal)"
echo "MinIO API: http://localhost:9000 (Docker internal)"
echo "MinIO UI : http://localhost:9001 (Docker internal)"
echo ""
echo "Next: setup Nginx → https://portal.batarasec.com"
echo "  Portal  : https://portal.batarasec.com/"
echo "  MinIO UI: https://portal.batarasec.com/storage/"
echo "  MinIO S3: https://portal.batarasec.com/s3/"
echo ""
echo "Smoke test after Nginx:"
echo "  curl https://portal.batarasec.com/api/health"
