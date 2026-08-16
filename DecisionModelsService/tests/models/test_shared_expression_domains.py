from typing import Any

import pytest

from models.shared_expression_domains import (
    SUPPORTED_EXPRESSION_DOMAIN_TYPE_KEYS,
    resolve_linguistic_2tuple_value,
)


LINGUISTIC_2TUPLE_DOMAIN: dict[str, Any] = {
    "typeKey": "linguistic2Tuple",
    "definition": {
        "labelCount": 5,
        "labels": [
            {
                "key": "very_low",
                "label": "Very Low",
                "index": 0,
            },
            {
                "key": "low",
                "label": "Low",
                "index": 1,
            },
            {
                "key": "medium",
                "label": "Medium",
                "index": 2,
            },
            {
                "key": "high",
                "label": "High",
                "index": 3,
            },
            {
                "key": "very_high",
                "label": "Very High",
                "index": 4,
            },
        ],
    },
}


def _resolve(value: Any) -> dict[str, Any]:
    return resolve_linguistic_2tuple_value(
        value=value,
        expression_domain=LINGUISTIC_2TUPLE_DOMAIN,
        field="evaluation",
    )


def test_linguistic_2tuple_is_a_supported_expression_domain() -> None:
    assert "linguistic2Tuple" in SUPPORTED_EXPRESSION_DOMAIN_TYPE_KEYS


def test_resolve_linguistic_2tuple_value_returns_beta_position() -> None:
    result = _resolve(
        {
            "labelKey": "medium",
            "alpha": -0.25,
        }
    )

    assert result == {
        "labelKey": "medium",
        "alpha": -0.25,
        "labelIndex": 2,
        "beta": 1.75,
    }


def test_resolve_linguistic_2tuple_accepts_zero_alpha() -> None:
    result = _resolve(
        {
            "labelKey": "high",
            "alpha": 0,
        }
    )

    assert result == {
        "labelKey": "high",
        "alpha": 0.0,
        "labelIndex": 3,
        "beta": 3.0,
    }


def test_resolve_linguistic_2tuple_accepts_negative_half_boundary() -> None:
    result = _resolve(
        {
            "labelKey": "low",
            "alpha": -0.5,
        }
    )

    assert result["beta"] == 0.5


@pytest.mark.parametrize(
    "alpha",
    [
        0.5,
        0.75,
        -0.51,
    ],
)
def test_resolve_linguistic_2tuple_rejects_invalid_alpha_range(
    alpha: float,
) -> None:
    with pytest.raises(ValueError, match="greater than or equal to -0.5"):
        _resolve(
            {
                "labelKey": "medium",
                "alpha": alpha,
            }
        )


@pytest.mark.parametrize(
    "alpha",
    [
        float("nan"),
        float("inf"),
        float("-inf"),
        "0.2",
        True,
    ],
)
def test_resolve_linguistic_2tuple_rejects_non_numeric_or_non_finite_alpha(
    alpha: Any,
) -> None:
    with pytest.raises(ValueError, match="must be a finite number"):
        _resolve(
            {
                "labelKey": "medium",
                "alpha": alpha,
            }
        )


def test_resolve_linguistic_2tuple_rejects_unknown_label() -> None:
    with pytest.raises(ValueError, match="Unknown linguistic label"):
        _resolve(
            {
                "labelKey": "unknown",
                "alpha": 0,
            }
        )


@pytest.mark.parametrize(
    "value",
    [
        {"labelKey": "medium"},
        {"alpha": 0},
        {
            "labelKey": "medium",
            "alpha": 0,
            "extra": True,
        },
    ],
)
def test_resolve_linguistic_2tuple_requires_exact_value_shape(
    value: dict[str, Any],
) -> None:
    with pytest.raises(ValueError, match="exactly"):
        _resolve(value)


@pytest.mark.parametrize(
    "value",
    [
        {
            "labelKey": "very_low",
            "alpha": -0.1,
        },
        {
            "labelKey": "very_high",
            "alpha": 0.1,
        },
    ],
)
def test_resolve_linguistic_2tuple_rejects_out_of_scale_beta(
    value: dict[str, Any],
) -> None:
    with pytest.raises(ValueError, match="out-of-range"):
        _resolve(value)