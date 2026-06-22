# Parameter Template

These files are reusable scaffolds for creating a new model parameter structure.

Generated backend files:
- `index.js`
- `validate.js`

Generated frontend files:
- `index.js`
- `{{ field_component_name }}.jsx`
- `{{ read_only_component_name }}.jsx`

Required placeholders:
- `{{ parameter_structure_key }}`
- `{{ parameter_label }}`
- `{{ component_name }}`
- `{{ field_component_name }}`
- `{{ read_only_component_name }}`
- `{{ backend_structure_export_name }}`
- `{{ validate_function_name }}`

Backend contract:
- The folder name and `parameterStructureKey` must match.
- `index.js` exports the structure entry loaded by the backend registry.
- `validate.js` owns normalization and validation for this structure.
- `parameterStructureKey` is the value-shape source of truth.
- `restrictions` is optional.
- The validator returns the normalized structure-owned value.

Frontend contract:
- `index.js` exports the field entry used by the automatic registry.
- `FieldComponent` is used while editing.
- `ReadOnlyComponent` is used in summaries and finished views.
- Components receive `parameterContext`, not a generic `context`.

`parameterContext` shape:
- `model`
- `alternatives`
- `criteriaTree`
- `leafCriteria`

Rules:
- Value shape is owned by the structure.
- Use ids for logic and names only for display.
- Do not fetch from backend or couple frontend and backend logic.
- Do not add legacy aliases or fallback context fields.
