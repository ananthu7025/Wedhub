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

cd /opt/wedhub
git fetch origin main

# Guard against the exact failure this hit twice: a file was scp'd directly
# onto the server before being committed, so a later `git pull` bringing in
# the same path as a real commit gets refused ("untracked working tree
# files would be overwritten by merge"). Only removes a currently-untracked
# path that origin/main is about to add as a tracked file — never touches
# any other untracked file.
while IFS= read -r path; do
  if git cat-file -e "origin/main:$path" 2>/dev/null; then
    echo "Removing untracked $path — origin/main will add it as a tracked file"
    rm -f "$path"
  fi
done < <(git ls-files --others --exclude-standard)

git pull origin main

cd /opt/wedhub/wedhub-backend
npm ci
npx prisma migrate deploy
npm run build

cd /opt/wedhub/wedhub-frontend-app
npm ci
npm run build

# Use `restart`, not `reload`, for every app here. `reload` was found live
# to silently no-op on this fork-mode setup — wedhub-web sat on a stale
# build for 45+ minutes with 0 recorded restarts, and separately
# wedhub-api kept serving pre-RBAC-enforcement code for hours after a
# "successful" reload + passing health check, masking a real access-control
# bug. `restart` is a few seconds of downtime per app but is the only mode
# confirmed to actually replace the running process on this setup.
#
# `pm2 restart <name>` only restarts the already-running process with
# whatever options it started with (or was last resurrected with) — it does
# NOT re-read ecosystem.config.js, so a config change like kill_timeout
# below would silently never take effect on a live server. Restarting by
# the ecosystem file instead applies its options on every deploy. This is
# also what fixed wedhub-worker being SIGKILLed mid-job on nearly every
# deploy: PM2's default 1600ms kill_timeout was far shorter than the up to
# ~12s a single media-processing job (media-processing.processor.ts) can
# take, so its graceful-shutdown drain (worker.ts) never got to finish
# before being killed, permanently orphaning that job's Media row at
# status PENDING/PROCESSING.
pm2 restart /opt/wedhub/ecosystem.config.js

# Poll instead of a single fixed-delay check — gives a slower-than-usual
# cold start room to finish instead of failing a deploy that actually
# succeeded (all 3 processes really did restart onto new code, just
# weren't done initializing yet).
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

wait_for_health http://127.0.0.1:4000/health "Backend"
wait_for_health http://127.0.0.1:3000/ "Frontend"

echo "Deploy complete and healthy"
