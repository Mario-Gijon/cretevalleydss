from __future__ import annotations

from typing import Any

from .common import (
    ANALYTICAL_TIE_TOLERANCE,
    EVIDENCE_TOLERANCE,
    MODEL_FLOAT_TOLERANCE,
    availability,
    close,
    effective_tie,
)
from .evidence import TopsisEvidence, extract_topsis_evidence


def _criterion_extreme(
    evidence: TopsisEvidence,
    values: list[float],
    *,
    select: str,
) -> dict[str, Any]:
    if len(values) == 1:
        return availability(
            False,
            "single_criterion",
            value=None,
            criteria=[],
        )

    maximum = max(values)
    minimum = min(values)
    if effective_tie(maximum, minimum):
        return availability(
            False,
            "no_variation",
            value=None,
            criteria=[],
        )

    target = maximum if select == "max" else minimum
    indexes = [
        index
        for index, value in enumerate(values)
        if effective_tie(value, target)
    ]
    return availability(
        True,
        value=target,
        criteria=[
            {
                "criterionId": evidence.criterion_ids[index],
                "name": evidence.criterion_names[index],
                "index": index,
            }
            for index in indexes
        ],
    )


def _principal_contribution(
    contributions: list[dict[str, Any]],
    *,
    total_distance: float,
    contribution_key: str,
) -> dict[str, Any]:
    if total_distance <= EVIDENCE_TOLERANCE:
        return availability(
            False,
            "no_variation",
            contribution=None,
            criteria=[],
        )

    maximum = max(item[contribution_key] for item in contributions)
    selected = [
        item
        for item in contributions
        if effective_tie(item[contribution_key], maximum)
    ]
    return availability(
        True,
        contribution=maximum,
        criteria=[
            {
                "criterionId": item["criterionId"],
                "name": item["criterionName"],
                "index": item["criterionIndex"],
            }
            for item in selected
        ],
    )


def _criterion_facts(
    evidence: TopsisEvidence,
) -> tuple[dict[str, Any], list[float], bool, bool]:
    beta_ranges = [
        abs(
            evidence.positive_ideal_beta[index]
            - evidence.negative_ideal_beta[index]
        )
        for index in range(len(evidence.criterion_ids))
    ]
    weighted_discrimination = [
        evidence.criterion_weights[index] * beta_ranges[index]
        for index in range(len(evidence.criterion_ids))
    ]
    total_weighted_discrimination = sum(weighted_discrimination)

    observed_discrimination = any(
        value > ANALYTICAL_TIE_TOLERANCE
        for value in beta_ranges
    )
    effective_discrimination = (
        total_weighted_discrimination
        > ANALYTICAL_TIE_TOLERANCE
    )

    shares: list[float | None]
    if effective_discrimination:
        shares = [
            value / total_weighted_discrimination
            for value in weighted_discrimination
        ]
    else:
        shares = [None for _ in weighted_discrimination]

    items = [
        {
            "criterionId": evidence.criterion_ids[index],
            "name": evidence.criterion_names[index],
            "index": index,
            "direction": evidence.criterion_directions[index],
            "configuredWeight": evidence.criterion_weights[index],
            "positiveIdealBeta": evidence.positive_ideal_beta[index],
            "negativeIdealBeta": evidence.negative_ideal_beta[index],
            "positiveIdeal": evidence.positive_ideal[index],
            "negativeIdeal": evidence.negative_ideal[index],
            "betaRange": beta_ranges[index],
            "weightedDiscrimination": weighted_discrimination[index],
            "discriminationShare": shares[index],
            "hasObservedDiscrimination": (
                beta_ranges[index] > ANALYTICAL_TIE_TOLERANCE
            ),
            "hasEffectiveWeight": (
                evidence.criterion_weights[index]
                > ANALYTICAL_TIE_TOLERANCE
            ),
            "hasEffectiveDiscrimination": (
                weighted_discrimination[index]
                > ANALYTICAL_TIE_TOLERANCE
            ),
        }
        for index in range(len(evidence.criterion_ids))
    ]

    comparison = (
        availability(True)
        if len(items) > 1
        else availability(False, "single_criterion")
    )
    facts = {
        "comparison": comparison,
        "totalWeightedDiscrimination": total_weighted_discrimination,
        "items": items,
        "mostDiscriminating": _criterion_extreme(
            evidence,
            weighted_discrimination,
            select="max",
        ),
        "leastDiscriminating": _criterion_extreme(
            evidence,
            weighted_discrimination,
            select="min",
        ),
    }
    return (
        facts,
        weighted_discrimination,
        observed_discrimination,
        effective_discrimination,
    )


def _alternative_facts(
    evidence: TopsisEvidence,
) -> list[dict[str, Any]]:
    rank_by_index = {
        alternative_index: rank
        for rank, alternative_index in enumerate(evidence.ranking, start=1)
    }
    items: list[dict[str, Any]] = []

    for alternative_index in range(len(evidence.alternative_ids)):
        criteria: list[dict[str, Any]] = []
        positive_distance = evidence.positive_distances[alternative_index]
        negative_distance = evidence.negative_distances[alternative_index]

        for criterion_index in range(len(evidence.criterion_ids)):
            positive_contribution = evidence.positive_contributions[
                alternative_index
            ][criterion_index]
            negative_contribution = evidence.negative_contributions[
                alternative_index
            ][criterion_index]
            beta = evidence.collective_beta_matrix[
                alternative_index
            ][criterion_index]

            criteria.append(
                {
                    "criterionId": evidence.criterion_ids[criterion_index],
                    "criterionName": evidence.criterion_names[criterion_index],
                    "criterionIndex": criterion_index,
                    "beta": beta,
                    "tuple": evidence.collective_matrix[
                        alternative_index
                    ][criterion_index],
                    "positiveDistanceContribution": positive_contribution,
                    "negativeDistanceContribution": negative_contribution,
                    "positiveDistanceShare": (
                        positive_contribution / positive_distance
                        if positive_distance > EVIDENCE_TOLERANCE
                        else None
                    ),
                    "negativeDistanceShare": (
                        negative_contribution / negative_distance
                        if negative_distance > EVIDENCE_TOLERANCE
                        else None
                    ),
                    "matchesPositiveIdeal": close(
                        beta,
                        evidence.positive_ideal_beta[criterion_index],
                    ),
                    "matchesNegativeIdeal": close(
                        beta,
                        evidence.negative_ideal_beta[criterion_index],
                    ),
                }
            )

        items.append(
            {
                "alternativeId": evidence.alternative_ids[alternative_index],
                "name": evidence.alternative_names[alternative_index],
                "originalIndex": alternative_index,
                "technicalRank": rank_by_index[alternative_index],
                "closeness": evidence.closeness[alternative_index],
                "positiveDistance": positive_distance,
                "negativeDistance": negative_distance,
                "matchesPositiveIdealCriterionCount": sum(
                    1 for item in criteria if item["matchesPositiveIdeal"]
                ),
                "matchesNegativeIdealCriterionCount": sum(
                    1 for item in criteria if item["matchesNegativeIdeal"]
                ),
                "criteria": criteria,
                "principalWeakness": _principal_contribution(
                    criteria,
                    total_distance=positive_distance,
                    contribution_key="positiveDistanceContribution",
                ),
                "principalStrength": _principal_contribution(
                    criteria,
                    total_distance=negative_distance,
                    contribution_key="negativeDistanceContribution",
                ),
            }
        )

    return items


def _result_facts(
    evidence: TopsisEvidence,
    *,
    effective_discrimination: bool,
) -> dict[str, Any]:
    rank_by_index = {
        alternative_index: rank
        for rank, alternative_index in enumerate(evidence.ranking, start=1)
    }
    technical_ranking = [
        {
            "alternativeId": evidence.alternative_ids[index],
            "name": evidence.alternative_names[index],
            "originalIndex": index,
            "technicalRank": rank,
            "closeness": evidence.closeness[index],
        }
        for rank, index in enumerate(evidence.ranking, start=1)
    ]

    maximum_closeness = max(evidence.closeness)
    leading_group = [
        {
            "alternativeId": evidence.alternative_ids[index],
            "name": evidence.alternative_names[index],
            "originalIndex": index,
            "technicalRank": rank_by_index[index],
            "closeness": evidence.closeness[index],
        }
        for index in range(len(evidence.alternative_ids))
        if effective_tie(evidence.closeness[index], maximum_closeness)
    ]
    leading_group.sort(key=lambda item: item["technicalRank"])

    if len(evidence.alternative_ids) == 1:
        winner = availability(
            False,
            "single_alternative",
            alternative=None,
        )
    elif not effective_discrimination:
        winner = availability(
            False,
            "no_discrimination",
            alternative=None,
        )
    elif len(leading_group) != 1:
        winner = availability(
            False,
            "no_variation",
            alternative=None,
        )
    else:
        winner = availability(
            True,
            alternative=dict(leading_group[0]),
        )

    return {
        "technicalRanking": technical_ranking,
        "leadingGroup": leading_group,
        "winner": winner,
    }


def build_core_facts_from_evidence(
    evidence: TopsisEvidence,
) -> dict[str, Any]:
    (
        criteria,
        _weighted_discrimination,
        observed_discrimination,
        effective_discrimination,
    ) = _criterion_facts(evidence)
    alternatives = _alternative_facts(evidence)
    result = _result_facts(
        evidence,
        effective_discrimination=effective_discrimination,
    )

    if len(evidence.criterion_weights) > 1:
        criterion_weight_variation = availability(
            True,
            varies=(
                max(evidence.criterion_weights)
                - min(evidence.criterion_weights)
                > ANALYTICAL_TIE_TOLERANCE
            ),
        )
    else:
        criterion_weight_variation = availability(
            False,
            "single_criterion",
            varies=None,
        )

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
    criterion_discrimination = (
        availability(True)
        if len(evidence.alternative_ids) > 1
        else availability(False, "single_alternative")
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
            "distanceMetric": "weighted_l1",
            "closenessFormula": "D- / (D+ + D-)",
            "degenerateCloseness": 0.5,
            "modelNumericalZeroTolerance": MODEL_FLOAT_TOLERANCE,
            "evidenceTolerance": EVIDENCE_TOLERANCE,
            "analyticalTieTolerance": ANALYTICAL_TIE_TOLERANCE,
        },
        "variation": {
            "observedAlternativeDiscrimination": observed_discrimination,
            "effectiveAlternativeDiscrimination": effective_discrimination,
            "criterionWeightVariation": criterion_weight_variation,
        },
        "capabilities": {
            "compareAlternatives": compare_alternatives,
            "compareCriteria": compare_criteria,
            "analyzeWinner": {
                "available": result["winner"]["available"],
                "reason": result["winner"]["reason"],
            },
            "analyzeIdealDistances": availability(True),
            "analyzeDistanceContributions": availability(True),
            "analyzeCriterionDiscrimination": criterion_discrimination,
        },
        "result": result,
        "criteria": criteria,
        "alternatives": {
            "items": alternatives,
        },
    }


def build_core_facts(context: dict[str, Any]) -> dict[str, Any]:
    return build_core_facts_from_evidence(extract_topsis_evidence(context))
