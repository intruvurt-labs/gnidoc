#!/usr/bin/env bash
set -euo pipefail

if ! command -v docker >/dev/null; then
  curl -fsSL https://get.docker.com | sh
fi
if ! docker compose version >/dev/null 2>&1; then
  apt-get update && apt-get install -y docker-compose-plugin
fi

docker compose up -d

if command -v ufw >/dev/null; then
  ufw allow 80 || true
  ufw allow 443 || true
fi
