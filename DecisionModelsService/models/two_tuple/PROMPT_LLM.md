# Implement 2-Tuple Linguistic Model integration — Standalone LLM prompt

You are implementing only the NON-MATHEMATICAL DecisionModelsService integration
for a generated CreteValleyDSS model.

This prompt is intentionally self-contained.

## Critical algorithm boundary

Do NOT implement, guess or infer the model algorithm in `run.py`.

Do not infer formulas from the model name.

Do not substitute:

- TOPSIS or another model;
- averaging;
- random scores;
- identity transformations;
- placeholder rankings;
- guessed mathematical equations.

A separately verified model-specific algorithm specification is required before
`run.py` may be implemented.

## Developer requirements

### Model input semantics
[MODEL INPUT REQUIREMENTS]

### Evaluation payload semantics
[EVALUATION PAYLOAD SEMANTICS]

### Expected public output
[EXPECTED PUBLIC OUTPUT]

### Additional integration requirements
[ADDITIONAL REQUIREMENTS]

### Actual runtime input — optional
[ACTUAL RUNTIME INPUT]

## Exact generated package location

```text
DecisionModelsService/models/two_tuple/
```

Exact generated files:

```text
DecisionModelsService/models/two_tuple/__init__.py
DecisionModelsService/models/two_tuple/definition.py
DecisionModelsService/models/two_tuple/executor.py
DecisionModelsService/models/two_tuple/run.py
DecisionModelsService/models/two_tuple/examples.py
```

Do not invent another location.

## Generated metadata

```text
apiModelKey: two_tuple
displayName: 2-Tuple Linguistic Model
modelKind: issue
evaluationStructureKey: alternativeCriteriaMatrix
evaluationStage: alternativeEvaluation

supportsCreatorCriteriaWeighting: False
supportsExpertCriteriaWeighting: False
supportsConsensus: False
supportsConsensusSimulation: False

isMultiCriteria: True
usesCriteriaWeights: True
usesExpertWeights: True
usesFuzzyCriteriaWeights: False
usesCriterionTypes: True

supportedExpressionDomains:
[{'typeKey': 'linguistic2Tuple', 'constraints': {}}]

parameters:
[{'key': 'expertAggregation',
  'label': 'Expert aggregation',
  'parameterStructureKey': 'twoTupleAggregation',
  'required': True,
  'default': {'method': 'arithmetic_mean', 'options': {}}},
 {'key': 'criteriaAggregation',
  'label': 'Criteria aggregation',
  'parameterStructureKey': 'twoTupleAggregation',
  'required': True,
  'default': {'method': 'weighted_average', 'options': {}}}]
```

Do not silently change capabilities.


## Exact DecisionModelsService request/response contracts

### `DecisionModelsService/schemas/model_requests.py`

```python
from pydantic import BaseModel, ConfigDict, Field


class RequestSchema(BaseModel):
    model_config = ConfigDict(extra="ignore")


class GenericModelExecutionRequest(RequestSchema):
    modelParameters: dict = Field(default_factory=dict)
    evaluations: list[dict] = Field(default_factory=list)
    context: dict = Field(default_factory=dict)
```

### `DecisionModelsService/services/model_executors/responses.py`

```python
from typing import Any

from fastapi.responses import JSONResponse


def success_response(message: str, data: Any) -> dict[str, Any]:
    return {
        "success": True,
        "message": message,
        "data": data,
    }


def error_response(
    message: str,
    code: str = "MODEL_EXECUTION_ERROR",
    details: Any | None = None,
) -> JSONResponse:
    return JSONResponse(
        status_code=200,
        content={
            "success": False,
            "message": message,
            "data": None,
            "error": {
                "code": code,
                "field": None,
                "details": details,
            },
        },
    )
```

Use these response helpers. Do not invent another public response envelope.
Unexpected internal failures normally use `code="INTERNAL_ERROR"` when
appropriate.


## Generic evaluation entry

Representative:

```json
{
  "expert": {
    "id": "EXPERT_1",
    "name": "Expert A",
    "email": "expert.a@example.com"
  },
  "payload": {}
}
```

An entry may also contain a numeric `weight` when expert weights are enabled.

The nested `payload` belongs to the Evaluation Structure. Its actual shape must
come from developer requirements/runtime input. Do not invent it.

## Executor responsibilities

`executor.py` owns, when relevant:

- model-specific request validation;
- normalization;
- stable ID/order resolution;
- declared parameter interpretation;
- canonical Expression Domain interpretation;
- preparation of algorithm input;
- later invocation of `run.py`;
- mapping a VERIFIED algorithm result to public response `data`;
- existing success/error wrapping.

Do not move mathematical model logic into `executor.py`.

If a successful result cannot exist without the algorithm, preserve a safe
MODEL_UNDER_DEVELOPMENT/error response rather than fabricating a result.

Do not invent Expression Domain conversions. Preserve richer values unless the
verified algorithm specification explicitly defines their conversion.


## Reference DecisionModelsService executor convention

A current criteria-weighting executor follows this overall shape:

```python
from typing import Any

from fastapi.responses import JSONResponse

from schemas.model_requests import GenericModelExecutionRequest
from services.criteria_weights_consensus.mcc_weights import solve_mcc_weights
from services.model_executors.responses import error_response, success_response
from .run import run_manual_criteria_weights


def execute_manual_criteria_weights(
    payload: GenericModelExecutionRequest,
) -> dict[str, Any] | JSONResponse:
    try:
        # Validate and normalize request/context.
        # Run the model-specific pure boundary.
        # For multiple expert weight vectors, existing MCC infrastructure may
        # be invoked when this model's verified requirements call for it.
        results = run_manual_criteria_weights(
            criteria=[],
            evaluations=(
                payload.evaluations
                if isinstance(payload.evaluations, list)
                else []
            ),
        )

        if not results.get("success", False):
            return error_response(
                results.get("message") or "Error executing model",
                details=results,
            )

        response_data = {
            # model-specific public data
        }

        return success_response(
            "Model executed successfully",
            response_data,
        )
    except ValueError as error:
        return error_response(str(error))
    except Exception as error:
        return error_response(
            f"Error executing model: {error}",
            code="INTERNAL_ERROR",
        )
```

This is an integration-style reference only. Do not copy its mathematical
behavior, output fields, MCC usage or validation rules unless the supplied model
requirements explicitly specify them.


## Exact generated starting source

### `DecisionModelsService/models/two_tuple/__init__.py`

```python
# Generated by ModelForge.
# Exposes this model package to DecisionModelsService.
# See IMPLEMENTATION_GUIDE.md.

from .definition import MODEL_DEFINITION

```

### `DecisionModelsService/models/two_tuple/definition.py`

```python
# Generated by ModelForge.
# Declares this model's DecisionModelsService contract.
# See IMPLEMENTATION_GUIDE.md.

from registry.model_definition import ModelDefinition
from schemas.model_requests import GenericModelExecutionRequest
from .executor import execute_two_tuple
from .examples import (
    TWO_TUPLE_REQUEST_EXAMPLES,
    TWO_TUPLE_RESPONSE_EXAMPLES,
)


MODEL_DEFINITION = ModelDefinition(
    api_model_key="two_tuple",
    api_endpoint_path="/two_tuple",
    request_model=GenericModelExecutionRequest,
    handler=execute_two_tuple,
    display_name="2-Tuple Linguistic Model",
    small_description="Linguistic decision model with configurable 2-tuple aggregation methods for experts and criteria.",
    extended_description="Decision model based on the 2-tuple linguistic representation. It aggregates alternative evaluations in two configurable stages: expert aggregation and criteria aggregation. Each stage can use a different aggregation method and method-specific parameters.",
    request_examples=TWO_TUPLE_REQUEST_EXAMPLES,
    response_examples=TWO_TUPLE_RESPONSE_EXAMPLES,
    more_info_url=None,
    implementation_status="scaffold",
    model_kind="issue",
    evaluation_structure_key="alternativeCriteriaMatrix",
    supports_creator_criteria_weighting=False,
    supports_expert_criteria_weighting=False,
    supports_consensus=False,
    supports_consensus_simulation=False,
    is_multi_criteria=True,
    uses_criteria_weights=True,
    uses_expert_weights=True,
    uses_fuzzy_criteria_weights=False,
    uses_criterion_types=True,
    supported_expression_domains=[{'typeKey': 'linguistic2Tuple', 'constraints': {}}],
    parameters=[{'key': 'expertAggregation',
  'label': 'Expert aggregation',
  'parameterStructureKey': 'twoTupleAggregation',
  'required': True,
  'default': {'method': 'arithmetic_mean', 'options': {}}},
 {'key': 'criteriaAggregation',
  'label': 'Criteria aggregation',
  'parameterStructureKey': 'twoTupleAggregation',
  'required': True,
  'default': {'method': 'weighted_average', 'options': {}}}],
)

```

### `DecisionModelsService/models/two_tuple/executor.py`

```python
# Generated by ModelForge.
# Implements request parsing, orchestration and public response mapping.
# See IMPLEMENTATION_GUIDE.md.

from fastapi.responses import JSONResponse

from schemas.model_requests import GenericModelExecutionRequest
from services.model_executors.responses import error_response


def execute_two_tuple(
    request: GenericModelExecutionRequest,
) -> dict | JSONResponse:
    del request

    return error_response(
        "2-Tuple Linguistic Model is a generated scaffold and is still under development.",
        code="MODEL_UNDER_DEVELOPMENT",
    )

```

### `DecisionModelsService/models/two_tuple/run.py`

```python
# Generated by ModelForge.
# Pure model algorithm boundary.
# Implement only from a verified model-specific specification.
# See IMPLEMENTATION_GUIDE.md.


def run_two_tuple(
    *,
    context: dict,
    evaluations: list,
    model_parameters: dict,
) -> dict:
    raise NotImplementedError(
        "2-Tuple Linguistic Model algorithm must be implemented from a verified specification."
    )

```

### `DecisionModelsService/models/two_tuple/examples.py`

```python
# Generated by ModelForge.
# API documentation examples only.
# See IMPLEMENTATION_GUIDE.md.

from typing import Any


TWO_TUPLE_REQUEST_EXAMPLES: dict[str, dict[str, Any]] = {
    "scaffold_request": {
        "summary": "Generated scaffold request",
        "value": {
            "modelParameters": {},
            "evaluations": [],
            "context": {
                "structure": {
                    "key": "alternativeCriteriaMatrix",
                    "stage": "alternativeEvaluation",
                }
            },
        },
    }
}


TWO_TUPLE_RESPONSE_EXAMPLES: dict[str, dict[str, Any]] = {
    "under_development": {
        "summary": "Generated scaffold under development",
        "value": {
            "success": False,
            "message": "2-Tuple Linguistic Model is a generated scaffold and is still under development.",
            "data": None,
            "error": {
                "code": "MODEL_UNDER_DEVELOPMENT",
                "field": None,
                "details": None,
            },
        },
    }
}

```

## Lifecycle

Keep:

```python
implementation_status="scaffold"
```

because this integration prompt does not implement the verified algorithm.

Tests are outside scope. Do not create/modify tests unless explicitly requested.

## Required output

For every required file:

```text
FILE: <complete repository path>
```

then complete source.

Do not return a guessed `run.py`, diffs, ellipses, partial functions,
pseudocode or fake completed behavior.

If a safe integration decision genuinely requires missing information, preserve
under-development behavior and state exactly what is missing.
