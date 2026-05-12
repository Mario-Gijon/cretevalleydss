from typing import Any

from fastapi.responses import JSONResponse

from models.herrera_viedma_crp.herrera_viedma_crp_model import run_herrera_viedma
from schemas.model_requests import GenericModelExecutionRequest
from services.model_executors.responses import error_response, success_response


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


def _weights(payload: GenericModelExecutionRequest, criteria_count: int) -> list[float]:
    context = payload.context or {}
    model_parameters = payload.modelParameters or {}

    raw_weights = context.get("weights") or model_parameters.get("weights") or []

    if len(raw_weights) == 0:
        raise ValueError("weights are required for Herrera-Viedma CRP")

    if len(raw_weights) != criteria_count:
        raise ValueError("weights length must match the number of criteria")

    return [
        _finite_number(weight, f"weights[{index}]")
        for index, weight in enumerate(raw_weights)
    ]


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

    weights = _weights(payload, len(criteria))
    matrices: dict[str, dict[str, list[list[float]]]] = {}
    seen_expert_keys: set[str] = set()

    criteria_count = len(criterion_names)
    alternatives_count = len(alternative_names)

    for expert_index, evaluation in enumerate(evaluations):
        expert = evaluation.get("expert") or {}
        evaluation_payload = evaluation.get("payload") or {}
        comparisons_by_criterion = evaluation_payload.get("comparisonsByCriterion")

        if not isinstance(comparisons_by_criterion, dict):
            raise ValueError(
                f"evaluations[{expert_index}].payload.comparisonsByCriterion is required"
            )

        unknown_criteria = [
            criterion_key
            for criterion_key in comparisons_by_criterion.keys()
            if criterion_key not in criterion_names
        ]
        if unknown_criteria:
            raise ValueError(
                f"evaluations[{expert_index}].payload.comparisonsByCriterion contains unknown criteria"
            )

        criterion_matrices: list[list[list[float]]] = []

        for criterion_name in criterion_names:
            criterion_payload = comparisons_by_criterion.get(criterion_name)
            if not isinstance(criterion_payload, dict):
                raise ValueError(
                    f"evaluations[{expert_index}].payload.comparisonsByCriterion['{criterion_name}'] is required"
                )

            expected_pair_keys: set[str] = set()
            matrix: list[list[float]] = []

            for row_alternative in alternative_names:
                row: list[float] = []

                for col_alternative in alternative_names:
                    if row_alternative == col_alternative:
                        row.append(0.0)
                        continue

                    pair_key = f"{row_alternative}::{col_alternative}"
                    expected_pair_keys.add(pair_key)

                    cell = criterion_payload.get(pair_key)
                    if not isinstance(cell, dict):
                        raise ValueError(
                            f"evaluations[{expert_index}].payload.comparisonsByCriterion['{criterion_name}']['{pair_key}'] is required"
                        )

                    value = cell.get("value")
                    if value is None or value == "":
                        raise ValueError(
                            f"evaluations[{expert_index}].payload.comparisonsByCriterion['{criterion_name}']['{pair_key}'].value is required"
                        )

                    row.append(
                        _finite_number(
                            value,
                            f"evaluations[{expert_index}].payload.comparisonsByCriterion['{criterion_name}']['{pair_key}'].value",
                        )
                    )

                matrix.append(row)

            unknown_pairs = [
                pair_key
                for pair_key in criterion_payload.keys()
                if pair_key not in expected_pair_keys
            ]
            if unknown_pairs:
                raise ValueError(
                    f"evaluations[{expert_index}].payload.comparisonsByCriterion['{criterion_name}'] contains unknown pair keys"
                )

            criterion_matrices.append(matrix)

        if criteria_count == 1:
            expert_matrix = criterion_matrices[0]
        else:
            expert_matrix: list[list[float]] = []

            for row_index in range(alternatives_count):
                row: list[float] = []

                for column_index in range(alternatives_count):
                    if row_index == column_index:
                        row.append(0.0)
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

        matrices[expert_key] = {"preference": expert_matrix}

    return {
        "matrices": matrices,
        "alternative_names": alternative_names,
        "criterion_names": criterion_names,
        "weights": weights,
    }


def _output(*, run_result: dict[str, Any], alternative_names: list[str]) -> dict[str, Any]:
    rankings_history = _as_list(run_result.get("alternatives_rankings"))
    if len(rankings_history) == 0:
        raise ValueError("Herrera-Viedma output is missing alternatives_rankings")

    collective_ranking_indexes = _as_list(rankings_history[-1])

    ranking: list[str] = []
    for index in collective_ranking_indexes:
        alternative_index = int(index)
        if alternative_index < 0 or alternative_index >= len(alternative_names):
            raise ValueError("Herrera-Viedma collective ranking contains out-of-range index")
        ranking.append(alternative_names[alternative_index])

    collective_scores = _as_list(run_result.get("collective_scores"))
    scores_by_alternative = {
        alternative_names[index]: float(score)
        for index, score in enumerate(collective_scores)
        if index < len(alternative_names)
    }

    consensus_measure = _finite_number(run_result.get("cm"), "cm")

    collective_evaluations = run_result.get("collective_evaluations")
    if not isinstance(collective_evaluations, dict):
        collective_evaluations = {}

    plots_graphic = run_result.get("plots_graphic")
    if not isinstance(plots_graphic, dict):
        plots_graphic = {}

    return {
        "ranking": ranking,
        "rankedWithScores": [
            {"name": name, "score": scores_by_alternative.get(name)}
            for name in ranking
        ],
        "scoresByAlternative": scores_by_alternative,
        "matrixUsed": {
            "collectiveEvaluations": collective_evaluations,
        },
        "collectivePayload": {
            "collectiveEvaluations": collective_evaluations,
        },
        "plotsGraphic": plots_graphic,
        "consensusMeasure": consensus_measure,
        "rawOutput": run_result,
    }


def execute_herrera_viedma(
    payload: GenericModelExecutionRequest,
) -> dict[str, Any] | JSONResponse:
    try:
        execution_input = _input(payload)
        model_parameters = payload.modelParameters or {}

        consensus_threshold = float(model_parameters.get("consensusThreshold", 0.7))

        results = run_herrera_viedma(
            execution_input["matrices"],
            cl=consensus_threshold,
            ag_lq=model_parameters.get("ag_lq") or [0.3, 0.8],
            ex_lq=model_parameters.get("ex_lq") or [0.5, 1.0],
            b=float(model_parameters.get("b", 1)),
            beta=float(model_parameters.get("beta", 0.8)),
            w_crit=[1.0],
        )

        return success_response(
            "Herrera Viedma CRP executed successfully",
            _output(
                run_result=results,
                alternative_names=execution_input["alternative_names"],
            ),
        )
    except Exception as error:
        return error_response(
            f"Error executing Herrera Viedma CRP: {error}",
            code="INTERNAL_ERROR",
        )