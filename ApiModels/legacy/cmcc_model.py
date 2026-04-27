"""
Solve the CMCC LP with common variable bounds:
    min ∑_k c_k * |o_bar_k - o_k|
s.t.
    g = ∑_k ω_k * o_bar_k
    |o_bar_k - g| <= eps,   ∀k
    1 - ∑_k w_k * |o_bar_k - g| ≥ μ0
    lower_bound <= o_bar_k, g <= upper_bound

"""

import pulp as pl

def solve_cmcc(o, c, omega, w, eps, mu0,
                                        lower_bound=0.0, upper_bound=1.0,
                                        solver=None, msg=False):
    """
    o           : list of original expert opinions (len m)
    c           : list of costs (len m) A cada experto un coste
    omega       : weights for aggregation (sum=1)
    w           : weights for DMs (len m)
    eps         : maximum deviation
    mu0         : minimum acceptable consensus threshold (0 ≤ μ0 ≤ 1)
    lower_bound : lower bound for o_bar_k and g
    upper_bound : upper bound for o_bar_k and g
    solver      : optional pulp solver
    msg         : solver output flag
    Returns: dict with keys 'status','o_bar','g','objective'
    """
    m = len(o)
    assert len(c) == m and len(omega) == m and len(w) == m, "Length mismatch among vectors"

    # Define LP problem
    prob = pl.LpProblem("CMCC", pl.LpMinimize)

    # Variables
    o_bar = [
        pl.LpVariable(f"o_bar_{k}", lowBound=lower_bound, upBound=upper_bound)
        for k in range(m)
    ]
    g = pl.LpVariable("g", lowBound=lower_bound, upBound=upper_bound)
    u = [pl.LpVariable(f"u_{k}", lowBound=0.0) for k in range(m)]  # |o_bar_k - o_k|
    v = [pl.LpVariable(f"v_{k}", lowBound=0.0) for k in range(m)]  # |o_bar_k - g|

    # Objective: minimize ∑ c_k * u_k
    prob += pl.lpSum(c[k] * u[k] for k in range(m)), "Objective"

    # Linearization for |o_bar_k - o_k| <= u_k
    for k in range(m):
        prob += u[k] >= o_bar[k] - o[k], f"abs_u_pos_{k}"
        prob += u[k] >= o[k] - o_bar[k], f"abs_u_neg_{k}"

    # Weighted aggregation: g = ∑ ω_k * o_bar_k
    prob += g == pl.lpSum(omega[k] * o_bar[k] for k in range(m)), "weighted_average"

    # Consensus constraints: |o_bar_k - g| <= eps
    for k in range(m):
        prob += o_bar[k] - g <= eps, f"consensus_pos_{k}"
        prob += g - o_bar[k] <= eps, f"consensus_neg_{k}"

    # Linearization for v_k = |o_bar_k - g|
    for k in range(m):
        prob += v[k] >= o_bar[k] - g, f"abs_v_pos_{k}"
        prob += v[k] >= g - o_bar[k], f"abs_v_neg_{k}"

    # consenus constraint: 1 - ∑ w_k * v_k ≥ μ0  ⇔  ∑ w_k * v_k ≤ 1 - μ0
    prob += pl.lpSum(w[k] * v[k] for k in range(m)) <= 1 - mu0, "kappa_constraint"

    # Solve
    if solver is None:
        solver = pl.PULP_CBC_CMD(msg=msg)
    prob.solve(solver)

    status = pl.LpStatus[prob.status]
    o_bar_vals = [pl.value(vv) for vv in o_bar]
    g_val = pl.value(g)
    obj_val = pl.value(prob.objective)
    kappa_val = 1 - sum(w[k] * pl.value(v[k]) for k in range(m))

    return {
        "status": status,
        "o_bar": o_bar_vals,
        "g": g_val,
        "consenus_level": kappa_val,
        "objective": obj_val,
        "problem": prob,
    }
