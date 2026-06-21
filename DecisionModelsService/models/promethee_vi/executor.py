from typing import Any

from fastapi.responses import JSONResponse

from schemas.model_requests import GenericModelExecutionRequest
from services.model_executors.responses import error_response, success_response
from models.shared_alternative_matrix import (
    extract_id_keyed_alternative_criteria_input,
    normalize_collective_evaluations_by_ids,
)
from .run import run_promethee_vi


SUPPORTED_PREFERENCE_FUNCTIONS = {"t1", "t2", "t3", "t4", "t5", "t6", "t7"}


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


def _criterion_map_values(
    *,
    model_parameters: dict[str, Any],
    parameter_key: str,
    criteria: list[dict[str, Any]],
    field: str,
) -> list[float]:
    raw_map = model_parameters.get(parameter_key)
    if not isinstance(raw_map, dict):
        raise ValueError(f"modelParameters.{parameter_key} must be an object keyed by criterion")

    values = []

    for index, criterion in enumerate(criteria):
        criterion_id = str(criterion.get("id") or "").strip()
        criterion_name = str(criterion.get("name") or f"criterion_{index + 1}").strip()
        if not criterion_id:
            raise ValueError(f"context.criteria[{index}] must include a non-empty id")
        if criterion_id not in raw_map:
            raise ValueError(f"{field} is missing value for criterion '{criterion_name}'")

        values.append(_finite_number(raw_map[criterion_id], f"{field}.{criterion_id}"))

    return values


def _criterion_select_values(
    *,
    model_parameters: dict[str, Any],
    parameter_key: str,
    criteria: list[dict[str, Any]],
    field: str,
) -> list[str]:
    raw_map = model_parameters.get(parameter_key)
    if not isinstance(raw_map, dict):
        raise ValueError(f"modelParameters.{parameter_key} must be an object keyed by criterion")

    values = []

    for index, criterion in enumerate(criteria):
        criterion_id = str(criterion.get("id") or "").strip()
        criterion_name = str(criterion.get("name") or f"criterion_{index + 1}").strip()
        if not criterion_id:
            raise ValueError(f"context.criteria[{index}] must include a non-empty id")
        if criterion_id not in raw_map:
            raise ValueError(f"{field} is missing value for criterion '{criterion_name}'")

        value = str(raw_map[criterion_id] or "").strip()
        if value not in SUPPORTED_PREFERENCE_FUNCTIONS:
            raise ValueError(
                f"{field}.{criterion_id} must be one of {sorted(SUPPORTED_PREFERENCE_FUNCTIONS)}"
            )

        values.append(value)

    return values


def _input(payload: GenericModelExecutionRequest) -> dict[str, Any]:
    context = payload.context or {}
    model_parameters = payload.modelParameters or {}
    criteria = context.get("criteria") or []
    extracted = extract_id_keyed_alternative_criteria_input(
        payload=payload,
        expert_key_fn=_expert_key,
        cell_value_fn=_cell_value,
    )

    return {
        **extracted,
        "q_thresholds": _criterion_map_values(
            model_parameters=model_parameters,
            parameter_key="q",
            criteria=criteria,
            field="Q thresholds",
        ),
        "s_thresholds": _criterion_map_values(
            model_parameters=model_parameters,
            parameter_key="s",
            criteria=criteria,
            field="S thresholds",
        ),
        "p_thresholds": _criterion_map_values(
            model_parameters=model_parameters,
            parameter_key="p",
            criteria=criteria,
            field="P thresholds",
        ),
        "preference_functions": _criterion_select_values(
            model_parameters=model_parameters,
            parameter_key="f",
            criteria=criteria,
            field="Preference functions",
        ),
        "weights_lower": _criterion_map_values(
            model_parameters=model_parameters,
            parameter_key="w_lower",
            criteria=criteria,
            field="Lower weight bounds",
        ),
        "weights_upper": _criterion_map_values(
            model_parameters=model_parameters,
            parameter_key="w_upper",
            criteria=criteria,
            field="Upper weight bounds",
        ),
        "iterations": int(_finite_number(model_parameters.get("iterations", 1000), "iterations")),
        "topn": len(extracted["alternative_items"]),
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


def _ranked_alternatives_from_promethee(
    *,
    ranking_rows: list[list[Any]],
    alternative_ids: list[str],
    alternative_names: list[str],
) -> list[dict[str, Any]]:
    ranked_alternatives = []

    for rank_position, row in enumerate(ranking_rows, start=1):
        if not isinstance(row, list) or len(row) < 2:
            raise ValueError("PROMETHEE VI ranking row must contain alternative index and score")

        pydecision_index = int(row[0])
        alternative_index = pydecision_index - 1

        if alternative_index < 0 or alternative_index >= len(alternative_names):
            raise ValueError(f"PROMETHEE VI returned invalid alternative index: {pydecision_index}")

        ranked_alternatives.append(
            {
                "alternativeId": alternative_ids[alternative_index],
                "name": alternative_names[alternative_index],
                "score": float(row[1]),
                "rank": rank_position,
            }
        )

    return ranked_alternatives


def _output(
    *,
    run_result: dict[str, Any],
    alternative_ids: list[str],
    alternative_names: list[str],
    criterion_ids: list[str],
) -> dict[str, Any]:
    favorable_ranking = run_result.get("favorable_ranking")

    if not isinstance(favorable_ranking, list):
        raise ValueError("PROMETHEE VI output is missing favorable_ranking")

    return {
        "rankedAlternatives": _ranked_alternatives_from_promethee(
            ranking_rows=favorable_ranking,
            alternative_ids=alternative_ids,
            alternative_names=alternative_names,
        ),
        "collectiveEvaluations": _normalize_collective_evaluations(
            collective_matrix=run_result.get("collective_matrix"),
            alternative_ids=alternative_ids,
            criterion_ids=criterion_ids,
        ),
        "plotsGraphic": run_result.get("plots_graphic") or {},
        "consensusMeasure": None,
        "rawOutput": run_result,
    }


def execute_promethee_vi(payload: GenericModelExecutionRequest) -> dict[str, Any] | JSONResponse:
    try:
        execution_input = _input(payload)

        results = run_promethee_vi(
            execution_input["matrices"],
            q_thresholds=execution_input["q_thresholds"],
            s_thresholds=execution_input["s_thresholds"],
            p_thresholds=execution_input["p_thresholds"],
            preference_functions=execution_input["preference_functions"],
            weights_lower=execution_input["weights_lower"],
            weights_upper=execution_input["weights_upper"],
            iterations=execution_input["iterations"],
            topn=execution_input["topn"],
        )

        return success_response(
            "PROMETHEE VI executed successfully",
            _output(
                run_result=results,
                alternative_ids=execution_input["alternative_ids"],
                alternative_names=execution_input["alternative_names"],
                criterion_ids=execution_input["criterion_ids"],
            ),
        )
    except Exception as error:
        return error_response(
            f"Error executing PROMETHEE VI: {error}",
            code="INTERNAL_ERROR",
        )
