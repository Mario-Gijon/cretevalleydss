import numpy as np
from pyDecision.algorithm import fuzzy_topsis_method

def run_fuzzy_topsis(matrices, weights, criterion_type):
    # matrices: dict → lista (alternativas x criterios) → cada celda es triple [l,m,u]
    matrices_list = list(matrices.values())

    def avg_triples(triples_list):
        l = np.mean([t[0] for t in triples_list])
        m = np.mean([t[1] for t in triples_list])
        u = np.mean([t[2] for t in triples_list])
        return (l, m, u)

    first_matrix = matrices_list[0]
    n_alt = len(first_matrix)
    n_crit = len(first_matrix[0])

    collective_matrix = []
    for i in range(n_alt):
        row = []
        for j in range(n_crit):
            triples = [mat[i][j] for mat in matrices_list]  # 👈 usar indexación lista
            print(f"Cell ({i},{j}):", triples)
            row.append(avg_triples(triples))
        collective_matrix.append(row)

    # Normalizamos pesos → lista de tuplas
    flat_weights = [tuple(w) for w in weights]

    if len(flat_weights) != len(criterion_type):
        raise ValueError(f"Mismatch: {len(flat_weights)} weights vs {len(criterion_type)} criteria")

    relative_closeness = fuzzy_topsis_method(
        dataset=collective_matrix,
        weights=[flat_weights],   # 👈 debe ir anidado igual que en el ejemplo oficial
        criterion_type=criterion_type,
        graph=False,
        verbose=False
    ).tolist()

    ranking = np.argsort(relative_closeness)[::-1].tolist()

    return {
        "collective_matrix": collective_matrix,
        "collective_scores": relative_closeness,
        "collective_ranking": ranking
    }
