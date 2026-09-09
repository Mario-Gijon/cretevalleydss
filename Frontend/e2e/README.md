# Playwright E2E

The E2E stack is deliberately separate from normal development. It never reads `Backend/.env`, uses the compose-private `mongo-e2e` host, and only connects to the `cretevalley_e2e` database.

## One-time setup

From `Frontend`, install the committed dependencies and Chromium:

```bash
bun install
bunx playwright install chromium
```

## Run the authentication smoke test

From the repository root, start the isolated stack:

```bash
docker compose -f docker-compose.e2e.yml up --build -d
docker compose -f docker-compose.e2e.yml exec backend-e2e bun run seed:e2e:auth
```

Then, from `Frontend`, run:

```bash
bun run test:e2e
```

For a visible browser session:

```bash
bun run test:e2e:headed
```

The smoke test uses only `auth.smoke@example.test`; the seed command is idempotent and refuses to run unless `NODE_ENV=e2e`, `E2E_ISOLATED_STACK=true`, the database is exactly `cretevalley_e2e`, and MongoDB is the compose-only `mongo-e2e` host.

## Teardown

Remove the isolated services and their E2E-only MongoDB volume:

```bash
docker compose -f docker-compose.e2e.yml down --volumes --remove-orphans
```

The current stack starts MongoDB, Backend, and Frontend. DecisionModelsService is intentionally not started for this authentication-only smoke test; it can be added to this dedicated compose stack when later golden-path coverage needs model execution.
