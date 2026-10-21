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

## Run the TOPSIS-Sort Finished Issue visual test

The Scenario Lab scenario creates and records the finished Issue. The Playwright
test only reads the latest `topsis-sort-2016` entry from its local manifest; it
does not create or delete Issues and does not depend on a MongoDB ID. First start
the isolated E2E stack and seed its existing users, model catalog, and numeric
domain using the commands above. Keep the existing ignored Scenario Lab user
configuration at `Automation/issue_scenario_lab/.issue-scenario-lab/users.e2e.local.yaml`.

Generate a current finished Issue from the repository root:

```bash
cd Automation/issue_scenario_lab
SCENARIO_LAB_API_BASE_URL=http://localhost:5001/api \
SCENARIO_LAB_USERS_FILE=.issue-scenario-lab/users.e2e.local.yaml \
python -m issue_scenario_lab generate topsis-sort-2016
```

Then run the desktop and mobile Chromium checks from `Frontend`:

```bash
cd ../../Frontend
bun run test:e2e -- e2e/topsisSortFinishedIssue.spec.js
```

The test logs in with the existing E2E authentication helper, opens Finished
Issues, finds the newest Scenario Lab generation, and checks the sorting card,
category assignments, dialog sections, unavailable ranking analysis, console
errors, failed requests and HTTP responses, and mobile overflow. It does not
modify the manifest or clean up existing generations.

## Teardown

Remove the isolated services and their E2E-only MongoDB volume:

```bash
docker compose -f docker-compose.e2e.yml down --volumes --remove-orphans
```

The isolated stack starts MongoDB, Backend, Frontend, and DecisionModelsService.
The TOPSIS-Sort runtime opt-in exists only in this E2E stack; the normal model
definition remains disabled outside it.
