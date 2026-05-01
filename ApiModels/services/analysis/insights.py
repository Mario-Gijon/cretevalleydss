from __future__ import annotations

from typing import Any


def build_insights_and_warnings(
    ranking_analysis: dict[str, Any],
    criteria_analysis: dict[str, Any],
    agreement_analysis: dict[str, Any],
    consensus_analysis: dict[str, Any],
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
                "message": (
                    f"{winner} has a clear advantage over the next alternative, "
                    "which supports a strong recommendation."
                ),
                "evidenceRefs": ["metric:rankingStrength"],
            }
        )

    if winner and runner_up and confidence.get("level") == "medium":
        insights.append(
            {
                "code": "SUPPORTED_RECOMMENDATION",
                "importance": "medium",
                "message": (
                    f"{winner} remains ahead of {runner_up}, although the margin suggests "
                    "the result should be interpreted with some caution."
                ),
                "evidenceRefs": ["metric:rankingStrength"],
            }
        )

    if winner and runner_up and confidence.get("level") == "low":
        insights.append(
            {
                "code": "CLOSE_DECISION",
                "importance": "high",
                "message": (
                    "The leading alternatives are close in score, so the recommendation should be interpreted carefully."
                ),
                "evidenceRefs": ["metric:rankingStrength"],
            }
        )
        warnings.append(
            {
                "code": "SMALL_SCORE_GAP",
                "severity": "medium",
                "message": f"{winner} and {runner_up} are close in score. Small changes could affect the final ordering.",
            }
        )

    top_weighted = (
        criteria_analysis.get("criterionInfluence", {}).get("topWeightedCriteria") or []
    )
    weight_dominance = (
        criteria_analysis.get("criterionInfluence", {}).get("weightDominance") or {}
    )
    all_equal_by_weight = bool(weight_dominance.get("allEqualByWeight"))

    if top_weighted and not all_equal_by_weight:
        criteria_names = ", ".join(item.get("criterion", "") for item in top_weighted[:2] if item.get("criterion"))
        if criteria_names:
            insights.append(
                {
                    "code": "TOP_WEIGHT_DRIVERS",
                    "importance": "medium",
                    "message": (
                        f"{criteria_names} had the greatest influence potential because they received the highest weights."
                    ),
                    "evidenceRefs": ["metric:criterionInfluence"],
                }
            )
    elif top_weighted and all_equal_by_weight:
        insights.append(
            {
                "code": "NO_SINGLE_WEIGHT_DRIVER",
                "importance": "low",
                "message": "No single criterion dominates by weight; influence appears balanced across the criteria set.",
                "evidenceRefs": ["metric:criterionInfluence"],
            }
        )

    agreement_warning = agreement_analysis.get("agreement_warning")
    expert_diagnostics = agreement_analysis.get("expertDiagnostics") or {}
    reason = str(expert_diagnostics.get("reason") or "")

    most_decisive = expert_diagnostics.get("mostDecisiveExpert")
    if isinstance(most_decisive, dict) and most_decisive.get("expertEmail"):
        expert_label = most_decisive.get("expertName") or most_decisive.get("expertEmail")
        insights.append(
            {
                "code": "EXPERT_MOST_DECISIVE",
                "importance": "low",
                "message": f"{expert_label} shows the most decisive pairwise preferences.",
                "evidenceRefs": ["metric:expertDiagnostics"],
            }
        )

    most_neutral = expert_diagnostics.get("mostNeutralExpert")
    if isinstance(most_neutral, dict) and most_neutral.get("expertEmail"):
        expert_label = most_neutral.get("expertName") or most_neutral.get("expertEmail")
        insights.append(
            {
                "code": "EXPERT_MOST_NEUTRAL",
                "importance": "low",
                "message": f"{expert_label} shows the most neutral pairwise preferences.",
                "evidenceRefs": ["metric:expertDiagnostics"],
            }
        )

    if reason == "single_expert":
        insights.append(
            {
                "code": "SINGLE_EXPERT_PARTICIPATION",
                "importance": "low",
                "message": "Only one expert participated, so expert-to-expert agreement cannot be compared.",
                "evidenceRefs": ["metric:expertDiagnostics"],
            }
        )

    if agreement_warning and reason not in {"single_expert", "missing_comparable_pairwise_vectors"}:
        warnings.append(
            {
                "code": "LIMITED_AGREEMENT_ANALYSIS",
                "severity": "low",
                "message": agreement_warning,
            }
        )

    consensus_diagnostics = consensus_analysis.get("consensusDiagnostics") or {}
    if consensus_diagnostics.get("relevant"):
        available = bool(consensus_diagnostics.get("available"))
        if not available:
            if consensus_diagnostics.get("reason") == "missing_consensus_series":
                warnings.append(
                    {
                        "code": "MISSING_CONSENSUS_DATA",
                        "severity": "medium",
                        "message": "Consensus diagnostics could not be computed because no valid consensus series was available.",
                    }
                )
        else:
            trend = str(consensus_diagnostics.get("trend") or "unknown")
            initial = consensus_diagnostics.get("initialConsensus")
            final = consensus_diagnostics.get("finalConsensus")
            threshold = consensus_diagnostics.get("threshold")
            threshold_reached = consensus_diagnostics.get("thresholdReached")

            if trend == "improved" and isinstance(initial, (int, float)) and isinstance(final, (int, float)):
                insights.append(
                    {
                        "code": "CONSENSUS_IMPROVED",
                        "importance": "medium",
                        "message": f"Consensus improved from {float(initial):.2f} to {float(final):.2f} across the process.",
                        "evidenceRefs": ["metric:consensusDiagnostics"],
                    }
                )
            elif trend == "worsened" and isinstance(initial, (int, float)) and isinstance(final, (int, float)):
                insights.append(
                    {
                        "code": "CONSENSUS_WORSENED",
                        "importance": "high",
                        "message": (
                            f"Consensus decreased from {float(initial):.2f} to {float(final):.2f}, "
                            "so the final agreement should be interpreted carefully."
                        ),
                        "evidenceRefs": ["metric:consensusDiagnostics"],
                    }
                )
                warnings.append(
                    {
                        "code": "CONSENSUS_WORSENED",
                        "severity": "medium",
                        "message": "Consensus worsened during the process, which may affect confidence in collective agreement.",
                    }
                )
            elif trend == "stable":
                insights.append(
                    {
                        "code": "CONSENSUS_STABLE",
                        "importance": "medium",
                        "message": "Consensus remained broadly stable across the available rounds.",
                        "evidenceRefs": ["metric:consensusDiagnostics"],
                    }
                )
            elif trend == "single_round":
                insights.append(
                    {
                        "code": "SINGLE_CONSENSUS_ROUND",
                        "importance": "low",
                        "message": "Only one consensus round is available, so no consensus trend can be assessed.",
                        "evidenceRefs": ["metric:consensusDiagnostics"],
                    }
                )

            if threshold_reached is True and isinstance(threshold, (int, float)):
                insights.append(
                    {
                        "code": "CONSENSUS_THRESHOLD_REACHED",
                        "importance": "high",
                        "message": f"The final consensus level reached the configured threshold of {float(threshold):.2f}.",
                        "evidenceRefs": ["metric:consensusDiagnostics"],
                    }
                )
            elif threshold_reached is False and isinstance(threshold, (int, float)):
                insights.append(
                    {
                        "code": "CONSENSUS_THRESHOLD_NOT_REACHED",
                        "importance": "high",
                        "message": f"The final consensus level remained below the configured threshold of {float(threshold):.2f}.",
                        "evidenceRefs": ["metric:consensusDiagnostics"],
                    }
                )
                warnings.append(
                    {
                        "code": "CONSENSUS_THRESHOLD_NOT_REACHED",
                        "severity": "medium",
                        "message": "The final consensus level remained below the configured threshold.",
                    }
                )

    return {
        "insights": insights,
        "warnings": warnings,
    }
