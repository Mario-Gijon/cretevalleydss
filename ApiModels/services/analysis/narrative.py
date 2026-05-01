from __future__ import annotations

from typing import Any


def _format_gap(value: Any) -> str | None:
    if not isinstance(value, (int, float)) or isinstance(value, bool):
        return None
    return f"{float(value):.2f}"


def build_summary(
    winner: str | None,
    runner_up: str | None,
    confidence: dict[str, Any],
    tied_scores: bool = False,
) -> dict[str, str | None]:
    if not winner:
        return {
            "recommendation": None,
            "explanation": "Not enough ranking information was provided to determine a final recommendation.",
        }

    level = str(confidence.get("level") or "unknown").lower()
    score_gap_text = _format_gap(confidence.get("scoreGap"))

    if runner_up:
        explanation = f"The analysis suggests that {winner} is the most suitable alternative."
        if tied_scores:
            explanation = (
                f"The ranking currently lists {winner} first, but {winner} and {runner_up} are tied in score. "
                "The available score evidence does not establish a clear score-based preference."
            )
        elif level == "high":
            if score_gap_text:
                explanation += (
                    f" It ranks ahead of {runner_up} with a score gap of {score_gap_text}, "
                    "so the recommendation appears stable rather than marginal."
                )
            else:
                explanation += (
                    f" It ranks ahead of {runner_up} with a clear advantage, "
                    "so the recommendation appears stable rather than marginal."
                )
        elif level == "medium":
            explanation += (
                f" It ranks ahead of {runner_up}, and the result is reasonably supported by the available scores."
            )
        elif level == "low":
            explanation += (
                f" It ranks ahead of {runner_up}, but the leading alternatives appear close, "
                "so the result should be interpreted with care."
            )
        else:
            explanation += (
                f" It ranks ahead of {runner_up}, but there is not enough score information to assess how strong "
                "that lead is."
            )
    else:
        explanation = (
            f"The analysis suggests that {winner} is the most suitable alternative based on the available ranking "
            "information."
        )

    return {
        "recommendation": winner,
        "explanation": explanation,
    }


def build_sections(
    confidence: dict[str, Any],
    metrics: dict[str, Any],
    winner: str | None,
    runner_up: str | None,
    tied_scores: bool,
    structure_notes: list[str],
    fuzzy_notes: list[str],
    informational_notes: list[str] | None = None,
) -> dict[str, list[dict[str, Any]]]:
    general: list[dict[str, Any]] = []
    level = str(confidence.get("level") or "unknown").lower()
    score_gap_text = _format_gap(confidence.get("scoreGap"))

    if winner:
        interpretation_text = (
            f"The ranking currently places {winner} first, but the score evidence is tied with {runner_up}. "
            "This should be interpreted as an ordinal lead rather than a clear score separation."
            if tied_scores and runner_up
            else (
                f"{winner} should be considered the preferred option for this issue. "
                "The available ranking and score evidence support this conclusion."
                if runner_up
                else (
                    f"{winner} should be considered the preferred option based on the available ranking data."
                )
            )
        )
        general.append(
            {
                "key": "result_interpretation",
                "title": "How to interpret the result",
                "text": interpretation_text,
            }
        )

    if level == "high":
        strength_text = (
            f"The score gap between {winner} and {runner_up} is {score_gap_text}, which indicates a clear separation."
            if winner and runner_up and score_gap_text
            else "The available evidence indicates a clear separation between the leading alternative and the rest."
        )
    elif level == "medium":
        strength_text = (
            f"The recommendation is supported, although the gap between {winner} and {runner_up} is moderate."
            if winner and runner_up
            else "The recommendation is supported, but should still be interpreted with moderate caution."
        )
    elif level == "low":
        strength_text = (
            f"The leading alternatives ({winner} and {runner_up}) are close"
            + (f" with a score gap of {score_gap_text}." if score_gap_text else ".")
            + " Small changes in assumptions may affect the final ordering."
            if winner and runner_up
            else "The available evidence suggests a close decision, so the result should be interpreted carefully."
        )
    else:
        strength_text = (
            "There was not enough score information to estimate how strong the recommendation is."
        )

    general.append(
        {
            "key": "decision_strength",
            "title": "Strength of the recommendation",
            "text": strength_text,
        }
    )

    criterion_influence = metrics.get("criterionInfluence", {}) or {}
    top_weighted = criterion_influence.get("topWeightedCriteria") or []
    winner_strength = criterion_influence.get("winnerStrengthCriteria") or []
    weight_dominance = criterion_influence.get("weightDominance") or {}
    all_equal_by_weight = bool(weight_dominance.get("allEqualByWeight"))
    if top_weighted:
        top_names = [item.get("criterion") for item in top_weighted if item.get("criterion")]
        if top_names:
            if all_equal_by_weight:
                criteria_text = (
                    "No single criterion dominates by weight in this problem. The weighting scheme appears balanced "
                    "across the criteria set."
                )
            else:
                names_text = ", ".join(top_names[:2])
                criteria_text = (
                    f"The decision is mainly influenced by {names_text}, because these criteria carry the greatest weight "
                    "in the problem."
                )
            if winner_strength:
                strongest = winner_strength[0]
                criterion = strongest.get("criterion")
                if criterion and winner:
                    criteria_text += f" {winner} appears especially strong on {criterion}, which helps explain its position in the ranking."
            else:
                criteria_text += (
                    " This does not necessarily mean the winning alternative performs best on those criteria, "
                    "but they had the highest potential impact on the final result."
                )
            general.append(
                {
                    "key": "criteria_influence",
                    "title": "Main decision drivers",
                    "text": criteria_text,
                }
            )

    expert_diagnostics = metrics.get("expertDiagnostics", {}) or {}
    if expert_diagnostics.get("available") and expert_diagnostics.get("mode") == "pairwise":
        closest = expert_diagnostics.get("closestToCollective") or {}
        farthest = expert_diagnostics.get("farthestFromCollective") or {}
        average_distance = expert_diagnostics.get("averageDistanceToCollective")
        if closest and farthest and isinstance(average_distance, (int, float)):
            closest_name = closest.get("expertName") or closest.get("expertEmail")
            farthest_name = farthest.get("expertName") or farthest.get("expertEmail")
            if closest_name and farthest_name:
                general.append(
                    {
                        "key": "expert_alignment",
                        "title": "Expert alignment",
                        "text": (
                            f"{closest_name} is closest to the collective opinion, while {farthest_name} is the most distant. "
                            f"The average distance to the collective opinion is {average_distance:.2f}."
                        ),
                    }
                )
    elif expert_diagnostics.get("reason") == "single_expert":
        general.append(
            {
                "key": "single_expert_note",
                "title": "Expert participation",
                "text": "Only one expert participated, so the analysis cannot compare disagreement between experts.",
            }
        )

    pairwise_diagnostics = metrics.get("pairwiseDiagnostics", {}) or {}
    strongest_pair = pairwise_diagnostics.get("strongestCollectivePreference") or {}
    if pairwise_diagnostics.get("available") and strongest_pair:
        criterion_name = strongest_pair.get("criterion")
        alternative = strongest_pair.get("alternative")
        compared_alternative = strongest_pair.get("comparedAlternative")
        if criterion_name and alternative and compared_alternative:
            general.append(
                {
                    "key": "pairwise_preference_pattern",
                    "title": "Pairwise preference patterns",
                    "text": (
                        f"The strongest collective preference appears under {criterion_name}, "
                        f"where {alternative} is preferred over {compared_alternative}."
                    ),
                }
            )

    technical = [
        {
            "key": "ranking_strength",
            "title": "Ranking strength",
            "text": (
                f"Confidence level: {confidence.get('level', 'unknown')}. "
                f"Score gap: {score_gap_text if score_gap_text is not None else confidence.get('scoreGap')}"
            ),
            "tables": [],
        }
    ]

    consensus_diagnostics = metrics.get("consensusDiagnostics", {}) or {}
    if consensus_diagnostics.get("relevant"):
        if consensus_diagnostics.get("available"):
            rounds = consensus_diagnostics.get("rounds")
            initial = consensus_diagnostics.get("initialConsensus")
            final = consensus_diagnostics.get("finalConsensus")
            threshold = consensus_diagnostics.get("threshold")
            threshold_reached = consensus_diagnostics.get("thresholdReached")

            if (
                isinstance(rounds, int)
                and rounds > 1
                and isinstance(initial, (int, float))
                and isinstance(final, (int, float))
            ):
                text = f"Consensus evolved from {float(initial):.2f} to {float(final):.2f} over {rounds} rounds."
                if isinstance(threshold, (int, float)):
                    if threshold_reached is True:
                        text += f" It reached the configured threshold of {float(threshold):.2f}."
                    elif threshold_reached is False:
                        text += f" It remained below the configured threshold of {float(threshold):.2f}."
                general.append(
                    {
                        "key": "consensus_evolution",
                        "title": "Consensus evolution",
                        "text": text,
                    }
                )
            elif rounds == 1:
                general.append(
                    {
                        "key": "consensus_evolution_single_round",
                        "title": "Consensus evolution",
                        "text": "Only one consensus round is available, so the analysis cannot assess whether consensus improved over time.",
                    }
                )
        else:
            technical.append(
                {
                    "key": "consensus_data_limited",
                    "title": "Consensus diagnostics",
                    "text": "Detailed consensus trend diagnostics were not available because no valid consensus series could be extracted.",
                    "tables": [],
                }
            )

    if structure_notes:
        technical.append(
            {
                "key": "structure_notes",
                "title": "Evaluation-structure notes",
                "text": " ".join(structure_notes),
                "tables": [],
            }
        )

    if fuzzy_notes:
        technical.append(
            {
                "key": "fuzzy_notes",
                "title": "Fuzzy interpretation notes",
                "text": " ".join(fuzzy_notes),
                "tables": [],
            }
        )

    if informational_notes:
        technical.append(
            {
                "key": "informational_notes",
                "title": "Additional notes",
                "text": " ".join(informational_notes),
                "tables": [],
            }
        )

    if metrics.get("criterionInfluence", {}).get("fuzzyCentroidApproximationUsed"):
        technical.append(
            {
                "key": "fuzzy_centroid_mvp",
                "title": "Fuzzy centroid approximation",
                "text": "Fuzzy tuples were reduced to centroids for selected MVP comparisons.",
                "tables": [],
            }
        )

    return {
        "general": general,
        "technical": technical,
    }
