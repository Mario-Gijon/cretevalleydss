"""Aggregation operators for homogeneous 2-tuple linguistic values.

Implemented directly from Chapter 2 of the supplied 2-tuple reference:
- Definition 2.3: 2-tuple arithmetic mean.
- Definition 2.4: 2-tuple weighted average.
- Definition 2.5: L2TOWA.
- Definitions 2.6 and Eq. (2.7): nondecreasing linguistic quantifier and
  generation of OWA positional weights.
"""

from __future__ import annotations

from math import isfinite
from numbers import Real
from typing import Sequence

from .core import TwoTuple, delta, delta_inverse


def _require_values(values: Sequence[TwoTuple]) -> list[TwoTuple]:
    normalized = list(values)
    if not normalized:
        raise ValueError("at least one 2-tuple value is required")
    return normalized


def _finite_weight(value: Real, *, index: int) -> float:
    if isinstance(value, bool) or not isinstance(value, Real):
        raise ValueError(f"weights[{index}] must be a finite number")

    normalized = float(value)
    if not isfinite(normalized):
        raise ValueError(f"weights[{index}] must be a finite number")
    if normalized < 0:
        raise ValueError(f"weights[{index}] must be non-negative")

    return normalized


def arithmetic_mean(
    values: Sequence[TwoTuple],
    *,
    label_count: int,
) -> TwoTuple:
    """Definition 2.3: Delta((1/n) * sum(Delta^-1(value_i)))."""

    values = _require_values(values)
    betas = [
        delta_inverse(value, label_count=label_count)
        for value in values
    ]
    mean_beta = sum(betas) / len(betas)

    return delta(mean_beta, label_count=label_count)


def weighted_average(
    values: Sequence[TwoTuple],
    *,
    weights: Sequence[Real],
    label_count: int,
) -> TwoTuple:
    """Definition 2.4: Delta(sum(beta_i*w_i) / sum(w_i))."""

    values = _require_values(values)
    normalized_weights = [
        _finite_weight(weight, index=index)
        for index, weight in enumerate(weights)
    ]

    if len(normalized_weights) != len(values):
        raise ValueError("weights must have the same length as values")

    weight_sum = sum(normalized_weights)
    if weight_sum <= 0:
        raise ValueError("the sum of weights must be greater than zero")

    betas = [
        delta_inverse(value, label_count=label_count)
        for value in values
    ]
    aggregated_beta = sum(
        beta * weight
        for beta, weight in zip(betas, normalized_weights, strict=True)
    ) / weight_sum

    return delta(aggregated_beta, label_count=label_count)


def linguistic_quantifier(
    x: Real,
    *,
    a: Real,
    b: Real,
) -> float:
    """Definition 2.6: nondecreasing linguistic quantifier Q(x)."""

    if isinstance(x, bool) or not isinstance(x, Real):
        raise ValueError("x must be a finite number")
    if isinstance(a, bool) or not isinstance(a, Real):
        raise ValueError("a must be a finite number")
    if isinstance(b, bool) or not isinstance(b, Real):
        raise ValueError("b must be a finite number")

    x = float(x)
    a = float(a)
    b = float(b)

    if not all(isfinite(value) for value in (x, a, b)):
        raise ValueError("x, a and b must be finite numbers")
    if x < 0 or x > 1:
        raise ValueError("x must satisfy 0 <= x <= 1")
    if a < 0 or b > 1 or a >= b:
        raise ValueError("quantifier parameters must satisfy 0 <= a < b <= 1")

    if x <= a:
        return 0.0
    if x <= b:
        return (x - a) / (b - a)
    return 1.0


def generate_owa_weights(
    dimension: int,
    *,
    a: Real,
    b: Real,
) -> list[float]:
    """Generate OWA positional weights using Eq. (2.7).

    w_i = Q(i/n) - Q((i-1)/n), for i = 1, ..., n.
    """

    if isinstance(dimension, bool) or not isinstance(dimension, int):
        raise ValueError("dimension must be an integer")
    if dimension < 1:
        raise ValueError("dimension must be at least 1")

    return [
        linguistic_quantifier(index / dimension, a=a, b=b)
        - linguistic_quantifier((index - 1) / dimension, a=a, b=b)
        for index in range(1, dimension + 1)
    ]


def l2towa(
    values: Sequence[TwoTuple],
    *,
    label_count: int,
    a: Real,
    b: Real,
) -> TwoTuple:
    """Definition 2.5: Linguistic 2-Tuple Ordered Weighted Aggregation.

    The OWA weights are positional weights. They are applied after sorting the
    numerical equivalents beta_i = Delta^-1(value_i) from largest to smallest.
    They are not argument/expert/criterion importance weights.
    """

    values = _require_values(values)
    ordered_betas = sorted(
        (
            delta_inverse(value, label_count=label_count)
            for value in values
        ),
        reverse=True,
    )
    positional_weights = generate_owa_weights(
        len(ordered_betas),
        a=a,
        b=b,
    )

    aggregated_beta = sum(
        weight * beta
        for weight, beta in zip(
            positional_weights,
            ordered_betas,
            strict=True,
        )
    )

    return delta(aggregated_beta, label_count=label_count)
