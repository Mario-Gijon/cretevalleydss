from __future__ import annotations

from typing import Any

from ..aggregation.core import TwoTuple, delta, delta_inverse
from ..aggregation.registry import aggregate
from .common import (
    ANALYTICAL_TIE_TOLERANCE,
    EVIDENCE_TOLERANCE,
    availability,
    effective_tie,
)
from .evidence import TwoTupleEvidence
from .experts import extract_expert_profiles


def _semantic_result(
    *,
    evidence: TwoTupleEvidence,
    collective_matrix: list[list[TwoTuple]],
    criterion_weights: list[float] | None = None,
) -> dict[str, Any]:
    method = evidence.criteria_aggregation["method"]
    options = evidence.criteria_aggregation["options"]
    values: list[TwoTuple] = []
    betas: list[float] = []

    for row in collective_matrix:
        result = aggregate(
            method,
            row,
            label_count=evidence.label_count,
            weights=criterion_weights,
            options=options,
        )
        values.append(result)
        betas.append(
            delta_inverse(
                result,
                label_count=evidence.label_count,
            )
        )

    ranking = sorted(
        range(len(betas)),
        key=lambda index: (-betas[index], index),
    )
    rank_by_index = {
        alternative_index: rank
        for rank, alternative_index in enumerate(ranking, start=1)
    }

    maximum_beta = max(betas)
    minimum_beta = min(betas)
    leading_group = [
        {
            "alternativeId": evidence.alternative_ids[index],
            "name": evidence.alternative_names[index],
            "alternativeIndex": index,
            "technicalRank": rank_by_index[index],
            "beta": betas[index],
        }
        for index in range(len(betas))
        if effective_tie(betas[index], maximum_beta)
    ]
    leading_group.sort(key=lambda item: item["technicalRank"])

    if len(evidence.alternative_ids) == 1:
        winner = availability(
            False,
            "single_alternative",
            alternative=None,
        )
    elif (
        maximum_beta - minimum_beta
        <= ANALYTICAL_TIE_TOLERANCE
    ):
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

    return {
        "technicalRankingIndexes": ranking,
        "technicalRanking": [
            {
                "alternativeId": evidence.alternative_ids[index],
                "name": evidence.alternative_names[index],
                "alternativeIndex": index,
                "technicalRank": rank,
                "beta": betas[index],
                "tuple": {
                    "labelIndex": values[index].label_index,
                    "labelKey": evidence.labels[
                        values[index].label_index
                    ]["key"],
                    "label": evidence.labels[
                        values[index].label_index
                    ]["label"],
                    "alpha": values[index].alpha,
                },
            }
            for rank, index in enumerate(ranking, start=1)
        ],
        "leadingGroup": leading_group,
        "winner": winner,
        "finalBetas": betas,
    }


def _baseline_result(
    evidence: TwoTupleEvidence,
) -> dict[str, Any]:
    rank_by_index = {
        alternative_index: rank
        for rank, alternative_index in enumerate(
            evidence.ranking,
            start=1,
        )
    }
    maximum_beta = max(evidence.collective_scores)
    minimum_beta = min(evidence.collective_scores)

    leading_group = [
        {
            "alternativeId": evidence.alternative_ids[index],
            "name": evidence.alternative_names[index],
            "alternativeIndex": index,
            "technicalRank": rank_by_index[index],
            "beta": evidence.collective_scores[index],
        }
        for index in range(len(evidence.alternative_ids))
        if effective_tie(
            evidence.collective_scores[index],
            maximum_beta,
        )
    ]
    leading_group.sort(key=lambda item: item["technicalRank"])

    if len(evidence.alternative_ids) == 1:
        winner = availability(
            False,
            "single_alternative",
            alternative=None,
        )
    elif (
        maximum_beta - minimum_beta
        <= ANALYTICAL_TIE_TOLERANCE
    ):
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

    return {
        "technicalRankingIndexes": list(evidence.ranking),
        "technicalRanking": [
            {
                "alternativeId": evidence.alternative_ids[index],
                "name": evidence.alternative_names[index],
                "alternativeIndex": index,
                "technicalRank": rank,
                "beta": evidence.collective_scores[index],
                "tuple": evidence.collective_values[index],
            }
            for rank, index in enumerate(
                evidence.ranking,
                start=1,
            )
        ],
        "leadingGroup": leading_group,
        "winner": winner,
        "finalBetas": list(evidence.collective_scores),
    }


def _winner_state(
    result: dict[str, Any],
) -> tuple[bool, str | None, str | None]:
    winner = result["winner"]
    if winner["available"]:
        return (
            True,
            winner["alternative"]["alternativeId"],
            None,
        )
    return False, None, winner["reason"]


def _impact(
    *,
    evidence: TwoTupleEvidence,
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

    alternatives: list[dict[str, Any]] = []
    total_rank_change = 0.0
    total_beta_change = 0.0
    max_rank_change = 0.0
    max_beta_change = 0.0

    for index, alternative_id in enumerate(evidence.alternative_ids):
        baseline_rank = baseline_rank_by_index[index]
        counter_rank = counter_rank_by_index[index]
        rank_delta = counter_rank - baseline_rank
        absolute_rank_change = abs(rank_delta)

        baseline_beta = baseline["finalBetas"][index]
        counter_beta = counterfactual["finalBetas"][index]
        beta_delta = counter_beta - baseline_beta
        absolute_beta_change = abs(beta_delta)

        total_rank_change += absolute_rank_change
        total_beta_change += absolute_beta_change
        max_rank_change = max(
            max_rank_change,
            absolute_rank_change,
        )
        max_beta_change = max(
            max_beta_change,
            absolute_beta_change,
        )

        alternatives.append(
            {
                "alternativeId": alternative_id,
                "name": evidence.alternative_names[index],
                "alternativeIndex": index,
                "baselineTechnicalRank": baseline_rank,
                "counterfactualTechnicalRank": counter_rank,
                "counterfactualRankMinusBaselineRank": rank_delta,
                "absoluteRankChange": absolute_rank_change,
                "baselineBeta": baseline_beta,
                "counterfactualBeta": counter_beta,
                "betaDelta": beta_delta,
                "absoluteBetaChange": absolute_beta_change,
            }
        )

    baseline_leaders = {
        item["alternativeId"]
        for item in baseline["leadingGroup"]
    }
    counter_leaders = {
        item["alternativeId"]
        for item in counterfactual["leadingGroup"]
    }
    alternative_count = len(evidence.alternative_ids)

    return {
        "technicalRankingChanged": (
            baseline["technicalRankingIndexes"]
            != counterfactual["technicalRankingIndexes"]
        ),
        "semanticLeadingGroupChanged": (
            baseline_leaders != counter_leaders
        ),
        "winnerStateChanged": (
            _winner_state(baseline)
            != _winner_state(counterfactual)
        ),
        "totalAbsoluteRankChange": total_rank_change,
        "meanAbsoluteRankChange": (
            total_rank_change / alternative_count
        ),
        "maxAbsoluteRankChange": max_rank_change,
        "totalAbsoluteBetaChange": total_beta_change,
        "meanAbsoluteBetaChange": (
            total_beta_change / alternative_count
        ),
        "maxAbsoluteBetaChange": max_beta_change,
        "alternatives": alternatives,
    }


def _extreme_counterfactual(
    items: list[dict[str, Any]],
    *,
    value_key: str,
    identity_keys: tuple[str, ...],
) -> dict[str, Any]:
    available_items = [
        item
        for item in items
        if item["available"]
    ]
    if not available_items:
        return availability(
            False,
            "missing_evidence",
            value=None,
            items=[],
        )

    values = [
        float(item["impact"][value_key])
        for item in available_items
    ]
    maximum = max(values)
    minimum = min(values)

    if effective_tie(maximum, minimum):
        return availability(
            False,
            "no_variation",
            value=None,
            items=[],
        )

    selected = [
        item
        for item in available_items
        if effective_tie(
            float(item["impact"][value_key]),
            maximum,
        )
    ]

    return availability(
        True,
        value=maximum,
        items=[
            {
                key: item[key]
                for key in identity_keys
            }
            for item in selected
        ],
    )


def _baseline_collective_matrix(
    evidence: TwoTupleEvidence,
) -> list[list[TwoTuple]]:
    return [
        [
            delta(
                beta,
                label_count=evidence.label_count,
            )
            for beta in row
        ]
        for row in evidence.collective_beta_matrix
    ]


def _loco(
    *,
    evidence: TwoTupleEvidence,
    baseline: dict[str, Any],
) -> dict[str, Any]:
    criterion_count = len(evidence.criterion_ids)

    if len(evidence.alternative_ids) == 1:
        return {
            "availability": availability(
                False,
                "single_alternative",
            ),
            "items": [],
            "mostRankChanging": availability(
                False,
                "single_alternative",
                value=None,
                items=[],
            ),
            "mostBetaChanging": availability(
                False,
                "single_alternative",
                value=None,
                items=[],
            ),
            "winnerStateChangingCriteria": [],
        }

    if criterion_count == 1:
        return {
            "availability": availability(
                False,
                "single_criterion",
            ),
            "items": [],
            "mostRankChanging": availability(
                False,
                "single_criterion",
                value=None,
                items=[],
            ),
            "mostBetaChanging": availability(
                False,
                "single_criterion",
                value=None,
                items=[],
            ),
            "winnerStateChangingCriteria": [],
        }

    baseline_matrix = _baseline_collective_matrix(evidence)
    items: list[dict[str, Any]] = []

    for removed_index, criterion_id in enumerate(
        evidence.criterion_ids
    ):
        remaining_indexes = [
            index
            for index in range(criterion_count)
            if index != removed_index
        ]

        identity = {
            "criterionId": criterion_id,
            "name": evidence.criterion_names[removed_index],
            "criterionIndex": removed_index,
        }

        counter_weights: list[float] | None = None
        weight_evidence: list[dict[str, Any]] | None = None

        if evidence.criterion_weights is not None:
            remaining_total = sum(
                evidence.criterion_weights[index]
                for index in remaining_indexes
            )
            identity["removedConfiguredWeight"] = (
                evidence.criterion_weights[removed_index]
            )
            identity["remainingConfiguredWeight"] = remaining_total

            if remaining_total <= EVIDENCE_TOLERANCE:
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

            counter_weights = [
                evidence.criterion_weights[index]
                / remaining_total
                for index in remaining_indexes
            ]
            weight_evidence = [
                {
                    "criterionId": evidence.criterion_ids[index],
                    "name": evidence.criterion_names[index],
                    "criterionIndex": index,
                    "weight": weight,
                }
                for index, weight in zip(
                    remaining_indexes,
                    counter_weights,
                    strict=True,
                )
            ]

        matrix = [
            [
                row[index]
                for index in remaining_indexes
            ]
            for row in baseline_matrix
        ]
        counterfactual = _semantic_result(
            evidence=evidence,
            collective_matrix=matrix,
            criterion_weights=counter_weights,
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
                "renormalizedCriterionWeights": weight_evidence,
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
            identity_keys=(
                "criterionId",
                "name",
                "criterionIndex",
            ),
        ),
        "mostBetaChanging": _extreme_counterfactual(
            items,
            value_key="totalAbsoluteBetaChange",
            identity_keys=(
                "criterionId",
                "name",
                "criterionIndex",
            ),
        ),
        "winnerStateChangingCriteria": [
            {
                "criterionId": item["criterionId"],
                "name": item["name"],
                "criterionIndex": item["criterionIndex"],
            }
            for item in items
            if (
                item["available"]
                and item["impact"]["winnerStateChanged"]
            )
        ],
    }


def _collective_without_expert(
    *,
    evidence: TwoTupleEvidence,
    profiles: list[dict[str, Any]],
    removed_index: int,
) -> tuple[
    list[list[TwoTuple]] | None,
    list[float] | None,
]:
    remaining = [
        profile
        for index, profile in enumerate(profiles)
        if index != removed_index
    ]
    expert_method = evidence.expert_aggregation["method"]
    expert_options = evidence.expert_aggregation["options"]

    expert_weights: list[float] | None = None
    if evidence.expert_weights is not None:
        remaining_indexes = [
            index
            for index in range(len(profiles))
            if index != removed_index
        ]
        remaining_total = sum(
            evidence.expert_weights[index]
            for index in remaining_indexes
        )
        if remaining_total <= EVIDENCE_TOLERANCE:
            return None, None

        expert_weights = [
            evidence.expert_weights[index]
            / remaining_total
            for index in remaining_indexes
        ]

    matrix: list[list[TwoTuple]] = []
    for alternative_index in range(
        len(evidence.alternative_ids)
    ):
        row: list[TwoTuple] = []
        for criterion_index in range(
            len(evidence.criterion_ids)
        ):
            values = [
                profile["matrix"][alternative_index][criterion_index]
                for profile in remaining
            ]
            row.append(
                aggregate(
                    expert_method,
                    values,
                    label_count=evidence.label_count,
                    weights=expert_weights,
                    options=expert_options,
                )
            )
        matrix.append(row)

    return matrix, expert_weights


def _loeo(
    *,
    evidence: TwoTupleEvidence,
    context: dict[str, Any],
    baseline: dict[str, Any],
) -> dict[str, Any]:
    profiles = extract_expert_profiles(
        evidence=evidence,
        context=context,
    )

    if len(evidence.alternative_ids) == 1:
        return {
            "availability": availability(
                False,
                "single_alternative",
            ),
            "items": [],
            "mostRankChanging": availability(
                False,
                "single_alternative",
                value=None,
                items=[],
            ),
            "mostBetaChanging": availability(
                False,
                "single_alternative",
                value=None,
                items=[],
            ),
            "winnerStateChangingEvaluators": [],
        }

    if len(profiles) == 1:
        return {
            "availability": availability(
                False,
                "single_evaluator",
            ),
            "items": [],
            "mostRankChanging": availability(
                False,
                "single_evaluator",
                value=None,
                items=[],
            ),
            "mostBetaChanging": availability(
                False,
                "single_evaluator",
                value=None,
                items=[],
            ),
            "winnerStateChangingEvaluators": [],
        }

    items: list[dict[str, Any]] = []

    for removed_index, profile in enumerate(profiles):
        identity = {
            "expertKey": profile["expertKey"],
            "expertId": profile["expertId"],
            "expertLabel": profile["expertLabel"],
            "expertEmail": profile["expertEmail"],
            "expertIndex": profile["expertIndex"],
            "removedImportanceWeight": profile["importanceWeight"],
        }

        matrix, renormalized_weights = _collective_without_expert(
            evidence=evidence,
            profiles=profiles,
            removed_index=removed_index,
        )
        if matrix is None:
            items.append(
                {
                    **identity,
                    "available": False,
                    "reason": "zero_effective_weight",
                    "renormalizedExpertWeights": [],
                    "counterfactualResult": None,
                    "impact": None,
                }
            )
            continue

        counterfactual = _semantic_result(
            evidence=evidence,
            collective_matrix=matrix,
            criterion_weights=(
                list(evidence.criterion_weights)
                if evidence.criterion_weights is not None
                else None
            ),
        )
        impact = _impact(
            evidence=evidence,
            baseline=baseline,
            counterfactual=counterfactual,
        )

        if renormalized_weights is None:
            weight_evidence = None
        else:
            remaining_profiles = [
                other
                for index, other in enumerate(profiles)
                if index != removed_index
            ]
            weight_evidence = [
                {
                    "expertKey": other["expertKey"],
                    "expertId": other["expertId"],
                    "expertLabel": other["expertLabel"],
                    "expertEmail": other["expertEmail"],
                    "expertIndex": other["expertIndex"],
                    "weight": weight,
                }
                for other, weight in zip(
                    remaining_profiles,
                    renormalized_weights,
                    strict=True,
                )
            ]

        items.append(
            {
                **identity,
                "available": True,
                "reason": None,
                "renormalizedExpertWeights": weight_evidence,
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
            identity_keys=(
                "expertKey",
                "expertId",
                "expertLabel",
                "expertEmail",
                "expertIndex",
            ),
        ),
        "mostBetaChanging": _extreme_counterfactual(
            items,
            value_key="totalAbsoluteBetaChange",
            identity_keys=(
                "expertKey",
                "expertId",
                "expertLabel",
                "expertEmail",
                "expertIndex",
            ),
        ),
        "winnerStateChangingEvaluators": [
            {
                "expertKey": item["expertKey"],
                "expertId": item["expertId"],
                "expertLabel": item["expertLabel"],
                "expertEmail": item["expertEmail"],
                "expertIndex": item["expertIndex"],
            }
            for item in items
            if (
                item["available"]
                and item["impact"]["winnerStateChanged"]
            )
        ],
    }


def build_robustness_facts(
    evidence: TwoTupleEvidence,
    context: dict[str, Any],
) -> dict[str, Any]:
    baseline = _baseline_result(evidence)

    return {
        "method": {
            "analysisKind": "counterfactual_diagnostic",
            "normativePartOfTwoTupleMethod": False,
            "criterionRemoval": (
                "remove one criterion and rerun the configured "
                "criteria aggregation"
            ),
            "evaluatorRemoval": (
                "remove one evaluator, rerun the configured expert "
                "aggregation, then rerun criteria aggregation"
            ),
            "weightedAverageRemoval": (
                "renormalize remaining argument-importance weights"
            ),
            "l2towaRemoval": (
                "recompute positional OWA weights for the reduced "
                "number of ordered beta arguments"
            ),
        },
        "baseline": baseline,
        "leaveOneCriterionOut": _loco(
            evidence=evidence,
            baseline=baseline,
        ),
        "leaveOneEvaluatorOut": _loeo(
            evidence=evidence,
            context=context,
            baseline=baseline,
        ),
    }


__all__ = [
    "build_robustness_facts",
    "_baseline_result",
    "_impact",
    "_semantic_result",
]
