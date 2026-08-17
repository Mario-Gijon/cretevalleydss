from __future__ import annotations

from typing import Any

from ..run import (
    calculate_closeness_coefficients,
    calculate_ideal_solutions,
    calculate_weighted_distances,
    rank_closeness_coefficients,
)
from .common import (
    ANALYTICAL_TIE_TOLERANCE,
    EVIDENCE_TOLERANCE,
    availability,
    effective_tie,
)
from .evidence import TopsisEvidence
from .experts import extract_expert_profiles


def _criterion_scales(evidence: TopsisEvidence) -> list[dict[str, Any]]:
    return [
        {
            "criterionId": evidence.criterion_ids[index],
            "labelCount": len(evidence.scale_labels[index]),
            "maximumIndex": len(evidence.scale_labels[index]) - 1,
            "labels": [dict(label) for label in evidence.scale_labels[index]],
        }
        for index in range(len(evidence.criterion_ids))
    ]


def _semantic_result(
    *,
    evidence: TopsisEvidence,
    matrix: list[list[float]],
    weights: list[float],
    directions: list[str],
    scales: list[dict[str, Any]],
) -> dict[str, Any]:
    ideals = calculate_ideal_solutions(
        collective_beta_matrix=matrix,
        criterion_directions=directions,
        criterion_scales=scales,
    )
    distances = calculate_weighted_distances(
        collective_beta_matrix=matrix,
        positive_ideal_beta=ideals["positive_ideal_beta"],
        negative_ideal_beta=ideals["negative_ideal_beta"],
        weights=weights,
    )
    closeness = calculate_closeness_coefficients(
        positive_distances=distances["positive_distances"],
        negative_distances=distances["negative_distances"],
    )
    ranking = rank_closeness_coefficients(closeness)
    rank_by_index = {
        alternative_index: rank
        for rank, alternative_index in enumerate(ranking, start=1)
    }

    technical_ranking = [
        {
            "alternativeId": evidence.alternative_ids[index],
            "name": evidence.alternative_names[index],
            "originalIndex": index,
            "technicalRank": rank,
            "closeness": closeness[index],
            "positiveDistance": distances["positive_distances"][index],
            "negativeDistance": distances["negative_distances"][index],
        }
        for rank, index in enumerate(ranking, start=1)
    ]

    maximum_closeness = max(closeness)
    leading_group = [
        {
            "alternativeId": evidence.alternative_ids[index],
            "name": evidence.alternative_names[index],
            "originalIndex": index,
            "technicalRank": rank_by_index[index],
            "closeness": closeness[index],
        }
        for index in range(len(evidence.alternative_ids))
        if effective_tie(closeness[index], maximum_closeness)
    ]
    leading_group.sort(key=lambda item: item["technicalRank"])

    weighted_discrimination = sum(
        weights[index]
        * abs(
            ideals["positive_ideal_beta"][index]
            - ideals["negative_ideal_beta"][index]
        )
        for index in range(len(weights))
    )

    if len(evidence.alternative_ids) == 1:
        winner = availability(False, "single_alternative", alternative=None)
    elif weighted_discrimination <= ANALYTICAL_TIE_TOLERANCE:
        winner = availability(False, "no_discrimination", alternative=None)
    elif len(leading_group) != 1:
        winner = availability(False, "no_variation", alternative=None)
    else:
        winner = availability(True, alternative=dict(leading_group[0]))

    return {
        "technicalRankingIndexes": list(ranking),
        "technicalRanking": technical_ranking,
        "leadingGroup": leading_group,
        "winner": winner,
        "positiveIdealBeta": list(ideals["positive_ideal_beta"]),
        "negativeIdealBeta": list(ideals["negative_ideal_beta"]),
        "positiveDistances": list(distances["positive_distances"]),
        "negativeDistances": list(distances["negative_distances"]),
        "closeness": list(closeness),
        "totalWeightedDiscrimination": weighted_discrimination,
    }


def _baseline_result(evidence: TopsisEvidence) -> dict[str, Any]:
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
            "positiveDistance": evidence.positive_distances[index],
            "negativeDistance": evidence.negative_distances[index],
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

    weighted_discrimination = sum(
        evidence.criterion_weights[index]
        * abs(
            evidence.positive_ideal_beta[index]
            - evidence.negative_ideal_beta[index]
        )
        for index in range(len(evidence.criterion_ids))
    )

    if len(evidence.alternative_ids) == 1:
        winner = availability(False, "single_alternative", alternative=None)
    elif weighted_discrimination <= ANALYTICAL_TIE_TOLERANCE:
        winner = availability(False, "no_discrimination", alternative=None)
    elif len(leading_group) != 1:
        winner = availability(False, "no_variation", alternative=None)
    else:
        winner = availability(True, alternative=dict(leading_group[0]))

    return {
        "technicalRankingIndexes": list(evidence.ranking),
        "technicalRanking": technical_ranking,
        "leadingGroup": leading_group,
        "winner": winner,
        "closeness": list(evidence.closeness),
    }


def _winner_state(result: dict[str, Any]) -> tuple[bool, str | None]:
    winner = result["winner"]
    if winner["available"]:
        return True, winner["alternative"]["alternativeId"]
    return False, None


def _impact(
    *,
    evidence: TopsisEvidence,
    baseline: dict[str, Any],
    counterfactual: dict[str, Any],
) -> dict[str, Any]:
    baseline_rank_by_index = {
        alternative_index: rank
        for rank, alternative_index in enumerate(
            baseline["technicalRankingIndexes"],
            start=1,
        )
    }
    counter_rank_by_index = {
        alternative_index: rank
        for rank, alternative_index in enumerate(
            counterfactual["technicalRankingIndexes"],
            start=1,
        )
    }

    alternative_impacts: list[dict[str, Any]] = []
    total_rank_change = 0.0
    total_closeness_change = 0.0
    max_rank_change = 0.0
    max_closeness_change = 0.0

    for index, alternative_id in enumerate(evidence.alternative_ids):
        baseline_rank = baseline_rank_by_index[index]
        counter_rank = counter_rank_by_index[index]
        rank_delta = counter_rank - baseline_rank
        absolute_rank_change = abs(rank_delta)

        baseline_closeness = baseline["closeness"][index]
        counter_closeness = counterfactual["closeness"][index]
        closeness_delta = counter_closeness - baseline_closeness
        absolute_closeness_change = abs(closeness_delta)

        total_rank_change += absolute_rank_change
        total_closeness_change += absolute_closeness_change
        max_rank_change = max(max_rank_change, absolute_rank_change)
        max_closeness_change = max(
            max_closeness_change,
            absolute_closeness_change,
        )

        alternative_impacts.append(
            {
                "alternativeId": alternative_id,
                "name": evidence.alternative_names[index],
                "originalIndex": index,
                "baselineTechnicalRank": baseline_rank,
                "counterfactualTechnicalRank": counter_rank,
                "counterfactualRankMinusBaselineRank": rank_delta,
                "absoluteRankChange": absolute_rank_change,
                "baselineCloseness": baseline_closeness,
                "counterfactualCloseness": counter_closeness,
                "closenessDelta": closeness_delta,
                "absoluteClosenessChange": absolute_closeness_change,
            }
        )

    baseline_leaders = {
        item["alternativeId"] for item in baseline["leadingGroup"]
    }
    counter_leaders = {
        item["alternativeId"] for item in counterfactual["leadingGroup"]
    }
    baseline_winner_state = _winner_state(baseline)
    counter_winner_state = _winner_state(counterfactual)
    alternative_count = len(evidence.alternative_ids)

    return {
        "technicalRankingChanged": (
            baseline["technicalRankingIndexes"]
            != counterfactual["technicalRankingIndexes"]
        ),
        "semanticLeadingGroupChanged": baseline_leaders != counter_leaders,
        "winnerStateChanged": baseline_winner_state != counter_winner_state,
        "totalAbsoluteRankChange": total_rank_change,
        "meanAbsoluteRankChange": total_rank_change / alternative_count,
        "maxAbsoluteRankChange": max_rank_change,
        "totalAbsoluteClosenessChange": total_closeness_change,
        "meanAbsoluteClosenessChange": (
            total_closeness_change / alternative_count
        ),
        "maxAbsoluteClosenessChange": max_closeness_change,
        "alternatives": alternative_impacts,
    }


def _extreme_counterfactual(
    items: list[dict[str, Any]],
    *,
    value_key: str,
    identity_keys: tuple[str, ...],
) -> dict[str, Any]:
    available_items = [item for item in items if item["available"]]
    if not available_items:
        return availability(False, "missing_evidence", value=None, items=[])

    values = [float(item["impact"][value_key]) for item in available_items]
    maximum = max(values)
    minimum = min(values)
    if effective_tie(maximum, minimum):
        return availability(False, "no_variation", value=None, items=[])

    selected = [
        item
        for item in available_items
        if effective_tie(float(item["impact"][value_key]), maximum)
    ]
    return availability(
        True,
        value=maximum,
        items=[
            {key: item[key] for key in identity_keys}
            for item in selected
        ],
    )


def _loco(
    *,
    evidence: TopsisEvidence,
    baseline: dict[str, Any],
) -> dict[str, Any]:
    criterion_count = len(evidence.criterion_ids)
    if criterion_count == 1:
        return {
            "availability": availability(False, "single_criterion"),
            "items": [],
            "mostRankChanging": availability(
                False,
                "single_criterion",
                value=None,
                items=[],
            ),
            "mostClosenessChanging": availability(
                False,
                "single_criterion",
                value=None,
                items=[],
            ),
            "winnerStateChangingCriteria": [],
        }

    all_scales = _criterion_scales(evidence)
    items: list[dict[str, Any]] = []

    for removed_index, criterion_id in enumerate(evidence.criterion_ids):
        remaining_indexes = [
            index for index in range(criterion_count) if index != removed_index
        ]
        remaining_weight_total = sum(
            evidence.criterion_weights[index] for index in remaining_indexes
        )

        identity = {
            "criterionId": criterion_id,
            "name": evidence.criterion_names[removed_index],
            "criterionIndex": removed_index,
            "removedConfiguredWeight": evidence.criterion_weights[removed_index],
            "remainingConfiguredWeight": remaining_weight_total,
        }

        if remaining_weight_total <= EVIDENCE_TOLERANCE:
            items.append(
                {
                    **identity,
                    "available": False,
                    "reason": "zero_effective_weight",
                    "renormalizedCriterionWeights": [],
                    "counterfactualResult": None,
                    "impact": None,
                }
            )
            continue

        weights = [
            evidence.criterion_weights[index] / remaining_weight_total
            for index in remaining_indexes
        ]
        matrix = [
            [row[index] for index in remaining_indexes]
            for row in evidence.collective_beta_matrix
        ]
        directions = [
            evidence.criterion_directions[index]
            for index in remaining_indexes
        ]
        scales = [all_scales[index] for index in remaining_indexes]

        counterfactual = _semantic_result(
            evidence=evidence,
            matrix=matrix,
            weights=weights,
            directions=directions,
            scales=scales,
        )
        impact = _impact(
            evidence=evidence,
            baseline=baseline,
            counterfactual=counterfactual,
        )

        items.append(
            {
                **identity,
                "available": True,
                "reason": None,
                "renormalizedCriterionWeights": [
                    {
                        "criterionId": evidence.criterion_ids[index],
                        "name": evidence.criterion_names[index],
                        "criterionIndex": index,
                        "weight": weight,
                    }
                    for index, weight in zip(
                        remaining_indexes,
                        weights,
                        strict=True,
                    )
                ],
                "counterfactualResult": counterfactual,
                "impact": impact,
            }
        )

    return {
        "availability": availability(True),
        "items": items,
        "mostRankChanging": _extreme_counterfactual(
            items,
            value_key="totalAbsoluteRankChange",
            identity_keys=("criterionId", "name", "criterionIndex"),
        ),
        "mostClosenessChanging": _extreme_counterfactual(
            items,
            value_key="totalAbsoluteClosenessChange",
            identity_keys=("criterionId", "name", "criterionIndex"),
        ),
        "winnerStateChangingCriteria": [
            {
                "criterionId": item["criterionId"],
                "name": item["name"],
                "criterionIndex": item["criterionIndex"],
            }
            for item in items
            if item["available"] and item["impact"]["winnerStateChanged"]
        ],
    }


def _loeo(
    *,
    evidence: TopsisEvidence,
    context: dict[str, Any],
    baseline: dict[str, Any],
) -> dict[str, Any]:
    experts = extract_expert_profiles(evidence=evidence, context=context)
    if len(experts) == 1:
        return {
            "availability": availability(False, "single_evaluator"),
            "items": [],
            "mostRankChanging": availability(
                False,
                "single_evaluator",
                value=None,
                items=[],
            ),
            "mostClosenessChanging": availability(
                False,
                "single_evaluator",
                value=None,
                items=[],
            ),
            "winnerStateChangingEvaluators": [],
        }

    scales = _criterion_scales(evidence)
    items: list[dict[str, Any]] = []

    for removed_index, removed in enumerate(experts):
        remaining = [
            expert
            for index, expert in enumerate(experts)
            if index != removed_index
        ]
        remaining_weight_total = sum(
            expert["configuredWeight"] for expert in remaining
        )
        identity = {
            "expertIndex": removed["expertIndex"],
            "expertKey": removed["expertKey"],
            "expertId": removed["expertId"],
            "name": removed["name"],
            "email": removed["email"],
            "removedConfiguredWeight": removed["configuredWeight"],
            "remainingConfiguredWeight": remaining_weight_total,
        }

        if remaining_weight_total <= EVIDENCE_TOLERANCE:
            items.append(
                {
                    **identity,
                    "available": False,
                    "reason": "zero_effective_weight",
                    "renormalizedEvaluatorWeights": [],
                    "counterfactualCollectiveBetaMatrix": None,
                    "counterfactualResult": None,
                    "impact": None,
                }
            )
            continue

        normalized_weights = [
            expert["configuredWeight"] / remaining_weight_total
            for expert in remaining
        ]
        counterfactual_matrix = [
            [
                sum(
                    weight
                    * expert["betaMatrix"][alternative_index][criterion_index]
                    for expert, weight in zip(
                        remaining,
                        normalized_weights,
                        strict=True,
                    )
                )
                for criterion_index in range(len(evidence.criterion_ids))
            ]
            for alternative_index in range(len(evidence.alternative_ids))
        ]
        counterfactual = _semantic_result(
            evidence=evidence,
            matrix=counterfactual_matrix,
            weights=evidence.criterion_weights,
            directions=evidence.criterion_directions,
            scales=scales,
        )
        impact = _impact(
            evidence=evidence,
            baseline=baseline,
            counterfactual=counterfactual,
        )

        items.append(
            {
                **identity,
                "available": True,
                "reason": None,
                "renormalizedEvaluatorWeights": [
                    {
                        "expertIndex": expert["expertIndex"],
                        "expertKey": expert["expertKey"],
                        "expertId": expert["expertId"],
                        "name": expert["name"],
                        "weight": weight,
                    }
                    for expert, weight in zip(
                        remaining,
                        normalized_weights,
                        strict=True,
                    )
                ],
                "counterfactualCollectiveBetaMatrix": [
                    list(row) for row in counterfactual_matrix
                ],
                "counterfactualResult": counterfactual,
                "impact": impact,
            }
        )

    return {
        "availability": availability(True),
        "items": items,
        "mostRankChanging": _extreme_counterfactual(
            items,
            value_key="totalAbsoluteRankChange",
            identity_keys=("expertKey", "expertId", "name", "expertIndex"),
        ),
        "mostClosenessChanging": _extreme_counterfactual(
            items,
            value_key="totalAbsoluteClosenessChange",
            identity_keys=("expertKey", "expertId", "name", "expertIndex"),
        ),
        "winnerStateChangingEvaluators": [
            {
                "expertKey": item["expertKey"],
                "expertId": item["expertId"],
                "name": item["name"],
                "expertIndex": item["expertIndex"],
            }
            for item in items
            if item["available"] and item["impact"]["winnerStateChanged"]
        ],
    }


def build_robustness_facts(
    evidence: TopsisEvidence,
    context: dict[str, Any],
) -> dict[str, Any]:
    baseline = _baseline_result(evidence)
    loco = _loco(evidence=evidence, baseline=baseline)
    loeo = _loeo(evidence=evidence, context=context, baseline=baseline)

    return {
        "method": {
            "kind": "counterfactual_diagnostic",
            "baseline": "executed_topsis_2tuple_result",
            "leaveOneCriterionOut": {
                "abbreviation": "LOCO",
                "operation": (
                    "remove one criterion, renormalize the remaining "
                    "criterion weights, and recompute TOPSIS"
                ),
            },
            "leaveOneEvaluatorOut": {
                "abbreviation": "LOEO",
                "operation": (
                    "remove one evaluator, renormalize the remaining "
                    "evaluator weights, rebuild the collective beta matrix, "
                    "and recompute TOPSIS"
                ),
            },
            "impact": {
                "rankDeltaSign": (
                    "positive means the alternative receives a worse "
                    "technical rank after removal"
                ),
                "closenessDeltaSign": (
                    "positive means the alternative has a larger TOPSIS "
                    "closeness coefficient after removal"
                ),
                "technicalRankingIsNotSemanticSeparation": True,
                "leadingGroupsUseAnalyticalTieTolerance": (
                    ANALYTICAL_TIE_TOLERANCE
                ),
            },
        },
        "capabilities": {
            "analyzeCriterionCounterfactualInfluence": loco["availability"],
            "analyzeEvaluatorCounterfactualInfluence": loeo["availability"],
        },
        "baseline": {
            "kind": "observed",
            "source": "facts.result",
        },
        "leaveOneCriterionOut": loco,
        "leaveOneEvaluatorOut": loeo,
    }
