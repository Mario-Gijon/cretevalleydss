# Frontend Tests

Current coverage layers:

- service and transport utilities
- auth and issues context providers
- app routing guards
- dashboard/listing/action coverage for active issues and finished issues
- create issue logic and hook coverage
- evaluation UI flow coverage

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

Evaluation UI flow coverage includes:

- evaluation context building and defensive leaf extraction
- evaluation service wrapper contracts
- evaluation dialog host unsupported/supported structure routing
- evaluation structure dialog load, fallback, draft save, submit, clear-all, dirty-close, and collective visibility flows
- lightweight shell/save/submit dialog actions
- active-issue overlay evaluation host smoke coverage

Deferred coverage:

- create issue wizard full UI interaction
- structure-specific complex rating matrix tests
- finished issue dialog deep charts and tables
- Playwright/E2E
- Python/DecisionModelsService model correctness
