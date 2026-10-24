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

## Run the TOPSIS-Sort rich Finished Issue visual test

The Scenario Lab scenario creates and records the finished Issue in a separate
E2E manifest. Playwright reads the latest `topsis-sort-2016-rich` entry, checks
its stored matrices, MCC weights and assignments, then validates the Finished
Issue at desktop and mobile viewports. It does not depend on a fixed MongoDB ID
or delete generations. Start the isolated stack and seed its fixtures:

```bash
docker compose -f docker-compose.e2e.yml up --build -d
docker compose -f docker-compose.e2e.yml exec backend-e2e bun run seed:e2e:auth
docker compose -f docker-compose.e2e.yml exec backend-e2e bun run seed:e2e:create-issue
docker compose -f docker-compose.e2e.yml exec backend-e2e bun run seed:e2e:topsis-sort-rich
```

Keep Scenario Lab credentials in the ignored
`Automation/issue_scenario_lab/.issue-scenario-lab/users.e2e.rich.local.yaml`.
It can copy the existing `users.e2e.local.yaml` entries and add `expert_c` and
`expert_d` with the E2E-only accounts seeded by `seed:e2e:topsis-sort-rich`.
Generate a fresh Issue into a dedicated E2E manifest:

```bash
cd Automation/issue_scenario_lab
SCENARIO_LAB_API_BASE_URL=http://localhost:5001/api \
SCENARIO_LAB_USERS_FILE=.issue-scenario-lab/users.e2e.rich.local.yaml \
SCENARIO_LAB_MANIFEST_FILE="$PWD/.issue-scenario-lab/manifest.e2e.json" \
DECISION_MODELS_PYTHON=../../DecisionModelsService/.venv/bin/python \
.venv/bin/python -m issue_scenario_lab generate topsis-sort-2016-rich
```

Run desktop and mobile Chromium checks from `Frontend`. Set the E2E manifest path
for Playwright too. The standard E2E port is 5174; if another local service owns
it, serve `frontend-e2e` on an available port such as 5175 and set
`E2E_BASE_URL` accordingly.

```bash
cd ../../Frontend
SCENARIO_LAB_MANIFEST_FILE="$PWD/../Automation/issue_scenario_lab/.issue-scenario-lab/manifest.e2e.json" \
E2E_BASE_URL=http://localhost:5174 \
bun run test:e2e -- e2e/topsisSortFinishedIssue.spec.js
```

## Teardown

Remove the isolated services and their E2E-only MongoDB volume:

```bash
docker compose -f docker-compose.e2e.yml down --volumes --remove-orphans
```

The isolated stack starts MongoDB, Backend, Frontend, and DecisionModelsService.
The TOPSIS-Sort runtime opt-in exists only in this E2E stack; the normal model
definition remains disabled outside it.
