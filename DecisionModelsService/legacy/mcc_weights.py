import pulp as pl

def solve_mcc_weights(o, c, w, eps, solver=None, msg=False):
    """
    Solve the MCC weights LP:
        min  sum_k sum_j c_k * |o_bar_k^j - o_k^j|
        s.t.
            g_bar_j = sum_k w_k * o_bar_k^j,   j = 1..n
            |o_bar_k^j - g_bar_j| <= eps,       k = 1..m, j = 1..n
            sum_j g_bar_j = 1
            o_bar_k^j >= 0                       k = 1..m, j = 1..n

    Parameters
    ----------
    o   : 2D list/array of shape (m, n) — experts' weights o_k^j
    c   : 1D list/array of length m    — nonneg cost per expert
    w   : 1D list/array of length m    — aggregation weights (sum to 1)
    eps : float >= 0                   — consensus tolerance
    solver : optional PuLP solver instance
    msg    : whether to print solver output

    Returns
    -------
    dict with keys:
        'status'    : solver status string
        'o_bar'     : list of lists o_bar[k][j]  (shape m x n)
        'g_bar'     : list g_bar[j]              (length n) consensus weights
        'objective' : optimal objective value
        'problem'   : the PuLP LpProblem instance
    """
    m = len(o)          # number of experts
    n = len(o[0])       # number of criteria

    assert len(c) == m,      f"c must have length m={m}, got {len(c)}"
    assert len(w) == m,      f"w must have length m={m}, got {len(w)}"
    assert all(len(o[k]) == n for k in range(m)), "All experts must have n opinions"
    assert eps >= 0, "eps must be nonnegative"
    assert all(ci >= 0 for ci in c), "All costs must be nonnegative"
    assert all(wi >= 0 for wi in w), "All aggregation weights must be nonnegative"
    assert abs(sum(w) - 1.0) < 1e-8, "Aggregation weights w must sum to 1"

    prob = pl.LpProblem("MCC_weights", pl.LpMinimize)

    # --- Decision variables ---
    # o_bar[k][j] : adjusted opinion of expert k on criterion j  (>= 0)
    o_bar = [
        [pl.LpVariable(f"o_bar_{k}_{j}", lowBound=0.0) for j in range(n)]
        for k in range(m)
    ]

    # g_bar[j] : group opinion on criterion j  (>= 0)
    g_bar = [pl.LpVariable(f"g_bar_{j}", lowBound=0.0) for j in range(n)]

    # u[k][j] : auxiliary variable for |o_bar_k^j - o_k^j|
    u = [
        [pl.LpVariable(f"u_{k}_{j}", lowBound=0.0) for j in range(n)]
        for k in range(m)
    ]

    # --- Objective ---
    prob += pl.lpSum(c[k] * u[k][j] for k in range(m) for j in range(n)), "Objective"

    # --- Linearised absolute value: u_k^j >= |o_bar_k^j - o_k^j| ---
    for k in range(m):
        for j in range(n):
            prob += u[k][j] >= o_bar[k][j] - o[k][j], f"abs_pos_{k}_{j}"
            prob += u[k][j] >= o[k][j] - o_bar[k][j], f"abs_neg_{k}_{j}"

    # --- Weighted average: g_bar_j = sum_k w_k * o_bar_k^j ---
    for j in range(n):
        prob += (
            g_bar[j] == pl.lpSum(w[k] * o_bar[k][j] for k in range(m)),
            f"weighted_avg_{j}"
        )

    # --- Consensus: |o_bar_k^j - g_bar_j| <= eps ---
    for k in range(m):
        for j in range(n):
            prob += o_bar[k][j] - g_bar[j] <= eps, f"consensus_pos_{k}_{j}"
            prob += g_bar[j] - o_bar[k][j] <= eps, f"consensus_neg_{k}_{j}"
            
    # --- Each adjusted expert opinion must sum to 1: sum_j o_bar_k^j = 1,  k = 1..m ---
    for k in range(m):
        prob += pl.lpSum(o_bar[k][j] for j in range(n)) == 1, f"expert_simplex_{k}"

    # --- Probability simplex: sum_j g_bar_j = 1 ---
    prob += pl.lpSum(g_bar[j] for j in range(n)) == 1, "simplex"

    # --- Solve ---
    if solver is None:
        solver = pl.PULP_CBC_CMD(msg=msg)
    prob.solve(solver)

    status     = pl.LpStatus[prob.status]
    o_bar_vals = [[pl.value(o_bar[k][j]) for j in range(n)] for k in range(m)]
    g_bar_vals = [pl.value(g_bar[j]) for j in range(n)]
    obj        = pl.value(prob.objective)

    return {
        "status":    status,
        "o_bar":     o_bar_vals,
        "g_bar":     g_bar_vals,
        "objective": obj,
        "problem":   prob,
    }


# ---------------------------------------------------------------------------
# Quick check
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    # 3 experts, 3 criteria
    # o[k][j]: expert k's original weight for criterion j.
    # The adjusted vectors o_bar[k] and the consensus vector g_bar
    # are constrained to sum to 1.
    o = [
        [0.5, 0.3, 0.2],   # expert 0
        [0.4, 0.4, 0.2],   # expert 1
        [0.3, 0.3, 0.4],   # expert 2
    ]
    c     = [1.0, 1.0, 1.0]          # equal costs
    w     = [1/3, 1/3, 1/3]          # equal weights
    eps   = 0.05                     # tight consensus band

    result = solve_mcc_weights(o, c, w, eps, msg=False)

    print(f"Status    : {result['status']}")
    print(f"Objective : {result['objective']:.6f}")
    print(f"g_bar     : {[round(v, 4) for v in result['g_bar']]}")
    print(f"sum(g_bar): {sum(result['g_bar']):.6f}  (should be 1.0)")
    for k, row in enumerate(result['o_bar']):
        print(f"o_bar[{k}]  : {[round(v, 4) for v in row]}")