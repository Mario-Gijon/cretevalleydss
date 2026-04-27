"""
Solve the OWA-MCC LP with common variable bounds:
    min ∑_k c_k * |o_bar_k - o_k|
s.t.
    g = ∑_k ω_k * o_bar_k
    |o_bar_k - g| <= eps,   ∀k
    lower_bound <= o_bar_k, g <= upper_bound
"""
"""
Solve the OWA-MCC LP with common variable bounds:
    min ∑_k c_k * |o_bar_k - o_k|
s.t.
    g = ∑_k ω_k * o_bar_k
    |o_bar_k - g| <= eps,   ∀k
    lower_bound <= o_bar_k, g <= upper_bound
"""

import pulp as pl

def solve_mcc(o, c, omega, eps, lower_bound=0.0, upper_bound=1.0, solver=None, msg=False):
    """
    o           : list/array of original expert opinions o_k (len m)
    c           : list/array of nonnegative costs c_k (len m)
    omega       : list/array of weights omega_k (len m), should sum to 1
    eps         : consensus tolerance (scalar >= 0)
    lower_bound : lower bound for all o_bar_k and g,
    upper_bound : upper bound for all o_bar_k and g
    solver      : optional pulp solver instance
    msg         : whether to print solver output
    Returns: dict with keys 'status','o_bar','g','objective'
    """
    m = len(o)
    assert len(c) == m and len(omega) == m, "Lengths of o, c, omega must match"

    # Problem
    prob = pl.LpProblem("MCC", pl.LpMinimize)

    # Variables: bounded by common lower and upper limits
    o_bar = [
        pl.LpVariable(f"o_bar_{k}", lowBound=lower_bound, upBound=upper_bound)
        for k in range(m)
    ]
    g = pl.LpVariable("g", lowBound=lower_bound, upBound=upper_bound)
    u = [pl.LpVariable(f"u_{k}", lowBound=0.0) for k in range(m)]

    # Objective: minimize sum_k c_k * u_k
    prob += pl.lpSum([c[k] * u[k] for k in range(m)]), "Objective"

    # |o_bar_k - o_k| <= u_k  (linearized absolute value)
    for k in range(m):
        prob += u[k] >= o_bar[k] - o[k], f"abs_pos_{k}"
        prob += u[k] >= o[k] - o_bar[k], f"abs_neg_{k}"

    # Weighted average: g = sum_k omega_k * o_bar_k
    prob += g == pl.lpSum([omega[k] * o_bar[k] for k in range(m)]), "weighted_average"

    # Consensus constraints: |o_bar_k - g| <= eps
    for k in range(m):
        prob += o_bar[k] - g <= eps, f"consensus_pos_{k}"
        prob += g - o_bar[k] <= eps, f"consensus_neg_{k}"

    # Solve
    if solver is None:
        solver = pl.PULP_CBC_CMD(msg=msg)
    prob.solve(solver)

    status = pl.LpStatus[prob.status]
    o_bar_vals = [pl.value(v) for v in o_bar]
    g_val = pl.value(g)
    obj = pl.value(prob.objective)

    return {"status": status, "o_bar": o_bar_vals, "g": g_val, "objective": obj, "problem": prob}

import pulp as pl

def solve_mcc(o, c, omega, eps, lower_bound=0.0, upper_bound=1.0, solver=None, msg=False):
    """
    o           : list/array of original expert opinions o_k (len m)
    c           : list/array of nonnegative costs c_k (len m)
    omega       : list/array of weights omega_k (len m), should sum to 1
    eps         : consensus tolerance (scalar >= 0)
    lower_bound : lower bound for all o_bar_k and g,
    upper_bound : upper bound for all o_bar_k and g
    solver      : optional pulp solver instance
    msg         : whether to print solver output
    Returns: dict with keys 'status','o_bar','g','objective'
    """
    m = len(o)
    assert len(c) == m and len(omega) == m, "Lengths of o, c, omega must match"

    # Problem
    prob = pl.LpProblem("MCC", pl.LpMinimize)

    # Variables: bounded by common lower and upper limits
    o_bar = [
        pl.LpVariable(f"o_bar_{k}", lowBound=lower_bound, upBound=upper_bound)
        for k in range(m)
    ]
    g = pl.LpVariable("g", lowBound=lower_bound, upBound=upper_bound)
    u = [pl.LpVariable(f"u_{k}", lowBound=0.0) for k in range(m)]

    # Objective: minimize sum_k c_k * u_k
    prob += pl.lpSum([c[k] * u[k] for k in range(m)]), "Objective"

    # |o_bar_k - o_k| <= u_k  (linearized absolute value)
    for k in range(m):
        prob += u[k] >= o_bar[k] - o[k], f"abs_pos_{k}"
        prob += u[k] >= o[k] - o_bar[k], f"abs_neg_{k}"

    # Weighted average: g = sum_k omega_k * o_bar_k
    prob += g == pl.lpSum([omega[k] * o_bar[k] for k in range(m)]), "weighted_average"

    # Consensus constraints: |o_bar_k - g| <= eps
    for k in range(m):
        prob += o_bar[k] - g <= eps, f"consensus_pos_{k}"
        prob += g - o_bar[k] <= eps, f"consensus_neg_{k}"

    # Solve
    if solver is None:
        solver = pl.PULP_CBC_CMD(msg=msg)
    prob.solve(solver)

    status = pl.LpStatus[prob.status]
    o_bar_vals = [pl.value(v) for v in o_bar]
    g_val = pl.value(g)
    obj = pl.value(prob.objective)

    return {"status": status, "o_bar": o_bar_vals, "g": g_val, "objective": obj, "problem": prob}