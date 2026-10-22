"""Rebuild optional visual evidence from a model's frozen execution input."""

from collections.abc import Mapping
from typing import Any


def reconstruct_sorting_projection(execution: Mapping[str, Any]) -> dict[str, Any] | None:
    """Rebuild TOPSIS-Sort's presentation-only MDS evidence when it is absent.

    Historical executions keep the exact request body in selectedExecution.input.
    Reuse the adapter's matrix and domain validation to reconstruct only the
    visual projection; this path never invokes the TOPSIS-Sort classification.
    """
    model_context = execution.get("modelContext") or {}
    if model_context.get("apiModelKey") != "topsis_sort_2016":
        return None

    frozen_input = execution.get("input")
    if not isinstance(frozen_input, Mapping):
        return {"reason": "missing_frozen_numeric_evidence"}

    # Keep the model-specific extraction at the adapter boundary. The generic
    # analysis path receives only the resulting optional projection, not raw
    # evaluations, parameters, or model diagnostics.
    from models.topsis_sort_2016.executor import (
        build_plots_graphic_from_execution_input,
    )

    try:
        return build_plots_graphic_from_execution_input(frozen_input)
    except Exception:
        return {"reason": "invalid_frozen_numeric_evidence"}
