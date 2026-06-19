# Development Docker Setup

This setup is for local development only.

The existing deployment Docker files remain separate and untouched:

- `docker-compose.yml`
- `cretevalley-docker-compose.yml`
- `Dockerfile.frontend`
- `Dockerfile.backend`
- `Dockerfile.decision-models-service`

## Prerequisites

- Docker
- Docker Compose

## First setup

Copy the safe example files and create your local env files:

```bash
cp Backend/.env.example Backend/.env
cp Frontend/.env.development.example Frontend/.env.development
```

Fill `Backend/.env` locally with your real credentials.

Never commit `.env` files.

## Start the development stack

```bash
docker compose -f docker-compose.dev.yml up --build
```

Open:

- Frontend: http://localhost:5173
- Backend API: http://localhost:5000/api
- DecisionModelsService: http://localhost:7000

## Normal restart

```bash
docker compose -f docker-compose.dev.yml up
```

## Stop the stack

```bash
docker compose -f docker-compose.dev.yml down
```

## Rebuild after dependency or Dockerfile changes

```bash
docker compose -f docker-compose.dev.yml build --no-cache
```

## Logs

```bash
docker compose -f docker-compose.dev.yml logs -f backend
docker compose -f docker-compose.dev.yml logs -f frontend
docker compose -f docker-compose.dev.yml logs -f decision-models-service
```

## Hot reload

Normal source-code changes should hot reload without rebuilding.

Dependency changes require rebuilds.

## Update flow

```bash
git pull
docker compose -f docker-compose.dev.yml up
```

If dependencies or Dockerfiles changed, use:

```bash
docker compose -f docker-compose.dev.yml up --build
```
