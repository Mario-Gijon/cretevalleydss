from __future__ import annotations

from typing import Any

from .common import (
    ANALYTICAL_TIE_TOLERANCE,
    availability,
    effective_tie,
)
from .evidence import TwoTupleEvidence, extract_two_tuple_evidence


def _criterion_extreme(
    evidence: TwoTupleEvidence,
    items: list[dict[str, Any]],
    *,
    select: str,
) -> dict[str, Any]:
    if len(items) == 1:
        return availability(
            False,
            "single_criterion",
            betaRange=None,
            criteria=[],
        )

    ranges = [float(item["betaRange"]) for item in items]
    maximum = max(ranges)
    minimum = min(ranges)

    if effective_tie(maximum, minimum):
        return availability(
            False,
            "no_variation",
            betaRange=None,
            criteria=[],
        )

    target = maximum if select == "max" else minimum
    selected = [
        item
        for item in items
        if effective_tie(float(item["betaRange"]), target)
    ]

    return availability(
        True,
        betaRange=target,
        criteria=[
            {
                "criterionId": item["criterionId"],
                "name": item["name"],
                "index": item["index"],
            }
            for item in selected
        ],
    )


def _criteria_facts(
    evidence: TwoTupleEvidence,
) -> tuple[dict[str, Any], bool]:
    alternative_count = len(evidence.alternative_ids)
    items: list[dict[str, Any]] = []

    for criterion_index, criterion_id in enumerate(evidence.criterion_ids):
        column = [
            evidence.collective_beta_matrix[alternative_index][criterion_index]
            for alternative_index in range(alternative_count)
        ]
        minimum = min(column)
        maximum = max(column)
        beta_range = maximum - minimum

        items.append(
            {
                "criterionId": criterion_id,
                "name": evidence.criterion_names[criterion_index],
                "index": criterion_index,
                "minimumBeta": minimum,
                "maximumBeta": maximum,
                "betaRange": beta_range,
                "hasObservedSeparation": (
                    beta_range > ANALYTICAL_TIE_TOLERANCE
                ),
            }
        )

    has_observed_separation = any(
        item["hasObservedSeparation"]
        for item in items
    )

    if alternative_count == 1:
        comparison = availability(False, "single_alternative")
        most_separating = availability(
            False,
            "single_alternative",
            betaRange=None,
            criteria=[],
        )
        least_separating = availability(
            False,
            "single_alternative",
            betaRange=None,
            criteria=[],
        )
    else:
        comparison = (
            availability(True)
            if len(items) > 1
            else availability(False, "single_criterion")
        )
        most_separating = _criterion_extreme(
            evidence,
            items,
            select="max",
        )
        least_separating = _criterion_extreme(
            evidence,
            items,
            select="min",
        )

    return (
        {
            "comparison": comparison,
            "items": items,
            "mostObservedSeparation": most_separating,
            "leastObservedSeparation": least_separating,
        },
        has_observed_separation,
    )


def _technical_ranking(
    evidence: TwoTupleEvidence,
) -> list[dict[str, Any]]:
    return [
        {
            "alternativeId": evidence.alternative_ids[alternative_index],
            "name": evidence.alternative_names[alternative_index],
            "originalIndex": alternative_index,
            "technicalRank": rank,
            "beta": evidence.collective_scores[alternative_index],
            "tuple": evidence.collective_values[alternative_index],
        }
        for rank, alternative_index in enumerate(
            evidence.ranking,
            start=1,
        )
    ]


def _result_facts(
    evidence: TwoTupleEvidence,
) -> dict[str, Any]:
    technical_ranking = _technical_ranking(evidence)
    maximum_beta = max(evidence.collective_scores)
    minimum_beta = min(evidence.collective_scores)
    observed_final_separation = maximum_beta - minimum_beta

    leading_group = [
        dict(item)
        for item in technical_ranking
        if effective_tie(float(item["beta"]), maximum_beta)
    ]

    if len(evidence.alternative_ids) == 1:
        winner = availability(
            False,
            "single_alternative",
            alternative=None,
        )
    elif observed_final_separation <= ANALYTICAL_TIE_TOLERANCE:
        winner = availability(
            False,
            "no_discrimination",
            alternative=None,
        )
    elif len(leading_group) != 1:
        winner = availability(
            False,
            "tied_leading_group",
            alternative=None,
        )
    else:
        winner = availability(
            True,
            alternative=dict(leading_group[0]),
        )

    adjacent_gaps: list[dict[str, Any]] = []
    for index in range(len(technical_ranking) - 1):
        left = technical_ranking[index]
        right = technical_ranking[index + 1]
        gap = float(left["beta"]) - float(right["beta"])
        adjacent_gaps.append(
            {
                "higherAlternativeId": left["alternativeId"],
                "higherAlternativeName": left["name"],
                "lowerAlternativeId": right["alternativeId"],
                "lowerAlternativeName": right["name"],
                "higherTechnicalRank": left["technicalRank"],
                "lowerTechnicalRank": right["technicalRank"],
                "betaGap": gap,
                "isEffectiveTie": (
                    gap <= ANALYTICAL_TIE_TOLERANCE
                ),
            }
        )

    closest_adjacent = None
    if adjacent_gaps:
        minimum_gap = min(item["betaGap"] for item in adjacent_gaps)
        closest_adjacent = {
            "betaGap": minimum_gap,
            "pairs": [
                dict(item)
                for item in adjacent_gaps
                if effective_tie(item["betaGap"], minimum_gap)
            ],
        }

    return {
        "technicalRanking": technical_ranking,
        "leadingGroup": leading_group,
        "winner": winner,
        "minimumFinalBeta": minimum_beta,
        "maximumFinalBeta": maximum_beta,
        "observedFinalBetaRange": observed_final_separation,
        "hasFinalDiscrimination": (
            observed_final_separation > ANALYTICAL_TIE_TOLERANCE
        ),
        "adjacentRankingGaps": adjacent_gaps,
        "closestAdjacentAlternatives": closest_adjacent,
    }


def _alternative_facts(
    evidence: TwoTupleEvidence,
) -> list[dict[str, Any]]:
    rank_by_index = {
        alternative_index: rank
        for rank, alternative_index in enumerate(
            evidence.ranking,
            start=1,
        )
    }
    leader_beta = max(evidence.collective_scores)

    return [
        {
            "alternativeId": evidence.alternative_ids[index],
            "name": evidence.alternative_names[index],
            "originalIndex": index,
            "technicalRank": rank_by_index[index],
            "finalBeta": evidence.collective_scores[index],
            "finalTuple": evidence.collective_values[index],
            "betaGapToLeader": (
                leader_beta - evidence.collective_scores[index]
            ),
            "collectiveCriteria": [
                {
                    "criterionId": evidence.criterion_ids[
                        criterion_index
                    ],
                    "criterionName": evidence.criterion_names[
                        criterion_index
                    ],
                    "criterionIndex": criterion_index,
                    "beta": evidence.collective_beta_matrix[
                        index
                    ][criterion_index],
                    "tuple": evidence.collective_matrix[
                        index
                    ][criterion_index],
                }
                for criterion_index in range(
                    len(evidence.criterion_ids)
                )
            ],
        }
        for index in range(len(evidence.alternative_ids))
    ]


def build_core_facts_from_evidence(
    evidence: TwoTupleEvidence,
) -> dict[str, Any]:
    criteria, observed_criterion_separation = _criteria_facts(evidence)
    result = _result_facts(evidence)

    compare_alternatives = (
        availability(True)
        if len(evidence.alternative_ids) > 1
        else availability(False, "single_alternative")
    )
    compare_criteria = (
        availability(True)
        if len(evidence.criterion_ids) > 1
        else availability(False, "single_criterion")
    )
    compare_evaluators = (
        availability(True)
        if len(evidence.expert_keys) > 1
        else availability(False, "single_evaluator")
    )

    return {
        "sourcePhase": evidence.source_phase,
        "counts": {
            "alternatives": len(evidence.alternative_ids),
            "criteria": len(evidence.criterion_ids),
            "evaluators": len(evidence.expert_keys),
            "executedRounds": evidence.executed_rounds,
        },
        "method": {
            "representation": "linguistic_2tuple",
            "finalOrdering": "descending_beta",
            "betaMeaning": "linguistic_position",
            "evidenceTolerance": 1e-9,
            "analyticalTieTolerance": ANALYTICAL_TIE_TOLERANCE,
        },
        "variation": {
            "observedCriterionSeparation": observed_criterion_separation,
            "observedFinalSeparation": result["hasFinalDiscrimination"],
        },
        "capabilities": {
            "compareAlternatives": compare_alternatives,
            "compareCriteria": compare_criteria,
            "compareEvaluators": compare_evaluators,
            "analyzeWinner": {
                "available": result["winner"]["available"],
                "reason": result["winner"]["reason"],
            },
            "analyzeObservedCriterionSeparation": (
                availability(True)
                if len(evidence.alternative_ids) > 1
                else availability(False, "single_alternative")
            ),
        },
        "result": result,
        "criteria": criteria,
        "alternatives": {
            "items": _alternative_facts(evidence),
        },
    }


def build_core_facts(
    context: dict[str, Any],
) -> dict[str, Any]:
    return build_core_facts_from_evidence(
        extract_two_tuple_evidence(context)
    )
