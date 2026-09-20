#!/usr/bin/env bash
set -euo pipefail

# Guard against two deploys running concurrently. A real failure caught
# live: a manually-triggered run and a CI-triggered run overlapped, both
# running `npm ci` in wedhub-backend at the same time — one of them won
# the race and left node_modules mid-install, so `express` itself was
# briefly missing and wedhub-api crash-looped with MODULE_NOT_FOUND
# despite the deploy otherwise "succeeding". flock makes a second
# concurrent run wait for the first to finish instead of corrupting
# shared node_modules/dist output.
LOCKFILE=/tmp/wedhub-deploy.lock
exec 9>"$LOCKFILE"
if ! flock -w 300 9; then
  echo "Another deploy is already running and didn't finish within 300s — aborting." >&2
  exit 1
fi

clean_untracked_conflicts() {
  local target_dir="$1"
  cd "$target_dir"
  while IFS= read -r path; do
    if git cat-file -e "origin/main:$path" 2>/dev/null; then
      echo "Removing untracked $path in $target_dir — origin/main will add it as a tracked file"
      rm -f "$path"
    fi
  done < <(git ls-files --others --exclude-standard)
}

wait_for_health() {
  local url="$1"
  local label="$2"
  for _ in $(seq 1 15); do
    if curl -sf "$url" > /dev/null; then
      echo "$label is healthy"
      return 0
    fi
    sleep 2
  done
  echo "$label failed to become healthy within 30s" >&2
  return 1
}

echo "=== 1/2: Deploying Production (itsmykalyanam.com -> wedhub_prod) ==="
cd /opt/wedhub
git fetch origin main
clean_untracked_conflicts "/opt/wedhub"
git pull origin main

echo "--- Deploying Production Database Migrations & Building Backend ---"
cd /opt/wedhub/wedhub-backend
npm ci
npx prisma migrate deploy
npm run build

echo "--- Building Production Frontend ---"
cd /opt/wedhub/wedhub-frontend-app
npm ci
npm run build

echo "--- Restarting Production Services in PM2 ---"
pm2 restart /opt/wedhub/ecosystem.config.js

# Deploy Test Environment if present
if [ -d "/opt/wedhub-test" ]; then
  echo "=== 2/2: Deploying Test Environment (test.itsmykalyanam.com -> wedhub_test) ==="
  cd /opt/wedhub-test
  git fetch origin main
  clean_untracked_conflicts "/opt/wedhub-test"
  git pull origin main

  echo "--- Deploying Test Database Migrations & Building Backend ---"
  cd /opt/wedhub-test/wedhub-backend
  npm ci
  npx prisma migrate deploy
  npm run build

  echo "--- Building Test Frontend ---"
  cd /opt/wedhub-test/wedhub-frontend-app
  npm ci
  npm run build

  echo "--- Restarting Test Services in PM2 ---"
  pm2 restart /opt/wedhub-test/ecosystem.test.config.js
fi

echo "=== Health Checking Services ==="
wait_for_health http://127.0.0.1:4000/health "Production Backend"
wait_for_health http://127.0.0.1:3000/ "Production Frontend"

if [ -d "/opt/wedhub-test" ]; then
  wait_for_health http://127.0.0.1:4001/health "Test Backend"
  wait_for_health http://127.0.0.1:3001/ "Test Frontend"
fi

echo "Deploy complete and healthy across both production and test environments"
