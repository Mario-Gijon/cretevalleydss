from __future__ import annotations

from typing import Any

from ..aggregation.core import TwoTuple
from ..aggregation.registry import aggregate
from .common import (
    EVIDENCE_TOLERANCE,
    assert_close,
    availability,
    effective_tie,
)
from .evidence import TwoTupleEvidence
from .experts import extract_expert_profiles
from .robustness import _baseline_result, _impact, _semantic_result


SENSITIVITY_STEP = 0.05


def _is_endpoint_weight(value: float) -> bool:
    return (
        abs(value) <= EVIDENCE_TOLERANCE
        or abs(value - 1.0) <= EVIDENCE_TOLERANCE
    )


def _is_interior_weight(value: float) -> bool:
    return not _is_endpoint_weight(value)


def _endpoint_winner_state_changes(
    points: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    changes: list[dict[str, Any]] = []

    for point in points:
        weight = float(point["variedWeight"])
        if (
            not _is_endpoint_weight(weight)
            or not point["changesFromBaseline"]["winnerStateChanged"]
        ):
            continue

        is_zero = abs(weight) <= EVIDENCE_TOLERANCE
        changes.append(
            {
                "variedWeight": weight,
                "endpoint": "zero" if is_zero else "one",
                "targetImportance": "zero" if is_zero else "all",
                "otherImportance": (
                    "redistributed_proportionally"
                    if is_zero
                    else "zero"
                ),
                "technicalRanking": [
                    item["alternativeId"]
                    for item in point["result"]["technicalRanking"]
                ],
                "leadingGroup": [
                    item["alternativeId"]
                    for item in point["result"]["leadingGroup"]
                ],
                "winner": point["result"]["winner"],
            }
        )

    return changes


def _sample_weights(configured_weight: float) -> list[float]:
    steps = round(1.0 / SENSITIVITY_STEP)
    values = [
        round(index * SENSITIVITY_STEP, 12)
        for index in range(steps + 1)
    ]
    if not any(
        abs(value - configured_weight) <= EVIDENCE_TOLERANCE
        for value in values
    ):
        values.append(float(configured_weight))
    return sorted(set(values))


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


def _compact_result(
    *,
    evidence: TwoTupleEvidence,
    result: dict[str, Any],
) -> dict[str, Any]:
    return {
        "technicalRankingIndexes": list(
            result["technicalRankingIndexes"]
        ),
        "technicalRanking": [
            {
                "alternativeId": item["alternativeId"],
                "name": item["name"],
                "technicalRank": item["technicalRank"],
            }
            for item in result["technicalRanking"]
        ],
        "leadingGroup": [
            {
                "alternativeId": item["alternativeId"],
                "name": item["name"],
                "technicalRank": item["technicalRank"],
            }
            for item in result["leadingGroup"]
        ],
        "winner": result["winner"],
        "finalBetas": [
            {
                "alternativeId": evidence.alternative_ids[index],
                "name": evidence.alternative_names[index],
                "value": result["finalBetas"][index],
            }
            for index in range(len(evidence.alternative_ids))
        ],
    }


def _point(
    *,
    evidence: TwoTupleEvidence,
    baseline: dict[str, Any],
    varied_weight: float,
    configured_weights: list[dict[str, Any]],
    result: dict[str, Any],
) -> dict[str, Any]:
    impact = _impact(
        evidence=evidence,
        baseline=baseline,
        counterfactual=result,
    )

    return {
        "variedWeight": varied_weight,
        "configuredWeights": configured_weights,
        "result": _compact_result(
            evidence=evidence,
            result=result,
        ),
        "changesFromBaseline": {
            "technicalRankingChanged": impact[
                "technicalRankingChanged"
            ],
            "semanticLeadingGroupChanged": impact[
                "semanticLeadingGroupChanged"
            ],
            "winnerStateChanged": impact[
                "winnerStateChanged"
            ],
            "totalAbsoluteRankChange": impact[
                "totalAbsoluteRankChange"
            ],
            "meanAbsoluteRankChange": impact[
                "meanAbsoluteRankChange"
            ],
            "maxAbsoluteRankChange": impact[
                "maxAbsoluteRankChange"
            ],
            "totalAbsoluteBetaChange": impact[
                "totalAbsoluteBetaChange"
            ],
            "meanAbsoluteBetaChange": impact[
                "meanAbsoluteBetaChange"
            ],
            "maxAbsoluteBetaChange": impact[
                "maxAbsoluteBetaChange"
            ],
        },
    }


def _transition_records(
    points: list[dict[str, Any]],
) -> dict[str, list[dict[str, Any]]]:
    ranking: list[dict[str, Any]] = []
    leaders: list[dict[str, Any]] = []
    winner: list[dict[str, Any]] = []

    for previous, current in zip(
        points,
        points[1:],
        strict=False,
    ):
        previous_result = previous["result"]
        current_result = current["result"]
        interval = {
            "fromWeight": previous["variedWeight"],
            "toWeight": current["variedWeight"],
            "intervalWidth": (
                current["variedWeight"]
                - previous["variedWeight"]
            ),
        }

        previous_ranking = tuple(
            item["alternativeId"]
            for item in previous_result["technicalRanking"]
        )
        current_ranking = tuple(
            item["alternativeId"]
            for item in current_result["technicalRanking"]
        )
        if previous_ranking != current_ranking:
            ranking.append(
                {
                    **interval,
                    "fromTechnicalRanking": list(
                        previous_ranking
                    ),
                    "toTechnicalRanking": list(
                        current_ranking
                    ),
                }
            )

        previous_leaders = tuple(
            item["alternativeId"]
            for item in previous_result["leadingGroup"]
        )
        current_leaders = tuple(
            item["alternativeId"]
            for item in current_result["leadingGroup"]
        )
        if previous_leaders != current_leaders:
            leaders.append(
                {
                    **interval,
                    "fromLeadingGroup": list(previous_leaders),
                    "toLeadingGroup": list(current_leaders),
                }
            )

        previous_winner = _winner_state(previous_result)
        current_winner = _winner_state(current_result)
        if previous_winner != current_winner:
            winner.append(
                {
                    **interval,
                    "fromWinner": {
                        "available": previous_winner[0],
                        "alternativeId": previous_winner[1],
                        "reason": previous_winner[2],
                    },
                    "toWinner": {
                        "available": current_winner[0],
                        "alternativeId": current_winner[1],
                        "reason": current_winner[2],
                    },
                }
            )

    return {
        "technicalRanking": ranking,
        "semanticLeadingGroup": leaders,
        "winnerState": winner,
    }


def _nearest_observed_change(
    *,
    points: list[dict[str, Any]],
    configured_weight: float,
    change_key: str,
    interior_only: bool = False,
) -> dict[str, Any]:
    changed = [
        point
        for point in points
        if (
            point["changesFromBaseline"][change_key]
            and (
                not interior_only
                or _is_interior_weight(float(point["variedWeight"]))
            )
        )
    ]
    if not changed:
        return availability(
            False,
            "no_variation",
            points=[],
        )

    minimum_distance = min(
        abs(point["variedWeight"] - configured_weight)
        for point in changed
    )
    selected = [
        point
        for point in changed
        if effective_tie(
            abs(
                point["variedWeight"]
                - configured_weight
            ),
            minimum_distance,
        )
    ]

    return availability(
        True,
        absoluteWeightChange=minimum_distance,
        points=[
            {
                "variedWeight": point["variedWeight"],
                "technicalRanking": [
                    item["alternativeId"]
                    for item in point["result"][
                        "technicalRanking"
                    ]
                ],
                "leadingGroup": [
                    item["alternativeId"]
                    for item in point["result"][
                        "leadingGroup"
                    ]
                ],
                "winner": point["result"]["winner"],
            }
            for point in selected
        ],
    )


def _item_summary(
    *,
    points: list[dict[str, Any]],
    configured_weight: float,
) -> dict[str, Any]:
    changed_rank = [
        point
        for point in points
        if point["changesFromBaseline"][
            "technicalRankingChanged"
        ]
    ]
    changed_leaders = [
        point
        for point in points
        if point["changesFromBaseline"][
            "semanticLeadingGroupChanged"
        ]
    ]
    changed_winner = [
        point
        for point in points
        if point["changesFromBaseline"][
            "winnerStateChanged"
        ]
    ]
    interior_winner_changes = [
        point
        for point in changed_winner
        if _is_interior_weight(
            float(point["variedWeight"])
        )
    ]
    endpoint_winner_changes = _endpoint_winner_state_changes(
        points
    )

    return {
        "sampleCount": len(points),
        "technicalRankingChangedSampleCount": len(
            changed_rank
        ),
        "semanticLeadingGroupChangedSampleCount": len(
            changed_leaders
        ),
        "winnerStateChangedSampleCount": len(
            changed_winner
        ),
        "interiorWinnerStateChangedSampleCount": len(
            interior_winner_changes
        ),
        "endpointWinnerStateChangedSampleCount": len(
            endpoint_winner_changes
        ),
        "winnerStateChangesOnlyAtEndpoints": (
            bool(changed_winner)
            and not interior_winner_changes
            and bool(endpoint_winner_changes)
        ),
        "endpointWinnerStateChanges": endpoint_winner_changes,
        "stableTechnicalRankingAcrossSampledPoints": (
            not changed_rank
        ),
        "stableSemanticLeadingGroupAcrossSampledPoints": (
            not changed_leaders
        ),
        "stableWinnerStateAcrossSampledPoints": (
            not changed_winner
        ),
        "maximumObservedTotalAbsoluteRankChange": max(
            point["changesFromBaseline"][
                "totalAbsoluteRankChange"
            ]
            for point in points
        ),
        "maximumObservedMeanAbsoluteBetaChange": max(
            point["changesFromBaseline"][
                "meanAbsoluteBetaChange"
            ]
            for point in points
        ),
        "nearestObservedTechnicalRankingChange": (
            _nearest_observed_change(
                points=points,
                configured_weight=configured_weight,
                change_key="technicalRankingChanged",
            )
        ),
        "nearestObservedSemanticLeadingGroupChange": (
            _nearest_observed_change(
                points=points,
                configured_weight=configured_weight,
                change_key="semanticLeadingGroupChanged",
            )
        ),
        "nearestObservedWinnerStateChange": (
            _nearest_observed_change(
                points=points,
                configured_weight=configured_weight,
                change_key="winnerStateChanged",
            )
        ),
        "nearestObservedInteriorWinnerStateChange": (
            _nearest_observed_change(
                points=points,
                configured_weight=configured_weight,
                change_key="winnerStateChanged",
                interior_only=True,
            )
        ),
        "transitions": _transition_records(points),
    }


def _validate_baseline_point(
    *,
    evidence: TwoTupleEvidence,
    point: dict[str, Any],
) -> None:
    if (
        point["result"]["technicalRankingIndexes"]
        != evidence.ranking
    ):
        raise ValueError(
            "Sensitivity baseline ranking is inconsistent "
            "with executed 2-tuple evidence"
        )

    final_betas = point["result"]["finalBetas"]
    for index, item in enumerate(final_betas):
        assert_close(
            item["value"],
            evidence.collective_scores[index],
            f"sensitivity.baseline.finalBetas[{index}]",
        )


def _extreme_items(
    *,
    items: list[dict[str, Any]],
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
        float(item["summary"][value_key])
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
            float(item["summary"][value_key]),
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


def _criterion_weight_sensitivity(
    *,
    evidence: TwoTupleEvidence,
    baseline: dict[str, Any],
) -> dict[str, Any]:
    alternative_count = len(evidence.alternative_ids)
    criterion_count = len(evidence.criterion_ids)

    if evidence.criteria_aggregation["method"] != "weighted_average":
        return {
            "availability": availability(
                False,
                "criteria_aggregation_not_weighted_average",
            ),
            "items": [],
        }
    if alternative_count == 1:
        return {
            "availability": availability(
                False,
                "single_alternative",
            ),
            "items": [],
        }
    if criterion_count == 1:
        return {
            "availability": availability(
                False,
                "single_criterion",
            ),
            "items": [],
        }
    if evidence.criterion_weights is None:
        raise ValueError(
            "weighted criteria aggregation requires criterion weights"
        )

    items: list[dict[str, Any]] = []

    for target_index, criterion_id in enumerate(
        evidence.criterion_ids
    ):
        configured_weight = evidence.criterion_weights[
            target_index
        ]
        complement_total = sum(
            evidence.criterion_weights[index]
            for index in range(criterion_count)
            if index != target_index
        )
        identity = {
            "criterionId": criterion_id,
            "name": evidence.criterion_names[target_index],
            "criterionIndex": target_index,
            "configuredWeight": configured_weight,
        }

        if complement_total <= EVIDENCE_TOLERANCE:
            items.append(
                {
                    **identity,
                    "available": False,
                    "reason": "zero_effective_complement_weight",
                    "points": [],
                    "summary": None,
                }
            )
            continue

        points: list[dict[str, Any]] = []

        for varied_weight in _sample_weights(
            configured_weight
        ):
            weights = [
                0.0
                for _ in evidence.criterion_weights
            ]
            weights[target_index] = varied_weight

            for index, baseline_weight in enumerate(
                evidence.criterion_weights
            ):
                if index == target_index:
                    continue
                weights[index] = (
                    (1.0 - varied_weight)
                    * baseline_weight
                    / complement_total
                )

            collective_matrix = [
                [
                    TwoTuple(
                        label_index=(
                            evidence.collective_matrix[
                                alternative_index
                            ][criterion_index]["labelIndex"]
                        ),
                        alpha=(
                            evidence.collective_matrix[
                                alternative_index
                            ][criterion_index]["alpha"]
                        ),
                    )
                    for criterion_index in range(
                        criterion_count
                    )
                ]
                for alternative_index in range(
                    alternative_count
                )
            ]
            result = _semantic_result(
                evidence=evidence,
                collective_matrix=collective_matrix,
                criterion_weights=weights,
            )
            point = _point(
                evidence=evidence,
                baseline=baseline,
                varied_weight=varied_weight,
                configured_weights=[
                    {
                        "criterionId": (
                            evidence.criterion_ids[index]
                        ),
                        "name": (
                            evidence.criterion_names[index]
                        ),
                        "criterionIndex": index,
                        "weight": weights[index],
                    }
                    for index in range(criterion_count)
                ],
                result=result,
            )
            points.append(point)

        baseline_points = [
            point
            for point in points
            if abs(
                point["variedWeight"]
                - configured_weight
            ) <= EVIDENCE_TOLERANCE
        ]
        if len(baseline_points) != 1:
            raise ValueError(
                "Criterion sensitivity must include exactly "
                "one configured baseline point"
            )
        _validate_baseline_point(
            evidence=evidence,
            point=baseline_points[0],
        )

        items.append(
            {
                **identity,
                "available": True,
                "reason": None,
                "redistribution": {
                    "method": (
                        "proportional_preserve_other_weight_ratios"
                    ),
                    "complementConfiguredWeight": (
                        complement_total
                    ),
                },
                "points": points,
                "summary": _item_summary(
                    points=points,
                    configured_weight=configured_weight,
                ),
            }
        )

    available_items = [
        item
        for item in items
        if item["available"]
    ]

    return {
        "availability": availability(True),
        "items": items,
        "mostRankSensitive": _extreme_items(
            items=items,
            value_key=(
                "maximumObservedTotalAbsoluteRankChange"
            ),
            identity_keys=(
                "criterionId",
                "name",
                "criterionIndex",
            ),
        ),
        "mostBetaSensitive": _extreme_items(
            items=items,
            value_key=(
                "maximumObservedMeanAbsoluteBetaChange"
            ),
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
            for item in available_items
            if (
                item["summary"][
                    "winnerStateChangedSampleCount"
                ] > 0
            )
        ],
    }


def _collective_for_expert_weights(
    *,
    evidence: TwoTupleEvidence,
    profiles: list[dict[str, Any]],
    expert_weights: list[float],
) -> list[list[TwoTuple]]:
    if evidence.expert_aggregation["method"] != "weighted_average":
        raise ValueError(
            "Expert weight sensitivity requires weighted_average"
        )

    matrix: list[list[TwoTuple]] = []

    for alternative_index in range(
        len(evidence.alternative_ids)
    ):
        row: list[TwoTuple] = []
        for criterion_index in range(
            len(evidence.criterion_ids)
        ):
            values = [
                profile["matrix"][
                    alternative_index
                ][criterion_index]
                for profile in profiles
            ]
            row.append(
                aggregate(
                    "weighted_average",
                    values,
                    label_count=evidence.label_count,
                    weights=expert_weights,
                    options=evidence.expert_aggregation[
                        "options"
                    ],
                )
            )
        matrix.append(row)

    return matrix


def _expert_weight_sensitivity(
    *,
    evidence: TwoTupleEvidence,
    context: dict[str, Any],
    baseline: dict[str, Any],
) -> dict[str, Any]:
    alternative_count = len(evidence.alternative_ids)

    if evidence.expert_aggregation["method"] != "weighted_average":
        return {
            "availability": availability(
                False,
                "expert_aggregation_not_weighted_average",
            ),
            "items": [],
        }
    if alternative_count == 1:
        return {
            "availability": availability(
                False,
                "single_alternative",
            ),
            "items": [],
        }
    if len(evidence.expert_keys) == 1:
        return {
            "availability": availability(
                False,
                "single_evaluator",
            ),
            "items": [],
        }
    if evidence.expert_weights is None:
        raise ValueError(
            "weighted expert aggregation requires expert weights"
        )

    profiles = extract_expert_profiles(
        evidence=evidence,
        context=context,
    )
    expert_count = len(profiles)
    items: list[dict[str, Any]] = []

    for target_index, profile in enumerate(profiles):
        configured_weight = evidence.expert_weights[
            target_index
        ]
        complement_total = sum(
            evidence.expert_weights[index]
            for index in range(expert_count)
            if index != target_index
        )
        identity = {
            "expertKey": profile["expertKey"],
            "expertId": profile["expertId"],
            "expertLabel": profile["expertLabel"],
            "expertEmail": profile["expertEmail"],
            "expertIndex": profile["expertIndex"],
            "configuredWeight": configured_weight,
        }

        if complement_total <= EVIDENCE_TOLERANCE:
            items.append(
                {
                    **identity,
                    "available": False,
                    "reason": "zero_effective_complement_weight",
                    "points": [],
                    "summary": None,
                }
            )
            continue

        points: list[dict[str, Any]] = []

        for varied_weight in _sample_weights(
            configured_weight
        ):
            weights = [
                0.0
                for _ in evidence.expert_weights
            ]
            weights[target_index] = varied_weight

            for index, baseline_weight in enumerate(
                evidence.expert_weights
            ):
                if index == target_index:
                    continue
                weights[index] = (
                    (1.0 - varied_weight)
                    * baseline_weight
                    / complement_total
                )

            collective_matrix = (
                _collective_for_expert_weights(
                    evidence=evidence,
                    profiles=profiles,
                    expert_weights=weights,
                )
            )
            result = _semantic_result(
                evidence=evidence,
                collective_matrix=collective_matrix,
                criterion_weights=(
                    list(evidence.criterion_weights)
                    if evidence.criterion_weights is not None
                    else None
                ),
            )
            point = _point(
                evidence=evidence,
                baseline=baseline,
                varied_weight=varied_weight,
                configured_weights=[
                    {
                        "expertKey": profiles[index][
                            "expertKey"
                        ],
                        "expertId": profiles[index][
                            "expertId"
                        ],
                        "expertLabel": profiles[index][
                            "expertLabel"
                        ],
                        "expertEmail": profiles[index][
                            "expertEmail"
                        ],
                        "expertIndex": profiles[index][
                            "expertIndex"
                        ],
                        "weight": weights[index],
                    }
                    for index in range(expert_count)
                ],
                result=result,
            )
            points.append(point)

        baseline_points = [
            point
            for point in points
            if abs(
                point["variedWeight"]
                - configured_weight
            ) <= EVIDENCE_TOLERANCE
        ]
        if len(baseline_points) != 1:
            raise ValueError(
                "Expert sensitivity must include exactly "
                "one configured baseline point"
            )
        _validate_baseline_point(
            evidence=evidence,
            point=baseline_points[0],
        )

        items.append(
            {
                **identity,
                "available": True,
                "reason": None,
                "redistribution": {
                    "method": (
                        "proportional_preserve_other_weight_ratios"
                    ),
                    "complementConfiguredWeight": (
                        complement_total
                    ),
                },
                "points": points,
                "summary": _item_summary(
                    points=points,
                    configured_weight=configured_weight,
                ),
            }
        )

    available_items = [
        item
        for item in items
        if item["available"]
    ]

    return {
        "availability": availability(True),
        "items": items,
        "mostRankSensitive": _extreme_items(
            items=items,
            value_key=(
                "maximumObservedTotalAbsoluteRankChange"
            ),
            identity_keys=(
                "expertKey",
                "expertId",
                "expertLabel",
                "expertEmail",
                "expertIndex",
            ),
        ),
        "mostBetaSensitive": _extreme_items(
            items=items,
            value_key=(
                "maximumObservedMeanAbsoluteBetaChange"
            ),
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
            for item in available_items
            if (
                item["summary"][
                    "winnerStateChangedSampleCount"
                ] > 0
            )
        ],
    }


def build_sensitivity_facts(
    evidence: TwoTupleEvidence,
    context: dict[str, Any],
) -> dict[str, Any]:
    baseline = _baseline_result(evidence)

    return {
        "method": {
            "analysisKind": "sampled_counterfactual_diagnostic",
            "normativePartOfTwoTupleMethod": False,
            "sampleStep": SENSITIVITY_STEP,
            "sampleRange": {
                "minimumInclusive": 0.0,
                "maximumInclusive": 1.0,
            },
            "redistribution": (
                "proportional_preserve_other_weight_ratios"
            ),
            "criterionWeightSensitivityAvailableOnlyFor": (
                "criteriaAggregation=weighted_average"
            ),
            "expertWeightSensitivityAvailableOnlyFor": (
                "expertAggregation=weighted_average"
            ),
            "l2towaPositionalWeightsAreNotImportanceWeights": True,
        },
        "criterionWeights": _criterion_weight_sensitivity(
            evidence=evidence,
            baseline=baseline,
        ),
        "expertWeights": _expert_weight_sensitivity(
            evidence=evidence,
            context=context,
            baseline=baseline,
        ),
    }


__all__ = ["build_sensitivity_facts"]
