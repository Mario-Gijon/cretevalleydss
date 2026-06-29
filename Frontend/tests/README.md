# Frontend Tests

Current coverage layers:

- service and transport utilities
- auth and issues context providers
- app routing guards
- dashboard/listing/action coverage for active issues and finished issues

Dashboard/listing/action coverage includes:

- active issues search, sort, overview, and listing hook state
- active issue action hook behavior for remove, leave, compute, and resolve
- finished issues search, sort, overview, and listing hook state
- finished issues view hook behavior for open/close detail, refresh, and remove
- lightweight loading and empty-state smoke tests for active and finished issue views

Deferred coverage:

- create issue wizard full flow
- evaluation UI flows
- finished issue dialog deep charts and tables
- Playwright/E2E
- Python/DecisionModelsService model correctness
