# Frontend Tests

Current coverage layers:

- service and transport utilities
- auth and issues context providers
- app routing guards
- dashboard/listing/action coverage for active issues and finished issues
- create issue logic and hook coverage

Dashboard/listing/action coverage includes:

- active issues search, sort, overview, and listing hook state
- active issue action hook behavior for remove, leave, compute, and resolve
- finished issues search, sort, overview, and listing hook state
- finished issues view hook behavior for open/close detail, refresh, and remove
- lightweight loading and empty-state smoke tests for active and finished issue views

Create issue coverage includes:

- field validation rules for issue name and description
- draft/localStorage state round-trips and defensive fallback handling
- criteria id normalization for nested trees
- expert-weight synchronization and validation
- criteria-weighting default detection and fuzzy-domain resolution
- model-parameter defaulting and criterion-map updates
- create-issue payload validation and serialization
- `useCreateIssue` initialization, persistence, derived state, and completion flows

Deferred coverage:

- create issue wizard full UI interaction
- evaluation UI flows
- finished issue dialog deep charts and tables
- Playwright/E2E
- Python/DecisionModelsService model correctness
