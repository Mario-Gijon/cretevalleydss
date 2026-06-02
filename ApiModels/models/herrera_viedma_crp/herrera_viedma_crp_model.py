"""Implementación del proceso de consenso Herrera-Viedma CRP."""

import math
from typing import Any

import numpy as np

from models.herrera_viedma_crp.utils import (
    aplicar_cambios,
    calcular_colectiva_OWA,
    calcular_consenso_alt,
    calcular_consenso_exp_alt,
    calcular_diferencia_rankings,
    calcular_medidas_proximidad,
    calcular_pesos_OWA,
    calcular_QGDD,
    conjunto_solucion_desde_scores,
    detectar_cambios,
    expertos_mas_alejados,
    get_plots_graphics,
    s_owa_or_like,
)


def _rounded_finite_matrix(matrix: np.ndarray) -> list[list[float]]:
    rounded_matrix: list[list[float]] = []
    for row_index, row in enumerate(matrix):
        rounded_row: list[float] = []
        for col_index, cell in enumerate(row):
            numeric_cell = float(cell)
            if not math.isfinite(numeric_cell):
                raise ValueError(
                    f"Non-finite value in preference matrix at [{row_index}][{col_index}]"
                )
            rounded_row.append(round(numeric_cell, 2))
        rounded_matrix.append(rounded_row)
    return rounded_matrix


def _finite_float_list(values: np.ndarray, *, precision: int = 6) -> list[float]:
    result: list[float] = []
    for index, value in enumerate(values):
        numeric_value = float(value)
        if not math.isfinite(numeric_value):
            raise ValueError(f"Non-finite value at index {index}")
        result.append(round(numeric_value, precision))
    return result


def _build_suggested_pairwise_payload(
    *,
    matrix: np.ndarray,
    criterion_name: str,
    alternative_names: list[str],
) -> dict[str, Any]:
    if len(alternative_names) != len(matrix):
        raise ValueError(
            "alternative_names length must match the suggested preference matrix size"
        )

    rounded_matrix = _rounded_finite_matrix(matrix)
    comparisons_by_criterion: dict[str, dict[str, Any]] = {
        criterion_name: {}
    }

    for row_index, row_alternative in enumerate(alternative_names):
        row = rounded_matrix[row_index]
        for col_index, col_alternative in enumerate(alternative_names):
            if row_index == col_index:
                continue

            pair_key = f"{row_alternative}::{col_alternative}"
            comparisons_by_criterion[criterion_name][pair_key] = {
                "value": row[col_index]
            }

    return {
        "comparisonsByCriterion": comparisons_by_criterion
    }


def run_herrera_viedma(
    matrices: dict[str, dict[str, list[list[float]]]],
    cl: float,
    ag_lq: list[float],
    ex_lq: list[float],
    b: float,
    beta: float,
    w_crit: list[float],
    alternative_names: list[str],
) -> dict[str, Any]:
    """Ejecuta una iteración del modelo Herrera-Viedma sobre matrices por experto."""

    n_exp = len(matrices)
    first_user_data = next(iter(matrices.values()))
    criterion_name = next(iter(first_user_data))
    first_matrix = first_user_data[criterion_name]
    n_alt = len(first_matrix)
    n_crit = 1

    expert_keys = list(matrices.keys())
    pref = np.zeros((n_exp + 1, n_alt, n_alt))
    for index, expert_key in enumerate(expert_keys):
        expert = matrices[expert_key]
        if criterion_name not in expert:
            raise ValueError(
                f"Missing criterion '{criterion_name}' in matrix for expert '{expert_key}'"
            )
        pref[index] = np.array(expert[criterion_name], dtype=float)

    w_exp = calcular_pesos_OWA(n_exp, ag_lq)
    w_alt = calcular_pesos_OWA(n_alt, ex_lq)

    cm = 0.0

    collective_preferences = calcular_colectiva_OWA(pref, n_exp, n_alt, n_crit, w_crit, w_exp)
    pref[-1] = collective_preferences
    plots = get_plots_graphics(pref, "MDS")

    alternatives_rankings: list[np.ndarray | None] = [None] * (n_exp + 1)
    qgdd_list: list[np.ndarray | None] = [None] * (n_exp + 1)

    for index in range(n_exp + 1):
        qgdd = calcular_QGDD(n_alt, pref[index], w_alt)
        qgdd_list[index] = qgdd
        alternatives_rankings[index] = np.argsort(qgdd)[::-1]

    collective_scores = qgdd_list[-1]
    solution_set = conjunto_solucion_desde_scores(collective_scores)

    differences_rankings = calcular_diferencia_rankings(alternatives_rankings)
    consensus_degree_exp_alt = calcular_consenso_exp_alt(differences_rankings, b)
    consensus_degree_alt = calcular_consenso_alt(consensus_degree_exp_alt, n_alt, n_exp)
    cm = s_owa_or_like(consensus_degree_alt, beta, solution_set)

    if cm < cl:
        proximity_measures = calcular_medidas_proximidad(consensus_degree_exp_alt, beta, solution_set)
        farthest_experts = expertos_mas_alejados(proximity_measures)
        changes = detectar_cambios(farthest_experts, differences_rankings)
        aplicar_cambios(changes, pref)
        suggested_next_evaluations = {
            expert_keys[expert_index]: {
                "payload": _build_suggested_pairwise_payload(
                    matrix=pref[expert_index],
                    criterion_name=criterion_name,
                    alternative_names=alternative_names,
                ),
            }
            for expert_index in range(n_exp)
        }
        proximity_measures_output = [
            round(float(value), 6) for value in proximity_measures
        ]
        farthest_experts_output = sorted(int(index) for index in farthest_experts)
        changes_output = {
            str(int(expert_index)): [int(change) for change in expert_changes]
            for expert_index, expert_changes in changes.items()
        }
    else:
        suggested_next_evaluations = {}
        proximity_measures_output = []
        farthest_experts_output = []
        changes_output = {}

    expert_rankings = [
        [int(value) for value in alternatives_rankings[expert_index]]
        for expert_index in range(n_exp)
    ]
    collective_ranking = [int(value) for value in alternatives_rankings[-1]]
    differences_rankings_output = [
        [int(value) for value in row]
        for row in differences_rankings.tolist()
    ]
    consensus_degree_exp_alt_output = [
        _finite_float_list(row, precision=6)
        for row in consensus_degree_exp_alt
    ]
    consensus_degree_alt_output = _finite_float_list(
        consensus_degree_alt,
        precision=6,
    )
    solution_set_output = sorted(int(index) for index in solution_set)

    return {
        "alternatives_rankings": alternatives_rankings,
        "cm": round(cm, 2),
        "collective_scores": [round(float(value), 6) for value in collective_scores],
        "collective_evaluations": {
            criterion_name: _rounded_finite_matrix(pref[-1]),
        },
        "plots_graphic": plots,
        "suggested_next_evaluations": suggested_next_evaluations,
        "diagnostics": {
            "expert_rankings": expert_rankings,
            "collective_ranking": collective_ranking,
            "differences_rankings": differences_rankings_output,
            "consensus_degree_exp_alt": consensus_degree_exp_alt_output,
            "consensus_degree_alt": consensus_degree_alt_output,
            "solution_set": solution_set_output,
            "proximity_measures": proximity_measures_output,
            "farthest_experts": farthest_experts_output,
            "changes": changes_output,
        },
    }
