# Deployment Docker Setup

This document covers the real deployment workflow used by the project:

- local image build and push from the repository root
- server deployment from Docker Hub images

ModelForge is not part of production deployment at this time. It remains a local/development tool.

## Main files

- `docker-compose.dev.yml`: local development from source with hot reload
- `docker-compose.yml`: canonical production deployment compose copied to the server
- `.env.production.example`: template for the server-only runtime configuration
- `build_and_push.sh`: local build and push script
- `deploy.sh`: server deploy script
- `docker/`: service Dockerfiles and nginx config

## Frontend production behavior

The production frontend image is built with:

- `VITE_API_BACK=/api`
- `VITE_MODE=production`

Nginx serves the React build, applies React Router fallback with `try_files`, and proxies `/api/` to `http://backend:5000`.

Backend and DecisionModelsService are internal-only in production Compose. The only public HTTP entrypoint is `frontend` on host port `80`.

## Production runtime configuration

Production secrets and external configuration are injected into the backend at container
runtime from `.env.production` beside `docker-compose.yml` on the server. They are not
copied into or baked into Docker images.

The compose file keeps only non-secret, container-internal settings in version control:

- `NODE_ENV=production`
- `PORT=5000`
- `DECISION_MODELS_SERVICE_BASE_URL=http://decision-models-service:7000`

Do not commit real `.env` files or secrets. The root `.env.production` is ignored by Git and
excluded from Docker build contexts.

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

### One-time server setup

Create a deployment directory on the server containing only:

- `docker-compose.yml`
- `deploy.sh`
- `.env.production.example`

Create the server-only runtime file from the example, fill in the real production values,
and restrict it to the deployment operator:

```bash
cp .env.production.example .env.production
chmod 600 .env.production
chmod +x deploy.sh
```

The server does not need a source checkout. Keep `.env.production` only on the server; Docker
Compose injects it into the backend at runtime.

### Normal future deployments

Deploy or refresh from that folder with the same command every time:

```bash
./deploy.sh
```

The script checks that `.env.production` exists before it starts containers, then runs:

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
