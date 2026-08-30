"""Runtime dispatch for the two-tuple aggregation methods.

The public method catalogue remains in ``definitions.py``. This module maps those
published method keys to their mathematical implementations and resolves the
method-specific runtime options.
"""

from __future__ import annotations

from numbers import Real
from typing import Any, Callable, Sequence

from .core import TwoTuple
from .definitions import AGGREGATION_METHODS
from .operators import arithmetic_mean, l2towa, weighted_average


AggregationImplementation = Callable[..., TwoTuple]


def _published_method_definition(method: str) -> dict[str, Any]:
    for definition in AGGREGATION_METHODS:
        if definition.get("key") == method:
            return definition

    raise ValueError(f"unsupported two-tuple aggregation method: {method}")


def _quantifier_definition(
    method_definition: dict[str, Any],
    quantifier_key: str,
) -> dict[str, Any]:
    subparameters = method_definition.get("subparameters")
    if not isinstance(subparameters, list):
        raise ValueError("l2towa method definition has no subparameters")

    quantifier_definition = next(
        (
            item
            for item in subparameters
            if isinstance(item, dict) and item.get("key") == "quantifier"
        ),
        None,
    )
    if quantifier_definition is None:
        raise ValueError("l2towa method definition has no quantifier metadata")

    options = quantifier_definition.get("options")
    if not isinstance(options, list):
        raise ValueError("l2towa quantifier definition has no options")

    for option in options:
        if isinstance(option, dict) and option.get("value") == quantifier_key:
            return option

    raise ValueError(f"unsupported L2TOWA quantifier: {quantifier_key}")


def _finite_option_number(value: Any, *, field: str) -> float:
    if isinstance(value, bool) or not isinstance(value, Real):
        raise ValueError(f"{field} must be a finite number")

    normalized = float(value)
    if normalized != normalized or normalized in {
        float("inf"),
        float("-inf"),
    }:
        raise ValueError(f"{field} must be a finite number")

    return normalized


def resolve_l2towa_quantifier(
    *,
    method_definition: dict[str, Any],
    options: dict[str, Any],
) -> tuple[float, float]:
    """Resolve (a, b) from DMS metadata or from a custom runtime configuration."""

    if not isinstance(options, dict):
        raise ValueError("l2towa options must be an object")

    quantifier_key = options.get("quantifier")
    if not isinstance(quantifier_key, str) or not quantifier_key.strip():
        raise ValueError("l2towa options.quantifier is required")

    quantifier_key = quantifier_key.strip()
    quantifier_definition = _quantifier_definition(
        method_definition,
        quantifier_key,
    )

    if quantifier_key == "custom":
        a = _finite_option_number(options.get("a"), field="l2towa options.a")
        b = _finite_option_number(options.get("b"), field="l2towa options.b")
    else:
        a = _finite_option_number(
            quantifier_definition.get("a"),
            field=f"quantifier '{quantifier_key}' metadata a",
        )
        b = _finite_option_number(
            quantifier_definition.get("b"),
            field=f"quantifier '{quantifier_key}' metadata b",
        )

    if a < 0 or b > 1 or a >= b:
        raise ValueError("L2TOWA quantifier must satisfy 0 <= a < b <= 1")

    return a, b


def _run_arithmetic_mean(
    *,
    values: Sequence[TwoTuple],
    label_count: int,
    weights: Sequence[Real] | None,
    options: dict[str, Any],
) -> TwoTuple:
    del weights
    del options
    return arithmetic_mean(values, label_count=label_count)


def _run_weighted_average(
    *,
    values: Sequence[TwoTuple],
    label_count: int,
    weights: Sequence[Real] | None,
    options: dict[str, Any],
) -> TwoTuple:
    del options

    if weights is None:
        raise ValueError("weighted_average requires argument weights")

    return weighted_average(
        values,
        weights=weights,
        label_count=label_count,
    )


def _run_l2towa(
    *,
    values: Sequence[TwoTuple],
    label_count: int,
    weights: Sequence[Real] | None,
    options: dict[str, Any],
) -> TwoTuple:
    del weights

    method_definition = _published_method_definition("l2towa")
    a, b = resolve_l2towa_quantifier(
        method_definition=method_definition,
        options=options,
    )

    return l2towa(
        values,
        label_count=label_count,
        a=a,
        b=b,
    )


AGGREGATION_IMPLEMENTATIONS: dict[str, AggregationImplementation] = {
    "arithmetic_mean": _run_arithmetic_mean,
    "weighted_average": _run_weighted_average,
    "l2towa": _run_l2towa,
}


def aggregate(
    method: str,
    values: Sequence[TwoTuple],
    *,
    label_count: int,
    weights: Sequence[Real] | None = None,
    options: dict[str, Any] | None = None,
) -> TwoTuple:
    """Execute one aggregation method declared by the two-tuple model."""

    if not isinstance(method, str) or not method.strip():
        raise ValueError("aggregation method is required")

    method = method.strip()
    _published_method_definition(method)

    implementation = AGGREGATION_IMPLEMENTATIONS.get(method)
    if implementation is None:
        raise ValueError(
            f"aggregation method '{method}' is declared but not implemented"
        )

    normalized_options = options if isinstance(options, dict) else {}

    return implementation(
        values=values,
        label_count=label_count,
        weights=weights,
        options=normalized_options,
    )
