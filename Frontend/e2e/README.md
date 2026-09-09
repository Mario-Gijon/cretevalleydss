# Playwright E2E

The E2E stack is deliberately separate from normal development. It never reads `Backend/.env`, uses the compose-private `mongo-e2e` host, and only connects to the `cretevalley_e2e` database.

## One-time setup

From `Frontend`, install the committed dependencies and Chromium:

```bash
bun install
bunx playwright install chromium
```

## Run the golden-path smoke tests

From the repository root, start the isolated stack:

```bash
docker compose -f docker-compose.e2e.yml up --build -d
docker compose -f docker-compose.e2e.yml exec backend-e2e bun run seed:e2e:auth
docker compose -f docker-compose.e2e.yml exec backend-e2e bun run seed:e2e:create-issue
```

Then, from `Frontend`, run:

```bash
bun run test:e2e
```

For a visible browser session:

```bash
bun run test:e2e:headed
```

The authentication smoke test uses `auth.smoke@example.test`. The create-issue smoke test also uses the isolated `issue.expert@example.test`, `E2E Matrix Model`, and `E2E Numeric 0-10` fixtures. Both seed commands are idempotent and refuse to run unless `NODE_ENV=e2e`, `E2E_ISOLATED_STACK=true`, the database is exactly `cretevalley_e2e`, and MongoDB is the compose-only `mongo-e2e` host.

Coverage: authentication verifies login and logout; issue creation verifies a logged-in owner can select the seeded model and domain, add alternatives, a criterion, and an expert, then create an active issue.

## Teardown

Remove the isolated services and their E2E-only MongoDB volume:

```bash
docker compose -f docker-compose.e2e.yml down --volumes --remove-orphans
```

The current stack starts MongoDB, Backend, and Frontend. DecisionModelsService is intentionally not started: the seeded `E2E Matrix Model` does not use criteria or expert weighting and this smoke flow stops after issue creation, before model execution.
