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

Finished issue dialog coverage includes:

- phase/round selection helpers and malformed payload fallback handling
- scenario compatibility and scenario payload transformation helpers
- model output derivation across consensus phases and scenario views
- finished issue ratings hook phase switching, collective fallback, and anonymized/deleted expert handling
- finished issue dialog hook loading, round navigation, scenario selection caching, and add/remove model run flows

Admin/model catalog coverage includes:

- admin route guard and internal admin routing behavior
- model manifest row normalization, merge, sorting, flattening, and display helper coverage
- admin model catalog hook loading/error handling and quiet refresh behavior
- model manifest dry-run, sync, and catalog visibility action hook flows
- model manifest sync panel tab/search-param handling, session success messages, detail dialog, sync confirm, and visibility confirm flows
- admin service route contracts for model catalog and manifest endpoints

Final frontend hardening coverage includes:

- login and signup form rendering, validation, success, error, and navigation behavior
- snackbar provider/context rendering, show/close behavior, and provider-usage guard
- pending backend change utility expiration/update/clear handling
- applying-backend-changes system page missing/stale state coverage
- private layout shell smoke plus dashboard navbar admin visibility and logout flow
- build validation coverage via `bun run build`
- Fast Refresh warning cleanup for create-issue summary model parameters by moving non-component exports out of component files

Deferred coverage:

- create issue wizard full UI interaction
- structure-specific complex rating matrix tests
- finished issue dialog deep charts and tables
- full admin experts/issues/reports/logs UI
- Playwright/E2E
- Python/DecisionModelsService model correctness
- real model sync/backend integration
- deep visual/chart testing
