#!/usr/bin/env bash
set -euo pipefail

if [[ ! -f .env.production ]]; then
  echo "Missing .env.production. Copy .env.production.example to .env.production and configure it before deploying." >&2
  exit 1
fi

sudo docker-compose pull
sudo docker-compose up -d --remove-orphans
sudo docker-compose ps
