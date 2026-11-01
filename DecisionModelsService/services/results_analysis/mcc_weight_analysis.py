"""Shared descriptive evidence for MCC criteria-weight adjustments.

This module only describes persisted MCC outputs. It never solves or reruns
the MCC optimization problem.
"""

from __future__ import annotations

import math
from typing import Any


MCC_ANALYSIS_TOLERANCE = 1e-6


def _close(left: float, right: float) -> bool:
    return math.isclose(
        float(left),
        float(right),
        rel_tol=MCC_ANALYSIS_TOLERANCE,
        abs_tol=MCC_ANALYSIS_TOLERANCE,
    )


def _largest(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    if not items:
        return []
    maximum = max(float(item["effort"]) for item in items)
    return [item for item in items if _close(float(item["effort"]), maximum)]


def build_mcc_weight_adjustment_facts(
    *,
    criteria: list[dict[str, str]],
    experts: list[dict[str, str]],
    original_weights_by_expert: dict[str, dict[str, float]],
    adjusted_weights_by_expert: dict[str, dict[str, float]],
    collective_weights_by_criterion: dict[str, float],
    epsilon: float,
    objective: float | None,
    status: str,
) -> dict[str, Any]:
    """Describe stored MCC adjustments in expert-by-criterion coordinates."""

    cells: list[dict[str, Any]] = []
    effort_by_expert: list[dict[str, Any]] = []
    effort_by_criterion: list[dict[str, Any]] = []

    for expert in experts:
        expert_key = expert["expertKey"]
        effort = 0.0
        for criterion in criteria:
            criterion_id = criterion["criterionId"]
            original = float(original_weights_by_expert[expert_key][criterion_id])
            adjusted = float(adjusted_weights_by_expert[expert_key][criterion_id])
            collective = float(collective_weights_by_criterion[criterion_id])
            delta = adjusted - original
            absolute_delta = abs(delta)
            effort += absolute_delta
            cells.append(
                {
                    "expertKey": expert_key,
                    "expertName": expert["name"],
                    "criterionId": criterion_id,
                    "criterionName": criterion["name"],
                    "originalWeight": original,
                    "adjustedWeight": adjusted,
                    "collectiveWeight": collective,
                    "delta": delta,
                    "absoluteDelta": absolute_delta,
                    "consensusDeviation": abs(adjusted - collective),
                }
            )
        effort_by_expert.append(
            {"expertKey": expert_key, "name": expert["name"], "effort": effort}
        )

    for criterion in criteria:
        criterion_id = criterion["criterionId"]
        effort = sum(
            cell["absoluteDelta"]
            for cell in cells
            if cell["criterionId"] == criterion_id
        )
        effort_by_criterion.append(
            {"criterionId": criterion_id, "name": criterion["name"], "effort": effort}
        )

    total_from_experts = sum(item["effort"] for item in effort_by_expert)
    total_from_criteria = sum(item["effort"] for item in effort_by_criterion)
    if not _close(total_from_experts, total_from_criteria):
        raise ValueError("MCC adjustment effort is inconsistent between expert and criterion aggregation")
    if objective is not None and not _close(total_from_experts, objective):
        raise ValueError("MCC objective is inconsistent with the stored absolute weight adjustments")

    max_consensus_deviation = max(
        (cell["consensusDeviation"] for cell in cells),
        default=0.0,
    )
    if max_consensus_deviation > float(epsilon) + MCC_ANALYSIS_TOLERANCE:
        raise ValueError("Stored MCC adjusted weights violate the configured epsilon bound")

    return {
        "available": True,
        "status": status,
        "epsilon": float(epsilon),
        "objective": objective,
        "totalAbsoluteAdjustment": total_from_experts,
        "maxConsensusDeviation": max_consensus_deviation,
        "cells": cells,
        "effortByExpert": effort_by_expert,
        "effortByCriterion": effort_by_criterion,
        "largestEffortExperts": [
            {"expertKey": item["expertKey"], "name": item["name"]}
            for item in _largest(effort_by_expert)
        ],
        "largestEffortCriteria": [
            {"criterionId": item["criterionId"], "name": item["name"]}
            for item in _largest(effort_by_criterion)
        ],
        "originalWeightsByExpert": {
            expert_key: dict(weights)
            for expert_key, weights in original_weights_by_expert.items()
        },
        "adjustedWeightsByExpert": {
            expert_key: dict(weights)
            for expert_key, weights in adjusted_weights_by_expert.items()
        },
        "collectiveWeightsByCriterion": dict(collective_weights_by_criterion),
        "expertNamesByKey": {item["expertKey"]: item["name"] for item in experts},
        "criterionNamesById": {item["criterionId"]: item["name"] for item in criteria},
    }


def build_mcc_adjustment_heatmap(
    *,
    criteria: list[dict[str, Any]],
    experts: list[dict[str, Any]],
    mcc: dict[str, Any],
) -> dict[str, Any] | None:
    """Build the model-independent MCC adjustment heatmap descriptor."""

    if not mcc.get("available"):
        return None

    by_cell = {
        (cell["expertKey"], cell["criterionId"]): cell
        for cell in mcc["cells"]
    }

    def display(value: float) -> float:
        rounded = round(float(value), 6)
        return 0.0 if rounded == -0.0 else rounded

    values = []
    details = []
    for expert in experts:
        value_row = []
        detail_row = []
        for criterion in criteria:
            cell = by_cell[(expert["expertKey"], criterion["criterionId"])]
            value_row.append(display(cell["delta"]))
            detail_row.append(
                {
                    "originalWeight": display(cell["originalWeight"]),
                    "adjustedWeight": display(cell["adjustedWeight"]),
                    "collectiveWeight": display(cell["collectiveWeight"]),
                    "delta": display(cell["delta"]),
                }
            )
        values.append(value_row)
        details.append(detail_row)

    total = float(mcc["totalAbsoluteAdjustment"])
    insight = (
        "The calculation left the original expert weights unchanged."
        if abs(total) <= MCC_ANALYSIS_TOLERANCE
        else "The calculation adjusted the expert weight profiles to meet the configured maximum gap."
    )
    return {
        "key": "mcc-adjustment-map",
        "type": "heatmap",
        "title": "Weight changes by expert and criterion",
        "description": (
            "How much the calculation raised or lowered each expert's original weight for each criterion."
        ),
        "insight": insight,
        "scale": {"kind": "diverging", "center": 0},
        "data": {
            "rows": [
                {"key": expert["expertKey"], "label": expert["name"]}
                for expert in experts
            ],
            "columns": [
                {"key": criterion["criterionId"], "label": criterion["name"]}
                for criterion in criteria
            ],
            "values": values,
            "details": details,
        },
    }
