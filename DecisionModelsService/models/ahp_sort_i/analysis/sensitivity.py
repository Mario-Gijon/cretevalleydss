"""Sampled criterion-weight sensitivity using the AHPSort I mathematical core."""

from __future__ import annotations

import math
from typing import Any

from ..group import aggregate_category_votes
from ..run import (
    AHPSortIProfileOrderError,
    run_ahp_sort_i_central_profiles,
    run_ahp_sort_i_multiple_profiles,
)
from .evidence import AHPSortIEvidence, NUMERIC_TOLERANCE


SENSITIVITY_STEP = 0.05


def _sample_weights(configured_weight: float) -> list[float]:
    values = [round(index * SENSITIVITY_STEP, 12) for index in range(21)]
    values.append(float(configured_weight))
    return sorted(set(values))


def _scenario_weights(
    evidence: AHPSortIEvidence,
    criterion_id: str,
    varied_weight: float,
) -> tuple[dict[str, float] | None, str | None]:
    configured = evidence.criterion_weights_by_id
    original_weight = configured[criterion_id]
    if varied_weight == original_weight:
        return dict(configured), None

    complement = math.fsum(
        weight for other_id, weight in configured.items() if other_id != criterion_id
    )
    if complement == 0.0:
        return None, "proportional_redistribution_impossible_zero_complement"

    weights = {criterion_id: float(varied_weight)}
    for other_id, original_weight in configured.items():
        if other_id == criterion_id:
            continue
        weights[other_id] = (1.0 - varied_weight) * original_weight / complement
    return weights, None


def _core_entities(
    evidence: AHPSortIEvidence,
) -> tuple[list[dict[str, str]], list[dict[str, str]], list[dict[str, str]]]:
    criteria = [
        {"id": item["criterionId"], "name": item["name"]}
        for item in evidence.criteria
    ]
    categories = [
        {"id": item["categoryId"], "name": item["label"]}
        for item in evidence.categories
    ]
    alternatives = [
        {"id": item["alternativeId"], "name": item["name"]}
        for item in evidence.alternatives
    ]
    return criteria, categories, alternatives


def _run_expert(
    evidence: AHPSortIEvidence,
    expert: dict[str, Any],
    weights: dict[str, float],
) -> dict[str, Any]:
    criteria, categories, alternatives = _core_entities(evidence)
    common = {
        "criteria": criteria,
        "categories": categories,
        "alternatives": alternatives,
        "criterion_weights_by_id": weights,
        "comparisons": expert["alternativeProfileComparisons"],
        "profile_comparisons": expert["profileComparisons"],
    }
    if evidence.profile_mode == "limiting":
        return run_ahp_sort_i_multiple_profiles(
            **common,
            limiting_profiles=evidence.profiles,
        )
    return run_ahp_sort_i_central_profiles(
        **common,
        central_profiles=evidence.profiles,
        tie_policy=evidence.profile_tie_policy,
    )


def _baseline_individual_results(
    evidence: AHPSortIEvidence,
) -> dict[str, dict[str, Any]]:
    diagnostics = evidence.baseline_result["diagnostics"]
    collective = diagnostics.get("individualResultsByExpertId")
    if isinstance(collective, dict):
        return collective
    if len(evidence.experts) != 1:
        raise ValueError("AHPSort I collective baseline is missing individual results")
    return {evidence.experts[0]["expertId"]: diagnostics}


def _numeric_equal(actual: Any, expected: Any) -> bool:
    return (
        not isinstance(actual, bool)
        and isinstance(actual, (int, float))
        and math.isfinite(float(actual))
        and math.isclose(
            float(actual),
            float(expected),
            rel_tol=NUMERIC_TOLERANCE,
            abs_tol=NUMERIC_TOLERANCE,
        )
    )


def _numeric_mapping_equal(actual: Any, expected: Any) -> bool:
    return (
        isinstance(actual, dict)
        and isinstance(expected, dict)
        and actual.keys() == expected.keys()
        and all(_numeric_equal(actual[key], expected[key]) for key in expected)
    )


def _validate_original_sample(
    *,
    evidence: AHPSortIEvidence,
    expert_results: list[dict[str, Any]],
    collective: dict[str, Any] | None,
) -> dict[str, bool]:
    baseline_by_expert = _baseline_individual_results(evidence)
    assignments_match = True
    priorities_match = True
    profiles_match = True
    central_classification_match = True
    assignment_rules_match = True

    for expert_result in expert_results:
        expert_id = expert_result["expertId"]
        baseline_alternatives = baseline_by_expert[expert_id]["resultsByAlternativeId"]
        for alternative_id, result in expert_result["alternativesById"].items():
            baseline = baseline_alternatives[alternative_id]
            assignments_match &= result["categoryId"] == baseline["categoryId"]
            priorities_match &= _numeric_equal(
                result["globalPriority"], baseline["globalPriority"]
            )
            profiles_match &= _numeric_mapping_equal(
                result["profilePrioritiesById"],
                baseline["profileGlobalPrioritiesById"],
            )
            assignment_rules_match &= (
                result["classification"]["rule"] == baseline["classification"]["rule"]
            )
            if evidence.profile_mode == "central":
                classification = result["classification"]
                stored = baseline["classification"]
                central_classification_match &= (
                    classification["selectedCenterProfileId"]
                    == stored["selectedCenterProfileId"]
                    and classification["tieDetected"] == stored["tieDetected"]
                    and classification["tiedCenterProfileIds"]
                    == stored["tiedCenterProfileIds"]
                    and classification["tiePolicy"] == stored["tiePolicy"]
                    and _numeric_equal(
                        classification["distanceToSelectedCenter"],
                        stored["distanceToSelectedCenter"],
                    )
                    and _numeric_mapping_equal(
                        classification["centerDistancesByProfileId"],
                        stored["centerDistancesByProfileId"],
                    )
                )

    collective_matches = None
    if len(evidence.experts) > 1:
        baseline_diagnostics = evidence.baseline_result["diagnostics"]
        collective_matches = (
            collective is not None
            and collective["assignmentsByAlternativeId"]
            == evidence.executed_assignments
            and collective["resultsByAlternativeId"]
            == baseline_diagnostics["resultsByAlternativeId"]
            and baseline_diagnostics["aggregationMethod"]
            == "unweighted_plurality_vote"
            and baseline_diagnostics["groupTiePolicy"] == evidence.group_tie_policy
        )

    checks = {
        "individualAssignmentsMatch": assignments_match,
        "alternativePrioritiesMatch": priorities_match,
        "alternativeSpecificProfilePrioritiesMatch": profiles_match,
        "assignmentRulesMatch": assignment_rules_match,
        "centralProfileTieResultsMatch": (
            central_classification_match if evidence.profile_mode == "central" else None
        ),
        "collectiveVotesMatch": collective_matches,
    }
    if any(value is False for value in checks.values()):
        raise ValueError(
            "The exact configured-weight sensitivity sample does not reproduce "
            "the validated AHPSort I baseline"
        )
    return checks


def _local_priorities(assignment: dict[str, Any]) -> dict[str, Any]:
    result = {}
    for criterion_id, criterion in assignment["localPrioritiesByCriterion"].items():
        profiles = criterion.get("profilesById") or criterion.get("centralProfilesById")
        result[criterion_id] = {
            "alternative": criterion["alternative"],
            "profilesById": dict(profiles),
        }
    return result


def _expert_result(
    *,
    evidence: AHPSortIEvidence,
    expert: dict[str, Any],
    core_result: dict[str, Any],
    baseline_results: dict[str, dict[str, Any]],
) -> dict[str, Any]:
    categories_by_id = {item["categoryId"]: item for item in evidence.categories}
    alternatives_by_id = {
        item["alternativeId"]: item for item in evidence.alternatives
    }
    results_by_id = {}
    baseline_alternatives = baseline_results["resultsByAlternativeId"]
    for alternative_id, assignment in core_result["resultsByAlternative"].items():
        category = categories_by_id[assignment["categoryId"]]
        baseline_category_id = baseline_alternatives[alternative_id]["categoryId"]
        profile_priorities = (
            assignment.get("profileGlobalPrioritiesById")
            or assignment.get("centralProfilePrioritiesById")
        )
        classification = {"rule": assignment["assignmentRule"]}
        if evidence.profile_mode == "central":
            for key in (
                "selectedCenterProfileId",
                "distanceToSelectedCenter",
                "centerDistancesByProfileId",
                "tieDetected",
                "tiedCenterProfileIds",
                "tiePolicy",
            ):
                classification[key] = assignment[key]

        results_by_id[alternative_id] = {
            "alternativeId": alternative_id,
            "alternativeName": alternatives_by_id[alternative_id]["name"],
            "categoryId": assignment["categoryId"],
            "category": category["label"],
            "globalPriority": assignment["globalPriority"],
            "profilePrioritiesById": dict(profile_priorities),
            "localPrioritiesByCriterion": _local_priorities(assignment),
            "classification": classification,
            "changedFromBaseline": assignment["categoryId"] != baseline_category_id,
            "baselineCategoryId": baseline_category_id,
        }
    return {
        "expertId": expert["expertId"],
        **({"expertName": expert["name"]} if expert.get("name") else {}),
        "available": True,
        "reason": None,
        "alternativesById": results_by_id,
    }


def _category_change(
    *,
    alternative_id: str,
    from_category_id: str,
    to_category_id: str,
    categories_by_id: dict[str, dict[str, Any]],
    alternatives_by_id: dict[str, dict[str, Any]],
    expert_id: str | None = None,
) -> dict[str, Any]:
    return {
        **({"expertId": expert_id} if expert_id is not None else {}),
        "alternativeId": alternative_id,
        "alternativeName": alternatives_by_id[alternative_id]["name"],
        "fromCategoryId": from_category_id,
        "fromCategory": categories_by_id[from_category_id]["label"],
        "toCategoryId": to_category_id,
        "toCategory": categories_by_id[to_category_id]["label"],
    }


def _changes_from_baseline(
    *,
    evidence: AHPSortIEvidence,
    expert_results: list[dict[str, Any]],
    collective: dict[str, Any] | None,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    categories_by_id = {item["categoryId"]: item for item in evidence.categories}
    alternatives_by_id = {
        item["alternativeId"]: item for item in evidence.alternatives
    }
    individual_changes = []
    for expert_result in expert_results:
        for alternative_id, result in expert_result["alternativesById"].items():
            if result["changedFromBaseline"]:
                individual_changes.append(
                    _category_change(
                        alternative_id=alternative_id,
                        from_category_id=result["baselineCategoryId"],
                        to_category_id=result["categoryId"],
                        categories_by_id=categories_by_id,
                        alternatives_by_id=alternatives_by_id,
                        expert_id=expert_result["expertId"],
                    )
                )

    collective_changes = []
    if collective is not None:
        for alternative_id, category_id in collective["assignmentsByAlternativeId"].items():
            baseline_category_id = evidence.executed_assignments[alternative_id]
            if category_id != baseline_category_id:
                collective_changes.append(
                    _category_change(
                        alternative_id=alternative_id,
                        from_category_id=baseline_category_id,
                        to_category_id=category_id,
                        categories_by_id=categories_by_id,
                        alternatives_by_id=alternatives_by_id,
                    )
                )
    return individual_changes, collective_changes


def _collective_classification(
    evidence: AHPSortIEvidence,
    expert_results: list[dict[str, Any]],
) -> dict[str, Any] | None:
    if len(evidence.experts) == 1:
        return None
    category_by_expert_and_alternative = {
        expert_result["expertId"]: {
            alternative_id: result["categoryId"]
            for alternative_id, result in expert_result["alternativesById"].items()
        }
        for expert_result in expert_results
    }
    assignments, diagnostics = aggregate_category_votes(
        categories=evidence.categories,
        alternatives=[
            {"id": item["alternativeId"], "name": item["name"]}
            for item in evidence.alternatives
        ],
        category_by_expert_and_alternative=category_by_expert_and_alternative,
        tie_policy=evidence.group_tie_policy,
    )
    return {
        "aggregationMethod": "unweighted_plurality_vote",
        "groupTiePolicy": evidence.group_tie_policy,
        "assignmentsByAlternativeId": {
            item["alternativeId"]: item["categoryId"] for item in assignments
        },
        "resultsByAlternativeId": diagnostics,
    }


def _unavailable_point(
    *,
    varied_weight: float,
    reason: str,
    criterion_weights: dict[str, float] | None,
    expert_results: list[dict[str, Any]] | None = None,
    error_details: Any = None,
) -> dict[str, Any]:
    return {
        "variedWeight": varied_weight,
        "criterionWeights": criterion_weights,
        "available": False,
        "reason": reason,
        "errorDetails": error_details,
        "expertResults": expert_results or [],
        "collectiveClassification": None,
        "individualChanges": [],
        "collectiveChanges": [],
        "baselineComparison": None,
    }


def _evaluate_point(
    *,
    evidence: AHPSortIEvidence,
    criterion_id: str,
    varied_weight: float,
    baseline_by_expert: dict[str, dict[str, Any]],
) -> dict[str, Any]:
    weights, weight_error = _scenario_weights(evidence, criterion_id, varied_weight)
    if weight_error is not None:
        return _unavailable_point(
            varied_weight=varied_weight,
            reason=weight_error,
            criterion_weights=None,
        )

    weight_vector = [
        {"criterionId": item["criterionId"], "weight": weights[item["criterionId"]]}
        for item in evidence.criteria
    ]
    expert_results = []
    first_error = None
    for expert in evidence.experts:
        try:
            core_result = _run_expert(evidence, expert, weights)
        except AHPSortIProfileOrderError as error:
            first_error = first_error or ("profile_order_invalid", error.as_dict())
            expert_results.append(
                {
                    "expertId": expert["expertId"],
                    **({"expertName": expert["name"]} if expert.get("name") else {}),
                    "available": False,
                    "reason": "profile_order_invalid",
                    "errorDetails": error.as_dict(),
                    "alternativesById": None,
                }
            )
        except (KeyError, TypeError, ValueError) as error:
            first_error = first_error or ("invalid_scenario", str(error))
            expert_results.append(
                {
                    "expertId": expert["expertId"],
                    **({"expertName": expert["name"]} if expert.get("name") else {}),
                    "available": False,
                    "reason": "invalid_scenario",
                    "errorDetails": str(error),
                    "alternativesById": None,
                }
            )
        else:
            expert_results.append(
                _expert_result(
                    evidence=evidence,
                    expert=expert,
                    core_result=core_result,
                    baseline_results=baseline_by_expert[expert["expertId"]],
                )
            )

    if first_error is not None:
        reason, error_details = first_error
        return _unavailable_point(
            varied_weight=varied_weight,
            reason=reason,
            criterion_weights=weight_vector,
            expert_results=expert_results,
            error_details=error_details,
        )

    collective = _collective_classification(evidence, expert_results)
    individual_changes, collective_changes = _changes_from_baseline(
        evidence=evidence,
        expert_results=expert_results,
        collective=collective,
    )
    baseline_comparison = None
    if varied_weight == evidence.criterion_weights_by_id[criterion_id]:
        baseline_comparison = _validate_original_sample(
            evidence=evidence,
            expert_results=expert_results,
            collective=collective,
        )

    return {
        "variedWeight": varied_weight,
        "criterionWeights": weight_vector,
        "available": True,
        "reason": None,
        "expertResults": expert_results,
        "collectiveClassification": collective,
        "individualChanges": individual_changes,
        "collectiveChanges": collective_changes,
        "baselineComparison": baseline_comparison,
    }


def _group_changes(
    points: list[dict[str, Any]],
    *,
    change_key: str,
    identity_keys: tuple[str, ...],
    configured_weight: float,
) -> list[dict[str, Any]]:
    grouped: dict[tuple[Any, ...], dict[str, Any]] = {}
    for point in points:
        for change in point[change_key]:
            identity = tuple(change.get(key) for key in identity_keys)
            record = grouped.setdefault(
                identity,
                {
                    **{key: change.get(key) for key in identity_keys},
                    "observedSampleCount": 0,
                    "samples": [],
                },
            )
            record["observedSampleCount"] += 1
            record["samples"].append(
                {
                    "variedWeight": point["variedWeight"],
                    "weightDifferenceFromConfigured": (
                        point["variedWeight"] - configured_weight
                    ),
                    "fromCategoryId": change["fromCategoryId"],
                    "toCategoryId": change["toCategoryId"],
                }
            )
    return list(grouped.values())


def _nearest_observed_change(
    points: list[dict[str, Any]], configured_weight: float
) -> dict[str, Any] | None:
    changed_points = [
        point
        for point in points
        if point["individualChanges"] or point["collectiveChanges"]
    ]
    if not changed_points:
        return None
    minimum = min(abs(point["variedWeight"] - configured_weight) for point in changed_points)
    nearest = [
        point
        for point in changed_points
        if abs(abs(point["variedWeight"] - configured_weight) - minimum)
        <= NUMERIC_TOLERANCE
    ]
    return {
        "absoluteWeightDifference": minimum,
        "points": [
            {
                "variedWeight": point["variedWeight"],
                "weightDifferenceFromConfigured": (
                    point["variedWeight"] - configured_weight
                ),
                "individualChanges": point["individualChanges"],
                "collectiveChanges": point["collectiveChanges"],
            }
            for point in nearest
        ],
    }


def _item_summary(
    points: list[dict[str, Any]], configured_weight: float
) -> dict[str, Any]:
    valid_points = [point for point in points if point["available"]]
    invalid_points = [point for point in points if not point["available"]]
    individual_changes = _group_changes(
        valid_points,
        change_key="individualChanges",
        identity_keys=("expertId", "alternativeId", "alternativeName"),
        configured_weight=configured_weight,
    )
    collective_changes = _group_changes(
        valid_points,
        change_key="collectiveChanges",
        identity_keys=("alternativeId", "alternativeName"),
        configured_weight=configured_weight,
    )
    has_collective = any(
        point["collectiveClassification"] is not None for point in valid_points
    )
    any_changes = any(
        point["individualChanges"] or point["collectiveChanges"]
        for point in valid_points
    )
    return {
        "sampleCount": len(points),
        "validSampleCount": len(valid_points),
        "invalidSampleCount": len(invalid_points),
        "individualChangedSampleCount": sum(
            bool(point["individualChanges"]) for point in valid_points
        ),
        "collectiveChangedSampleCount": sum(
            bool(point["collectiveChanges"]) for point in valid_points
        ),
        "alternativesWithObservedIndividualChanges": individual_changes,
        "alternativesWithObservedCollectiveChanges": collective_changes,
        "nearestObservedChange": _nearest_observed_change(
            valid_points, configured_weight
        ),
        "noChangesObserved": (not any_changes) if len(valid_points) >= 2 else None,
        "collectiveClassificationAnalyzed": has_collective,
        "unavailableReasons": {
            reason: sum(point["reason"] == reason for point in invalid_points)
            for reason in sorted({point["reason"] for point in invalid_points})
        },
    }


def _single_criterion_facts(evidence: AHPSortIEvidence) -> dict[str, Any]:
    criterion = evidence.criteria[0]
    return {
        "profileMode": evidence.profile_mode,
        "aggregationMethod": (
            "unweighted_plurality_vote" if len(evidence.experts) > 1 else None
        ),
        "profileTiePolicy": evidence.profile_tie_policy,
        "groupTiePolicy": evidence.group_tie_policy,
        "availability": {"available": False, "reason": "single_criterion"},
        "method": {
            "kind": "sampled_counterfactual_diagnostic",
            "step": SENSITIVITY_STEP,
            "minimumWeight": 0.0,
            "maximumWeight": 1.0,
            "exactConfiguredWeightIncluded": True,
            "redistribution": "proportional_preserve_other_weight_ratios",
            "exactSwitchingThresholdsCalculated": False,
        },
        "items": [
            {
                "criterionId": criterion["criterionId"],
                "criterionName": criterion["name"],
                "criterionIndex": 0,
                "configuredWeight": criterion["weight"],
                "available": False,
                "reason": "single_criterion",
                "points": [],
                "summary": {
                    "sampleCount": 0,
                    "validSampleCount": 0,
                    "invalidSampleCount": 0,
                    "individualChangedSampleCount": 0,
                    "collectiveChangedSampleCount": 0,
                    "alternativesWithObservedIndividualChanges": [],
                    "alternativesWithObservedCollectiveChanges": [],
                    "nearestObservedChange": None,
                    "noChangesObserved": None,
                    "collectiveClassificationAnalyzed": False,
                    "unavailableReasons": {},
                },
            }
        ],
    }


def build_sensitivity_facts(evidence: AHPSortIEvidence) -> dict[str, Any]:
    """Recompute AHPSort I classifications across sampled criterion weights."""
    if len(evidence.criteria) == 1:
        return _single_criterion_facts(evidence)

    baseline_by_expert = _baseline_individual_results(evidence)
    items = []
    for criterion_index, criterion in enumerate(evidence.criteria):
        criterion_id = criterion["criterionId"]
        configured_weight = float(evidence.criterion_weights_by_id[criterion_id])
        points = [
            _evaluate_point(
                evidence=evidence,
                criterion_id=criterion_id,
                varied_weight=varied_weight,
                baseline_by_expert=baseline_by_expert,
            )
            for varied_weight in _sample_weights(configured_weight)
        ]
        valid_points = [point for point in points if point["available"]]
        item_available = bool(valid_points)
        items.append(
            {
                "criterionId": criterion_id,
                "criterionName": criterion["name"],
                "criterionIndex": criterion_index,
                "configuredWeight": configured_weight,
                "available": item_available,
                "reason": None if item_available else "no_valid_weight_samples",
                "redistribution": {
                    "method": "proportional_preserve_other_weight_ratios",
                    "complementConfiguredWeight": math.fsum(
                        weight
                        for other_id, weight in evidence.criterion_weights_by_id.items()
                        if other_id != criterion_id
                    ),
                },
                "points": points,
                "summary": _item_summary(points, configured_weight),
            }
        )

    available = any(item["available"] for item in items)
    return {
        "profileMode": evidence.profile_mode,
        "aggregationMethod": (
            "unweighted_plurality_vote" if len(evidence.experts) > 1 else None
        ),
        "profileTiePolicy": evidence.profile_tie_policy,
        "groupTiePolicy": evidence.group_tie_policy,
        "availability": {
            "available": available,
            "reason": None if available else "no_valid_weight_samples",
        },
        "method": {
            "kind": "sampled_counterfactual_diagnostic",
            "step": SENSITIVITY_STEP,
            "minimumWeight": 0.0,
            "maximumWeight": 1.0,
            "exactConfiguredWeightIncluded": True,
            "redistribution": "proportional_preserve_other_weight_ratios",
            "exactSwitchingThresholdsCalculated": False,
        },
        "items": items,
    }


__all__ = ["SENSITIVITY_STEP", "build_sensitivity_facts"]
