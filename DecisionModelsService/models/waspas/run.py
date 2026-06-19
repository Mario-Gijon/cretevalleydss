"""WASPAS model implementation for API execution."""

from typing import Any

import numpy as np
from pyDecision.algorithm import waspas_method

from utils.clean_matrix import clean_matrix
from utils.get_plots_graphics_from_matrices import get_plots_graphics_from_matrices


def _ensure_valid_scores(
    scores: np.ndarray,
    expected_length: int,
    field: str,
) -> list[float]:
    if scores.ndim != 1:
        raise ValueError(f"WASPAS returned an invalid {field} score array")

    if scores.shape[0] != expected_length:
        raise ValueError(
            f"WASPAS {field} score length does not match the number of alternatives"
        )

    if not np.all(np.isfinite(scores)):
        raise ValueError(f"WASPAS returned non-finite {field} scores")

    return [float(score) for score in scores.tolist()]


def run_waspas(
    matrices: dict[str, list[list[float]]],
    weights: list[float],
    criterion_type: list[str],
    lambda_value: float = 0.5,
) -> dict[str, Any]:
    matrices_np = [np.array(matrix, dtype=float) for matrix in matrices.values()]
    collective_matrix = np.mean(matrices_np, axis=0)

    matrix_clean, weights_clean, criteria_clean = clean_matrix(
        collective_matrix,
        weights,
        criterion_type,
    )

    wsm, wpm, waspas = waspas_method(
        matrix_clean,
        criteria_clean,
        weights_clean,
        lambda_value,
        graph=False,
    )

    wsm = np.array(wsm, dtype=float)
    wpm = np.array(wpm, dtype=float)
    waspas = np.array(waspas, dtype=float)

    wsm_scores = _ensure_valid_scores(
        wsm,
        expected_length=matrix_clean.shape[0],
        field="WSM",
    )
    wpm_scores = _ensure_valid_scores(
        wpm,
        expected_length=matrix_clean.shape[0],
        field="WPM",
    )
    waspas_scores = _ensure_valid_scores(
        waspas,
        expected_length=matrix_clean.shape[0],
        field="WASPAS",
    )

    return {
        "collective_matrix": collective_matrix.tolist(),
        "matrix_used": matrix_clean.tolist(),
        "collective_scores": waspas_scores,
        "collective_ranking": np.argsort(waspas)[::-1].tolist(),
        "wsm_scores": wsm_scores,
        "wpm_scores": wpm_scores,
        "waspas_scores": waspas_scores,
        "lambda": lambda_value,
        "weights_used": np.array(weights_clean, dtype=float).tolist(),
        "plots_graphic": get_plots_graphics_from_matrices(
            matrices_np,
            collective_matrix,
            method="MDS",
        ),
    }