from typing import Any

from fastapi.responses import JSONResponse

from schemas.model_requests import GenericModelExecutionRequest
from services.model_executors.responses import error_response, success_response
from models.shared_alternative_matrix import (
    extract_id_keyed_alternative_criteria_input,
    normalize_collective_evaluations_by_ids,
)
from .run import run_borda


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


def _finite_number(value: Any, field: str) -> float:
    number = float(value)

    if number != number or number in {float("inf"), float("-inf")}:
        raise ValueError(f"{field} must be a finite number")

    return number


def _average(values: list[float]) -> float:
    return float(sum(values) / len(values))


def _linguistic_values(
    *,
    label: Any,
    expression_domain: dict[str, Any],
    field: str,
) -> list[float]:
    normalized_label = str(label or "").strip()
    labels = expression_domain.get("linguisticLabels")

    if not normalized_label:
        raise ValueError(f"{field}.value is required")

    if not isinstance(labels, list):
        raise ValueError(f"{field}.expressionDomain.linguisticLabels is required")

    for label_definition in labels:
        if not isinstance(label_definition, dict):
            continue

        current_label = str(label_definition.get("label") or "").strip()
        if current_label != normalized_label:
            continue

        values = label_definition.get("values")
        if not isinstance(values, list) or len(values) == 0:
            raise ValueError(f"{field}.expressionDomain label values are required")

        return [
            _finite_number(item, f"{field}.expressionDomain.linguisticLabels.values[{index}]")
            for index, item in enumerate(values)
        ]

    raise ValueError(f"Unknown linguistic label '{normalized_label}'")


def _cell_value(cell: dict[str, Any], field: str) -> float:
    value = cell.get("value")
    if value is None or value == "":
        raise ValueError(f"{field}.value is required")

    expression_domain = cell.get("expressionDomain")
    domain_type = ""
    if isinstance(expression_domain, dict):
        domain_type = str(expression_domain.get("type") or "").strip().lower()

    if domain_type == "linguistic":
        values = _linguistic_values(
            label=value,
            expression_domain=expression_domain,
            field=field,
        )
        return _average(values)

    if isinstance(value, list):
        return _average(
            [
                _finite_number(item, f"{field}.value[{index}]")
                for index, item in enumerate(value)
            ]
        )

    return _finite_number(value, f"{field}.value")


def _borda_input(payload: GenericModelExecutionRequest) -> dict[str, Any]:
    extracted = extract_id_keyed_alternative_criteria_input(
        payload=payload,
        expert_key_fn=_expert_key,
        cell_value_fn=_cell_value,
    )

    return {
        **extracted,
        "criterion_directions": [
            _criterion_type(item.get("type")) for item in extracted["criterion_items"]
        ],
    }


def _normalize_collective_evaluations(
    *,
    collective_matrix: Any,
    alternative_ids: list[str],
    criterion_ids: list[str],
) -> dict[str, dict[str, Any]]:
    return normalize_collective_evaluations_by_ids(
        collective_matrix=collective_matrix,
        alternative_ids=alternative_ids,
        criterion_ids=criterion_ids,
    )


def _borda_output(
    *,
    run_result: dict[str, Any],
    alternative_ids: list[str],
    alternative_names: list[str],
    criterion_ids: list[str],
) -> dict[str, Any]:
    ranking_indexes = run_result.get("collective_ranking")
    if not isinstance(ranking_indexes, list):
        raise ValueError("Borda output is missing collective_ranking")

    collective_scores = run_result.get("collective_scores")
    if not isinstance(collective_scores, list):
        raise ValueError("Borda output is missing collective_scores")

    ranking_indexes_normalized: list[int] = []
    for index in ranking_indexes:
        alternative_index = int(index)
        if alternative_index < 0 or alternative_index >= len(alternative_names):
            raise ValueError("Borda collective_ranking contains out-of-range index")
        ranking_indexes_normalized.append(alternative_index)

    scores_by_alternative: dict[str, float] = {}
    for index, score in enumerate(collective_scores):
        if index >= len(alternative_names):
            break
        scores_by_alternative[alternative_names[index]] = float(score)

    if len(ranking_indexes_normalized) == 0:
        raise ValueError("Borda output collective_ranking is empty")

    ranked_alternatives = []
    for rank_position, alternative_index in enumerate(ranking_indexes_normalized, start=1):
        alternative_name = alternative_names[alternative_index]
        ranked_alternatives.append(
            {
                "alternativeId": alternative_ids[alternative_index],
                "name": alternative_name,
                "score": float(scores_by_alternative[alternative_name]),
                "rank": rank_position,
            }
        )

    return {
        "rankedAlternatives": ranked_alternatives,
        "collectiveEvaluations": _normalize_collective_evaluations(
            collective_matrix=run_result.get("collective_matrix"),
            alternative_ids=alternative_ids,
            criterion_ids=criterion_ids,
        ),
        "plotsGraphic": run_result.get("plots_graphic") or {},
        "consensusMeasure": None,
        "rawOutput": run_result,
    }


def execute_borda(
    payload: GenericModelExecutionRequest,
) -> dict[str, Any] | JSONResponse:
    try:
        execution_input = _borda_input(payload)

        results = run_borda(
            execution_input["matrices"],
            criterion_type=execution_input["criterion_directions"],
        )

        return success_response(
            "Borda executed successfully",
            _borda_output(
                run_result=results,
                alternative_ids=execution_input["alternative_ids"],
                alternative_names=execution_input["alternative_names"],
                criterion_ids=execution_input["criterion_ids"],
            ),
        )
    except Exception as error:
        return error_response(
            f"Error executing Borda: {error}",
            code="INTERNAL_ERROR",
        )
