from typing import Any, Callable

from schemas.model_requests import GenericModelExecutionRequest
from models.shared_expression_domains import (
    SUPPORTED_EXPRESSION_DOMAIN_TYPE_KEYS,
    expression_domain_type_key,
)

EXPERT_WEIGHT_SUM_EPSILON = 0.0015


def extract_id_keyed_alternative_criteria_input(
    *,
    payload: GenericModelExecutionRequest,
    expert_key_fn: Callable[[dict[str, Any], int], str],
    evaluation_value_fn: Callable[[Any, dict[str, Any], str], Any],
    require_expert_weights: bool = False,
) -> dict[str, Any]:
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

    alternative_items = []
    for item in alternatives:
        alternative_id = str(item.get("id") or "").strip()
        alternative_name = str(item.get("name") or "").strip()
        if not alternative_id:
            raise ValueError("Every context.alternatives item requires a non-empty id")
        if not alternative_name:
            raise ValueError("Every context.alternatives item requires a non-empty name")
        alternative_items.append({"id": alternative_id, "name": alternative_name})

    criterion_items = []
    for item in criteria:
        criterion_id = str(item.get("id") or "").strip()
        criterion_name = str(item.get("name") or "").strip()
        expression_domain = item.get("expressionDomain")
        if not criterion_id:
            raise ValueError("Every context.criteria item requires a non-empty id")
        if not criterion_name:
            raise ValueError("Every context.criteria item requires a non-empty name")
        if not isinstance(expression_domain, dict):
            raise ValueError(
                "Every context.criteria item requires an expressionDomain object"
            )

        if expression_domain_type_key(expression_domain) not in SUPPORTED_EXPRESSION_DOMAIN_TYPE_KEYS:
            raise ValueError(
                "Every context.criteria item requires a supported expressionDomain.typeKey"
            )

        criterion_items.append(
            {
                "id": criterion_id,
                "name": criterion_name,
                "type": item.get("type"),
                "expressionDomain": expression_domain,
            }
        )

    alternative_ids = [item["id"] for item in alternative_items]
    criterion_ids = [item["id"] for item in criterion_items]
    alternative_names = [item["name"] for item in alternative_items]
    criterion_names = [item["name"] for item in criterion_items]

    matrices: dict[str, list[list[float]]] = {}
    expert_weights: list[float] = []
    seen_expert_keys: set[str] = set()

    for expert_index, evaluation in enumerate(evaluations):
        expert = evaluation.get("expert") or {}
        evaluation_payload = evaluation.get("payload") or {}

        if not isinstance(evaluation_payload, dict):
            raise ValueError(f"evaluations[{expert_index}].payload is required")

        expert_key = expert_key_fn(expert, expert_index)
        if expert_key in seen_expert_keys:
            expert_key = f"{expert_key}_{expert_index + 1}"
        seen_expert_keys.add(expert_key)

        matrix: list[list[float]] = []
        unknown_alternative_ids = [
            alternative_id
            for alternative_id in evaluation_payload.keys()
            if alternative_id not in alternative_ids
        ]

        if unknown_alternative_ids:
            raise ValueError(
                f"evaluations[{expert_index}].payload contains unknown alternative rows"
            )

        for alternative_id in alternative_ids:
            if alternative_id not in evaluation_payload:
                raise ValueError(
                    f"evaluations[{expert_index}].payload['{alternative_id}'] is required"
                )

            alternative_payload = evaluation_payload[alternative_id]
            if not isinstance(alternative_payload, dict):
                raise ValueError(
                    f"evaluations[{expert_index}].payload['{alternative_id}'] is required"
                )

            unknown_criterion_ids = [
                criterion_id
                for criterion_id in alternative_payload.keys()
                if criterion_id not in criterion_ids
            ]

            if unknown_criterion_ids:
                raise ValueError(
                    f"evaluations[{expert_index}].payload['{alternative_id}'] contains unknown criterion cells"
                )

            row: list[float] = []
            for criterion in criterion_items:
                criterion_id = criterion["id"]
                field = (
                    f"evaluations[{expert_index}].payload['{alternative_id}']['{criterion_id}']"
                )
                if criterion_id not in alternative_payload:
                    raise ValueError(f"{field} is required")

                value = alternative_payload[criterion_id]
                if value is None:
                    raise ValueError(f"{field} is required")

                row.append(evaluation_value_fn(value, criterion, field))

            matrix.append(row)

        matrices[expert_key] = matrix

        if require_expert_weights:
            raw_weight = evaluation.get("weight")
            try:
                weight = float(raw_weight)
            except (TypeError, ValueError):
                raise ValueError(f"evaluations[{expert_index}].weight is required")

            if weight != weight or weight in {float("inf"), float("-inf")}:
                raise ValueError(f"evaluations[{expert_index}].weight must be finite")
            if weight < 0 or weight > 1:
                raise ValueError(f"evaluations[{expert_index}].weight must be between 0 and 1")

            expert_weights.append(weight)

    if require_expert_weights:
        total_weight = sum(expert_weights)
        if total_weight <= 0 or abs(total_weight - 1) > EXPERT_WEIGHT_SUM_EPSILON:
            raise ValueError("Expert weights must sum to 1")
        expert_weights = [weight / total_weight for weight in expert_weights]

    return {
        "matrices": matrices,
        "alternative_items": alternative_items,
        "criterion_items": criterion_items,
        "alternative_ids": alternative_ids,
        "criterion_ids": criterion_ids,
        "alternative_names": alternative_names,
        "criterion_names": criterion_names,
        "expert_weights": expert_weights if require_expert_weights else None,
    }


def normalize_collective_evaluations_by_ids(
    *,
    collective_matrix: Any,
    alternative_ids: list[str],
    criterion_ids: list[str],
) -> dict[str, dict[str, Any]]:
    if not isinstance(collective_matrix, list):
        return {}

    collective_evaluations: dict[str, dict[str, Any]] = {}

    for row_index, alternative_id in enumerate(alternative_ids):
        row = collective_matrix[row_index] if row_index < len(collective_matrix) else None
        if not isinstance(row, list):
            continue

        collective_evaluations[alternative_id] = {}
        for criterion_index, criterion_id in enumerate(criterion_ids):
            collective_evaluations[alternative_id][criterion_id] = (
                row[criterion_index] if criterion_index < len(row) else ""
            )

    return collective_evaluations
