from typing import Any
import math

from fastapi.responses import JSONResponse
import numpy as np

from schemas.model_requests import GenericModelExecutionRequest
from services.criteria_weights import ordered_numeric_weights
from services.model_executors.responses import error_response, success_response
from .run import run_herrera_viedma


def _expert_key(expert: dict[str, Any], index: int) -> str:
    for field in ("id", "email", "name"):
        value = expert.get(field)
        if value is None:
            continue

        normalized = str(value).strip()
        if normalized:
            return normalized

    return f"expert_{index + 1}"


def _finite_number(value: Any, field: str) -> float:
    number = float(value)

    if number != number or number in {float("inf"), float("-inf")}:
        raise ValueError(f"{field} must be a finite number")

    return number


def _as_list(value: Any) -> list[Any]:
    if isinstance(value, list):
        return value

    if isinstance(value, tuple):
        return list(value)

    tolist = getattr(value, "tolist", None)
    if callable(tolist):
        converted = tolist()
        if isinstance(converted, list):
            return converted
        if isinstance(converted, tuple):
            return list(converted)

    raise ValueError("Expected a list-compatible value")


def _to_json_compatible(value: Any) -> Any:
    if isinstance(value, dict):
        return {
            str(key): _to_json_compatible(item)
            for key, item in value.items()
        }

    if isinstance(value, (list, tuple)):
        return [_to_json_compatible(item) for item in value]

    if isinstance(value, np.ndarray):
        return _to_json_compatible(value.tolist())

    if isinstance(value, np.integer):
        return int(value)

    if isinstance(value, np.floating):
        numeric_value = float(value)
        return numeric_value if math.isfinite(numeric_value) else None

    if isinstance(value, float):
        return value if math.isfinite(value) else None

    if isinstance(value, int) or value is None or isinstance(value, str) or isinstance(value, bool):
        return value

    tolist = getattr(value, "tolist", None)
    if callable(tolist):
        return _to_json_compatible(tolist())

    return str(value)


def _weights(payload: GenericModelExecutionRequest, criteria_count: int) -> list[float]:
    if criteria_count == 1:
        return [1.0]

    weights = ordered_numeric_weights(
        payload,
        allow_empty=False,
        error_label="weights",
    )

    if len(weights) == 0:
        raise ValueError(
            "weights are required for Herrera-Viedma CRP when multiple criteria are used"
        )

    if len(weights) != criteria_count:
        raise ValueError("weights length must match the number of criteria")

    return weights


def _input(payload: GenericModelExecutionRequest) -> dict[str, Any]:
    context = payload.context or {}
    alternatives = context.get("alternatives") or []
    criteria = context.get("criteria") or []
    evaluations = payload.evaluations or []

    if len(alternatives) == 0:
        raise ValueError("context.alternatives is required")
    if len(criteria) == 0:
        raise ValueError("context.criteria is required")
    if len(evaluations) == 0:
        raise ValueError("evaluations must include at least one expert payload")

    alternative_items: list[dict[str, str]] = []
    for index, item in enumerate(alternatives):
        alternative_id = str(item.get("id") or "").strip()
        alternative_name = str(item.get("name") or "").strip()
        if not alternative_id:
            raise ValueError(f"context.alternatives[{index}] requires a non-empty id")
        if not alternative_name:
            raise ValueError(f"context.alternatives[{index}] requires a non-empty name")
        alternative_items.append({"id": alternative_id, "name": alternative_name})

    criterion_items: list[dict[str, str]] = []
    for index, item in enumerate(criteria):
        criterion_id = str(item.get("id") or "").strip()
        criterion_name = str(item.get("name") or "").strip()
        if not criterion_id:
            raise ValueError(f"context.criteria[{index}] requires a non-empty id")
        if not criterion_name:
            raise ValueError(f"context.criteria[{index}] requires a non-empty name")
        criterion_items.append({"id": criterion_id, "name": criterion_name})

    alternative_ids = [item["id"] for item in alternative_items]
    alternative_names = [item["name"] for item in alternative_items]
    criterion_ids = [item["id"] for item in criterion_items]
    criterion_names = [item["name"] for item in criterion_items]

    weights = _weights(payload, len(criteria))
    matrices: dict[str, dict[str, list[list[float]]]] = {}
    seen_expert_keys: set[str] = set()

    criteria_count = len(criterion_ids)
    alternatives_count = len(alternative_ids)

    for expert_index, evaluation in enumerate(evaluations):
        expert = evaluation.get("expert") or {}
        evaluation_payload = evaluation.get("payload") or {}
        if not isinstance(evaluation_payload, dict):
            raise ValueError(f"evaluations[{expert_index}].payload is required")

        unknown_criteria = [
            criterion_key
            for criterion_key in evaluation_payload.keys()
            if criterion_key not in criterion_ids
        ]
        if unknown_criteria:
            raise ValueError(
                f"evaluations[{expert_index}].payload contains unknown criteria"
            )

        criterion_matrices: list[list[list[float]]] = []

        for criterion_index, criterion_id in enumerate(criterion_ids):
            criterion_name = criterion_names[criterion_index]
            criterion_payload = evaluation_payload.get(criterion_id)
            if not isinstance(criterion_payload, dict):
                raise ValueError(
                    f"evaluations[{expert_index}].payload['{criterion_id}'] is required"
                )

            matrix: list[list[float]] = []

            unknown_row_keys = [
                alternative_key
                for alternative_key in criterion_payload.keys()
                if alternative_key not in alternative_ids
            ]
            if unknown_row_keys:
                raise ValueError(
                    f"evaluations[{expert_index}].payload['{criterion_id}'] contains unknown row keys"
                )

            for row_index, row_alternative_id in enumerate(alternative_ids):
                row_alternative_name = alternative_names[row_index]
                row_payload = criterion_payload.get(row_alternative_id)
                if not isinstance(row_payload, dict):
                    raise ValueError(
                        f"evaluations[{expert_index}].payload['{criterion_id}']['{row_alternative_id}'] is required"
                    )

                row: list[float] = []
                unknown_col_keys = [
                    alternative_key
                    for alternative_key in row_payload.keys()
                    if alternative_key not in alternative_ids or alternative_key == row_alternative_id
                ]
                if unknown_col_keys:
                    raise ValueError(
                        f"evaluations[{expert_index}].payload['{criterion_id}']['{row_alternative_id}'] contains unknown column keys"
                    )

                for col_index, col_alternative_id in enumerate(alternative_ids):
                    col_alternative_name = alternative_names[col_index]
                    if row_alternative_id == col_alternative_id:
                        row.append(0.5)
                        continue

                    cell = row_payload.get(col_alternative_id)
                    if not isinstance(cell, dict):
                        raise ValueError(
                            f"evaluations[{expert_index}].payload['{criterion_id}']['{row_alternative_id}']['{col_alternative_id}'] is required"
                        )

                    value = cell.get("value")
                    if value is None or value == "":
                        raise ValueError(
                            f"evaluations[{expert_index}].payload['{criterion_id}']['{row_alternative_id}']['{col_alternative_id}'].value is required"
                        )

                    row.append(
                        _finite_number(
                            value,
                            f"evaluations[{expert_index}].payload['{criterion_id}']['{row_alternative_id}']['{col_alternative_id}'].value",
                        )
                    )

                matrix.append(row)

            criterion_matrices.append(matrix)

        if criteria_count == 1:
            expert_matrix = criterion_matrices[0]
        else:
            expert_matrix: list[list[float]] = []

            for row_index in range(alternatives_count):
                row: list[float] = []

                for column_index in range(alternatives_count):
                    if row_index == column_index:
                        row.append(0.5)
                        continue

                    aggregated_value = 0.0
                    for criterion_index in range(criteria_count):
                        aggregated_value += (
                            weights[criterion_index]
                            * criterion_matrices[criterion_index][row_index][column_index]
                        )

                    row.append(aggregated_value)

                expert_matrix.append(row)

        expert_key = _expert_key(expert, expert_index)
        if expert_key in seen_expert_keys:
            expert_key = f"{expert_key}_{expert_index + 1}"
        seen_expert_keys.add(expert_key)

        matrices[expert_key] = {criterion_ids[0]: expert_matrix}

    return {
        "matrices": matrices,
        "alternative_ids": alternative_ids,
        "alternative_names": alternative_names,
        "criterion_ids": criterion_ids,
        "criterion_names": criterion_names,
        "aggregated_criterion_id": criterion_ids[0],
        "weights": weights,
    }


def _normalize_pairwise_collective_evaluations(
    *,
    source: Any,
    alternative_ids: list[str],
    aggregated_criterion_id: str,
) -> dict[str, dict[str, dict[str, Any]]]:
    if not isinstance(source, dict):
        return {}

    matrix = source.get(aggregated_criterion_id)
    if not isinstance(matrix, list):
        return {}

    collective_evaluations: dict[str, dict[str, dict[str, Any]]] = {
        aggregated_criterion_id: {}
    }

    for row_index, row_alternative_id in enumerate(alternative_ids):
        row = matrix[row_index] if row_index < len(matrix) else None
        if not isinstance(row, list):
            continue

        collective_evaluations[aggregated_criterion_id][row_alternative_id] = {}
        for col_index, col_alternative_id in enumerate(alternative_ids):
            if row_alternative_id == col_alternative_id:
                continue

            collective_evaluations[aggregated_criterion_id][row_alternative_id][
                col_alternative_id
            ] = row[col_index] if col_index < len(row) else ""

    return collective_evaluations


def _normalize_suggested_next_evaluations(
    *,
    source: Any,
) -> dict[str, dict[str, Any]]:
    if not isinstance(source, dict):
        return {}

    if len(source) == 0:
        return {}

    normalized_suggestions: dict[str, dict[str, Any]] = {}

    for expert_id, expert_suggestion in source.items():
        if not isinstance(expert_suggestion, dict):
            raise ValueError(
                f"Herrera-Viedma suggested_next_evaluations['{expert_id}'] must be an object"
            )

        payload = expert_suggestion.get("payload")
        if not isinstance(payload, dict):
            raise ValueError(
                f"Herrera-Viedma suggested_next_evaluations['{expert_id}'].payload must be an object"
            )

        normalized_suggestions[str(expert_id)] = {
            "payload": payload
        }

    return normalized_suggestions


def _output(
    *,
    run_result: dict[str, Any],
    alternative_ids: list[str],
    alternative_names: list[str],
    aggregated_criterion_id: str,
) -> dict[str, Any]:
    safe_run_result = _to_json_compatible(run_result)

    rankings_history = _as_list(safe_run_result.get("alternatives_rankings"))
    if len(rankings_history) == 0:
        raise ValueError("Herrera-Viedma output is missing alternatives_rankings")

    collective_ranking_indexes = _as_list(rankings_history[-1])

    ranking_indexes_normalized: list[int] = []
    for index in collective_ranking_indexes:
        alternative_index = int(index)
        if alternative_index < 0 or alternative_index >= len(alternative_names):
            raise ValueError("Herrera-Viedma collective ranking contains out-of-range index")
        ranking_indexes_normalized.append(alternative_index)

    if len(ranking_indexes_normalized) == 0:
        raise ValueError("Herrera-Viedma collective ranking is empty")

    collective_scores = _as_list(safe_run_result.get("collective_scores"))
    scores_by_alternative = {
        alternative_names[index]: float(score)
        for index, score in enumerate(collective_scores)
        if index < len(alternative_names)
    }
    ranked_alternatives = []
    for rank_position, alternative_index in enumerate(ranking_indexes_normalized, start=1):
        alternative_name = alternative_names[alternative_index]
        if alternative_name not in scores_by_alternative:
            raise ValueError(
                f"Herrera-Viedma collective_scores is missing value for '{alternative_name}'"
            )
        ranked_alternatives.append(
            {
                "alternativeId": alternative_ids[alternative_index],
                "name": alternative_name,
                "score": float(scores_by_alternative[alternative_name]),
                "rank": rank_position,
            }
        )

    consensus_measure = _finite_number(safe_run_result.get("cm"), "cm")

    collective_evaluations = safe_run_result.get("collective_evaluations")
    if not isinstance(collective_evaluations, dict):
        collective_evaluations = {}

    plots_graphic = safe_run_result.get("plots_graphic")
    if not isinstance(plots_graphic, dict):
        plots_graphic = {}

    safe_run_result["suggested_next_evaluations"] = _normalize_suggested_next_evaluations(
        source=safe_run_result.get("suggested_next_evaluations"),
    )

    return {
        "rankedAlternatives": ranked_alternatives,
        "collectiveEvaluations": _normalize_pairwise_collective_evaluations(
            source=collective_evaluations,
            alternative_ids=alternative_ids,
            aggregated_criterion_id=aggregated_criterion_id,
        ),
        "plotsGraphic": plots_graphic,
        "consensusMeasure": consensus_measure,
        "rawOutput": safe_run_result,
    }


def execute_herrera_viedma(
    payload: GenericModelExecutionRequest,
) -> dict[str, Any] | JSONResponse:
    try:
        execution_input = _input(payload)
        model_parameters = payload.modelParameters or {}
        context = payload.context or {}
        issue_context = context.get("issue") if isinstance(context, dict) else {}
        if not isinstance(issue_context, dict):
            issue_context = {}

        consensus_threshold = float(
            issue_context.get(
                "consensusThreshold",
                model_parameters.get("consensusThreshold", 0.7),
            )
        )

        results = run_herrera_viedma(
            execution_input["matrices"],
            cl=consensus_threshold,
            ag_lq=model_parameters.get("ag_lq") or [0.3, 0.8],
            ex_lq=model_parameters.get("ex_lq") or [0.5, 1.0],
            b=float(model_parameters.get("b", 1)),
            beta=float(model_parameters.get("beta", 0.8)),
            w_crit=[1.0],
            criterion_id=execution_input["aggregated_criterion_id"],
            alternative_ids=execution_input["alternative_ids"],
            alternative_names=execution_input["alternative_names"],
        )

        return success_response(
            "Herrera Viedma CRP executed successfully",
            _output(
                run_result=results,
                alternative_ids=execution_input["alternative_ids"],
                alternative_names=execution_input["alternative_names"],
                aggregated_criterion_id=execution_input["aggregated_criterion_id"],
            ),
        )
    except Exception as error:
        return error_response(
            f"Error executing Herrera Viedma CRP: {error}",
            code="INTERNAL_ERROR",
        )
