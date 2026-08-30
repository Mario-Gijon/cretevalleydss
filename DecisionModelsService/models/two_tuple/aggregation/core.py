"""Core operations for the homogeneous 2-tuple linguistic model.

Mathematical basis:
- Definition 2.1: Delta transformation from beta in [0, g] to (s_i, alpha).
- Proposition 2.1: inverse Delta transformation, beta = i + alpha.
- Section 2.3: lexicographic comparison of 2-tuples.
- Definition 2.2: 2-tuple negation.

This module is intentionally independent from request parsing, expression-domain
documents, and model orchestration.
"""

from __future__ import annotations

from dataclasses import dataclass
from math import floor, isfinite
from numbers import Real


_FLOAT_EPSILON = 1e-12


@dataclass(frozen=True, slots=True)
class TwoTuple:
    """Internal mathematical representation of a linguistic 2-tuple."""

    label_index: int
    alpha: float

    @property
    def beta(self) -> float:
        """Return the numerical equivalent Delta^-1(s_i, alpha) = i + alpha."""

        return float(self.label_index + self.alpha)


def _validate_label_count(label_count: int) -> int:
    if isinstance(label_count, bool) or not isinstance(label_count, int):
        raise ValueError("label_count must be an integer")
    if label_count < 1:
        raise ValueError("label_count must be at least 1")
    return label_count


def _finite_real(value: Real, *, field: str) -> float:
    if isinstance(value, bool) or not isinstance(value, Real):
        raise ValueError(f"{field} must be a finite number")

    normalized = float(value)
    if not isfinite(normalized):
        raise ValueError(f"{field} must be a finite number")

    return normalized


def validate_two_tuple(value: TwoTuple, *, label_count: int) -> TwoTuple:
    """Validate a 2-tuple against a concrete homogeneous linguistic term set."""

    label_count = _validate_label_count(label_count)

    if not isinstance(value, TwoTuple):
        raise ValueError("value must be a TwoTuple")

    if isinstance(value.label_index, bool) or not isinstance(value.label_index, int):
        raise ValueError("label_index must be an integer")

    maximum_index = label_count - 1
    if value.label_index < 0 or value.label_index > maximum_index:
        raise ValueError(
            f"label_index must be between 0 and {maximum_index}"
        )

    alpha = _finite_real(value.alpha, field="alpha")
    if alpha < -0.5 or alpha >= 0.5:
        raise ValueError("alpha must satisfy -0.5 <= alpha < 0.5")

    beta = float(value.label_index + alpha)
    if beta < -_FLOAT_EPSILON or beta > maximum_index + _FLOAT_EPSILON:
        raise ValueError("label_index and alpha produce an out-of-range beta")

    if value.label_index == 0 and alpha < 0:
        raise ValueError("the first linguistic term cannot have a negative alpha")
    if value.label_index == maximum_index and alpha > 0:
        raise ValueError("the last linguistic term cannot have a positive alpha")

    return TwoTuple(label_index=value.label_index, alpha=alpha)


def delta(beta: Real, *, label_count: int) -> TwoTuple:
    """Apply the book's Delta transformation.

    For S = {s_0, ..., s_g} and beta in [0, g]:

        Delta(beta) = (s_i, alpha)
        i = round(beta)
        alpha = beta - i

    Since beta is non-negative, ``floor(beta + 0.5)`` implements nearest-integer
    rounding with half values assigned to the upper linguistic term. This is also
    consistent with the canonical alpha interval [-0.5, 0.5).
    """

    label_count = _validate_label_count(label_count)
    maximum_index = label_count - 1
    normalized_beta = _finite_real(beta, field="beta")

    if (
        normalized_beta < -_FLOAT_EPSILON
        or normalized_beta > maximum_index + _FLOAT_EPSILON
    ):
        raise ValueError(
            f"beta must be between 0 and {maximum_index}"
        )

    if normalized_beta < 0:
        normalized_beta = 0.0
    elif normalized_beta > maximum_index:
        normalized_beta = float(maximum_index)

    label_index = int(floor(normalized_beta + 0.5))
    alpha = float(normalized_beta - label_index)

    if abs(alpha) <= _FLOAT_EPSILON:
        alpha = 0.0

    return validate_two_tuple(
        TwoTuple(label_index=label_index, alpha=alpha),
        label_count=label_count,
    )


def delta_inverse(value: TwoTuple, *, label_count: int) -> float:
    """Apply Delta^-1(s_i, alpha) = i + alpha."""

    validated = validate_two_tuple(value, label_count=label_count)
    return validated.beta


def compare_two_tuples(
    left: TwoTuple,
    right: TwoTuple,
    *,
    label_count: int,
) -> int:
    """Compare two 2-tuples using the lexicographic order from Section 2.3.

    Returns:
        -1 when left < right,
         0 when left == right,
         1 when left > right.
    """

    left = validate_two_tuple(left, label_count=label_count)
    right = validate_two_tuple(right, label_count=label_count)

    if left.label_index < right.label_index:
        return -1
    if left.label_index > right.label_index:
        return 1
    if left.alpha < right.alpha:
        return -1
    if left.alpha > right.alpha:
        return 1
    return 0


def negate_two_tuple(value: TwoTuple, *, label_count: int) -> TwoTuple:
    """Apply Definition 2.2: Neg(s_i, alpha) = Delta(g - Delta^-1(s_i, alpha))."""

    label_count = _validate_label_count(label_count)
    maximum_index = label_count - 1
    beta = delta_inverse(value, label_count=label_count)

    return delta(maximum_index - beta, label_count=label_count)
