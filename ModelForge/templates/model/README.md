# Model Template

These files are reusable scaffolds for creating a new `DecisionModelsService` model.

Generated files:
- `definition.py`
- `executor.py`
- `run.py`
- `examples.py`

Generated scaffold defaults:
- `definition.py` sets `implementation_status="scaffold"`
- `executor.py` returns a controlled `MODEL_UNDER_DEVELOPMENT` error
- `run.py` is intentionally not called until the developer removes the executor guard

Required placeholders:
- `{{ api_model_key }}`
- `{{ api_endpoint_path }}`
- `{{ display_name }}`
- `{{ small_description }}`
- `{{ extended_description }}`
- `{{ snake_case_model_name }}`
- `{{ execute_function_name }}`
- `{{ run_function_name }}`
- `{{ request_examples_constant }}`
- `{{ response_examples_constant }}`

Optional examples mode:
- Use `request_examples={{ request_examples_constant }}` and `response_examples={{ response_examples_constant }}` when examples are generated.
- Use `request_examples={}` and `response_examples={}` when examples are omitted.

Request contract:
- Request model is `GenericModelExecutionRequest`.
- Available inputs include `context`, `evaluations`, and `modelParameters`.
- Core entity references must use ids.
- Names are for display labels only.

Response contract:
- `rankedAlternatives`: required non-empty list ordered by `rank`
- `collectiveEvaluations`: required object with structure-owned shape
- `plotsGraphic`: required object, use `{}` if none
- `consensusMeasure`: required finite number or `None`
- `rawOutput`: required object

Rules:
- Do not assume matrices, weights, rankings, or plots internally.
- Do not assume one universal payload shape.
- Model parameter definitions use `parameterStructureKey` as the value-shape source of truth.
- Do not add a separate parameter `type` field.
- `run.py` should stay algorithm-focused and transport-agnostic.
- Change `implementation_status` from `"scaffold"` to `"ready"` only after the model is implemented and tested.
