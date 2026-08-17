from __future__ import annotations

from typing import Any

from .common import (
    ANALYTICAL_TIE_TOLERANCE,
    EVIDENCE_TOLERANCE,
    assert_close,
    availability,
    effective_tie,
)
from .evidence import TopsisEvidence
from .experts import extract_expert_profiles
from .robustness import _baseline_result, _impact, _semantic_result


SENSITIVITY_STEP = 0.05


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


def _sample_weights(configured_weight: float) -> list[float]:
    steps = round(1.0 / SENSITIVITY_STEP)
    values = [round(index * SENSITIVITY_STEP, 12) for index in range(steps + 1)]
    if not any(abs(value - configured_weight) <= EVIDENCE_TOLERANCE for value in values):
        values.append(float(configured_weight))
    return sorted(set(values))


def _leading_ids(result: dict[str, Any]) -> tuple[str, ...]:
    return tuple(item["alternativeId"] for item in result["leadingGroup"])


def _winner_state(result: dict[str, Any]) -> tuple[bool, str | None, str | None]:
    winner = result["winner"]
    if winner["available"]:
        return True, winner["alternative"]["alternativeId"], None
    return False, None, winner["reason"]


def _compact_result(
    *,
    evidence: TopsisEvidence,
    result: dict[str, Any],
) -> dict[str, Any]:
    return {
        "technicalRankingIndexes": list(result["technicalRankingIndexes"]),
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
        "closeness": [
            {
                "alternativeId": evidence.alternative_ids[index],
                "name": evidence.alternative_names[index],
                "value": result["closeness"][index],
            }
            for index in range(len(evidence.alternative_ids))
        ],
        "totalWeightedDiscrimination": result["totalWeightedDiscrimination"],
    }


def _point(
    *,
    evidence: TopsisEvidence,
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
        "result": _compact_result(evidence=evidence, result=result),
        "changesFromBaseline": {
            "technicalRankingChanged": impact["technicalRankingChanged"],
            "semanticLeadingGroupChanged": impact["semanticLeadingGroupChanged"],
            "winnerStateChanged": impact["winnerStateChanged"],
            "totalAbsoluteRankChange": impact["totalAbsoluteRankChange"],
            "meanAbsoluteRankChange": impact["meanAbsoluteRankChange"],
            "maxAbsoluteRankChange": impact["maxAbsoluteRankChange"],
            "totalAbsoluteClosenessChange": impact[
                "totalAbsoluteClosenessChange"
            ],
            "meanAbsoluteClosenessChange": impact[
                "meanAbsoluteClosenessChange"
            ],
            "maxAbsoluteClosenessChange": impact[
                "maxAbsoluteClosenessChange"
            ],
        },
    }


def _transition_records(points: list[dict[str, Any]]) -> dict[str, list[dict[str, Any]]]:
    ranking: list[dict[str, Any]] = []
    leaders: list[dict[str, Any]] = []
    winner: list[dict[str, Any]] = []

    for previous, current in zip(points, points[1:], strict=False):
        previous_result = previous["result"]
        current_result = current["result"]
        interval = {
            "fromWeight": previous["variedWeight"],
            "toWeight": current["variedWeight"],
            "intervalWidth": current["variedWeight"] - previous["variedWeight"],
        }

        previous_ranking = tuple(
            item["alternativeId"] for item in previous_result["technicalRanking"]
        )
        current_ranking = tuple(
            item["alternativeId"] for item in current_result["technicalRanking"]
        )
        if previous_ranking != current_ranking:
            ranking.append(
                {
                    **interval,
                    "fromTechnicalRanking": list(previous_ranking),
                    "toTechnicalRanking": list(current_ranking),
                }
            )

        previous_leaders = tuple(
            item["alternativeId"] for item in previous_result["leadingGroup"]
        )
        current_leaders = tuple(
            item["alternativeId"] for item in current_result["leadingGroup"]
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
) -> dict[str, Any]:
    changed = [
        point
        for point in points
        if point["changesFromBaseline"][change_key]
    ]
    if not changed:
        return availability(False, "no_variation", points=[])

    minimum_distance = min(
        abs(point["variedWeight"] - configured_weight)
        for point in changed
    )
    selected = [
        point
        for point in changed
        if effective_tie(
            abs(point["variedWeight"] - configured_weight),
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
                    for item in point["result"]["technicalRanking"]
                ],
                "leadingGroup": [
                    item["alternativeId"]
                    for item in point["result"]["leadingGroup"]
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
        if point["changesFromBaseline"]["technicalRankingChanged"]
    ]
    changed_leaders = [
        point
        for point in points
        if point["changesFromBaseline"]["semanticLeadingGroupChanged"]
    ]
    changed_winner = [
        point
        for point in points
        if point["changesFromBaseline"]["winnerStateChanged"]
    ]
    transitions = _transition_records(points)

    return {
        "sampleCount": len(points),
        "technicalRankingChangedSampleCount": len(changed_rank),
        "semanticLeadingGroupChangedSampleCount": len(changed_leaders),
        "winnerStateChangedSampleCount": len(changed_winner),
        "stableTechnicalRankingAcrossSampledPoints": not changed_rank,
        "stableSemanticLeadingGroupAcrossSampledPoints": not changed_leaders,
        "stableWinnerStateAcrossSampledPoints": not changed_winner,
        "maximumObservedTotalAbsoluteRankChange": max(
            point["changesFromBaseline"]["totalAbsoluteRankChange"]
            for point in points
        ),
        "maximumObservedMeanAbsoluteClosenessChange": max(
            point["changesFromBaseline"]["meanAbsoluteClosenessChange"]
            for point in points
        ),
        "nearestObservedTechnicalRankingChange": _nearest_observed_change(
            points=points,
            configured_weight=configured_weight,
            change_key="technicalRankingChanged",
        ),
        "nearestObservedSemanticLeadingGroupChange": _nearest_observed_change(
            points=points,
            configured_weight=configured_weight,
            change_key="semanticLeadingGroupChanged",
        ),
        "nearestObservedWinnerStateChange": _nearest_observed_change(
            points=points,
            configured_weight=configured_weight,
            change_key="winnerStateChanged",
        ),
        "transitions": transitions,
    }


def _validate_baseline_point(
    *,
    evidence: TopsisEvidence,
    point: dict[str, Any],
) -> None:
    if point["result"]["technicalRankingIndexes"] != evidence.ranking:
        raise ValueError(
            "Sensitivity baseline ranking is inconsistent with executed TOPSIS evidence"
        )
    closeness = point["result"]["closeness"]
    for index, item in enumerate(closeness):
        assert_close(
            item["value"],
            evidence.closeness[index],
            f"sensitivity.baseline.closeness[{index}]",
        )


def _extreme_items(
    *,
    items: list[dict[str, Any]],
    value_key: str,
    identity_keys: tuple[str, ...],
) -> dict[str, Any]:
    available_items = [item for item in items if item["available"]]
    if not available_items:
        return availability(False, "missing_evidence", value=None, items=[])

    values = [float(item["summary"][value_key]) for item in available_items]
    maximum = max(values)
    minimum = min(values)
    if effective_tie(maximum, minimum):
        return availability(False, "no_variation", value=None, items=[])

    selected = [
        item
        for item in available_items
        if effective_tie(float(item["summary"][value_key]), maximum)
    ]
    return availability(
        True,
        value=maximum,
        items=[
            {key: item[key] for key in identity_keys}
            for item in selected
        ],
    )


def _criterion_weight_sensitivity(
    *,
    evidence: TopsisEvidence,
    baseline: dict[str, Any],
) -> dict[str, Any]:
    alternative_count = len(evidence.alternative_ids)
    criterion_count = len(evidence.criterion_ids)

    if alternative_count == 1:
        return {
            "availability": availability(False, "single_alternative"),
            "items": [],
        }
    if criterion_count == 1:
        return {
            "availability": availability(False, "single_criterion"),
            "items": [],
        }

    scales = _criterion_scales(evidence)
    items: list[dict[str, Any]] = []

    for target_index, criterion_id in enumerate(evidence.criterion_ids):
        configured_weight = evidence.criterion_weights[target_index]
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
                    "reason": "zero_effective_weight",
                    "points": [],
                    "summary": None,
                }
            )
            continue

        points: list[dict[str, Any]] = []
        for varied_weight in _sample_weights(configured_weight):
            weights = [0.0 for _ in evidence.criterion_weights]
            weights[target_index] = varied_weight
            for index, baseline_weight in enumerate(evidence.criterion_weights):
                if index == target_index:
                    continue
                weights[index] = (
                    (1.0 - varied_weight)
                    * baseline_weight
                    / complement_total
                )

            result = _semantic_result(
                evidence=evidence,
                matrix=evidence.collective_beta_matrix,
                weights=weights,
                directions=evidence.criterion_directions,
                scales=scales,
            )
            point = _point(
                evidence=evidence,
                baseline=baseline,
                varied_weight=varied_weight,
                configured_weights=[
                    {
                        "criterionId": evidence.criterion_ids[index],
                        "name": evidence.criterion_names[index],
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
            if abs(point["variedWeight"] - configured_weight)
            <= EVIDENCE_TOLERANCE
        ]
        if len(baseline_points) != 1:
            raise ValueError(
                "Criterion sensitivity must include exactly one configured baseline point"
            )
        _validate_baseline_point(evidence=evidence, point=baseline_points[0])

        items.append(
            {
                **identity,
                "available": True,
                "reason": None,
                "redistribution": {
                    "method": "proportional_preserve_other_weight_ratios",
                    "complementConfiguredWeight": complement_total,
                },
                "points": points,
                "summary": _item_summary(
                    points=points,
                    configured_weight=configured_weight,
                ),
            }
        )

    available_items = [item for item in items if item["available"]]
    return {
        "availability": availability(True),
        "items": items,
        "mostRankSensitive": _extreme_items(
            items=items,
            value_key="maximumObservedTotalAbsoluteRankChange",
            identity_keys=("criterionId", "name", "criterionIndex"),
        ),
        "mostClosenessSensitive": _extreme_items(
            items=items,
            value_key="maximumObservedMeanAbsoluteClosenessChange",
            identity_keys=("criterionId", "name", "criterionIndex"),
        ),
        "winnerStateChangingCriteria": [
            {
                "criterionId": item["criterionId"],
                "name": item["name"],
                "criterionIndex": item["criterionIndex"],
            }
            for item in available_items
            if item["summary"]["winnerStateChangedSampleCount"] > 0
        ],
    }


def _evaluator_weight_sensitivity(
    *,
    evidence: TopsisEvidence,
    context: dict[str, Any],
    baseline: dict[str, Any],
) -> dict[str, Any]:
    alternative_count = len(evidence.alternative_ids)
    experts = extract_expert_profiles(evidence=evidence, context=context)

    if alternative_count == 1:
        return {
            "availability": availability(False, "single_alternative"),
            "items": [],
        }
    if len(experts) == 1:
        return {
            "availability": availability(False, "single_evaluator"),
            "items": [],
        }

    scales = _criterion_scales(evidence)
    items: list[dict[str, Any]] = []

    for target_index, target in enumerate(experts):
        configured_weight = target["configuredWeight"]
        complement_total = sum(
            expert["configuredWeight"]
            for index, expert in enumerate(experts)
            if index != target_index
        )
        identity = {
            "expertIndex": target["expertIndex"],
            "expertKey": target["expertKey"],
            "expertId": target["expertId"],
            "name": target["name"],
            "email": target["email"],
            "configuredWeight": configured_weight,
        }

        if complement_total <= EVIDENCE_TOLERANCE:
            items.append(
                {
                    **identity,
                    "available": False,
                    "reason": "zero_effective_weight",
                    "points": [],
                    "summary": None,
                }
            )
            continue

        points: list[dict[str, Any]] = []
        for varied_weight in _sample_weights(configured_weight):
            weights = [0.0 for _ in experts]
            weights[target_index] = varied_weight
            for index, expert in enumerate(experts):
                if index == target_index:
                    continue
                weights[index] = (
                    (1.0 - varied_weight)
                    * expert["configuredWeight"]
                    / complement_total
                )

            matrix = [
                [
                    sum(
                        weights[expert_index]
                        * expert["betaMatrix"][alternative_index][criterion_index]
                        for expert_index, expert in enumerate(experts)
                    )
                    for criterion_index in range(len(evidence.criterion_ids))
                ]
                for alternative_index in range(len(evidence.alternative_ids))
            ]
            result = _semantic_result(
                evidence=evidence,
                matrix=matrix,
                weights=evidence.criterion_weights,
                directions=evidence.criterion_directions,
                scales=scales,
            )
            point = _point(
                evidence=evidence,
                baseline=baseline,
                varied_weight=varied_weight,
                configured_weights=[
                    {
                        "expertIndex": expert["expertIndex"],
                        "expertKey": expert["expertKey"],
                        "expertId": expert["expertId"],
                        "name": expert["name"],
                        "weight": weights[index],
                    }
                    for index, expert in enumerate(experts)
                ],
                result=result,
            )
            points.append(point)

        baseline_points = [
            point
            for point in points
            if abs(point["variedWeight"] - configured_weight)
            <= EVIDENCE_TOLERANCE
        ]
        if len(baseline_points) != 1:
            raise ValueError(
                "Evaluator sensitivity must include exactly one configured baseline point"
            )
        _validate_baseline_point(evidence=evidence, point=baseline_points[0])

        items.append(
            {
                **identity,
                "available": True,
                "reason": None,
                "redistribution": {
                    "method": "proportional_preserve_other_weight_ratios",
                    "complementConfiguredWeight": complement_total,
                },
                "points": points,
                "summary": _item_summary(
                    points=points,
                    configured_weight=configured_weight,
                ),
            }
        )

    available_items = [item for item in items if item["available"]]
    return {
        "availability": availability(True),
        "items": items,
        "mostRankSensitive": _extreme_items(
            items=items,
            value_key="maximumObservedTotalAbsoluteRankChange",
            identity_keys=(
                "expertIndex",
                "expertKey",
                "expertId",
                "name",
            ),
        ),
        "mostClosenessSensitive": _extreme_items(
            items=items,
            value_key="maximumObservedMeanAbsoluteClosenessChange",
            identity_keys=(
                "expertIndex",
                "expertKey",
                "expertId",
                "name",
            ),
        ),
        "winnerStateChangingEvaluators": [
            {
                "expertIndex": item["expertIndex"],
                "expertKey": item["expertKey"],
                "expertId": item["expertId"],
                "name": item["name"],
            }
            for item in available_items
            if item["summary"]["winnerStateChangedSampleCount"] > 0
        ],
    }


def build_sensitivity_facts(
    evidence: TopsisEvidence,
    context: dict[str, Any],
) -> dict[str, Any]:
    baseline = _baseline_result(evidence)
    return {
        "method": {
            "kind": "sampled_counterfactual_diagnostic",
            "range": {"minimum": 0.0, "maximum": 1.0},
            "step": SENSITIVITY_STEP,
            "sampling": "fixed_grid_plus_exact_configured_weight",
            "redistribution": (
                "When one weight is varied, the remaining weight mass is "
                "distributed proportionally across the other configured weights, "
                "preserving their relative ratios."
            ),
            "transitionPrecision": (
                "Transitions identify intervals between sampled weights; they are "
                "not claimed to be exact mathematical breakpoints."
            ),
        },
        "capabilities": {
            "criterionWeightSensitivity": (
                availability(False, "single_alternative")
                if len(evidence.alternative_ids) == 1
                else (
                    availability(False, "single_criterion")
                    if len(evidence.criterion_ids) == 1
                    else availability(True)
                )
            ),
            "evaluatorWeightSensitivity": (
                availability(False, "single_alternative")
                if len(evidence.alternative_ids) == 1
                else (
                    availability(False, "single_evaluator")
                    if len(evidence.expert_keys) == 1
                    else availability(True)
                )
            ),
        },
        "criterionWeights": _criterion_weight_sensitivity(
            evidence=evidence,
            baseline=baseline,
        ),
        "evaluatorWeights": _evaluator_weight_sensitivity(
            evidence=evidence,
            context=context,
            baseline=baseline,
        ),
    }
