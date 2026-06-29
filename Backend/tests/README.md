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
- DecisionModelsService calls are mocked in backend tests; model correctness remains deferred to DecisionModelsService/model-specific test layers
- evaluation payload tests stay structure-level and flexible rather than model-algorithm specific
- notifications behavior and notification API contracts
- issue model runtime and actor/model loading
- issue creation integration and protected issue API basics
- active/finished issue visibility rules and finished detail access
- users/models catalog basics
- consensusPhase isolation and re-entry-safe evaluation persistence

Tests use a MongoDB in-memory replica set via `mongodb-memory-server`, so transaction-backed flows can run without an external database.
