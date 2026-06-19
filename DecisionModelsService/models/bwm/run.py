"""Implementación del modelo Best-Worst Method (BWM)."""

from typing import Any

import numpy as np
from pyDecision.algorithm import bw_method


def run_bwm(
    experts_data: dict[str, dict[str, list[float]]],
    eps_penalty: float = 1,
) -> dict[str, Any]:
    """Ejecuta BWM a partir de comparaciones agregadas de expertos."""

    try:
        if not experts_data:
            return {"success": False, "message": "No expert data provided"}

        mic_list: list[np.ndarray] = []
        lic_list: list[np.ndarray] = []

        for _, values in experts_data.items():
            mic = np.array(values.get("mic", []), dtype=float)
            lic = np.array(values.get("lic", []), dtype=float)

            if mic.size == 0 or lic.size == 0:
                continue

            mic_list.append(mic)
            lic_list.append(lic)

        if not mic_list or not lic_list:
            return {"success": False, "message": "No valid expert data to aggregate"}

        mic_avg = np.mean(np.vstack(mic_list), axis=0)
        lic_avg = np.mean(np.vstack(lic_list), axis=0)
        weights = bw_method(mic_avg, lic_avg, eps_penalty=eps_penalty, verbose=False)

        return {
            "success": True,
            "weights": weights.tolist(),
            "n_experts": len(mic_list),
            "mic_avg": mic_avg.tolist(),
            "lic_avg": lic_avg.tolist(),
        }
    except Exception as error:
        return {"success": False, "message": f"Error in run_bwm: {error}"}
