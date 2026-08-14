# Implement Preference Order Criteria Weights integration — Standalone LLM prompt

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
This is a criteria-weighting model.

It consumes one or more completed criteriaPreferenceOrder evaluations and,
after the separately verified mathematical algorithm is implemented, produces
one normalized numeric criterion-weight vector per evaluation/expert.

The DecisionModelsService request uses GenericModelExecutionRequest:

{
  "modelParameters": {},
  "evaluations": [...],
  "context": {...}
}

MODEL PARAMETERS

This model declares no model parameters.

modelParameters should therefore normally be an empty object.

Do not invent model-specific parameters, defaults, tuning values or algorithm
configuration.

Do not make the model depend on undeclared modelParameters fields.

CONTEXT

The canonical criterion collection for this model is:

context.criteria

context must be an object.

context.criteria must:

- exist;
- be a non-empty list;
- contain objects;
- provide a non-empty string id for every criterion;
- provide a non-empty string name for every criterion;
- contain no duplicate normalized criterion IDs.

Criterion IDs may be normalized by trimming surrounding whitespace.

Criterion names are used for diagnostics and for the existing criteria-weight
aggregation infrastructure, but criterion identity is always the criterion id.

The order of context.criteria is a stable canonical criterion order for mapping
model results. It is NOT itself a preference order.

A criterion may contain fields such as:

{
  "id": "CRIT_1",
  "name": "Cost",
  "type": "cost"
}

This model has:

usesCriterionTypes = False

Therefore criterion.type must not affect this model's behavior.

This model has no supported Expression Domains and does not consume Expression
Domain evaluations.

The runtime context may additionally contain:

- issue;
- structure;
- consensusPhase;
- previousStageResult.

Do not require fields that are not needed by this model.

If context.structure is supplied, it is expected to identify:

{
  "key": "criteriaPreferenceOrder",
  "stage": "criteriaWeighting"
}

Do not use context.criteriaWeights as input.

This model derives criterion weights; it does not consume pre-existing criterion
weights.

EVALUATIONS

evaluations must be a non-empty list of completed evaluation entries.

Each evaluation entry is expected to have:

{
  "expert": {
    "id": "...",
    "name": "...",
    "email": "..."
  },
  "payload": {
    "criterionOrder": [...]
  }
}

The expert object provides evaluation identity.

Resolve a stable expert key using:

1. non-empty expert.email when available;
2. otherwise non-empty expert.id.

At least one of those two identifiers must be available.

Reject duplicate resolved expert keys.

expert.name is presentation/diagnostic metadata only.

This model has:

usesExpertWeights = False

Therefore do not require, consume or apply an evaluation-level expert weight.

One evaluation represents one expert preference ordering.

Creator-side execution is represented using the same evaluation contract, with
the creator supplied as the evaluation expert.

The DecisionModelsService model executes only completed evaluations.

Partial drafts are valid inside the Evaluation Structure lifecycle but are NOT
valid execution input for this model.

### Evaluation payload semantics
Each evaluation payload belongs to the criteriaPreferenceOrder Evaluation
Structure.

The canonical payload is exactly:

{
  "criterionOrder": [
    "<criterion-id-most-important>",
    "<criterion-id-second-most-important>",
    "...",
    "<criterion-id-least-important>"
  ]
}

criterionOrder is a strict complete ordinal preference order over the current
context.criteria.

Its semantics are:

- index 0 is the most important criterion;
- increasing indices mean decreasing importance;
- the final item is the least important criterion.

Array position is the rank representation.

Do not expect or accept explicit numeric rank fields.

For DecisionModelsService execution, criterionOrder must be complete.

Given the canonical criterion IDs from context.criteria:

- criterionOrder must be a list;
- every item must be a string;
- every item must be non-empty after trimming;
- every item must identify a current context criterion;
- criterion IDs must be unique after normalization;
- every context criterion must appear exactly once;
- no additional criterion may appear;
- criterionOrder length must equal the number of context criteria.

Preserve the supplied semantic order exactly.

Do not sort criterionOrder.

Do not infer another ranking.

Do not silently insert missing criteria.

Do not silently remove duplicates or unknown criteria.

Do not substitute criterion names for criterion IDs.

The payload must contain exactly the criterionOrder property.

It does not contain:

- criterion names;
- explicit rank numbers;
- criterion weights;
- positional scores;
- normalized utility values;
- Expression Domain evaluations;
- consensus information;
- MCC information.

The Backend Evaluation Structure already validates and canonicalizes these
payloads before normal execution, but DecisionModelsService must still validate
its own runtime boundary defensively.

Validation and normalization must not mutate the incoming evaluation objects or
their criterionOrder arrays.

IMPORTANT ALGORITHM BOUNDARY:

criterionOrder is the complete model input needed by the later mathematical
algorithm, but this integration task must NOT convert the order to positional
scores, utilities or criterion weights.

That conversion belongs exclusively to the separately verified implementation
of run_preference_order_criteria_weights in run.py.

### Expected public output
After the separately verified run.py algorithm is implemented successfully, this
criteria-weighting model must expose the same public criteria-weighting result
shape used by the existing criteria-weighting models.

The successful top-level response must use:

success_response(
  "Preference Order Criteria Weights executed successfully",
  response_data,
)

where response_data has exactly these model-facing semantics:

{
  "message": "Criteria weights computed successfully",
  "consensusMeasure": null,
  "weightsByCriterion": {
    "<criterion-id>": <normalized numeric weight>
  },
  "collectiveEvaluations": {
    "weightsByCriterion": {
      "<criterion-id>": <same normalized numeric weight>
    }
  },
  "rawOutput": {
    "useMcc": <boolean>,
    "expertWeightsByExpert": {
      "<expert-key>": {
        "<criterion-id>": <normalized numeric weight>
      }
    },
    "nExperts": <number of evaluated experts>,

    "...": "singleExpertKey when useMcc is false, or mcc when useMcc is true"
  }
}

weightsByCriterion must:

- be an object/dict;
- contain exactly every current context criterion ID;
- contain finite numeric values;
- contain normalized criterion weights;
- use criterion IDs, never criterion names, as keys.

collectiveEvaluations.weightsByCriterion must contain the same final collective
weight vector as weightsByCriterion.

consensusMeasure is null.

This model does not implement the issue consensus/simulation process.

PER-EXPERT OUTPUT

The verified pure algorithm boundary is expected eventually to produce one
normalized numeric vector per expert, represented to the executor as:

{
  "success": true,
  "data": {
    "expertWeightsByExpert": {
      "<expert-key>": {
        "<criterion-id>": <normalized numeric weight>
      }
    },
    "nExperts": <integer>
  }
}

This describes the integration boundary only.

It does NOT define how run.py calculates those numeric weights.

FINAL WEIGHT RESOLUTION

When exactly one expert vector exists:

- do not invoke MCC;
- use that expert vector directly as weightsByCriterion;
- rawOutput.useMcc = false;
- rawOutput.singleExpertKey = the corresponding expert key.

When more than one expert vector exists:

- use the existing solve_mcc_weights service;
- pass the normalized context criteria and expertWeightsByExpert;
- use the returned weightsByCriterion as the final collective vector;
- rawOutput.useMcc = true;
- rawOutput.mcc = the complete MCC result.

rawOutput must always include:

- useMcc;
- expertWeightsByExpert;
- nExperts.

Do not expose a fake successful result while run.py remains unimplemented.

Until the verified algorithm exists, execution must return the normal
MODEL_UNDER_DEVELOPMENT error response rather than fabricating weights.

Runtime/model validation failures must use error_response(...).

Unexpected internal failures must use:

error_response(
  <message>,
  code="INTERNAL_ERROR"
)

Do not invent another public response envelope.

### Additional integration requirements
Implement only the non-mathematical DecisionModelsService integration in this
task.

DO implement:

- runtime request/context validation;
- normalization of context.criteria;
- validation of evaluation entries;
- stable expert-key resolution;
- duplicate expert detection;
- validation of the exact criteriaPreferenceOrder payload contract;
- verification that every execution-time criterionOrder is complete;
- preparation of normalized immutable data for the pure run.py boundary;
- integration with the existing success_response/error_response helpers;
- the future result-mapping boundary from per-expert criterion weight vectors to
  the standard criteria-weighting public response;
- existing MCC aggregation wiring for the multi-expert case;
- realistic API documentation examples.

DO NOT implement:

- ordinal rank to positional score conversion;
- positional score formulas;
- normalized utility formulas;
- any other preference-order-to-weight calculation;
- an alternative weighting algorithm;
- averaging as a substitute for the real algorithm;
- fake criterion weights.

RUN.PY

Keep run.py as the generated pure algorithm boundary with its
NotImplementedError.

Do not change that NotImplementedError into an implementation in this task.

The intended future call boundary remains:

run_preference_order_criteria_weights(
    context=...,
    evaluations=...,
    model_parameters=...,
)

The executor may prepare and validate the inputs required by that boundary.

If the executor invokes run_preference_order_criteria_weights while it is still
a scaffold, handle NotImplementedError explicitly and return:

error_response(
    "Preference Order Criteria Weights is a generated scaffold and is still under development.",
    code="MODEL_UNDER_DEVELOPMENT",
)

Do not allow the NotImplementedError to fall through to the generic
INTERNAL_ERROR handler.

RUN RESULT INTEGRATION CONTRACT

Once the verified algorithm is implemented later, the executor should expect
the pure run boundary to return either:

{
  "success": false,
  "message": "..."
}

or:

{
  "success": true,
  "data": {
    "expertWeightsByExpert": {
      "<expert-key>": {
        "<criterion-id>": <numeric weight>
      }
    },
    "nExperts": <integer>
  }
}

This is an interface contract only and must not be used to infer the algorithm.

When a run result reports success, defensively validate expertWeightsByExpert
before exposing it publicly.

Require:

- a non-empty dict;
- one vector per resolved expert;
- each expert vector to be a dict;
- each vector to contain exactly all context criterion IDs;
- every weight to be numeric and finite;
- no boolean values as numbers;
- each weight to be within the valid normalized weight range;
- every per-expert vector to represent a normalized criterion-weight vector.

Do not silently normalize malformed algorithm output merely to make it valid.
A verified algorithm must return valid normalized vectors.

MCC INTEGRATION

Use the existing service:

from services.criteria_weights_consensus.mcc_weights import solve_mcc_weights

For exactly one expert vector, bypass MCC and use that vector directly.

For two or more expert vectors, call:

solve_mcc_weights(
    criteria=criteria,
    expert_weights_by_expert=expert_weights_by_expert,
)

Use:

mcc_result["weightsByCriterion"]

as the final collective criteria-weight vector.

IMPORTANT:

supportsConsensus = False and supportsConsensusSimulation = False do NOT disable
this MCC step.

Those capabilities refer to the model/issue consensus workflow.

MCC here is the existing criteria-weight aggregation mechanism used after
multiple experts independently produce numeric criterion-weight vectors.

Do not invent another multi-expert aggregation algorithm.

MODEL PARAMETERS

This model declares no parameters.

Do not add parameter-specific logic.

Pass a normalized object through the existing run boundary if required by the
signature, but do not invent semantics for it.

EXPRESSION DOMAINS / CRITERION TYPES / EXPERT WEIGHTS

Do not add Expression Domain conversion.

Do not use criterion types.

Do not use fuzzy criteria weights.

Do not consume external expert weights.

Those capabilities are all disabled in the generated metadata.

EXAMPLES.PY

Replace the generic empty scaffold request example with a realistic
criteriaPreferenceOrder request example that shows:

- modelParameters: {};
- at least three context criteria;
- one complete criterionOrder evaluation;
- an expert identity;
- context.structure.key = "criteriaPreferenceOrder";
- context.structure.stage = "criteriaWeighting".

Because run.py is intentionally still unimplemented in this task, keep the
documented response example as MODEL_UNDER_DEVELOPMENT.

Do not publish a fake successful response example before the verified algorithm
exists.

DEFINITION.PY

Preserve all generated model metadata exactly.

Keep:

implementation_status="scaffold"

because the mathematical run.py implementation is deliberately absent.

Do not change capabilities, model kind, evaluation structure key, endpoint,
descriptions, supported Expression Domains or parameters.

ERROR HANDLING

Invalid model input should return the normal model execution error response.

Unexpected implementation/runtime failures should use INTERNAL_ERROR.

NotImplementedError from the deliberate run.py scaffold should use
MODEL_UNDER_DEVELOPMENT.

Keep error messages useful and model-specific.

ARCHITECTURE

Keep request parsing/orchestration in executor.py.

Keep mathematical model logic exclusively in run.py.

Do not move the future preference-order mathematics into executor.py.

Do not add dependencies.

Do not implement tests in this generated task.

Do not modify files outside this model package.

### Actual runtime input — optional
No captured production runtime payload is available yet.

However, the current Backend creator-side integration constructs this exact
request shape for criteria-weighting API models:

{
  "modelParameters": {},
  "evaluations": [
    {
      "expert": {
        "id": "creator",
        "name": "Creator",
        "email": "creator@local"
      },
      "payload": {
        "criterionOrder": [
          "CRIT_2",
          "CRIT_1",
          "CRIT_3"
        ]
      }
    }
  ],
  "context": {
    "issue": {
      "id": "ISSUE_1",
      "name": "Example issue",
      "currentStage": "criteriaWeighting",
      "consensusThreshold": null,
      "consensusMaxPhases": null
    },
    "criteria": [
      {
        "id": "CRIT_1",
        "name": "Criterion 1",
        "type": null
      },
      {
        "id": "CRIT_2",
        "name": "Criterion 2",
        "type": null
      },
      {
        "id": "CRIT_3",
        "name": "Criterion 3",
        "type": null
      }
    ],
    "consensusPhase": 0,
    "previousStageResult": null,
    "structure": {
      "key": "criteriaPreferenceOrder",
      "stage": "criteriaWeighting"
    }
  }
}

The concrete IDs, names, criterion count, criterion types and number of
evaluations vary at runtime.

Do not hard-code any example values.

Expert-side execution may contain multiple evaluation entries following the same
evaluation contract.

Every execution-time evaluation is expected to contain a complete
criteriaPreferenceOrder payload.

The model must derive its criterion universe dynamically from context.criteria.

The example criterionOrder above is illustrative data only. It must not be used
to infer or hard-code any criterion preference.

## Exact generated package location

```text
DecisionModelsService/models/preference_order_criteria_weights/
```

Exact generated files:

```text
DecisionModelsService/models/preference_order_criteria_weights/__init__.py
DecisionModelsService/models/preference_order_criteria_weights/definition.py
DecisionModelsService/models/preference_order_criteria_weights/executor.py
DecisionModelsService/models/preference_order_criteria_weights/run.py
DecisionModelsService/models/preference_order_criteria_weights/examples.py
```

Do not invent another location.

## Generated metadata

```text
apiModelKey: preference_order_criteria_weights
displayName: Preference Order Criteria Weights
modelKind: criteriaWeighting
evaluationStructureKey: criteriaPreferenceOrder
evaluationStage: criteriaWeighting

supportsCreatorCriteriaWeighting: True
supportsExpertCriteriaWeighting: True
supportsConsensus: False
supportsConsensusSimulation: False

isMultiCriteria: True
usesCriteriaWeights: False
usesExpertWeights: False
usesFuzzyCriteriaWeights: False
usesCriterionTypes: False

supportedExpressionDomains:
[]

parameters:
[]
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

### `DecisionModelsService/models/preference_order_criteria_weights/__init__.py`

```python
# Generated by ModelForge.
# Exposes this model package to DecisionModelsService.
# See IMPLEMENTATION_GUIDE.md.

from .definition import MODEL_DEFINITION

```

### `DecisionModelsService/models/preference_order_criteria_weights/definition.py`

```python
# Generated by ModelForge.
# Declares this model's DecisionModelsService contract.
# See IMPLEMENTATION_GUIDE.md.

from registry.model_definition import ModelDefinition
from schemas.model_requests import GenericModelExecutionRequest
from .executor import execute_preference_order_criteria_weights
from .examples import (
    PREFERENCE_ORDER_CRITERIA_WEIGHTS_REQUEST_EXAMPLES,
    PREFERENCE_ORDER_CRITERIA_WEIGHTS_RESPONSE_EXAMPLES,
)


MODEL_DEFINITION = ModelDefinition(
    api_model_key="preference_order_criteria_weights",
    api_endpoint_path="/preference_order_criteria_weights",
    request_model=GenericModelExecutionRequest,
    handler=execute_preference_order_criteria_weights,
    display_name="Preference Order Criteria Weights",
    small_description="Derives normalized criterion weights from a complete preference order.",
    extended_description="Auxiliary criteria-weighting model that transforms each complete ordinal ranking of the leaf criteria into a normalized utility vector using positional scores. It supports creator-side and expert-side weighting. Expert-derived numeric weight vectors can be aggregated through the existing MCC criteria consensus workflow.",
    request_examples=PREFERENCE_ORDER_CRITERIA_WEIGHTS_REQUEST_EXAMPLES,
    response_examples=PREFERENCE_ORDER_CRITERIA_WEIGHTS_RESPONSE_EXAMPLES,
    more_info_url=None,
    implementation_status="scaffold",
    model_kind="criteriaWeighting",
    evaluation_structure_key="criteriaPreferenceOrder",
    supports_creator_criteria_weighting=True,
    supports_expert_criteria_weighting=True,
    supports_consensus=False,
    supports_consensus_simulation=False,
    is_multi_criteria=True,
    uses_criteria_weights=False,
    uses_expert_weights=False,
    uses_fuzzy_criteria_weights=False,
    uses_criterion_types=False,
    supported_expression_domains=[],
    parameters=[],
)

```

### `DecisionModelsService/models/preference_order_criteria_weights/executor.py`

```python
# Generated by ModelForge.
# Implements request parsing, orchestration and public response mapping.
# See IMPLEMENTATION_GUIDE.md.

from fastapi.responses import JSONResponse

from schemas.model_requests import GenericModelExecutionRequest
from services.model_executors.responses import error_response


def execute_preference_order_criteria_weights(
    request: GenericModelExecutionRequest,
) -> dict | JSONResponse:
    del request

    return error_response(
        "Preference Order Criteria Weights is a generated scaffold and is still under development.",
        code="MODEL_UNDER_DEVELOPMENT",
    )

```

### `DecisionModelsService/models/preference_order_criteria_weights/run.py`

```python
# Generated by ModelForge.
# Pure model algorithm boundary.
# Implement only from a verified model-specific specification.
# See IMPLEMENTATION_GUIDE.md.


def run_preference_order_criteria_weights(
    *,
    context: dict,
    evaluations: list,
    model_parameters: dict,
) -> dict:
    raise NotImplementedError(
        "Preference Order Criteria Weights algorithm must be implemented from a verified specification."
    )

```

### `DecisionModelsService/models/preference_order_criteria_weights/examples.py`

```python
# Generated by ModelForge.
# API documentation examples only.
# See IMPLEMENTATION_GUIDE.md.

from typing import Any


PREFERENCE_ORDER_CRITERIA_WEIGHTS_REQUEST_EXAMPLES: dict[str, dict[str, Any]] = {
    "scaffold_request": {
        "summary": "Generated scaffold request",
        "value": {
            "modelParameters": {},
            "evaluations": [],
            "context": {
                "structure": {
                    "key": "criteriaPreferenceOrder",
                    "stage": "criteriaWeighting",
                }
            },
        },
    }
}


PREFERENCE_ORDER_CRITERIA_WEIGHTS_RESPONSE_EXAMPLES: dict[str, dict[str, Any]] = {
    "under_development": {
        "summary": "Generated scaffold under development",
        "value": {
            "success": False,
            "message": "Preference Order Criteria Weights is a generated scaffold and is still under development.",
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
