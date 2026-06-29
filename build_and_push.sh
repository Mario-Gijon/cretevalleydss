#!/usr/bin/env bash
set -euo pipefail

DOCKERHUB_USER="${DOCKERHUB_USER:-mariogijon}"
DOCKER_PROJECT="${DOCKER_PROJECT:-cretevalleydss}"

SERVICES=(
  "backend:docker/backend/Dockerfile"
  "frontend:docker/frontend/Dockerfile"
  "decision-models-service:docker/decision-models-service/Dockerfile"
)

for entry in "${SERVICES[@]}"; do
  service="${entry%%:*}"
  dockerfile="${entry#*:}"
  image="${DOCKERHUB_USER}/${DOCKER_PROJECT}_${service}:latest"

  echo "Building ${image} with ${dockerfile}"
  docker build -f "${dockerfile}" -t "${image}" .

  echo "Pushing ${image}"
  docker push "${image}"
done
