# AHPSort I local demonstration

This opt-in stack stores demonstration Issues in a dedicated local MongoDB
database. It does not use `docker-compose.dev.yml`, `Backend/.env`, MongoDB
Atlas, or production services. The demo Mongo service is private to the Docker
network, and the Frontend and Backend are published only on loopback:

- Frontend: <http://localhost:5175>
- Backend: <http://localhost:5002>
- MongoDB: `mongo-demo:27017/cretevalley_demo` inside the demo network only

AHPSort I is marked ready and individually authorized only when the DMS sees
all explicit demo-stack markers (`NODE_ENV=demo`, `DEMO_LOCAL_STACK=true`,
`DEMO_MONGO_HOST=mongo-demo`, and `DEMO_MONGODB_DB_NAME=cretevalley_demo`). It
remains scaffolded in the ordinary development and production environments.
Consensus and consensus simulation remain disabled.

## Start or resume the stack

Run these commands from the repository root:

```sh
python Automation/issue_scenario_lab/scripts/prepare_demo_environment.py
docker compose --env-file .env.demo -f docker-compose.demo.yml config --format json \
  | node Backend/scripts/demo/verifyDemoComposeConfig.js
docker compose --env-file .env.demo -f docker-compose.demo.yml up -d --build
docker compose --env-file .env.demo -f docker-compose.demo.yml exec -T backend-demo \
  node scripts/demo/verifyDemoMongoTarget.js
docker compose --env-file .env.demo -f docker-compose.demo.yml exec -T backend-demo \
  node scripts/demo/seedDemoEnvironment.js
docker compose --env-file .env.demo -f docker-compose.demo.yml exec -T backend-demo \
  node scripts/demo/syncDemoModelCatalog.js
```

The Compose verifier checks the effective configuration before startup. The
Mongo target verifier performs a read-only connection check before the seed
script writes. The seeder only upserts the four synthetic accounts and global
expression domains; it does not create or modify Issues. The catalog script
uses the official manifest synchronizer, initializes the catalog in this local
database, then scopes AHPSort I synchronization to `apiModelKeys: ["ahp_sort_i"]`.

`.env.demo` is generated locally with random JWT secrets and passwords, has
owner-only permissions, and is ignored by Git. It contains the passwords; they
are intentionally not copied into this document. The login accounts are:

| Role | Email |
| --- | --- |
| Creator | `demo.creator@example.test` |
| Expert A | `demo.expert.a@example.test` |
| Expert B | `demo.expert.b@example.test` |
| Expert C | `demo.expert.c@example.test` |

Open `.env.demo` locally to retrieve their generated passwords. Re-running the
environment preparation command retains existing credentials. Re-seeding
updates only these local demo accounts and expression domains.

## Generate or verify the demonstration Issues

From `Frontend/`, load the local credentials into the current shell and run the
Playwright scenario against the isolated stack:

```sh
set -a
. ../.env.demo
set +a
E2E_BASE_URL=http://localhost:5175 bun run test:e2e -- ahpSortIDemo.spec.js \
  --project=chromium --workers=1
```

The scenario is idempotent by Issue title. It reuses a finished Issue or
resumes an existing active one instead of creating duplicates. It does not
delete Issues. It exercises the UI and official application APIs, and writes
desktop/mobile screenshots and Playwright reports under `Frontend/test-results/`.

### Persisted demonstration results

**Supplier pre-qualification, Ishizaka et al. (2012)**

- Issue ID: `6ae32e917fc2c1cffdafc8b9`
- One expert, 12 suppliers, five criteria; AHP criterion weights were computed
  from the configured Saaty pairwise judgments.
- Accepted: Suppliers A–G.
- Rejected: Suppliers H–L.
- Weights: Experience `0.5645256214`, Flexibility `0.0806450327`, Security
  `0.2337344535`, Resilience `0.0806450327`, Environment `0.0404498597`.

**Sustainable development group demonstration, based on Labella et al. (2021)**

- Issue ID: `6ae332907fc2c1cffdafced3`
- Three experts, five countries, six social criteria; individual AHP vectors
  were combined by the existing MCC workflow.
- Weights: Poverty/social exclusion `0.17803968`, Obesity `0.16350689`, Life
  expectancy `0.17900523`, NEET `0.15380651`, Gender employment gap
  `0.16282085`, Homicide death rate `0.16282085`.
- Synthetic, reproducible individual judgments produce: Spain **Bad**, United
  Kingdom **Moderate**, Croatia **Good**, Norway **Good**, Romania **Bad**.
- The result demonstrates unanimity (Spain), unique pluralities (United
  Kingdom, Norway, Romania), and a three-way tie resolved to **Good** by the
  configured optimistic preference. These synthetic classifications are not
  presented as results published by Labella et al.

MCC weights are persisted at eight decimal places. The AHPSort I adapter
renormalizes only the possible sum residue from that serialization (bounded by
`1e-7` across the supported maximum of 15 criteria); the mathematical core
continues rejecting materially non-normalized weights.

## Stop without removing the Issues

From the repository root, stop the services without removing their persistent
MongoDB volume:

```sh
docker compose --env-file .env.demo -f docker-compose.demo.yml down
```

Do not add `-v` when the demonstration Issues should remain available on the
next start. The standard development stack and its remote MongoDB configuration
are unchanged.
