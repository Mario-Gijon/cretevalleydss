"""AHP priorities from complete Saaty pairwise comparisons.

Each expert's reciprocal matrix is solved independently with the principal
right eigenvector. This module does not aggregate experts; the executor feeds
the resulting vectors to the existing MCC criteria-weight consensus service.
"""

from __future__ import annotations

import math
from typing import Any

import numpy as np

from models.saaty_scale import (
    SAATY_SCALE,
    SAATY_SCALE_TOLERANCE,
    SAATY_SCALE_VALUES,
    is_saaty_scale_value,
)

__all__ = ["SAATY_SCALE", "SAATY_SCALE_TOLERANCE", "SAATY_SCALE_VALUES"]

RANDOM_INDEX_BY_SIZE = {
    1: 0.0,
    2: 0.0,
    3: 0.58,
    4: 0.90,
    5: 1.12,
    6: 1.24,
    7: 1.32,
    8: 1.41,
    9: 1.45,
    10: 1.49,
    11: 1.51,
    12: 1.48,
    13: 1.56,
    14: 1.57,
    15: 1.59,
}
MAX_SUPPORTED_CRITERIA = max(RANDOM_INDEX_BY_SIZE)
SCALE_TOLERANCE = SAATY_SCALE_TOLERANCE
EIGEN_RESIDUAL_TOLERANCE = 1e-9
CONSISTENCY_REVIEW_THRESHOLD = 0.10


def _non_empty_string(value: Any) -> str | None:
    if not isinstance(value, str):
        return None
    normalized = value.strip()
    return normalized or None


def _normalize_criteria(context: Any) -> list[dict[str, str]]:
    if not isinstance(context, dict):
        raise ValueError("context must be an object")
    source = context.get("criteria")
    if not isinstance(source, list) or not source:
        raise ValueError("context.criteria must contain at least one criterion")
    if len(source) > MAX_SUPPORTED_CRITERIA:
        raise ValueError(
            f"AHP consistency is supported for at most {MAX_SUPPORTED_CRITERIA} criteria"
        )

    criteria: list[dict[str, str]] = []
    seen: set[str] = set()
    for index, item in enumerate(source):
        if not isinstance(item, dict):
            raise ValueError(f"context.criteria[{index}] must be an object")
        criterion_id = _non_empty_string(item.get("id"))
        name = _non_empty_string(item.get("name"))
        if criterion_id is None or name is None:
            raise ValueError(
                f"context.criteria[{index}] must have non-empty id and name"
            )
        if criterion_id in seen:
            raise ValueError(f"context.criteria contains duplicate id '{criterion_id}'")
        seen.add(criterion_id)
        criteria.append({"id": criterion_id, "name": name})
    return criteria


def _resolve_expert_key(evaluation: Any, index: int) -> tuple[str, str | None]:
    if not isinstance(evaluation, dict):
        raise ValueError(f"evaluations[{index}] must be an object")
    expert = evaluation.get("expert")
    if not isinstance(expert, dict):
        raise ValueError(f"evaluations[{index}].expert must be an object")
    key = _non_empty_string(expert.get("email")) or _non_empty_string(expert.get("id"))
    if key is None:
        raise ValueError(f"evaluations[{index}].expert must provide an email or id")
    return key, _non_empty_string(expert.get("name"))


def _normalize_judgment(value: Any, field: str) -> float:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ValueError(f"{field} must be a numeric Saaty comparison")
    numeric = float(value)
    if not math.isfinite(numeric):
        raise ValueError(f"{field} must be finite")
    if not is_saaty_scale_value(numeric):
        raise ValueError(f"{field} must be one of Saaty's 1–9 scale values or a reciprocal")
    return numeric


def _build_matrix(
    *, evaluation: Any, criteria: list[dict[str, str]], evaluation_index: int
) -> tuple[np.ndarray, int]:
    criterion_ids = [criterion["id"] for criterion in criteria]
    index_by_id = {criterion_id: index for index, criterion_id in enumerate(criterion_ids)}
    required = len(criteria) * (len(criteria) - 1) // 2
    payload = evaluation.get("payload")
    if not isinstance(payload, dict) or set(payload) != {"comparisons"}:
        raise ValueError(
            f"evaluations[{evaluation_index}].payload must contain exactly comparisons"
        )
    comparisons = payload.get("comparisons")
    if not isinstance(comparisons, list):
        raise ValueError(f"evaluations[{evaluation_index}].payload.comparisons must be a list")

    matrix = np.ones((len(criteria), len(criteria)), dtype=np.float64)
    seen_pairs: set[frozenset[str]] = set()
    for comparison_index, comparison in enumerate(comparisons):
        field = f"evaluations[{evaluation_index}].payload.comparisons[{comparison_index}]"
        if not isinstance(comparison, dict) or set(comparison) != {
            "criterionId",
            "comparedCriterionId",
            "value",
        }:
            raise ValueError(f"{field} must contain criterionId, comparedCriterionId and value")
        first_id = _non_empty_string(comparison.get("criterionId"))
        second_id = _non_empty_string(comparison.get("comparedCriterionId"))
        if first_id not in index_by_id or second_id not in index_by_id:
            raise ValueError(f"{field} references an unknown criterion id")
        if first_id == second_id:
            raise ValueError(f"{field} cannot compare a criterion with itself")
        pair = frozenset((first_id, second_id))
        if pair in seen_pairs:
            raise ValueError(f"{field} duplicates an unordered criterion pair")
        seen_pairs.add(pair)
        value = _normalize_judgment(comparison.get("value"), f"{field}.value")
        first_index = index_by_id[first_id]
        second_index = index_by_id[second_id]
        matrix[first_index, second_index] = value
        matrix[second_index, first_index] = 1.0 / value

    if len(seen_pairs) != required:
        raise ValueError(
            f"evaluations[{evaluation_index}] is incomplete: {len(seen_pairs)} of {required} comparisons are present"
        )
    return matrix, required


def _principal_eigenvector(matrix: np.ndarray) -> tuple[float, np.ndarray]:
    eigenvalues, eigenvectors = np.linalg.eig(matrix)
    principal_index = int(np.argmax(eigenvalues.real))
    principal_value = eigenvalues[principal_index]
    vector = eigenvectors[:, principal_index]
    if abs(float(principal_value.imag)) > EIGEN_RESIDUAL_TOLERANCE:
        raise ValueError("AHP principal eigenvalue has an unexpected imaginary component")
    if np.max(np.abs(vector.imag)) > EIGEN_RESIDUAL_TOLERANCE:
        raise ValueError("AHP principal eigenvector has an unexpected imaginary component")

    lambda_max = float(principal_value.real)
    priorities = np.asarray(vector.real, dtype=np.float64)
    if float(priorities.sum()) < 0:
        priorities = -priorities
    if not math.isfinite(lambda_max) or lambda_max <= 0:
        raise ValueError("AHP principal eigenvalue is invalid")
    if not np.all(np.isfinite(priorities)) or np.any(priorities <= 0):
        raise ValueError("AHP principal eigenvector must contain finite positive priorities")

    total = float(priorities.sum())
    if not math.isfinite(total) or total <= 0:
        raise ValueError("AHP principal eigenvector cannot be normalized")
    priorities = priorities / total
    residual = float(np.linalg.norm(matrix @ priorities - lambda_max * priorities, ord=np.inf))
    if not math.isfinite(residual) or residual > EIGEN_RESIDUAL_TOLERANCE * max(1.0, lambda_max):
        raise ValueError("AHP principal eigenvector did not pass the residual check")
    return lambda_max, priorities


def _calculate_consistency_metrics(
    *, lambda_max: float, criterion_count: int
) -> dict[str, Any]:
    """Calculate Saaty's CI/CR using the same rules as the final AHP solver."""

    if criterion_count <= 2:
        return {
            "consistencyIndex": None,
            "randomIndex": None,
            "consistencyRatio": None,
            "consistencyStatus": "not_applicable",
        }

    raw_ci = (lambda_max - criterion_count) / (criterion_count - 1)
    consistency_index = max(0.0, float(raw_ci))
    random_index = RANDOM_INDEX_BY_SIZE[criterion_count]
    if random_index <= 0:
        raise ValueError(f"Saaty Random Index is unavailable for n={criterion_count}")
    consistency_ratio = consistency_index / random_index

    return {
        "consistencyIndex": consistency_index,
        "randomIndex": random_index,
        "consistencyRatio": consistency_ratio,
        "consistencyStatus": (
            "consistent"
            if consistency_ratio <= CONSISTENCY_REVIEW_THRESHOLD
            else "review"
        ),
    }


def _solve_one(
    *, evaluation: dict[str, Any], criteria: list[dict[str, str]], evaluation_index: int
) -> dict[str, Any]:
    matrix, completed = _build_matrix(
        evaluation=evaluation,
        criteria=criteria,
        evaluation_index=evaluation_index,
    )
    lambda_max, priorities = _principal_eigenvector(matrix)
    criterion_count = len(criteria)
    consistency = _calculate_consistency_metrics(
        lambda_max=lambda_max,
        criterion_count=criterion_count,
    )

    expert_key, expert_name = _resolve_expert_key(evaluation, evaluation_index)
    return {
        "expertKey": expert_key,
        "expertName": expert_name,
        "weightsByCriterion": {
            criterion["id"]: float(priorities[index])
            for index, criterion in enumerate(criteria)
        },
        "lambdaMax": lambda_max,
        **consistency,
        "completedComparisons": completed,
        "requiredComparisons": completed,
    }


def run_ahp_criteria_weights(*, context: Any, evaluations: Any) -> dict[str, Any]:
    """Return expert priorities and AHP consistency diagnostics.

    The function accepts complete evaluations only. Draft and incomplete
    payloads remain persistable by the Backend structure but cannot produce
    final weights.
    """

    criteria = _normalize_criteria(context)
    if not isinstance(evaluations, list) or not evaluations:
        raise ValueError("evaluations must contain at least one completed evaluation")

    results_by_expert: dict[str, dict[str, Any]] = {}
    for index, evaluation in enumerate(evaluations):
        result = _solve_one(
            evaluation=evaluation,
            criteria=criteria,
            evaluation_index=index,
        )
        expert_key = result["expertKey"]
        if expert_key in results_by_expert:
            raise ValueError(f"Duplicate AHP evaluation for expert '{expert_key}'")
        results_by_expert[expert_key] = result

    return {
        "criteria": criteria,
        "expertResultsByExpert": results_by_expert,
        "expertWeightsByExpert": {
            expert_key: result["weightsByCriterion"]
            for expert_key, result in results_by_expert.items()
        },
        "expertDiagnosticsByExpert": results_by_expert,
        "nExperts": len(results_by_expert),
    }
