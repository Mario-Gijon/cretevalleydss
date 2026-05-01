from __future__ import annotations

from typing import Any


def build_summary(
    winner: str | None,
    runner_up: str | None,
    confidence: dict[str, Any],
) -> dict[str, str | None]:
    if not winner:
        return {
            "recommendation": None,
            "explanation": "Not enough ranking information was provided to determine a final recommendation.",
        }

    if runner_up:
        explanation = (
            f"{winner} is the recommended alternative based on the available ranking and score evidence, "
            f"ahead of {runner_up}."
        )
    else:
        explanation = f"{winner} is the recommended alternative based on the available ranking evidence."

    if confidence.get("level") == "low":
        explanation += " The result appears close, so it should be interpreted with caution."

    return {
        "recommendation": winner,
        "explanation": explanation,
    }


def build_sections(
    summary: dict[str, Any],
    confidence: dict[str, Any],
    metrics: dict[str, Any],
    structure_notes: list[str],
    fuzzy_notes: list[str],
) -> dict[str, list[dict[str, Any]]]:
    general = [
        {
            "key": "final_recommendation",
            "title": "Final recommendation",
            "text": summary.get("explanation") or "No recommendation could be derived.",
        },
        {
            "key": "confidence",
            "title": "Confidence",
            "text": confidence.get("reason") or "Confidence could not be estimated.",
        },
    ]

    technical = [
        {
            "key": "ranking_strength",
            "title": "Ranking strength",
            "text": (
                f"Confidence level: {confidence.get('level', 'unknown')}. "
                f"Score gap: {confidence.get('scoreGap')}"
            ),
            "tables": [],
        }
    ]

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
