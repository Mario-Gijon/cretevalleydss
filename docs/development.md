# Development Docker Setup

This document covers the local development workflow only.

For production-style local testing and server deployment, see [deployment.md](./deployment.md).

## Workflow

Run the full local stack with Docker:

```bash
docker compose -f docker-compose.dev.yml up --build
```

This workflow builds from local source code and keeps the normal development setup:

- Frontend dev server on http://localhost:5173
- Backend API on http://localhost:5000/api
- DecisionModelsService on http://localhost:7000
- ModelForge on http://localhost:7100

Inside Docker networking:

- Backend calls DMS at `http://decision-models-service:7000`
- Backend calls ModelForge at `http://model-forge:7100`
- Frontend dev calls backend with `VITE_API_BACK=http://localhost:5000/api`

## Required env files

Create the local development env files from the safe examples:

```bash
cp Backend/.env.example Backend/.env
cp Frontend/.env.development.example Frontend/.env.development
```

Fill `Backend/.env` locally with your own credentials. Never commit `.env` files.

## Common commands

Start:

```bash
docker compose -f docker-compose.dev.yml up --build
```

Restart without rebuilding:

```bash
docker compose -f docker-compose.dev.yml up
```

Stop:

```bash
docker compose -f docker-compose.dev.yml down
```

Rebuild after dependency or Dockerfile changes:

```bash
docker compose -f docker-compose.dev.yml build --no-cache
```

## Logs

```bash
docker compose -f docker-compose.dev.yml logs -f frontend
docker compose -f docker-compose.dev.yml logs -f backend
docker compose -f docker-compose.dev.yml logs -f decision-models-service
docker compose -f docker-compose.dev.yml logs -f model-forge
```

## Optional health checks

```bash
curl http://localhost:5000/api/health
curl http://localhost:7000/health
curl http://localhost:7100/health
```

## Notes

Hot reload should work through the existing bind mounts and containerized dependency folders.

If you pull new changes that affect dependencies or Dockerfiles, rerun with `--build`.
