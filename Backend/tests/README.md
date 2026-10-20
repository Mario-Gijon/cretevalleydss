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

## Backend and DecisionModelsService integration

The PROMETHEE VI criterion-parameter integration is opt-in and is not included in the normal Backend test suite. It calls the real DecisionModelsService input preparer, so set `DECISION_MODELS_PYTHON` to an interpreter with that service's Python dependencies installed.

From `Backend`, on POSIX shells:

```bash
DECISION_MODELS_PYTHON=/path/to/python npm run test:integration:decision-models
```

For example, point it at the service virtual environment when available:

```bash
DECISION_MODELS_PYTHON=../DecisionModelsService/.venv/bin/python npm run test:integration:decision-models
```

On PowerShell, set `$env:DECISION_MODELS_PYTHON` to the interpreter path first, then run `npm run test:integration:decision-models`. The interpreter may also be a command available on `PATH`; the integration test runs it with `DecisionModelsService` as its working directory.
