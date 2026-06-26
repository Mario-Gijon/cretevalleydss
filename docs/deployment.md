# Deployment Docker Setup

This document covers the production-style Docker workflows:

- local production-style image test
- server deployment from Docker Hub images

ModelForge is not part of production deployment at this time. It remains a local/development tool.

## Compose files

- `docker-compose.dev.yml`: local development from source with hot reload
- `docker-compose.yml`: local production-style test build from source
- `cretevalley-docker-compose.yml`: server deployment from Docker Hub images

## Frontend production behavior

The production frontend image is built with:

- `VITE_API_BACK=/api`
- `VITE_MODE=production`

Nginx serves the React build, applies React Router fallback with `try_files`, and proxies `/api/` to `http://backend:5000`.

Backend and DecisionModelsService are internal-only in production Compose. The only public HTTP entrypoint is `frontend` on host port `80`.

## Required env files

Local production-style test:

```bash
cp Backend/.env.production.example Backend/.env.production
```

Server deployment:

- `Backend/.env.production` must exist on the server with real production values

Do not commit real `.env` files or secrets.

## Local production-style test

Build the production images locally and run them with Compose:

```bash
docker compose -f docker-compose.yml up --build
```

This is useful to verify the Nginx frontend plus internal backend/DMS networking before pushing images.

## Build and push images

Use the repository script:

```bash
./docker/scripts/build-and-push.sh
```

By default it builds and pushes:

- `mariogijon/cretevalleydss_backend:latest`
- `mariogijon/cretevalleydss_frontend:latest`
- `mariogijon/cretevalleydss_decision-models-service:latest`

You can override the Docker Hub namespace or project prefix with:

```bash
DOCKERHUB_USER=myuser DOCKER_PROJECT=cretevalleydss ./docker/scripts/build-and-push.sh
```

## Server deployment

Deploy or refresh the server with:

```bash
./docker/scripts/deploy-server.sh
```

That script runs:

```bash
docker compose -f cretevalley-docker-compose.yml pull
docker compose -f cretevalley-docker-compose.yml up -d --remove-orphans
docker compose -f cretevalley-docker-compose.yml ps
```

It does not remove volumes and is safe for repeated deployments.

## Service layout

- `frontend`: public Nginx container on port `80`
- `backend`: internal Express API on port `5000`
- `decision-models-service`: internal FastAPI service on port `7000`

Backend calls DMS internally at `http://decision-models-service:7000`.
