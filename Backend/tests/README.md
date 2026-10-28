# Backend Tests

Run the backend tests with:

```bash
cd Backend
bun run test
```

Current layers cover:

- auth and account/session behavior
- profile, account update, email change, and safe account deletion/purge behavior
- expression domains
- issue input normalization
- issue lifecycle behavior
- scenario access, payload, delete, and creation-boundary behavior
- issue participation editing, invitations, and leaving/removal flows
- participation timeline integrity: `Participation` stays the current-state record, while `ExitUserIssue.history` preserves entered/exited events across re-entry cycles
- evaluation lifecycle coverage: save/get/submit, permissions, stage guards, and participation completion flags
- compute/orchestration coverage: stage compute permissions, stage transitions, persisted `IssueStageResult`, consensus lifecycle, and mocked DecisionModelsService integration
- final backend hardening coverage: entryPhase/entryStage evaluation guards, compute against current participation timeline, and finished payload robustness under historical/deleted-user scenarios
- DecisionModelsService calls are mocked in backend tests; model correctness remains deferred to DecisionModelsService/model-specific test layers
- DecisionModelsService/model correctness remains deferred to Python/service-level tests rather than this backend suite
- evaluation payload tests stay structure-level and flexible rather than model-algorithm specific
- notifications behavior and notification API contracts
- issue model runtime and actor/model loading
- issue creation integration and protected issue API basics
- active/finished issue visibility rules and finished detail access
- users/models catalog basics
- consensusPhase isolation and re-entry-safe evaluation persistence

Tests use a MongoDB in-memory replica set via `mongodb-memory-server`, so transaction-backed flows can run without an external database.

## Per-model Issue execution authorization

DecisionModelsService issue-model manifests publish `issueExecutionAuthorized` separately from `publicUsable` and the Result Structure's `issueExecution` capability. New model definitions default this permission to `false`; current ranking plugins opt in explicitly. After deploying the manifest contract, run the existing confirmed model-manifest synchronization to backfill the field on historical `IssueModel` records. Records missing the field fail closed until that sync applies the manifest value. Criteria Weighting Plugins do not use this permission.

## Backend and DecisionModelsService integration

The PROMETHEE VI criterion-parameter, TOPSIS-Sort 2016 result-contract, and AHPSort I contract integrations are opt-in and are not included in the normal Backend test suite. They call the real DecisionModelsService input preparer and executor, so set `DECISION_MODELS_PYTHON` to an interpreter with that service's Python dependencies installed. The TOPSIS-Sort integration uses a test-only persisted contract fixture. The AHPSort I integration calls its adapter directly rather than enabling the public POST route; it validates both profile modes, Backend normalization and `sorting@1` persistence while the production manifest remains scaffold and unauthorized. The AHPSort I test also uses MongoDB's in-memory replica set.

From `Backend`, on POSIX shells:

```bash
DECISION_MODELS_PYTHON=/path/to/python npm run test:integration:decision-models
```

For example, point it at the service virtual environment when available:

```bash
DECISION_MODELS_PYTHON=../DecisionModelsService/.venv/bin/python npm run test:integration:decision-models
```

On PowerShell, set `$env:DECISION_MODELS_PYTHON` to the interpreter path first, then run `npm run test:integration:decision-models`. The interpreter may also be a command available on `PATH`; the integration test runs it with `DecisionModelsService` as its working directory.
