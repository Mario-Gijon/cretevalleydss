# Deployment Docker Setup

This document covers the real deployment workflow used by the project:

- local image build and push from the repository root
- server deployment from Docker Hub images

ModelForge is not part of production deployment at this time. It remains a local/development tool.

## Main files

- `docker-compose.dev.yml`: local development from source with hot reload
- `docker-compose.yml`: production deployment compose copied to the server
- `build_and_push.sh`: local build and push script
- `deploy.sh`: server deploy script
- `docker/`: service Dockerfiles and nginx config

## Frontend production behavior

The production frontend image is built with:

- `VITE_API_BACK=/api`
- `VITE_MODE=production`

Nginx serves the React build, applies React Router fallback with `try_files`, and proxies `/api/` to `http://backend:5000`.

Backend and DecisionModelsService are internal-only in production Compose. The only public HTTP entrypoint is `frontend` on host port `80`.

## Required env files

Local build machine:

- `Frontend/.env.production`
- `Backend/.env.production`

Those files are configured locally before building and pushing images.

Server deployment:

- no `.env.production` file is required on the server in the current workflow

Do not commit real `.env` files or secrets.

## Build and push images

Use the repository script:

```bash
./build_and_push.sh
```

By default it builds and pushes:

- `mariogijon/cretevalleydss_backend:latest`
- `mariogijon/cretevalleydss_frontend:latest`
- `mariogijon/cretevalleydss_decision-models-service:latest`

You can override the Docker Hub namespace or project prefix with:

```bash
DOCKERHUB_USER=myuser DOCKER_PROJECT=cretevalleydss ./build_and_push.sh
```

## Server deployment

The server folder only needs:

- `docker-compose.yml`
- `deploy.sh`

Deploy or refresh from that folder with:

```bash
./deploy.sh
```

That script runs:

```bash
sudo docker-compose pull
sudo docker-compose up -d --remove-orphans
sudo docker-compose ps
```

It does not remove volumes and is safe for repeated deployments.

## Service layout

- `frontend`: public Nginx container on port `80`
- `backend`: internal Express API on port `5000`
- `decision-models-service`: internal FastAPI service on port `7000`

Backend calls DMS internally at `http://decision-models-service:7000`.
