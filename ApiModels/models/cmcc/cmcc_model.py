
import pulp as pl

def run_cmcc(
    o,
    c,
    omega,
    w,
    eps,
    mu0,
    lower_bound: float = 0.0,
    upper_bound: float = 1.0,
    msg: bool = False,
):
    """
    Ejecuta el modelo CMCC sobre un vector de opiniones de expertos.

    Parámetros:
      - o      : lista de opiniones originales de los expertos (len m)
      - c      : lista de costes (len m)
      - omega  : lista de pesos para la agregación (sum = 1, len m)
      - w      : lista de pesos para la restricción de consenso (len m)
      - eps    : desviación máxima permitida |o_bar_k - g|
      - mu0    : umbral mínimo de consenso (0 <= mu0 <= 1)
      - lower_bound, upper_bound : cota inferior y superior de o_bar_k y g
      - msg    : si True, muestra log del solver pulp

    Devuelve:
      dict con:
        - success (bool)
        - msg (str)
        - o_bar (list[float])         -> opiniones ajustadas por experto
        - g (float)                   -> opinión colectiva
        - consensus_level (float)     -> kappa
        - objective (float)           -> valor de la función objetivo
    """

    try:
        m = len(o)
        if not (len(c) == m and len(omega) == m and len(w) == m):
            return {
                "success": False,
                "msg": "Length mismatch among o, c, omega, w",
            }

        # 1) Definir problema LP
        prob = pl.LpProblem("CMCC", pl.LpMinimize)

        # 2) Variables
        o_bar = [
            pl.LpVariable(f"o_bar_{k}", lowBound=lower_bound, upBound=upper_bound)
            for k in range(m)
        ]
        g = pl.LpVariable("g", lowBound=lower_bound, upBound=upper_bound)
        u = [pl.LpVariable(f"u_{k}", lowBound=0.0) for k in range(m)]  # |o_bar_k - o_k|
        v = [pl.LpVariable(f"v_{k}", lowBound=0.0) for k in range(m)]  # |o_bar_k - g|

        # 3) Objetivo: min ∑ c_k * u_k
        prob += pl.lpSum(c[k] * u[k] for k in range(m)), "Objective"

        # 4) |o_bar_k - o_k| <= u_k (linealización)
        for k in range(m):
            prob += u[k] >= o_bar[k] - o[k], f"abs_u_pos_{k}"
            prob += u[k] >= o[k] - o_bar[k], f"abs_u_neg_{k}"

        # 5) Agregación ponderada: g = ∑ ω_k * o_bar_k
        prob += g == pl.lpSum(omega[k] * o_bar[k] for k in range(m)), "weighted_average"

        # 6) Restricciones de consenso: |o_bar_k - g| <= eps
        for k in range(m):
            prob += o_bar[k] - g <= eps, f"consensus_pos_{k}"
            prob += g - o_bar[k] <= eps, f"consensus_neg_{k}"

        # 7) Linealización v_k = |o_bar_k - g|
        for k in range(m):
            prob += v[k] >= o_bar[k] - g, f"abs_v_pos_{k}"
            prob += v[k] >= g - o_bar[k], f"abs_v_neg_{k}"

        # 8) Restricción de nivel de consenso:
        #    1 - ∑ w_k * v_k ≥ μ0  ⇔  ∑ w_k * v_k ≤ 1 - μ0
        prob += pl.lpSum(w[k] * v[k] for k in range(m)) <= 1 - mu0, "kappa_constraint"

        # 9) Resolver
        solver = pl.PULP_CBC_CMD(msg=msg)
        prob.solve(solver)

        status = pl.LpStatus[prob.status]
        o_bar_vals = [pl.value(vv) for vv in o_bar]
        g_val = pl.value(g)
        obj_val = pl.value(prob.objective)
        kappa_val = 1 - sum(w[k] * pl.value(v[k]) for k in range(m))

        if status != "Optimal":
            return {
                "success": False,
                "msg": f"Solver ended with status {status}",
                "o_bar": o_bar_vals,
                "g": g_val,
                "consensus_level": kappa_val,
                "objective": obj_val,
            }

        return {
            "success": True,
            "msg": "CMCC solved optimally",
            "o_bar": o_bar_vals,           # <- aquí tienes los pesos ajustados por experto
            "g": g_val,                    # <- opinión colectiva
            "consensus_level": kappa_val,  # <- nivel de consenso alcanzado
            "objective": obj_val,
        }

    except Exception as e:
        return {
            "success": False,
            "msg": f"Exception in run_cmcc: {str(e)}",
        }
