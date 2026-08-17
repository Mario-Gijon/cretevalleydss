from __future__ import annotations

import math
from typing import Any

from ..run import FLOAT_TOLERANCE as MODEL_FLOAT_TOLERANCE
from ..run import delta_inverse


EVIDENCE_TOLERANCE = 1e-9
ANALYTICAL_TIE_TOLERANCE = 1e-6


def availability(
    available: bool,
    reason: str | None = None,
    **extra: Any,
) -> dict[str, Any]:
    if available:
        result: dict[str, Any] = {
            "available": True,
            "reason": None,
        }
    else:
        if not reason:
            raise ValueError("Unavailable analysis facts require a reason")
        result = {
            "available": False,
            "reason": reason,
        }

    result.update(extra)
    return result


def as_object(value: Any, field: str) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise ValueError(f"{field} must be an object")
    return value


def as_list(
    value: Any,
    field: str,
    *,
    non_empty: bool = False,
) -> list[Any]:
    if not isinstance(value, list):
        raise ValueError(f"{field} must be a list")
    if non_empty and not value:
        raise ValueError(f"{field} must not be empty")
    return value


def required(
    source: dict[str, Any],
    key: str,
    field: str,
) -> Any:
    if key not in source or source[key] is None:
        raise ValueError(f"{field}.{key} is required")
    return source[key]


def finite_number(value: Any, field: str) -> float:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ValueError(f"{field} must be a finite number")

    number = float(value)
    if not math.isfinite(number):
        raise ValueError(f"{field} must be a finite number")
    return number


def non_empty_string(value: Any, field: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"{field} must be a non-empty string")
    return value.strip()


def close(
    left: float,
    right: float,
    *,
    tolerance: float = EVIDENCE_TOLERANCE,
) -> bool:
    return abs(left - right) <= tolerance


def assert_close(actual: float, expected: float, field: str) -> None:
    if not close(actual, expected):
        raise ValueError(
            f"{field} is inconsistent with the executed TOPSIS evidence: "
            f"expected {expected!r}, got {actual!r}"
        )


def effective_tie(left: float, right: float) -> bool:
    return close(
        left,
        right,
        tolerance=ANALYTICAL_TIE_TOLERANCE,
    )


def validated_string_list(raw: Any, field: str) -> list[str]:
    values = as_list(raw, field, non_empty=True)
    return [
        non_empty_string(value, f"{field}[{index}]")
        for index, value in enumerate(values)
    ]


def validated_numeric_list(
    raw: Any,
    field: str,
    expected_length: int,
    *,
    non_negative: bool = False,
) -> list[float]:
    values = as_list(raw, field)
    if len(values) != expected_length:
        raise ValueError(
            f"{field} length must be {expected_length}, got {len(values)}"
        )

    normalized: list[float] = []
    for index, raw_value in enumerate(values):
        value = finite_number(raw_value, f"{field}[{index}]")
        if non_negative and value < -EVIDENCE_TOLERANCE:
            raise ValueError(
                f"{field}[{index}] must be greater than or equal to 0"
            )
        if non_negative and value < 0:
            value = 0.0
        normalized.append(value)

    return normalized


def validated_weights(
    raw: Any,
    field: str,
    expected_length: int,
) -> list[float]:
    weights = validated_numeric_list(
        raw,
        field,
        expected_length,
        non_negative=True,
    )
    total = sum(weights)
    if total <= EVIDENCE_TOLERANCE:
        raise ValueError(f"{field} must contain at least one positive weight")

    assert_close(total, 1.0, f"sum({field})")
    return weights


def scale_labels(
    raw_scale: Any,
    criterion_index: int,
    criterion_id: str,
) -> list[dict[str, Any]]:
    field = f"rawOutput.criterion_scales[{criterion_index}]"
    scale = as_object(raw_scale, field)

    scale_criterion_id = non_empty_string(
        scale.get("criterionId"),
        f"{field}.criterionId",
    )
    if scale_criterion_id != criterion_id:
        raise ValueError(
            f"{field}.criterionId must match rawOutput.criterion_ids"
        )

    labels_raw = as_list(
        scale.get("labels"),
        f"{field}.labels",
        non_empty=True,
    )
    labels: list[dict[str, Any]] = []
    seen_keys: set[str] = set()

    for label_index, raw_label in enumerate(labels_raw):
        label_field = f"{field}.labels[{label_index}]"
        label = as_object(raw_label, label_field)
        key = non_empty_string(label.get("key"), f"{label_field}.key")
        human_label = non_empty_string(
            label.get("label"),
            f"{label_field}.label",
        )

        if key in seen_keys:
            raise ValueError(f"{field}.labels contains duplicate key '{key}'")
        seen_keys.add(key)

        stored_index = label.get("index", label_index)
        if (
            isinstance(stored_index, bool)
            or not isinstance(stored_index, int)
            or stored_index != label_index
        ):
            raise ValueError(
                f"{label_field}.index must equal its ordered label index"
            )

        labels.append(
            {
                "key": key,
                "label": human_label,
                "index": label_index,
            }
        )

    label_count = scale.get("labelCount", len(labels))
    maximum_index = scale.get("maximumIndex", len(labels) - 1)
    if label_count != len(labels):
        raise ValueError(f"{field}.labelCount is inconsistent with labels")
    if maximum_index != len(labels) - 1:
        raise ValueError(f"{field}.maximumIndex is inconsistent with labels")

    return labels


def tuple_fact(
    raw_tuple: Any,
    *,
    beta: float,
    labels: list[dict[str, Any]],
    field: str,
) -> dict[str, Any]:
    tuple_value = as_object(raw_tuple, field)
    label_key = non_empty_string(
        tuple_value.get("labelKey"),
        f"{field}.labelKey",
    )
    alpha = finite_number(tuple_value.get("alpha"), f"{field}.alpha")

    label_by_key = {label["key"]: label for label in labels}
    if label_key not in label_by_key:
        raise ValueError(
            f"{field}.labelKey '{label_key}' does not exist in criterion scale"
        )

    label_definition = label_by_key[label_key]
    label_index = label_definition["index"]
    reconstructed_beta = delta_inverse(
        label_index=label_index,
        alpha=alpha,
        maximum_index=len(labels) - 1,
    )
    assert_close(beta, reconstructed_beta, f"{field} beta")

    return {
        "labelKey": label_key,
        "label": label_definition["label"],
        "labelIndex": label_index,
        "alpha": alpha,
    }


def validated_numeric_matrix(
    raw: Any,
    field: str,
    row_count: int,
    column_count: int,
) -> list[list[float]]:
    matrix = as_list(raw, field)
    if len(matrix) != row_count:
        raise ValueError(
            f"{field} must contain {row_count} rows, got {len(matrix)}"
        )

    normalized: list[list[float]] = []
    for row_index, raw_row in enumerate(matrix):
        row_field = f"{field}[{row_index}]"
        row = as_list(raw_row, row_field)
        if len(row) != column_count:
            raise ValueError(
                f"{row_field} must contain {column_count} columns, "
                f"got {len(row)}"
            )

        normalized.append(
            [
                finite_number(
                    raw_value,
                    f"{row_field}[{column_index}]",
                )
                for column_index, raw_value in enumerate(row)
            ]
        )

    return normalized


def validated_tuple_matrix(
    raw: Any,
    *,
    betas: list[list[float]],
    scales: list[list[dict[str, Any]]],
    row_count: int,
    column_count: int,
) -> list[list[dict[str, Any]]]:
    matrix = as_list(raw, "rawOutput.collective_matrix")
    if len(matrix) != row_count:
        raise ValueError(
            "rawOutput.collective_matrix row count must match alternatives"
        )

    normalized: list[list[dict[str, Any]]] = []
    for row_index, raw_row in enumerate(matrix):
        row = as_list(
            raw_row,
            f"rawOutput.collective_matrix[{row_index}]",
        )
        if len(row) != column_count:
            raise ValueError(
                "rawOutput.collective_matrix column count must match criteria"
            )

        normalized.append(
            [
                tuple_fact(
                    raw_tuple,
                    beta=betas[row_index][column_index],
                    labels=scales[column_index],
                    field=(
                        "rawOutput.collective_matrix"
                        f"[{row_index}][{column_index}]"
                    ),
                )
                for column_index, raw_tuple in enumerate(row)
            ]
        )

    return normalized
