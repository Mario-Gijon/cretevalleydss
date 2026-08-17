from typing import Any

from fastapi.responses import JSONResponse

from models.shared_alternative_matrix import (
    extract_id_keyed_alternative_criteria_input,
    normalize_collective_evaluations_by_ids,
)
from models.shared_expression_domains import (
    expression_domain_definition,
    expression_domain_type_key,
    resolve_linguistic_2tuple_value,
)
from schemas.model_requests import GenericModelExecutionRequest
from services.criteria_weights import ordered_numeric_weights
from services.model_executors.responses import (
    error_response,
    success_response,
)
from .run import run_topsis_2tuple


def _criterion_type(value: Any) -> str:
    key = str(value or "").strip().lower()

    if key in {"benefit", "max"}:
        return "max"

    if key in {"cost", "min"}:
        return "min"

    raise ValueError(f"Unsupported criterion type: {value}")


def _expert_key(expert: dict[str, Any], index: int) -> str:
    for field in ("id", "email", "name"):
        value = expert.get(field)

        if value is None:
            continue

        normalized = str(value).strip()

        if normalized:
            return normalized

    return f"expert_{index + 1}"


def _expert_label(expert: dict[str, Any], index: int) -> str:
    for field in ("name", "email"):
        value = expert.get(field)

        if value is None:
            continue

        normalized = str(value).strip()

        if normalized:
            return normalized

    return f"Expert {index + 1}"


def _evaluation_value(
    value: Any,
    criterion: dict[str, Any],
    field: str,
) -> float:
    expression_domain = criterion["expressionDomain"]
    domain_type = expression_domain_type_key(expression_domain)

    if domain_type != "linguistic2Tuple":
        raise ValueError(
            f"{field}.expressionDomain.typeKey '{domain_type}' "
            "is not supported for 2-Tuple TOPSIS"
        )

    resolved = resolve_linguistic_2tuple_value(
        value=value,
        expression_domain=expression_domain,
        field=field,
    )

    return float(resolved["beta"])


def _criterion_scale(
    criterion: dict[str, Any],
) -> dict[str, Any]:
    criterion_id = criterion["id"]
    expression_domain = criterion["expressionDomain"]
    domain_type = expression_domain_type_key(expression_domain)

    if domain_type != "linguistic2Tuple":
        raise ValueError(
            f"Criterion '{criterion_id}' must use "
            "a linguistic2Tuple expression domain"
        )

    definition = expression_domain_definition(expression_domain)
    labels = definition.get("labels")

    if not isinstance(labels, list) or len(labels) < 3:
        raise ValueError(
            f"Criterion '{criterion_id}' linguistic2Tuple domain "
            "must contain at least three labels"
        )

    if len(labels) % 2 == 0:
        raise ValueError(
            f"Criterion '{criterion_id}' linguistic2Tuple domain "
            "must contain an odd number of labels"
        )

    normalized_labels: list[dict[str, Any]] = []
    seen_keys: set[str] = set()

    for index, label_definition in enumerate(labels):
        if not isinstance(label_definition, dict):
            raise ValueError(
                f"Criterion '{criterion_id}' expression domain "
                f"label at index {index} must be an object"
            )

        label_key = str(label_definition.get("key") or "").strip()
        label = str(label_definition.get("label") or "").strip()

        if not label_key:
            raise ValueError(
                f"Criterion '{criterion_id}' expression domain "
                f"label at index {index} requires a key"
            )

        if not label:
            raise ValueError(
                f"Criterion '{criterion_id}' expression domain "
                f"label at index {index} requires a label"
            )

        if label_key in seen_keys:
            raise ValueError(
                f"Criterion '{criterion_id}' expression domain "
                f"contains duplicate label key '{label_key}'"
            )

        seen_keys.add(label_key)

        normalized_labels.append(
            {
                "key": label_key,
                "label": label,
                "index": index,
            }
        )

    return {
        "criterionId": criterion_id,
        "labelCount": len(normalized_labels),
        "maximumIndex": len(normalized_labels) - 1,
        "labels": normalized_labels,
    }


def _criterion_scales(
    criteria: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    scales = [
        _criterion_scale(criterion)
        for criterion in criteria
    ]

    granularities = {
        scale["labelCount"]
        for scale in scales
    }

    if len(granularities) > 1:
        raise ValueError(
            "All linguistic2Tuple criteria must use "
            "the same number of linguistic labels"
        )

    return scales


def _weights(
    payload: GenericModelExecutionRequest,
    criteria_count: int,
) -> list[float]:
    weights = ordered_numeric_weights(
        payload,
        allow_empty=False,
        error_label="weights",
    )

    if len(weights) != criteria_count:
        raise ValueError(
            "weights length must match the number of criteria"
        )

    for index, weight in enumerate(weights):
        if weight < 0:
            raise ValueError(
                f"weights[{index}] must be greater than or equal to 0"
            )

    total_weight = sum(weights)

    if total_weight <= 0:
        raise ValueError(
            "Criteria weights must contain at least one positive weight"
        )

    return [
        float(weight / total_weight)
        for weight in weights
    ]


def _input(
    payload: GenericModelExecutionRequest,
) -> dict[str, Any]:
    extracted = extract_id_keyed_alternative_criteria_input(
        payload=payload,
        expert_key_fn=_expert_key,
        evaluation_value_fn=_evaluation_value,
        require_expert_weights=True,
    )

    criterion_items = extracted["criterion_items"]
    matrices = extracted["matrices"]

    return {
        **extracted,
        "expert_keys": list(matrices.keys()),
        "expert_labels": [
            _expert_label(evaluation.get("expert") or {}, index)
            for index, evaluation in enumerate(payload.evaluations or [])
        ],
        "weights": _weights(
            payload,
            len(criterion_items),
        ),
        "criterion_directions": [
            _criterion_type(criterion.get("type"))
            for criterion in criterion_items
        ],
        "criterion_scales": _criterion_scales(
            criterion_items
        ),
    }


def _output(
    *,
    run_result: dict[str, Any],
    execution_input: dict[str, Any],
) -> dict[str, Any]:
    ranking_indexes = run_result.get("collective_ranking")
    collective_scores = run_result.get("collective_scores")

    if not isinstance(ranking_indexes, list):
        raise ValueError(
            "2-Tuple TOPSIS output is missing collective_ranking"
        )

    if not isinstance(collective_scores, list):
        raise ValueError(
            "2-Tuple TOPSIS output is missing collective_scores"
        )

    alternative_ids = execution_input["alternative_ids"]
    alternative_names = execution_input["alternative_names"]
    criterion_ids = execution_input["criterion_ids"]

    if len(ranking_indexes) != len(alternative_ids):
        raise ValueError(
            "2-Tuple TOPSIS collective_ranking length must match "
            "the number of alternatives"
        )

    if len(collective_scores) != len(alternative_ids):
        raise ValueError(
            "2-Tuple TOPSIS collective_scores length must match "
            "the number of alternatives"
        )

    ranked_alternatives: list[dict[str, Any]] = []
    seen_indexes: set[int] = set()

    for rank_position, raw_index in enumerate(
        ranking_indexes,
        start=1,
    ):
        alternative_index = int(raw_index)

        if (
            alternative_index < 0
            or alternative_index >= len(alternative_ids)
        ):
            raise ValueError(
                "2-Tuple TOPSIS collective_ranking "
                "contains out-of-range index"
            )

        if alternative_index in seen_indexes:
            raise ValueError(
                "2-Tuple TOPSIS collective_ranking "
                "contains duplicate alternative index"
            )

        seen_indexes.add(alternative_index)

        score = float(
            collective_scores[alternative_index]
        )

        ranked_alternatives.append(
            {
                "alternativeId": alternative_ids[
                    alternative_index
                ],
                "name": alternative_names[
                    alternative_index
                ],
                "score": score,
                "rank": rank_position,
            }
        )

    collective_evaluations = (
        normalize_collective_evaluations_by_ids(
            collective_matrix=run_result.get(
                "collective_matrix"
            ),
            alternative_ids=alternative_ids,
            criterion_ids=criterion_ids,
        )
    )

    plots_graphic = dict(run_result.get("plots_graphic") or {})

    if "expert_points" in plots_graphic:
        # The shared projection contract keeps expert points in evaluation
        # order. Keep stable IDs and human-readable display labels alongside
        # the points without changing the mathematical projection.
        plots_graphic["expert_ids"] = list(
            execution_input["expert_keys"]
        )
        plots_graphic["expert_labels"] = list(
            execution_input["expert_labels"]
        )

    raw_output = {
        **run_result,
        "alternative_ids": list(
            execution_input["alternative_ids"]
        ),
        "alternative_names": list(
            execution_input["alternative_names"]
        ),
        "criterion_ids": list(
            execution_input["criterion_ids"]
        ),
        "criterion_names": list(
            execution_input["criterion_names"]
        ),
        "expert_keys": list(
            execution_input["expert_keys"]
        ),
        "criterion_scales": execution_input[
            "criterion_scales"
        ],
    }

    return {
        "rankedAlternatives": ranked_alternatives,
        "collectiveEvaluations": collective_evaluations,
        "plotsGraphic": plots_graphic,
        "consensusMeasure": None,
        "rawOutput": raw_output,
    }


def execute_topsis_2tuple(
    request: GenericModelExecutionRequest,
) -> dict[str, Any] | JSONResponse:
    try:
        execution_input = _input(request)

        results = run_topsis_2tuple(
            matrices=execution_input["matrices"],
            expert_weights=execution_input[
                "expert_weights"
            ],
            weights=execution_input["weights"],
            criterion_directions=execution_input[
                "criterion_directions"
            ],
            criterion_scales=execution_input[
                "criterion_scales"
            ],
        )

        return success_response(
            "2-Tuple TOPSIS executed successfully",
            _output(
                run_result=results,
                execution_input=execution_input,
            ),
        )

    except ValueError as error:
        return error_response(
            str(error),
        )

    except Exception as error:
        return error_response(
            f"Error executing 2-Tuple TOPSIS: {error}",
            code="INTERNAL_ERROR",
        )
