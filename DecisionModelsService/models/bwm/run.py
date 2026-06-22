"""Implementación del modelo Best-Worst Method (BWM)."""

from typing import Any

import math
import numpy as np
from pyDecision.algorithm import bw_method


def _to_weight_list(raw_weights: Any, expert_key: str) -> list[float]:
    weights_array = np.array(raw_weights, dtype=float).reshape(-1)

    if weights_array.size == 0:
        raise ValueError(f"BWM returned empty weights for expert '{expert_key}'")

    weights: list[float] = []
    for index, value in enumerate(weights_array.tolist()):
        numeric = float(value)
        if not math.isfinite(numeric):
            raise ValueError(
                f"BWM returned a non-finite weight for expert '{expert_key}' at index {index}"
            )
        if numeric < 0:
            raise ValueError(
                f"BWM returned a negative weight for expert '{expert_key}' at index {index}"
            )
        weights.append(numeric)

    total = sum(weights)
    if not math.isfinite(total) or total <= 0:
        raise ValueError(f"BWM returned weights with non-positive total for expert '{expert_key}'")

    return weights


def run_bwm(
    experts_data: dict[str, dict[str, list[float]]],
    eps_penalty: float = 1,
) -> dict[str, Any]:
    """Run BWM independently for each expert.

    Consensus aggregation is intentionally handled by the executor.
    """

    try:
        if not experts_data:
            return {"success": False, "message": "No expert data provided"}

        expert_weights: dict[str, list[float]] = {}
        expert_inputs: dict[str, dict[str, list[float]]] = {}

        for expert_key, values in experts_data.items():
            mic = np.array(values.get("mic", []), dtype=float)
            lic = np.array(values.get("lic", []), dtype=float)

            if mic.size == 0 or lic.size == 0:
                return {
                    "success": False,
                    "message": f"No valid BWM data for expert '{expert_key}'",
                }

            if mic.size != lic.size:
                return {
                    "success": False,
                    "message": f"BWM MIC/LIC lengths differ for expert '{expert_key}'",
                }

            raw_weights = bw_method(mic, lic, eps_penalty=eps_penalty, verbose=False)
            weights = _to_weight_list(raw_weights, expert_key)

            if len(weights) != mic.size:
                return {
                    "success": False,
                    "message": (
                        f"BWM returned {len(weights)} weights for expert '{expert_key}', "
                        f"expected {mic.size}"
                    ),
                }

            expert_weights[expert_key] = weights
            expert_inputs[expert_key] = {
                "mic": mic.tolist(),
                "lic": lic.tolist(),
            }

        return {
            "success": True,
            "expertWeights": expert_weights,
            "expertInputs": expert_inputs,
            "n_experts": len(expert_weights),
            "eps_penalty": eps_penalty,
        }
    except Exception as error:
        return {"success": False, "message": f"Error in run_bwm: {error}"}
