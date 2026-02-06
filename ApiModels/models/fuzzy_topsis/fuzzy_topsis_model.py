import numpy as np
from pyDecision.algorithm import fuzzy_topsis_method
from utils.get_plots_graphics_from_matrices import get_plots_graphics_from_matrices
from utils.defuzzify_centroid import defuzzify_centroid

def run_fuzzy_topsis(matrices, weights, criterion_type):
    matrices_list = list(matrices.values())  # expert -> (alt x crit x [l,m,u])

    def avg_triples(triples_list):
        l = np.mean([t[0] for t in triples_list])
        m = np.mean([t[1] for t in triples_list])
        u = np.mean([t[2] for t in triples_list])
        return (l, m, u)

    # ---------- (A) matriz colectiva fuzzy ----------
    first_matrix = matrices_list[0]
    n_alt = len(first_matrix)
    n_crit = len(first_matrix[0])

    collective_matrix = []
    for i in range(n_alt):
        row = []
        for j in range(n_crit):
            triples = [mat[i][j] for mat in matrices_list]
            row.append(avg_triples(triples))
        collective_matrix.append(row)

    # ---------- (B) ejecutar fuzzy topsis ----------
    flat_weights = [tuple(w) for w in weights]

    if len(flat_weights) != len(criterion_type):
        raise ValueError(f"Mismatch: {len(flat_weights)} weights vs {len(criterion_type)} criteria")

    collective_scores = fuzzy_topsis_method(
        dataset=collective_matrix,
        weights=[flat_weights],
        criterion_type=criterion_type,
        graph=False,
        verbose=False
    ).tolist()

    ranking = np.argsort(collective_scores)[::-1].tolist()

    matrices_np = [defuzzify_centroid(mat) for mat in matrices_list]
    collective_crisp = defuzzify_centroid(collective_matrix)

    plots_graphic = get_plots_graphics_from_matrices(
        matrices_np=[m for m in matrices_np],          # lista np alt x crit
        collective_matrix=collective_crisp,            # np alt x crit
        method="MDS"
    )

    return {
        "collective_matrix": collective_matrix,        # fuzzy triples
        "collective_scores": collective_scores,        # ranking scores
        "collective_ranking": ranking,
        "plots_graphic": plots_graphic                
    }
