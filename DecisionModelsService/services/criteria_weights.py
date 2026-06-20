from typing import Any

from schemas.model_requests import GenericModelExecutionRequest


def _is_plain_object(value: Any) -> bool:
    return isinstance(value, dict)


def _finite_number(value: Any, field: str) -> float:
    number = float(value)

    if number != number or number in {float("inf"), float("-inf")}:
        raise ValueError(f"{field} must be a finite number")

    return number


def _criterion_items(payload: GenericModelExecutionRequest) -> list[dict[str, str]]:
    context = payload.context if _is_plain_object(payload.context) else {}
    criteria = context.get("criteria")

    if not isinstance(criteria, list):
        return []

    criterion_items: list[dict[str, str]] = []
    for criterion in criteria:
        if not isinstance(criterion, dict):
            continue

        criterion_id = str(criterion.get("id") or "").strip()
        criterion_name = str(criterion.get("name") or "").strip()

        if criterion_id and criterion_name:
            criterion_items.append({
                "id": criterion_id,
                "name": criterion_name,
            })

    return criterion_items


def ordered_numeric_weights(
    payload: GenericModelExecutionRequest,
    *,
    allow_empty: bool,
    error_label: str,
) -> list[float]:
    model_parameters = payload.modelParameters if _is_plain_object(payload.modelParameters) else {}
    raw_weights = model_parameters.get("weights")
    criteria = _criterion_items(payload)

    if not _is_plain_object(raw_weights):
        if allow_empty and len(criteria) == 0:
            return []

        raise ValueError(f"{error_label} are required")

    if len(criteria) == 0:
        if allow_empty:
            return []

        raise ValueError("context.criteria is required")

    ordered_weights: list[float] = []
    for criterion in criteria:
        criterion_id = criterion["id"]
        if criterion_id not in raw_weights:
            raise ValueError(f"weights['{criterion_id}'] is required")

        ordered_weights.append(
            _finite_number(raw_weights[criterion_id], f"weights['{criterion_id}']")
        )

    if len(ordered_weights) != len(criteria):
        raise ValueError("weights length must match the number of criteria")

    return ordered_weights


def ordered_fuzzy_weights(
    payload: GenericModelExecutionRequest,
    *,
    triplet_length: int = 3,
) -> list[list[float]]:
    model_parameters = payload.modelParameters if _is_plain_object(payload.modelParameters) else {}
    raw_weights = model_parameters.get("weights")
    criteria = _criterion_items(payload)

    if not _is_plain_object(raw_weights):
        raise ValueError("fuzzy weights are required for Fuzzy TOPSIS")

    if len(criteria) == 0:
        raise ValueError("context.criteria is required")

    ordered_weights: list[list[float]] = []

    for criterion in criteria:
        criterion_id = criterion["id"]
        criterion_weights = raw_weights.get(criterion_id)

        if not isinstance(criterion_weights, (list, tuple)) or len(criterion_weights) != triplet_length:
            raise ValueError(f"weights['{criterion_id}'] must be a fuzzy triplet [l, m, u]")

        ordered_weights.append([
            _finite_number(item, f"weights['{criterion_id}'][{index}]")
            for index, item in enumerate(criterion_weights)
        ])

    return ordered_weights
