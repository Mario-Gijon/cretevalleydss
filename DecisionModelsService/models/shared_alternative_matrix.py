from typing import Any, Callable

from schemas.model_requests import GenericModelExecutionRequest


def extract_id_keyed_alternative_criteria_input(
    *,
    payload: GenericModelExecutionRequest,
    expert_key_fn: Callable[[dict[str, Any], int], str],
    cell_value_fn: Callable[[dict[str, Any], str], Any],
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
        if not criterion_id:
            raise ValueError("Every context.criteria item requires a non-empty id")
        if not criterion_name:
            raise ValueError("Every context.criteria item requires a non-empty name")
        criterion_items.append(
            {
                "id": criterion_id,
                "name": criterion_name,
                "type": item.get("type"),
            }
        )

    alternative_ids = [item["id"] for item in alternative_items]
    criterion_ids = [item["id"] for item in criterion_items]
    alternative_names = [item["name"] for item in alternative_items]
    criterion_names = [item["name"] for item in criterion_items]

    matrices: dict[str, list[list[float]]] = {}
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

        for alternative_id in alternative_ids:
            alternative_payload = evaluation_payload.get(alternative_id)
            if not isinstance(alternative_payload, dict):
                raise ValueError(
                    f"evaluations[{expert_index}].payload['{alternative_id}'] is required"
                )

            row: list[float] = []
            for criterion_id in criterion_ids:
                cell = alternative_payload.get(criterion_id)
                field = (
                    f"evaluations[{expert_index}].payload['{alternative_id}']['{criterion_id}']"
                )
                if not isinstance(cell, dict):
                    raise ValueError(f"{field} is required")

                row.append(cell_value_fn(cell, field))

            matrix.append(row)

        matrices[expert_key] = matrix

    return {
        "matrices": matrices,
        "alternative_items": alternative_items,
        "criterion_items": criterion_items,
        "alternative_ids": alternative_ids,
        "criterion_ids": criterion_ids,
        "alternative_names": alternative_names,
        "criterion_names": criterion_names,
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
