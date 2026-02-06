import numpy as np

def defuzzify_centroid(matrix_fuzzy):
    m = np.array(matrix_fuzzy, dtype=float)     # alt x crit x 3
    return (m[..., 0] + m[..., 1] + m[..., 2]) / 3.0  # alt x crit