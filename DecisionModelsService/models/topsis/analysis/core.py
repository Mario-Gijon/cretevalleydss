from __future__ import annotations

from typing import Any

from .evidence import extract_topsis_evidence


def _exact_score_groups(alternatives: list[dict[str, Any]]) -> list[dict[str, Any]]:
    groups: dict[float, list[dict[str, Any]]] = {}
    for item in alternatives:
        score = item.get("score")
        if isinstance(score, (int, float)):
            groups.setdefault(float(score), []).append(item)
    return [
        {"score": score, "alternatives": members}
        for score, members in groups.items()
        if len(members) > 1
    ]


def build_core_facts_from_evidence(evidence: dict[str, Any]) -> dict[str, Any]:
    alternatives = evidence["rankedAlternatives"]
    criteria = evidence["criteria"]
    matrix = evidence["collectiveMatrix"]
    input_order_ids = evidence.get("matrixAlternativeIds", [])
    matrix_by_alternative = {
        alternative_id: matrix[index]
        for index, alternative_id in enumerate(input_order_ids)
        if matrix is not None and index < len(matrix)
    }

    criterion_items: list[dict[str, Any]] = []
    for criterion_index, criterion in enumerate(criteria):
        evaluations_by_alternative = [
            {
                "alternativeId": alternative["alternativeId"],
                "alternativeName": alternative["name"],
                "value": (
                    matrix_by_alternative.get(alternative["alternativeId"], [])[criterion_index]
                    if criterion_index < len(matrix_by_alternative.get(alternative["alternativeId"], []))
                    else None
                ),
                "relativeFavorability": (
                    criterion["relativeFavorability"][input_order_ids.index(alternative["alternativeId"])]
                    if alternative["alternativeId"] in input_order_ids
                    and input_order_ids.index(alternative["alternativeId"]) < len(criterion.get("relativeFavorability", []))
                    else None
                ),
            }
            for alternative in alternatives
        ]
        criterion_items.append({
            **criterion,
            "evaluationsByAlternative": evaluations_by_alternative,
        })

    scores_available = bool(alternatives) and all(
        isinstance(item.get("score"), (int, float)) for item in alternatives
    )
    exact_ties = _exact_score_groups(alternatives)
    distance_items = evidence["distances"]["items"]
    return {
        "sourcePhase": evidence["sourcePhase"],
        "aggregation": evidence["aggregation"],
        "result": {
            "available": scores_available,
            "scoreMeaning": "relative_closeness_to_positive_ideal",
            "scoreRange": [0, 1],
            "higherScoreIsPreferred": True,
            "items": alternatives,
            "exactScoreTies": exact_ties,
            "leadingScoreGap": (
                alternatives[0]["score"] - alternatives[1]["score"]
                if scores_available and len(alternatives) > 1
                else None
            ),
        },
        "criteria": {
            "available": bool(
                matrix is not None
                and criterion_items
                and all(item["direction"] in {"max", "min"} for item in criterion_items)
            ),
            "reason": (
                None
                if matrix is not None and criterion_items and all(item["direction"] in {"max", "min"} for item in criterion_items)
                else "criterion_directions_unavailable"
                if matrix is not None and criterion_items
                else "collective_evaluations_unavailable"
            ),
            "items": criterion_items,
        },
        "idealDistances": {
            "available": evidence["distances"]["available"],
            "reason": evidence["distances"]["reason"],
            "items": distance_items,
        },
    }


def build_core_facts(context: dict[str, Any]) -> dict[str, Any]:
    return build_core_facts_from_evidence(extract_topsis_evidence(context))


__all__ = ["build_core_facts", "build_core_facts_from_evidence"]
