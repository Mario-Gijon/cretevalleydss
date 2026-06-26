#!/usr/bin/env bash
set -euo pipefail

sudo docker-compose pull
sudo docker-compose up -d --remove-orphans
sudo docker-compose ps
