#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

git pull --ff-only

# The frontend build context points to GitHub, so --no-cache makes each deploy
# fetch and rebuild the latest frontend main branch as well.
docker compose build --pull --no-cache
docker compose up -d --remove-orphans
docker compose ps
