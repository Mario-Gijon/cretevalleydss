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
- `get` builds or normalizes a default payload for the UI.
- `save` validates and normalizes draft or submit payloads.
- `validateBeforeCompute` validates completed evaluations before model execution.
- Payload shape is structure-owned.
- Core entity references must stay id-based.

Frontend contract:
- `index.js` exports the registry entry with `key`, `stage`, `label`, `adapter`, and `View`.
- `adapter` converts between canonical backend payloads and UI state.
- `View` renders the structure editor or read-only display.
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
- No generation is implemented here yet.
