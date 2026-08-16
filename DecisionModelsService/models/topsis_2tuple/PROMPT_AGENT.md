# Implement 2-Tuple TOPSIS integration — Agent prompt

Target package:

```text
DecisionModelsService/models/topsis_2tuple/
```

Do NOT implement/guess `run.py` mathematics.

Read complete generated package, its guide, referenced Evaluation/Parameter
Structures, and:

```text
DecisionModelsService/schemas/model_requests.py
DecisionModelsService/services/model_executors/responses.py
```

Inspect the closest relevant executor. Repository state is authoritative.

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


Preserve generated metadata. Implement only non-mathematical request
validation/normalization/integration. Do not move the algorithm into
`executor.py`.

If meaningful success depends on the missing algorithm, keep a safe
under-development result.

Keep `implementation_status="scaffold"`.

Tests are outside scope. Do not create/modify/run tests unless explicitly
requested.

Run appropriate Python syntax/static/lint validation when practical plus:

```text
git diff --check
```

Do not install dependencies.

Report files changed, normalization/contracts consumed, response helper reuse,
confirmation that `run.py` was not implemented, lifecycle status and validation.
