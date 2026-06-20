from typing import Any

from fastapi.responses import JSONResponse

from schemas.model_requests import GenericModelExecutionRequest
from services.criteria_weights import ordered_numeric_weights
from services.model_executors.responses import error_response, success_response
from .run import run_aras


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
        return _average(
            _linguistic_values(
                label=value,
                expression_domain=expression_domain,
                field=field,
            )
        )

    if isinstance(value, list):
        return _average(
            [
                _finite_number(item, f"{field}.value[{index}]")
                for index, item in enumerate(value)
            ]
        )

    return _finite_number(value, f"{field}.value")


def _weights(payload: GenericModelExecutionRequest, criteria_count: int) -> list[float]:
    weights = ordered_numeric_weights(
        payload,
        allow_empty=False,
        error_label="weights",
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

    alternative_names = [str(item.get("name") or "").strip() for item in alternatives]
    criterion_names = [str(item.get("name") or "").strip() for item in criteria]

    if any(name == "" for name in alternative_names):
        raise ValueError("Every context.alternatives item requires a non-empty name")
    if any(name == "" for name in criterion_names):
        raise ValueError("Every context.criteria item requires a non-empty name")

    matrices: dict[str, list[list[float]]] = {}
    seen_expert_keys: set[str] = set()

    for expert_index, evaluation in enumerate(evaluations):
        expert = evaluation.get("expert") or {}
        evaluation_payload = evaluation.get("payload") or {}
        cells = evaluation_payload.get("cells")

        if not isinstance(cells, dict):
            raise ValueError(f"evaluations[{expert_index}].payload.cells is required")

        expert_key = _expert_key(expert, expert_index)
        if expert_key in seen_expert_keys:
            expert_key = f"{expert_key}_{expert_index + 1}"
        seen_expert_keys.add(expert_key)

        matrix: list[list[float]] = []

        for alternative_name in alternative_names:
            row: list[float] = []

            for criterion_name in criterion_names:
                cell_key = f"{alternative_name}::{criterion_name}"
                cell = cells.get(cell_key)

                if not isinstance(cell, dict):
                    raise ValueError(
                        f"evaluations[{expert_index}].payload.cells['{cell_key}'] is required"
                    )

                row.append(
                    _cell_value(
                        cell,
                        f"evaluations[{expert_index}].payload.cells['{cell_key}']",
                    )
                )

            matrix.append(row)

        matrices[expert_key] = matrix

    return {
        "matrices": matrices,
        "weights": _weights(payload, len(criteria)),
        "criterion_directions": [_criterion_type(item.get("type")) for item in criteria],
        "alternative_names": alternative_names,
        "criterion_names": criterion_names,
    }


def _normalize_collective_evaluations(
    *,
    collective_matrix: Any,
    alternative_names: list[str],
    criterion_names: list[str],
) -> dict[str, dict[str, Any]]:
    if not isinstance(collective_matrix, list):
        return {}

    collective_evaluations: dict[str, dict[str, Any]] = {}

    for row_index, alternative_name in enumerate(alternative_names):
        row = collective_matrix[row_index] if row_index < len(collective_matrix) else None
        if not isinstance(row, list):
            continue

        collective_evaluations[alternative_name] = {}
        for criterion_index, criterion_name in enumerate(criterion_names):
            collective_evaluations[alternative_name][criterion_name] = (
                row[criterion_index] if criterion_index < len(row) else ""
            )

    return collective_evaluations


def _output(
    *,
    run_result: dict[str, Any],
    alternative_names: list[str],
    criterion_names: list[str],
) -> dict[str, Any]:
    ranking_indexes = run_result.get("collective_ranking")
    collective_scores = run_result.get("collective_scores")

    if not isinstance(ranking_indexes, list):
        raise ValueError("ARAS output is missing collective_ranking")
    if not isinstance(collective_scores, list):
        raise ValueError("ARAS output is missing collective_scores")

    ranking = [alternative_names[int(index)] for index in ranking_indexes]
    if len(ranking) == 0:
        raise ValueError("ARAS output collective_ranking is empty")

    ranked_alternatives = []
    for rank_position, alternative_name in enumerate(ranking, start=1):
        alternative_index = alternative_names.index(alternative_name)
        score = collective_scores[alternative_index]
        ranked_alternatives.append(
            {
                "alternativeId": None,
                "name": alternative_name,
                "score": float(score),
                "rank": rank_position,
            }
        )

    return {
        "rankedAlternatives": ranked_alternatives,
        "collectiveEvaluations": _normalize_collective_evaluations(
            collective_matrix=run_result.get("collective_matrix"),
            alternative_names=alternative_names,
            criterion_names=criterion_names,
        ),
        "plotsGraphic": run_result.get("plots_graphic") or {},
        "consensusMeasure": None,
        "rawOutput": run_result,
    }


def execute_aras(payload: GenericModelExecutionRequest) -> dict[str, Any] | JSONResponse:
    try:
        execution_input = _input(payload)

        results = run_aras(
            execution_input["matrices"],
            weights=execution_input["weights"],
            criterion_type=execution_input["criterion_directions"],
        )

        return success_response(
            "Aras executed successfully",
            _output(
                run_result=results,
                alternative_names=execution_input["alternative_names"],
                criterion_names=execution_input["criterion_names"],
            ),
        )
    except Exception as error:
        return error_response(f"Error executing Aras: {error}", code="INTERNAL_ERROR")
