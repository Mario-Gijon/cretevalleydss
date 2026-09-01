import math
from typing import Any

from .aggregation.core import TwoTuple


def interpret_two_tuple_result(
    value: TwoTuple,
    *,
    labels: list[dict[str, Any]],
) -> str:
    """Return a concise natural-language interpretation of a 2-tuple."""

    if not isinstance(value, TwoTuple):
        raise ValueError("two-tuple result must be a TwoTuple")

    label_index = value.label_index
    if label_index < 0 or label_index >= len(labels):
        raise ValueError("two-tuple result contains an out-of-range label index")

    base_label = str(labels[label_index]["label"])
    alpha = float(value.alpha)
    magnitude = abs(alpha)

    if not math.isfinite(alpha) or magnitude < 0.10:
        return base_label

    direction = 1 if alpha > 0 else -1
    neighbor_index = label_index + direction
    has_neighbor = 0 <= neighbor_index < len(labels)

    if not has_neighbor:
        return base_label

    neighbor_label = str(labels[neighbor_index]["label"])
    if magnitude < 0.25:
        return f"{base_label}, slightly leaning toward {neighbor_label}"

    if magnitude < 0.40:
        return f"{base_label}, leaning toward {neighbor_label}"

    lower_label, upper_label = (
        (base_label, neighbor_label)
        if alpha > 0
        else (neighbor_label, base_label)
    )

    if math.isclose(magnitude, 0.50, rel_tol=0.0, abs_tol=1e-9):
        return f"Between {lower_label} and {upper_label}"

    if magnitude < 0.50:
        return (
            f"Between {lower_label} and {upper_label}, "
            f"closer to {base_label}"
        )

    return base_label
