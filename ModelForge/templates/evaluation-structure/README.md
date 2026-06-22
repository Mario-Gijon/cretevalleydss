# Evaluation Structure Template

These files are reusable scaffolds for creating a new evaluation structure.

Generated backend files:
- `index.js`
- `evaluationContext.js`
- `payload.js`
- `computeValidation.js`

Generated frontend files:
- `index.js`
- `adapter.js`
- `View.jsx`

Required placeholders:
- `{{ evaluation_structure_key }}`
- `{{ backend_structure_export_name }}`
- `{{ component_name }}`
- `{{ view_component_name }}`
- `{{ adapter_export_name }}`
- `{{ normalize_payload_function_name }}`
- `{{ validate_before_compute_function_name }}`

Backend contract:
- `key` must match the folder name.
- `get` may return a placeholder payload so the scaffold UI can render safely.
- `save` must fail with a controlled under-development error until implemented.
- `validateBeforeCompute` must fail with a controlled under-development error until implemented.
- Payload shape is structure-owned.
- Core entity references must stay id-based.

Frontend contract:
- `index.js` exports the registry entry with `key`, `stage`, `label`, `adapter`, and `View`.
- `adapter` converts between canonical backend payloads and UI state.
- `View` renders the structure editor or a safe under-development placeholder.
- DataGrid or row state is UI-only and must not leak into canonical payloads.

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
