"""Derive descriptive facts from validated AHP criteria-weight evidence."""

from __future__ import annotations

import math
from typing import Any

from .evidence import AHPWeightingEvidence, WEIGHT_TOLERANCE


def _is_tied(left: float, right: float) -> bool:
    return math.isclose(left, right, rel_tol=WEIGHT_TOLERANCE, abs_tol=WEIGHT_TOLERANCE)


def build_core_facts(evidence: AHPWeightingEvidence) -> dict[str, Any]:
    criteria = []
    collective = evidence.final_weights_by_criterion
    for criterion in evidence.criteria:
        criterion_id = criterion["criterionId"]
        individual = [
            {
                "expertKey": expert["expertKey"],
                "expertName": expert["name"],
                "weight": evidence.individual_weights_by_expert.get(expert["expertKey"], {}).get(criterion_id),
            }
            for expert in evidence.experts
        ]
        values = [entry["weight"] for entry in individual if entry["weight"] is not None]
        criteria.append(
            {
                "criterionId": criterion_id,
                "name": criterion["name"],
                "collectiveWeight": collective.get(criterion_id) if collective else None,
                "individualWeights": individual,
                "individualWeightRange": max(values) - min(values) if values else None,
            }
        )

    ordered = sorted(
        (item for item in criteria if item["collectiveWeight"] is not None),
        key=lambda item: (-item["collectiveWeight"], item["name"].casefold(), item["criterionId"]),
    )
    leaders = []
    least = []
    top_three_share = None
    if ordered:
        maximum = ordered[0]["collectiveWeight"]
        minimum = min(item["collectiveWeight"] for item in ordered)
        leaders = [item["criterionId"] for item in ordered if _is_tied(item["collectiveWeight"], maximum)]
        least = [item["criterionId"] for item in ordered if _is_tied(item["collectiveWeight"], minimum)]
        if len(ordered) > 3:
            top_three_share = sum(item["collectiveWeight"] for item in ordered[:3])

    experts = []
    collective_distances = []
    for expert in evidence.experts:
        key = expert["expertKey"]
        weights = evidence.individual_weights_by_expert.get(key)
        distance = None
        if weights and collective:
            distance = sum(abs(weights[criterion["criterionId"]] - collective[criterion["criterionId"]]) for criterion in evidence.criteria)
            collective_distances.append((key, distance))
        experts.append(
            {
                **expert,
                "weightsByCriterion": dict(weights) if weights else None,
                "consistency": evidence.consistency_by_expert.get(key, {"available": False, "reason": "No stored diagnostic is available"}),
                "absoluteDifferenceFromCollective": distance,
            }
        )

    maximum_distance = max((distance for _, distance in collective_distances), default=None)
    experts_furthest = [key for key, distance in collective_distances if maximum_distance is not None and _is_tied(distance, maximum_distance)]
    widest_range = max((item["individualWeightRange"] for item in criteria if item["individualWeightRange"] is not None), default=None)
    widest_criteria = [
        item["criterionId"] for item in criteria
        if widest_range is not None and item["individualWeightRange"] is not None and _is_tied(item["individualWeightRange"], widest_range)
    ]

    return {
        "status": evidence.status,
        "unavailableReasons": list(evidence.issues),
        "source": {
            "phase": evidence.phase,
            "attemptId": evidence.attempt_id,
            "nExperts": len(evidence.experts),
            "nCriteria": len(evidence.criteria),
            "aggregationMethod": evidence.aggregation_method,
        },
        "criteria": {
            "items": criteria,
            "orderedCriterionIds": [item["criterionId"] for item in ordered],
            "collectiveLeaders": leaders,
            "leastImportant": least,
            "topThreeShare": top_three_share,
            "widestIndividualSpreadCriterionIds": widest_criteria,
        },
        "experts": {
            "items": experts,
            "furthestFromCollectiveExpertKeys": experts_furthest,
        },
        "finalWeightsByCriterion": dict(collective) if collective else None,
        "individualWeightsByExpert": {
            key: dict(weights)
            for key, weights in evidence.individual_weights_by_expert.items()
        },
        "mcc": dict(evidence.mcc),
        "consistency": {
            "threshold": 0.10,
            "experts": [
                {
                    "expertKey": expert["expertKey"],
                    "name": expert["name"],
                    **dict(evidence.consistency_by_expert.get(expert["expertKey"], {"available": False, "reason": "No stored diagnostic is available"})),
                }
                for expert in evidence.experts
            ],
        },
    }


__all__ = ["build_core_facts"]
