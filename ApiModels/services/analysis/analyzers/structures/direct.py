from __future__ import annotations

from typing import Any


def analyze_direct_structure_layer(common_results: dict[str, Any]) -> dict[str, Any]:
    criteria_analysis = common_results.get("criteria_analysis") or {}
    criterion_influence = criteria_analysis.get("criterionInfluence") or {}

    notes: list[str] = ["Direct-structure diagnostics were applied using alternative-by-criterion collective values when available."]
    insights: list[dict[str, Any]] = []
    warnings: list[dict[str, Any]] = []

    winner_strengths = criterion_influence.get("winnerStrengthCriteria") or []
    if winner_strengths:
        strongest = winner_strengths[0]
        criterion = strongest.get("criterion")
        advantage = strongest.get("advantage")
        if criterion and isinstance(advantage, (int, float)):
            insights.append(
                {
                    "code": "DIRECT_LARGEST_CRITERION_GAP",
                    "importance": "medium",
                    "message": (
                        f"The largest observed performance separation between leading alternatives appears on {criterion} "
                        f"(difference: {float(advantage):.2f})."
                    ),
                    "evidenceRefs": ["metric:criterionInfluence"],
                }
            )

    return {
        "notes": notes,
        "insights": insights,
        "warnings": warnings,
    }
