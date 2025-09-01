import numpy as np
from pyDecision.algorithm import topsis_method

import numpy as np

def run_topsis(matrices, weights, criterion_type):
    expert_rankings = {}
    expert_scores = {}
    expert_mean = {}
    expert_std = {}
    pairwise_correlations = {}

    for expert, matrix in matrices.items():
        matrix_np = np.array(matrix, dtype=float)
        scores = topsis_method(matrix_np, weights, criterion_type)

        # Guardamos los scores del experto
        scores_list = scores.tolist()
        expert_scores[expert] = scores_list

        # Ranking del experto
        ranking = np.argsort(scores)[::-1].tolist()
        expert_rankings[expert] = ranking

        # Media y desviación de cada experto (para ver consistencia)
        expert_mean[expert] = float(np.mean(scores))
        expert_std[expert] = float(np.std(scores))

    # Matriz de todas las puntuaciones (expertos x alternativas)
    all_scores = np.array(list(expert_scores.values()))

    # Ranking colectivo: promedio de relative_closeness
    collective_scores = np.mean(all_scores, axis=0).tolist()
    collective_ranking = np.argsort(collective_scores)[::-1].tolist()

    # Desviación estándar colectiva (variabilidad entre expertos)
    collective_std = np.std(all_scores, axis=0).tolist()

    # Heatmap data: matriz de correlaciones entre expertos
    expert_names = list(expert_scores.keys())
    correlation_matrix = np.corrcoef(all_scores)
    correlation_dict = {
        expert_names[i]: {
            expert_names[j]: float(correlation_matrix[i, j])
            for j in range(len(expert_names))
        }
        for i in range(len(expert_names))
    }

    # Puntos de dispersión (ej: diferencias de cada experto vs. media colectiva)
    dispersion = {
        expert: (np.array(scores) - np.array(collective_scores)).tolist()
        for expert, scores in expert_scores.items()
    }

    return {
        "expert_scores": expert_scores,           # puntuaciones de cada experto
        "expert_rankings": expert_rankings,       # ranking de cada experto
        "expert_mean": expert_mean,               # media de cada experto
        "expert_std": expert_std,                 # desviación std de cada experto
        "collective_scores": collective_scores,   # puntuaciones promedio
        "collective_ranking": collective_ranking, # ranking promedio
        "collective_std": collective_std,         # desviación colectiva por alternativa
        "correlation_matrix": correlation_dict,   # correlaciones entre expertos
        "dispersion": dispersion,                 # diferencia experto vs media
        "heatmap_data": all_scores.tolist(),      # matriz para heatmap (experto x alternativa)
    }
