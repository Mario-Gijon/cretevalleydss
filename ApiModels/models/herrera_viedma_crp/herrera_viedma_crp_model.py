"""Implementación del proceso de consenso Herrera-Viedma CRP."""

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
    conjunto_solucion,
    detectar_cambios,
    expertos_mas_alejados,
    get_plots_graphics,
    s_owa_or_like,
)


def run_herrera_viedma(
    matrices: dict[str, dict[str, list[list[float]]]],
    cl: float,
    ag_lq: list[float],
    ex_lq: list[float],
    b: float,
    beta: float,
    w_crit: list[float],
) -> dict[str, Any]:
    """Ejecuta una iteración del modelo Herrera-Viedma sobre matrices por experto."""

    n_exp = len(matrices)
    first_user_data = next(iter(matrices.values()))
    criterion_name = next(iter(first_user_data))
    first_matrix = first_user_data[criterion_name]
    n_alt = len(first_matrix)
    n_crit = 1

    pref = np.zeros((n_exp + 1, n_alt, n_alt))
    for index, expert in enumerate(matrices.values()):
        pref[index] = np.array(expert[criterion_name])

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
    solution_set = conjunto_solucion(alternatives_rankings[-1])

    differences_rankings = calcular_diferencia_rankings(alternatives_rankings)
    consensus_degree_exp_alt = calcular_consenso_exp_alt(differences_rankings, b)
    consensus_degree_alt = calcular_consenso_alt(consensus_degree_exp_alt, n_alt, n_exp)
    cm = s_owa_or_like(consensus_degree_alt, beta, solution_set)

    if cm < cl:
        proximity_measures = calcular_medidas_proximidad(consensus_degree_exp_alt, beta, solution_set)
        farthest_experts = expertos_mas_alejados(proximity_measures)
        changes = detectar_cambios(farthest_experts, differences_rankings)
        aplicar_cambios(changes, pref)

    return {
        "alternatives_rankings": alternatives_rankings,
        "cm": round(cm, 2),
        "collective_scores": [round(float(value), 6) for value in collective_scores],
        "collective_evaluations": {
            criterion_name: [[round(cell, 2) for cell in row] for row in pref[-1]],
        },
        "plots_graphic": plots,
    }
