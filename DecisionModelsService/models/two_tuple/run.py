"""Pure solving flow for the homogeneous 2-tuple linguistic model.

The solving process implemented here follows the two-stage aggregation scheme
described by the supplied 2-tuple reference:

1. Aggregate the experts' 2-tuple assessments for every alternative/criterion.
2. Aggregate the resulting collective criterion values for every alternative.
3. Rank alternatives by their final 2-tuple collective value.

Besides the mathematical result, this module emits compact deterministic
execution evidence (beta matrices and aggregation traces) that Results Analysis
can validate and interpret later. User-facing interpretation and visualization
do not belong here.
"""

from __future__ import annotations

from math import isfinite
from numbers import Real
from typing import Any, Sequence

from .aggregation.core import TwoTuple, delta_inverse
from .aggregation.definitions import AGGREGATION_METHODS
from .aggregation.operators import generate_owa_weights
from .aggregation.registry import aggregate, resolve_l2towa_quantifier


TRACE_TOLERANCE = 1e-9


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

    return method.strip(), dict(options)


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


def _finite_non_negative(
    value: Real,
    *,
    field: str,
) -> float:
    if isinstance(value, bool) or not isinstance(value, Real):
        raise ValueError(f"{field} must be a finite number")

    normalized = float(value)
    if not isfinite(normalized):
        raise ValueError(f"{field} must be a finite number")
    if normalized < 0:
        raise ValueError(f"{field} must be non-negative")

    return normalized


def _validate_weight_vector(
    weights: Sequence[Real] | None,
    *,
    expected_length: int,
    field: str,
) -> list[float] | None:
    if weights is None:
        return None

    normalized = list(weights)
    if len(normalized) != expected_length:
        raise ValueError(
            f"{field} must contain {expected_length} values; "
            f"received {len(normalized)}"
        )

    return [
        _finite_non_negative(weight, field=f"{field}[{index}]")
        for index, weight in enumerate(normalized)
    ]


def _method_definition(method: str) -> dict[str, Any]:
    definition = next(
        (
            item
            for item in AGGREGATION_METHODS
            if isinstance(item, dict) and item.get("key") == method
        ),
        None,
    )
    if definition is None:
        raise ValueError(f"unsupported two-tuple aggregation method: {method}")
    return definition


def _aggregation_stage_evidence(
    *,
    method: str,
    options: dict[str, Any],
    argument_count: int,
    argument_weights: Sequence[Real] | None,
    field: str,
) -> dict[str, Any]:
    """Describe the exact coefficients/semantics used by one aggregation stage."""

    if argument_count < 1:
        raise ValueError(f"{field} requires at least one aggregation argument")

    if method == "arithmetic_mean":
        effective_weights = [1.0 / argument_count for _ in range(argument_count)]
        return {
            "method": method,
            "options": dict(options),
            "argument_count": argument_count,
            "weight_semantics": "equal_arguments",
            "configured_argument_weights": None,
            "effective_weights": effective_weights,
            "l2towa": None,
        }

    if method == "weighted_average":
        normalized = _validate_weight_vector(
            argument_weights,
            expected_length=argument_count,
            field=f"{field}.weights",
        )
        if normalized is None:
            raise ValueError(f"{field} weighted_average requires argument weights")

        total = sum(normalized)
        if total <= 0:
            raise ValueError(f"{field}.weights must contain at least one positive value")

        effective_weights = [weight / total for weight in normalized]
        return {
            "method": method,
            "options": dict(options),
            "argument_count": argument_count,
            "weight_semantics": "argument_importance",
            "configured_argument_weights": normalized,
            "effective_weights": effective_weights,
            "l2towa": None,
        }

    if method == "l2towa":
        definition = _method_definition(method)
        a, b = resolve_l2towa_quantifier(
            method_definition=definition,
            options=options,
        )
        positional_weights = generate_owa_weights(
            argument_count,
            a=a,
            b=b,
        )
        return {
            "method": method,
            "options": dict(options),
            "argument_count": argument_count,
            "weight_semantics": "ordered_positions_descending_beta",
            "configured_argument_weights": None,
            "effective_weights": positional_weights,
            "l2towa": {
                "quantifier": options.get("quantifier"),
                "a": a,
                "b": b,
                "positional_weights": positional_weights,
                "ordering": "descending_beta",
            },
        }

    raise ValueError(f"unsupported two-tuple aggregation method: {method}")


def _aggregation_trace(
    *,
    values: Sequence[TwoTuple],
    result: TwoTuple,
    label_count: int,
    stage_evidence: dict[str, Any],
) -> dict[str, Any]:
    """Create a compact trace that exactly reproduces one aggregation result."""

    betas = [
        delta_inverse(value, label_count=label_count)
        for value in values
    ]
    method = stage_evidence["method"]
    effective_weights = list(stage_evidence["effective_weights"])

    if len(effective_weights) != len(betas):
        raise ValueError("aggregation evidence weights do not match aggregation inputs")

    if method == "l2towa":
        ordered = sorted(
            enumerate(betas),
            key=lambda item: (-item[1], item[0]),
        )
        source_indexes = [index for index, _ in ordered]
        aggregation_betas = [beta for _, beta in ordered]
    else:
        source_indexes = list(range(len(betas)))
        aggregation_betas = list(betas)

    contributions = [
        beta * weight
        for beta, weight in zip(
            aggregation_betas,
            effective_weights,
            strict=True,
        )
    ]
    traced_beta = sum(contributions)
    result_beta = delta_inverse(result, label_count=label_count)

    if abs(traced_beta - result_beta) > TRACE_TOLERANCE:
        raise ValueError(
            "aggregation trace is inconsistent with the executed aggregation result"
        )

    return {
        "input_betas": betas,
        "source_indexes_in_aggregation_order": source_indexes,
        "aggregation_betas": aggregation_betas,
        "effective_weights": effective_weights,
        "contributions": contributions,
        "aggregated_beta": result_beta,
    }


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
    stage_evidence: dict[str, Any],
) -> tuple[list[list[TwoTuple]], list[list[dict[str, Any]]]]:
    """Aggregate experts for each alternative/criterion cell."""

    collective_matrix: list[list[TwoTuple]] = []
    traces: list[list[dict[str, Any]]] = []

    for alternative_index in range(alternatives_count):
        collective_row: list[TwoTuple] = []
        trace_row: list[dict[str, Any]] = []

        for criterion_index in range(criteria_count):
            values = [
                matrices[expert_key][alternative_index][criterion_index]
                for expert_key in expert_keys
            ]

            result = aggregate(
                method,
                values,
                label_count=label_count,
                weights=expert_weights,
                options=options,
            )
            collective_row.append(result)
            trace_row.append(
                _aggregation_trace(
                    values=values,
                    result=result,
                    label_count=label_count,
                    stage_evidence=stage_evidence,
                )
            )

        collective_matrix.append(collective_row)
        traces.append(trace_row)

    return collective_matrix, traces


def _aggregate_criteria(
    *,
    collective_matrix: list[list[TwoTuple]],
    label_count: int,
    method: str,
    options: dict[str, Any],
    criterion_weights: Sequence[Real] | None,
    stage_evidence: dict[str, Any],
) -> tuple[list[TwoTuple], list[dict[str, Any]]]:
    """Aggregate the collective criterion values for every alternative."""

    collective_values: list[TwoTuple] = []
    traces: list[dict[str, Any]] = []

    for row in collective_matrix:
        result = aggregate(
            method,
            row,
            label_count=label_count,
            weights=criterion_weights,
            options=options,
        )
        collective_values.append(result)
        traces.append(
            _aggregation_trace(
                values=row,
                result=result,
                label_count=label_count,
                stage_evidence=stage_evidence,
            )
        )

    return collective_values, traces


def _beta_matrix(
    matrix: list[list[TwoTuple]],
    *,
    label_count: int,
) -> list[list[float]]:
    return [
        [
            delta_inverse(value, label_count=label_count)
            for value in row
        ]
        for row in matrix
    ]


def _ranking(
    values: Sequence[TwoTuple],
    *,
    label_count: int,
) -> tuple[list[float], list[int]]:
    """Return beta scores and a descending ranking of alternative indexes."""

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
    """Execute the homogeneous 2-tuple decision model."""

    expert_keys, alternatives_count, criteria_count = _validate_matrices(matrices)

    if isinstance(label_count, bool) or not isinstance(label_count, int):
        raise ValueError("label_count must be an integer")
    if label_count < 1:
        raise ValueError("label_count must be at least 1")

    expert_method, expert_options = _aggregation_config(
        expert_aggregation,
        field="expert_aggregation",
    )
    criteria_method, criteria_options = _aggregation_config(
        criteria_aggregation,
        field="criteria_aggregation",
    )

    expert_weights_for_aggregation = (
        _validate_weight_vector(
            expert_weights,
            expected_length=len(expert_keys),
            field="expert_weights",
        )
        if expert_method == "weighted_average"
        else None
    )
    criterion_weights_for_aggregation = (
        _validate_weight_vector(
            criterion_weights,
            expected_length=criteria_count,
            field="criterion_weights",
        )
        if criteria_method == "weighted_average"
        else None
    )

    expert_stage_evidence = _aggregation_stage_evidence(
        method=expert_method,
        options=expert_options,
        argument_count=len(expert_keys),
        argument_weights=expert_weights_for_aggregation,
        field="expert_aggregation",
    )
    criteria_stage_evidence = _aggregation_stage_evidence(
        method=criteria_method,
        options=criteria_options,
        argument_count=criteria_count,
        argument_weights=criterion_weights_for_aggregation,
        field="criteria_aggregation",
    )

    collective_matrix, expert_aggregation_traces = _aggregate_experts(
        matrices=matrices,
        expert_keys=expert_keys,
        alternatives_count=alternatives_count,
        criteria_count=criteria_count,
        label_count=label_count,
        method=expert_method,
        options=expert_options,
        expert_weights=expert_weights_for_aggregation,
        stage_evidence=expert_stage_evidence,
    )

    collective_beta_matrix = _beta_matrix(
        collective_matrix,
        label_count=label_count,
    )

    collective_values, criteria_aggregation_traces = _aggregate_criteria(
        collective_matrix=collective_matrix,
        label_count=label_count,
        method=criteria_method,
        options=criteria_options,
        criterion_weights=criterion_weights_for_aggregation,
        stage_evidence=criteria_stage_evidence,
    )

    collective_scores, collective_ranking = _ranking(
        collective_values,
        label_count=label_count,
    )

    return {
        "collective_matrix": collective_matrix,
        "collective_beta_matrix": collective_beta_matrix,
        "collective_values": collective_values,
        "collective_scores": collective_scores,
        "collective_ranking": collective_ranking,
        "expert_aggregation_evidence": expert_stage_evidence,
        "criteria_aggregation_evidence": criteria_stage_evidence,
        "expert_aggregation_traces": expert_aggregation_traces,
        "criteria_aggregation_traces": criteria_aggregation_traces,
    }
