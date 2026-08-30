"""Pure solving flow for the homogeneous 2-tuple linguistic model.

The solving process implemented here follows the two-stage aggregation scheme
used in the supplied 2-tuple reference:

1. Aggregate the experts' 2-tuple assessments for every alternative/criterion.
2. Aggregate the resulting criterion values for every alternative.
3. Rank alternatives by their final 2-tuple collective value.

Request parsing, expression-domain label resolution, and public response mapping
belong to ``executor.py`` and are intentionally kept out of this module.
"""

from __future__ import annotations

from numbers import Real
from typing import Any, Sequence

from .aggregation.core import TwoTuple, delta_inverse
from .aggregation.registry import aggregate


def _aggregation_config(
    value: Any,
    *,
    field: str,
) -> tuple[str, dict[str, Any]]:
    if not isinstance(value, dict):
        raise ValueError(f"{field} must be an object")

    method = value.get("method")
    if not isinstance(method, str) or not method.strip():
        raise ValueError(f"{field}.method is required")

    options = value.get("options", {})
    if options is None:
        options = {}
    if not isinstance(options, dict):
        raise ValueError(f"{field}.options must be an object")

    return method.strip(), options


def _matrix_shape(
    matrix: Any,
    *,
    field: str,
) -> tuple[int, int]:
    if not isinstance(matrix, list) or len(matrix) == 0:
        raise ValueError(f"{field} must contain at least one alternative row")

    criteria_count: int | None = None

    for row_index, row in enumerate(matrix):
        if not isinstance(row, list) or len(row) == 0:
            raise ValueError(
                f"{field}[{row_index}] must contain at least one criterion value"
            )

        if criteria_count is None:
            criteria_count = len(row)
        elif len(row) != criteria_count:
            raise ValueError(
                f"{field} rows must all contain the same number of criteria"
            )

        for criterion_index, value in enumerate(row):
            if not isinstance(value, TwoTuple):
                raise ValueError(
                    f"{field}[{row_index}][{criterion_index}] must be a TwoTuple"
                )

    assert criteria_count is not None
    return len(matrix), criteria_count


def _validate_matrices(
    matrices: dict[str, list[list[TwoTuple]]],
) -> tuple[list[str], int, int]:
    if not isinstance(matrices, dict) or len(matrices) == 0:
        raise ValueError("matrices must include at least one expert matrix")

    expert_keys = list(matrices.keys())
    expected_shape: tuple[int, int] | None = None

    for expert_key in expert_keys:
        if not isinstance(expert_key, str) or not expert_key.strip():
            raise ValueError("every expert matrix requires a non-empty expert key")

        shape = _matrix_shape(
            matrices[expert_key],
            field=f"matrices['{expert_key}']",
        )

        if expected_shape is None:
            expected_shape = shape
        elif shape != expected_shape:
            raise ValueError("all expert matrices must have the same shape")

    assert expected_shape is not None
    alternatives_count, criteria_count = expected_shape
    return expert_keys, alternatives_count, criteria_count


def _validate_weight_vector(
    weights: Sequence[Real] | None,
    *,
    expected_length: int,
    field: str,
) -> list[Real] | None:
    if weights is None:
        return None

    normalized = list(weights)
    if len(normalized) != expected_length:
        raise ValueError(
            f"{field} must contain {expected_length} values; "
            f"received {len(normalized)}"
        )

    return normalized


def _aggregate_experts(
    *,
    matrices: dict[str, list[list[TwoTuple]]],
    expert_keys: list[str],
    alternatives_count: int,
    criteria_count: int,
    label_count: int,
    method: str,
    options: dict[str, Any],
    expert_weights: Sequence[Real] | None,
) -> list[list[TwoTuple]]:
    """Aggregate experts for each alternative/criterion cell."""

    collective_matrix: list[list[TwoTuple]] = []

    for alternative_index in range(alternatives_count):
        collective_row: list[TwoTuple] = []

        for criterion_index in range(criteria_count):
            values = [
                matrices[expert_key][alternative_index][criterion_index]
                for expert_key in expert_keys
            ]

            collective_row.append(
                aggregate(
                    method,
                    values,
                    label_count=label_count,
                    weights=expert_weights,
                    options=options,
                )
            )

        collective_matrix.append(collective_row)

    return collective_matrix


def _aggregate_criteria(
    *,
    collective_matrix: list[list[TwoTuple]],
    label_count: int,
    method: str,
    options: dict[str, Any],
    criterion_weights: Sequence[Real] | None,
) -> list[TwoTuple]:
    """Aggregate the collective criterion values for each alternative."""

    return [
        aggregate(
            method,
            row,
            label_count=label_count,
            weights=criterion_weights,
            options=options,
        )
        for row in collective_matrix
    ]


def _ranking(
    values: Sequence[TwoTuple],
    *,
    label_count: int,
) -> tuple[list[float], list[int]]:
    """Return beta scores and a descending ranking of alternative indexes.

    In one homogeneous linguistic term set, Delta^-1(s_i, alpha) = i + alpha
    preserves the lexicographic order of 2-tuples, so descending beta order is
    equivalent to descending 2-tuple order.
    """

    collective_scores = [
        delta_inverse(value, label_count=label_count)
        for value in values
    ]

    collective_ranking = sorted(
        range(len(collective_scores)),
        key=lambda index: (-collective_scores[index], index),
    )

    return collective_scores, collective_ranking


def run_two_tuple(
    matrices: dict[str, list[list[TwoTuple]]],
    *,
    label_count: int,
    expert_aggregation: dict[str, Any],
    criteria_aggregation: dict[str, Any],
    expert_weights: Sequence[Real] | None = None,
    criterion_weights: Sequence[Real] | None = None,
) -> dict[str, Any]:
    """Execute the homogeneous 2-tuple decision model.

    ``matrices`` contains one alternative x criterion matrix per expert. Every
    matrix cell must already be resolved to the internal ``TwoTuple`` type and
    all cells must belong to the same linguistic expression domain.

    The selected aggregation method determines whether the provided expert or
    criterion weights participate in each stage. The aggregation registry is
    responsible for those method-specific semantics.
    """

    expert_keys, alternatives_count, criteria_count = _validate_matrices(matrices)

    expert_weights = _validate_weight_vector(
        expert_weights,
        expected_length=len(expert_keys),
        field="expert_weights",
    )
    criterion_weights = _validate_weight_vector(
        criterion_weights,
        expected_length=criteria_count,
        field="criterion_weights",
    )

    expert_method, expert_options = _aggregation_config(
        expert_aggregation,
        field="expert_aggregation",
    )
    criteria_method, criteria_options = _aggregation_config(
        criteria_aggregation,
        field="criteria_aggregation",
    )

    collective_matrix = _aggregate_experts(
        matrices=matrices,
        expert_keys=expert_keys,
        alternatives_count=alternatives_count,
        criteria_count=criteria_count,
        label_count=label_count,
        method=expert_method,
        options=expert_options,
        expert_weights=expert_weights,
    )

    collective_values = _aggregate_criteria(
        collective_matrix=collective_matrix,
        label_count=label_count,
        method=criteria_method,
        options=criteria_options,
        criterion_weights=criterion_weights,
    )

    collective_scores, collective_ranking = _ranking(
        collective_values,
        label_count=label_count,
    )

    return {
        "collective_matrix": collective_matrix,
        "collective_values": collective_values,
        "collective_scores": collective_scores,
        "collective_ranking": collective_ranking,
    }
