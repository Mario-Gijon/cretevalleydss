from __future__ import annotations

import math
from typing import Any

import pulp as pl

DEFAULT_MCC_EPS = 0.05
WEIGHT_SUM_TOLERANCE = 1e-6


def _is_plain_object(value: Any) -> bool:
    return isinstance(value, dict)


def _as_finite_float(value: Any, field: str) -> float:
    try:
        numeric = float(value)
    except (TypeError, ValueError):
        raise ValueError(f"{field} must be a finite number")

    if not math.isfinite(numeric):
        raise ValueError(f"{field} must be a finite number")

    return numeric


def _validate_criteria(criteria: list[dict[str, str]]) -> list[dict[str, str]]:
    if not isinstance(criteria, list) or len(criteria) == 0:
        raise ValueError("MCC requires a non-empty criteria list")

    normalized: list[dict[str, str]] = []
    seen_ids: set[str] = set()

    for index, criterion in enumerate(criteria):
        if not isinstance(criterion, dict):
            raise ValueError(f"criteria[{index}] must be an object")

        criterion_id = str(criterion.get("id") or "").strip()
        criterion_name = str(criterion.get("name") or criterion_id).strip()

        if not criterion_id:
            raise ValueError(f"criteria[{index}].id is required")

        if criterion_id in seen_ids:
            raise ValueError(f"Duplicate criterion id in MCC criteria: {criterion_id}")

        seen_ids.add(criterion_id)
        normalized.append({
            "id": criterion_id,
            "name": criterion_name or criterion_id,
        })

    return normalized


def _validate_expert_weights(
    *,
    criteria: list[dict[str, str]],
    expert_weights_by_expert: dict[str, dict[str, float]],
) -> tuple[list[str], list[list[float]], dict[str, dict[str, float]]]:
    if not _is_plain_object(expert_weights_by_expert):
        raise ValueError("expert_weights_by_expert must be an object")

    if len(expert_weights_by_expert) < 2:
        raise ValueError("MCC requires at least two experts")

    expert_keys: list[str] = []
    matrix: list[list[float]] = []
    original_by_expert: dict[str, dict[str, float]] = {}

    for raw_expert_key, raw_weights in expert_weights_by_expert.items():
        expert_key = str(raw_expert_key or "").strip()
        if not expert_key:
            raise ValueError("Every MCC expert must have a non-empty key")

        if expert_key in original_by_expert:
            raise ValueError(f"Duplicate MCC expert key: {expert_key}")

        if not _is_plain_object(raw_weights):
            raise ValueError(f"MCC weights for expert '{expert_key}' must be an object")

        row: list[float] = []
        weights_by_criterion: dict[str, float] = {}

        for criterion in criteria:
            criterion_id = criterion["id"]
            criterion_name = criterion["name"]

            if criterion_id not in raw_weights:
                raise ValueError(
                    f"MCC weights for expert '{expert_key}' are missing "
                    f"criterion '{criterion_name}' ({criterion_id})"
                )

            weight = _as_finite_float(
                raw_weights[criterion_id],
                f"MCC weight for expert '{expert_key}' and criterion '{criterion_id}'",
            )

            if weight < 0 or weight > 1:
                raise ValueError(
                    f"MCC weight for expert '{expert_key}' and criterion "
                    f"'{criterion_id}' must be between 0 and 1"
                )

            row.append(weight)
            weights_by_criterion[criterion_id] = weight

        total = sum(row)
        if abs(total - 1.0) > WEIGHT_SUM_TOLERANCE:
            raise ValueError(
                f"MCC weights for expert '{expert_key}' must sum to 1 "
                f"(got {total})"
            )

        expert_keys.append(expert_key)
        matrix.append(row)
        original_by_expert[expert_key] = weights_by_criterion

    return expert_keys, matrix, original_by_expert


def _solve_mcc_lp(
    *,
    o: list[list[float]],
    c: list[float],
    w: list[float],
    eps: float,
    solver: Any = None,
    msg: bool = False,
) -> dict[str, Any]:
    if not isinstance(o, list) or len(o) == 0:
        raise ValueError("o must be a non-empty matrix")

    m = len(o)
    n = len(o[0]) if isinstance(o[0], list) else 0

    if n == 0:
        raise ValueError("o must contain at least one criterion")

    if len(c) != m:
        raise ValueError(f"c must have length {m}")

    if len(w) != m:
        raise ValueError(f"w must have length {m}")

    eps_value = _as_finite_float(eps, "eps")
    if eps_value < 0:
        raise ValueError("eps must be non-negative")

    for k, row in enumerate(o):
        if not isinstance(row, list) or len(row) != n:
            raise ValueError("All MCC expert weight rows must have the same length")

        for j, value in enumerate(row):
            numeric = _as_finite_float(value, f"o[{k}][{j}]")
            if numeric < 0:
                raise ValueError(f"o[{k}][{j}] must be non-negative")

    for index, cost in enumerate(c):
        numeric_cost = _as_finite_float(cost, f"c[{index}]")
        if numeric_cost < 0:
            raise ValueError(f"c[{index}] must be non-negative")

    for index, aggregation_weight in enumerate(w):
        numeric_weight = _as_finite_float(aggregation_weight, f"w[{index}]")
        if numeric_weight < 0:
            raise ValueError(f"w[{index}] must be non-negative")

    if abs(sum(w) - 1.0) > WEIGHT_SUM_TOLERANCE:
        raise ValueError(f"Aggregation weights w must sum to 1 (got {sum(w)})")

    problem = pl.LpProblem("MCC_weights", pl.LpMinimize)

    o_bar = [
        [pl.LpVariable(f"o_bar_{k}_{j}", lowBound=0.0) for j in range(n)]
        for k in range(m)
    ]
    g_bar = [pl.LpVariable(f"g_bar_{j}", lowBound=0.0) for j in range(n)]
    u = [
        [pl.LpVariable(f"u_{k}_{j}", lowBound=0.0) for j in range(n)]
        for k in range(m)
    ]

    problem += pl.lpSum(c[k] * u[k][j] for k in range(m) for j in range(n)), "Objective"

    for k in range(m):
        for j in range(n):
            problem += u[k][j] >= o_bar[k][j] - o[k][j], f"abs_pos_{k}_{j}"
            problem += u[k][j] >= o[k][j] - o_bar[k][j], f"abs_neg_{k}_{j}"

    for j in range(n):
        problem += (
            g_bar[j] == pl.lpSum(w[k] * o_bar[k][j] for k in range(m)),
            f"weighted_avg_{j}",
        )

    for k in range(m):
        for j in range(n):
            problem += o_bar[k][j] - g_bar[j] <= eps_value, f"consensus_pos_{k}_{j}"
            problem += g_bar[j] - o_bar[k][j] <= eps_value, f"consensus_neg_{k}_{j}"

    for k in range(m):
        problem += pl.lpSum(o_bar[k][j] for j in range(n)) == 1, f"expert_simplex_{k}"

    problem += pl.lpSum(g_bar[j] for j in range(n)) == 1, "simplex"

    if solver is None:
        solver = pl.PULP_CBC_CMD(msg=msg)

    problem.solve(solver)

    status = pl.LpStatus[problem.status]
    o_bar_values = [[float(pl.value(o_bar[k][j]) or 0.0) for j in range(n)] for k in range(m)]
    g_bar_values = [float(pl.value(g_bar[j]) or 0.0) for j in range(n)]
    objective_value = pl.value(problem.objective)

    return {
        "status": status,
        "o_bar": o_bar_values,
        "g_bar": g_bar_values,
        "objective": float(objective_value) if objective_value is not None else None,
    }


def solve_mcc_weights(
    *,
    criteria: list[dict[str, str]],
    expert_weights_by_expert: dict[str, dict[str, float]],
    eps: float = DEFAULT_MCC_EPS,
    solver: Any = None,
    msg: bool = False,
) -> dict[str, Any]:
    """Apply MCC consensus to already-computed expert criteria weights.

    The input weights are not normalized here. They must already be valid
    criteria-weight vectors: finite values in [0, 1] and sum approximately 1
    for each expert.
    """

    criterion_items = _validate_criteria(criteria)
    expert_keys, matrix, original_by_expert = _validate_expert_weights(
        criteria=criterion_items,
        expert_weights_by_expert=expert_weights_by_expert,
    )

    expert_count = len(expert_keys)
    costs = [1.0 for _ in range(expert_count)]
    aggregation_weights = [1.0 / expert_count for _ in range(expert_count)]

    lp_result = _solve_mcc_lp(
        o=matrix,
        c=costs,
        w=aggregation_weights,
        eps=eps,
        solver=solver,
        msg=msg,
    )

    if lp_result["status"] != "Optimal":
        raise ValueError(f"MCC solver did not find an optimal solution: {lp_result['status']}")

    weights_by_criterion = {
        criterion["id"]: float(lp_result["g_bar"][index])
        for index, criterion in enumerate(criterion_items)
    }

    adjusted_weights_by_expert: dict[str, dict[str, float]] = {}
    for expert_index, expert_key in enumerate(expert_keys):
        adjusted_weights_by_expert[expert_key] = {
            criterion["id"]: float(lp_result["o_bar"][expert_index][criterion_index])
            for criterion_index, criterion in enumerate(criterion_items)
        }

    return {
        "useMcc": True,
        "eps": float(eps),
        "status": lp_result["status"],
        "objective": lp_result["objective"],
        "weightsByCriterion": weights_by_criterion,
        "adjustedWeightsByExpert": adjusted_weights_by_expert,
        "originalWeightsByExpert": original_by_expert,
    }
