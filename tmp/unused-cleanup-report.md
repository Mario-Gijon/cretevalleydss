# Unused Cleanup Report

## 1. Deleted files
- `Backend/modules/issues/issue.lifecycleKind.js`
  - No imports/consumers found in backend/frontend.
  - No route, registry, barrel, or model wiring references.
- `Backend/modules/issues/expressionDomains/expressionDomain.transforms.js`
  - Exported helpers were not imported anywhere.
  - No route, registry, barrel, or dynamic key references.
- `Backend/modules/issues/expressionDomains/issueDomainDetection.js`
  - Exported helper was not imported anywhere.
  - No route, registry, barrel, or dynamic key references.
- Generated cache files (outside `ApiModels/.venv` and outside `ApiModels/legacy`):
  - all `ApiModels/**/*.pyc`

## 2. Deleted empty folders
- Generated cache folders (outside `ApiModels/.venv` and outside `ApiModels/legacy`):
  - all `ApiModels/**/__pycache__/`

## 3. Removed exports/imports
- No import/export updates were needed for deleted backend files because they had no consumers.

## 4. Removed local dead code
- `Frontend/src/utils/domainAssignments.utils.js`
  - Removed unused export `groupDomainData` (no references found).

## 5. Files considered but kept because uncertain
- `ApiModels/.venv/**`
  - Kept intentionally to avoid deleting local development environment files.
- Registry-driven structures/handlers that looked legacy but are still wired by keys/registries:
  - `Backend/modules/issues/evaluations/structures/fuzzyCriteriaWeights/index.js`
  - `Backend/modules/issues/evaluations/structures/criteriaPairwiseMatrix/index.js`
  - `Backend/modules/issues/modelParameters/handlers/criteriaWeights.parameter.js`
  - `Backend/modules/issues/modelParameters/handlers/fuzzyCriteriaWeights.parameter.js`
- Frontend expert-domain assignment modules (still referenced by issue-expert dialogs/flows):
  - `Frontend/src/features/issueExperts/**`

## 6. Notes about dynamic references checked
- Checked backend evaluation structure registry and constants before deleting structure-related files.
- Checked frontend evaluation registry and dialog host wiring.
- Checked model-parameter handler registry for handler-key-driven runtime references.
- Checked backend controller/service/route imports for removed modules.
- Preserved `ApiModels/legacy/**` as required.
