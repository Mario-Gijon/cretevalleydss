# Evaluation Structure Template

These files are reusable scaffolds for creating a new evaluation structure.

Generated backend files:
- `index.js`

Generated frontend files:
- `index.js`
- `View.jsx`

Required placeholders:
- `{{ evaluation_structure_key }}`
- `{{ backend_structure_export_name }}`
- `{{ component_name }}`
- `{{ view_component_name }}`

Backend contract:
- `key` must match the folder name.
- `get({ payload, evaluationContext })` returns the canonical payload that the frontend renders directly.
- `save` must fail with a controlled under-development error until implemented.
- Payload shape is structure-owned.
- Core entity references must stay id-based.

Frontend contract:
- `index.js` exports the registry entry with `key`, `stage`, optional `implementationStatus`, and `View`.
- `View` renders the structure editor or a safe under-development placeholder.
- UI-only row/grid state belongs in the View and must not change the backend payload contract.

`evaluationContext` includes:
- `issue`
- `structure`
- `model`
- `modelParameters`
- `criteriaWeightingParameters`
- `alternatives`
- `criteriaTree`
- `leafCriteria`
- `consensus`

Rules:
- Payload shape is flexible and owned by the structure.
- Use `alternative.id`, `criterion.id`, and `expressionDomain.id` for logic.
- Use names only for UI labels and error text.
- Do not add legacy aliases or name-keyed fallbacks.
- Generated scaffolds should fail clearly until the structure is implemented.
