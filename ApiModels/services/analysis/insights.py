from __future__ import annotations

from typing import Any


def build_insights_and_warnings(
    ranking_analysis: dict[str, Any],
    criteria_analysis: dict[str, Any],
    agreement_analysis: dict[str, Any],
    evaluation_structure: str | None,
) -> dict[str, list[dict[str, Any]]]:
    insights: list[dict[str, Any]] = []
    warnings: list[dict[str, Any]] = []

    confidence = ranking_analysis.get("confidence") or {}
    winner = ranking_analysis.get("winner")
    runner_up = ranking_analysis.get("runnerUp")

    if winner and confidence.get("level") == "high":
        insights.append(
            {
                "code": "CLEAR_WINNER",
                "importance": "high",
                "message": f"{winner} stands out as the strongest option with a clear margin.",
                "evidenceRefs": ["metric:rankingStrength"],
            }
        )

    if winner and runner_up and confidence.get("level") == "low":
        warnings.append(
            {
                "code": "SMALL_SCORE_GAP",
                "severity": "medium",
                "message": f"{winner} and {runner_up} are close. Interpret the recommendation cautiously.",
            }
        )

    top_weighted = (
        criteria_analysis.get("criterionInfluence", {}).get("topWeightedCriteria") or []
    )
    if top_weighted:
        criteria_names = ", ".join(item.get("criterion", "") for item in top_weighted[:2] if item.get("criterion"))
        if criteria_names:
            insights.append(
                {
                    "code": "TOP_WEIGHT_DRIVERS",
                    "importance": "medium",
                    "message": f"The most influential criteria by weight are: {criteria_names}.",
                    "evidenceRefs": ["metric:criterionInfluence"],
                }
            )

    agreement_warning = agreement_analysis.get("agreement_warning")
    if agreement_warning:
        warnings.append(
            {
                "code": "LIMITED_AGREEMENT_ANALYSIS",
                "severity": "low",
                "message": agreement_warning,
            }
        )

    if evaluation_structure not in {None, "", "direct", "pairwiseAlternatives"}:
        warnings.append(
            {
                "code": "UNSUPPORTED_EVALUATION_STRUCTURE_FOR_DETAILED_ANALYSIS",
                "severity": "medium",
                "message": f"Evaluation structure '{evaluation_structure}' is not fully supported for detailed diagnostics in MVP.",
            }
        )

    return {
        "insights": insights,
        "warnings": warnings,
    }
