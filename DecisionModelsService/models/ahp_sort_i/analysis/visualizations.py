"""Visualization descriptors for validated AHPSort I analysis facts."""

from __future__ import annotations

import math
from typing import Any


def _name(item: dict[str, Any], key: str, fallback: str) -> str:
    value = item.get(key)
    return value.strip() if isinstance(value, str) and value.strip() else fallback


def _profile_labels(facts: dict[str, Any]) -> dict[str, str]:
    categories = {item["categoryId"]: item["label"] for item in facts["categories"]}
    labels = {}
    for index, profile in enumerate(facts["profiles"], start=1):
        profile_id = profile.get("profileId", f"profile-{index}")
        if facts["profileMode"] == "limiting":
            lower = categories.get(profile.get("lowerCategoryId"))
            upper = categories.get(profile.get("upperCategoryId"))
            label = f"{lower or 'Unknown'} / {upper or 'Unknown'} boundary"
        else:
            category = categories.get(profile.get("categoryId"))
            label = f"{category or 'Unknown'} central profile"
        labels[profile_id] = label
    return labels


def _individual_diagnostics(facts: dict[str, Any]) -> dict[str, dict[str, Any]]:
    return facts.get("individualResultsByExpertId") or {}


def _add_individual_priority_details(
    details: dict[str, Any],
    facts: dict[str, Any],
    result: dict[str, Any],
    *,
    include_classification: bool,
) -> None:
    """Add numeric values that belong to this one alternative/expert matrix."""
    details["Priority scope"] = (
        "These priorities belong only to this alternative and this expert's AHP matrix"
    )
    details["Alternative priority · this expert and alternative matrix"] = result.get(
        "globalPriority"
    )
    profile_labels = _profile_labels(facts)
    profile_priorities = (
        result.get("profileGlobalPrioritiesById")
        or result.get("profilePrioritiesById")
        or {}
    )
    for profile_id, priority in profile_priorities.items():
        details[f"Profile priority · {profile_labels.get(profile_id, profile_id)}"] = priority

    criteria = {item["criterionId"]: item["name"] for item in facts["criteria"]}
    for criterion_id, local in (result.get("localPrioritiesByCriterion") or {}).items():
        criterion_name = criteria.get(criterion_id, criterion_id)
        details[f"Local alternative priority · {criterion_name}"] = local.get("alternative")
        local_profiles = local.get("profilesById") or local.get("centralProfilesById") or {}
        for profile_id, priority in local_profiles.items():
            details[
                f"Local profile priority · {criterion_name} · "
                f"{profile_labels.get(profile_id, profile_id)}"
            ] = priority

    if include_classification and facts["profileMode"] == "central":
        classification = result.get("classification") or {}
        selected_id = classification.get("selectedCenterProfileId")
        details["Selected central profile"] = profile_labels.get(selected_id, selected_id)
        details["Distance to selected central profile"] = classification.get(
            "distanceToSelectedCenter"
        )
        details["Central profile tie detected"] = classification.get("tieDetected")
        tied_ids = classification.get("tiedCenterProfileIds") or []
        if tied_ids:
            details["Tied central profiles"] = ", ".join(
                profile_labels.get(profile_id, profile_id) for profile_id in tied_ids
            )
        details["Central profile tie policy"] = classification.get("tiePolicy")


def _original_classifications(facts: dict[str, Any]) -> dict[str, Any]:
    categories = sorted(facts["categories"], key=lambda item: item["order"])
    alternatives = facts["alternatives"]
    category_order = {
        item["categoryId"]: index for index, item in enumerate(categories)
    }
    category_labels = {
        item["categoryId"]: item["label"] for item in categories
    }
    individual = _individual_diagnostics(facts)
    multi_expert = len(facts["experts"]) > 1
    series = []
    lane_width = min(0.36, 0.72 / max(1, len(facts["experts"]) + int(multi_expert)))
    visible_series_count = len(facts["experts"]) + int(multi_expert)
    lane_offsets = [
        (index - (visible_series_count - 1) / 2) * lane_width
        for index in range(visible_series_count)
    ]

    for expert_index, expert in enumerate(facts["experts"]):
        expert_id = expert["expertId"]
        expert_name = _name(expert, "name", expert_id)
        results = (individual.get(expert_id) or {}).get("resultsByAlternativeId", {})
        points = []
        for alternative_index, alternative in enumerate(alternatives):
            alternative_id = alternative["alternativeId"]
            result = results.get(alternative_id)
            if not isinstance(result, dict):
                continue
            category_id = result.get("categoryId")
            if category_id not in category_order:
                continue
            details: dict[str, Any] = {
                "Classification": category_labels[category_id],
                "Expert": expert_name,
                "Alternative": alternative["name"],
            }
            _add_individual_priority_details(
                details,
                facts,
                result,
                include_classification=True,
            )
            points.append(
                {
                    "id": f"{expert_id}:{alternative_id}",
                    "label": f"{expert_name} · {alternative['name']}",
                    "x": category_order[category_id],
                    "y": alternative_index + lane_offsets[expert_index],
                    "categoryId": category_id,
                    "alternativeId": alternative_id,
                    "details": details,
                }
            )
        series.append(
            {
                "key": f"individual-{expert_id}",
                "label": f"Individual · {expert_name}",
                "role": "individual",
                "points": points,
            }
        )

    if multi_expert:
        collective_results = facts.get("collectiveResultsByAlternativeId") or {}
        points = []
        collective_index = len(facts["experts"])
        for alternative_index, alternative in enumerate(alternatives):
            alternative_id = alternative["alternativeId"]
            result = collective_results.get(alternative_id)
            if not isinstance(result, dict):
                continue
            category_id = result.get("categoryId") or result.get("selectedCategoryId")
            if category_id not in category_order:
                continue
            votes = result.get("votesByCategoryId") or {}
            classifications = result.get("classificationsByExpertId") or {}
            details = {
                "Classification": category_labels[category_id],
                "Result type": "Collective plurality vote",
                "Alternative": alternative["name"],
                "Aggregation": facts.get("aggregationMethod"),
                "Vote outcome": result.get("aggregationStatus"),
                "Tie detected": result.get("tieDetected"),
                "Tie policy": result.get("tiePolicy"),
            }
            for vote_category_id, count in votes.items():
                if vote_category_id in category_labels:
                    details[f"Votes · {category_labels[vote_category_id]}"] = count
            expert_names = {
                item["expertId"]: _name(item, "name", item["expertId"])
                for item in facts["experts"]
            }
            for expert_id, expert_category_id in classifications.items():
                details[f"Individual · {expert_names.get(expert_id, expert_id)}"] = (
                    category_labels.get(expert_category_id, expert_category_id)
                )
            points.append(
                {
                    "id": f"collective:{alternative_id}",
                    "label": f"Collective · {alternative['name']}",
                    "x": category_order[category_id],
                    "y": alternative_index + lane_offsets[collective_index],
                    "categoryId": category_id,
                    "alternativeId": alternative_id,
                    "details": details,
                }
            )
        series.append(
            {
                "key": "collective-classifications",
                "label": "Collective · plurality vote",
                "role": "collective",
                "pointStyle": "rectRot",
                "points": points,
            }
        )

    if not series:
        return {}
    return {
        "key": "ahp-sort-i-original-classifications",
        "type": "scatter",
        "title": "AHPSort I classifications",
        "description": (
            "Each marker shows an alternative's assigned category. Individual results "
            "are separated by expert; collective results show only the plurality-vote "
            "category. Small vertical offsets separate markers and carry no model meaning."
        ),
        "insight": (
            "Hover individual markers for priorities from that alternative and expert's "
            "own AHP matrix. Collective markers show category votes and tie handling; "
            "AHPSort I does not calculate a collective numeric priority."
        ),
        "presentation": {
            "stableSeriesColors": True,
            "tooltip": {"variant": "point-details"},
            "pointStyleLegend": True,
        },
        "xAxis": {
            "label": "Assigned category · lower to higher preference",
            "min": -0.5,
            "max": max(0.5, len(categories) - 0.5),
            "scaleType": "linear",
            "categories": [
                {"value": index, "label": item["label"]}
                for index, item in enumerate(categories)
            ],
        },
        "yAxis": {
            "label": "Alternative",
            "min": -0.5,
            "max": max(0.5, len(alternatives) - 0.5),
            "scaleType": "linear",
            "categories": [
                {"value": index, "label": item["name"]}
                for index, item in enumerate(alternatives)
            ],
        },
        "data": {"series": series},
    }


def _weight_details(
    facts: dict[str, Any],
    point: dict[str, Any],
    *,
    category: str | None,
    changed: bool | None,
    unavailable_reason: str | None,
) -> dict[str, Any]:
    details: dict[str, Any] = {
        "Varied weight": point.get("variedWeight"),
        "Assigned category": category,
        "Changed from original": (
            "Yes" if changed is True else "No" if changed is False else None
        ),
        "Unavailable reason": unavailable_reason,
    }
    criterion_names = {item["criterionId"]: item["name"] for item in facts["criteria"]}
    for weight in point.get("criterionWeights") or []:
        criterion_id = weight.get("criterionId")
        if criterion_id in criterion_names:
            details[f"Effective weight · {criterion_names[criterion_id]}"] = weight.get(
                "weight"
            )
    return details


def _baseline_match(point: dict[str, Any], *, collective: bool) -> bool | None:
    comparison = point.get("baselineComparison")
    if not isinstance(comparison, dict):
        return None
    keys = (
        ("collectiveVotesMatch",)
        if collective
        else (
            "individualAssignmentsMatch",
            "alternativePrioritiesMatch",
            "alternativeSpecificProfilePrioritiesMatch",
            "assignmentRulesMatch",
            "centralProfileTieResultsMatch",
        )
    )
    values = [comparison.get(key) for key in keys if comparison.get(key) is not None]
    return all(value is True for value in values) if values else None


def _sensitivity_series_details(
    facts: dict[str, Any],
    result: dict[str, Any],
    *,
    details: dict[str, Any],
) -> None:
    _add_individual_priority_details(
        details,
        facts,
        result,
        include_classification=True,
    )


def _is_finite_number(value: Any) -> bool:
    if not isinstance(value, (int, float)) or isinstance(value, bool):
        return False
    try:
        return math.isfinite(value)
    except OverflowError:
        return False


def _available_sensitivity_result(
    point: dict[str, Any], expert_id: str, alternative_id: str
) -> tuple[dict[str, Any] | None, str | None]:
    if point.get("available") is not True:
        return None, point.get("reason") or "sample_unavailable"
    expert_result = next(
        (
            candidate
            for candidate in point.get("expertResults", [])
            if candidate.get("expertId") == expert_id
        ),
        None,
    )
    if expert_result is None or expert_result.get("available") is not True:
        return None, (expert_result or {}).get("reason") or "expert_result_unavailable"
    result = (expert_result.get("alternativesById") or {}).get(alternative_id)
    return (result, None) if isinstance(result, dict) else (None, "alternative_result_unavailable")


def _priority_sensitivity_visualization(
    facts: dict[str, Any], item: dict[str, Any], points: list[dict[str, Any]]
) -> dict[str, Any]:
    experts = {
        expert["expertId"]: _name(expert, "name", expert["expertId"])
        for expert in facts["experts"]
    }
    alternatives = {alt["alternativeId"]: alt for alt in facts["alternatives"]}
    profile_labels = _profile_labels(facts)
    categories = {category["categoryId"]: category["label"] for category in facts["categories"]}
    series = []

    for expert_id, expert_name in experts.items():
        for alternative_id, alternative in alternatives.items():
            values = []
            for point in points:
                result, unavailable_reason = _available_sensitivity_result(
                    point, expert_id, alternative_id
                )
                priority = (result or {}).get("globalPriority")
                category_id = (result or {}).get("categoryId")
                available = (
                    _is_finite_number(priority)
                    and categories.get(category_id) is not None
                )
                details = _weight_details(
                    facts,
                    point,
                    category=categories.get(category_id) if available else None,
                    changed=(result.get("changedFromBaseline") if available else None),
                    unavailable_reason=(
                        unavailable_reason
                        or (None if available else "alternative_priority_unavailable")
                    ),
                )
                if result is not None:
                    _sensitivity_series_details(facts, result, details=details)
                    if point.get("baselineComparison") is not None:
                        details["Original-weight result matches validated baseline"] = (
                            _baseline_match(point, collective=False)
                        )
                values.append(
                    {
                        "x": point["variedWeight"],
                        "y": priority if available else None,
                        "label": f"{expert_name} · {alternative['name']}",
                        "category": categories.get(category_id) if available else None,
                        "alternativeId": alternative_id,
                        "expertId": expert_id,
                        "details": details,
                        "isConfiguredWeight": point["variedWeight"]
                        == item.get("configuredWeight"),
                    }
                )
            series.append(
                {
                    "key": f"alternative:{expert_id}:{alternative_id}",
                    "label": f"Alternative · {alternative['name']} · {expert_name}",
                    "role": "alternative",
                    "resultType": "individual",
                    "alternativeId": alternative_id,
                    "alternativeName": alternative["name"],
                    "expertId": expert_id,
                    "expertName": expert_name,
                    "values": values,
                    "style": {"borderWidth": 3, "pointRadius": 2.5},
                }
            )

            for profile_id, profile_label in profile_labels.items():
                profile_values = []
                for point in points:
                    result, unavailable_reason = _available_sensitivity_result(
                        point, expert_id, alternative_id
                    )
                    profile_priority = ((result or {}).get("profilePrioritiesById") or {}).get(profile_id)
                    category_id = (result or {}).get("categoryId")
                    available = (
                        result is not None
                        and _is_finite_number(profile_priority)
                        and categories.get(category_id) is not None
                    )
                    details = _weight_details(
                        facts,
                        point,
                        category=categories.get(category_id) if available else None,
                        changed=(result.get("changedFromBaseline") if available else None),
                        unavailable_reason=(
                            unavailable_reason
                            or (None if available else "profile_priority_unavailable")
                        ),
                    )
                    details.update(
                        {
                            "Alternative": alternative["name"],
                            "Expert": expert_name,
                            "Profile": profile_label,
                            "Alternative priority · same matrix": (
                                (result or {}).get("globalPriority") if result else None
                            ),
                            "Profile priority · same matrix": (
                                profile_priority if available else None
                            ),
                        }
                    )
                    profile_values.append(
                        {
                            "x": point["variedWeight"],
                            "y": profile_priority if available else None,
                            "label": f"{expert_name} · {alternative['name']} · {profile_label}",
                            "category": categories.get(category_id) if available else None,
                            "alternativeId": alternative_id,
                            "expertId": expert_id,
                            "profileId": profile_id,
                            "details": details,
                            "isConfiguredWeight": point["variedWeight"]
                            == item.get("configuredWeight"),
                        }
                    )
                series.append(
                    {
                        "key": f"profile:{expert_id}:{alternative_id}:{profile_id}",
                        "label": f"{profile_label} · {alternative['name']} · {expert_name}",
                        "role": "boundary",
                        "resultType": "individual-profile",
                        "alternativeId": alternative_id,
                        "alternativeName": alternative["name"],
                        "expertId": expert_id,
                        "expertName": expert_name,
                        "profileId": profile_id,
                        "profileName": profile_label,
                        "values": profile_values,
                        "style": {"borderDash": [6, 4], "borderWidth": 1.8, "opacity": 0.9},
                    }
                )

    if not series:
        return {}
    configured_point = next(
        (point for point in points if point.get("variedWeight") == item.get("configuredWeight")),
        None,
    )
    return {
        "key": f"ahp-sort-i-criterion-priority-sensitivity-{item['criterionId']}",
        "type": "line",
        "title": f"AHP priorities · {item['criterionName']}",
        "description": (
            "Priorities are recalculated for one selected alternative–expert AHP matrix. "
            "Profile curves belong to that same matrix; compare them only with the selected alternative. "
            "Invalid samples appear as gaps."
        ),
        "insight": (
            "The curves show the selected alternative's global priority and its own profile priorities. "
            "They are not shared thresholds across alternatives or experts."
        ),
        "scope": {
            "dimension": "criterion",
            "id": item["criterionId"],
            "label": item["criterionName"],
            "order": item.get("criterionIndex", 0),
        },
        "xAxis": {"label": "Varied criterion weight", "min": 0, "max": 1, "scaleType": "linear"},
        "yAxis": {"label": "AHP priority · selected alternative–expert matrix", "scaleType": "linear"},
        "data": {
            "xScaleType": "linear",
            "x": [point["variedWeight"] for point in points],
            "configuredWeight": item.get("configuredWeight"),
            "originalWeightBaselineComparison": (
                configured_point.get("baselineComparison") if configured_point else None
            ),
            "unavailableSamples": [
                {"weight": point.get("variedWeight"), "reason": point.get("reason")}
                for point in points if point.get("available") is not True
            ],
            "series": series,
        },
        "presentation": {
            "chartHeight": {"xs": 440, "sm": 520, "md": 600},
            "stableSeriesColors": True,
            "compactLegend": True,
            "profileLegendTitle": (
                "LIMITING PROFILES" if facts["profileMode"] == "limiting" else "CENTRAL PROFILES"
            ),
            "profileLegendItemTitle": (
                "Limiting profile" if facts["profileMode"] == "limiting" else "Central profile"
            ),
            "originalWeightMarker": True,
            "originalWeightLabel": "Original criterion weight",
            "originalWeightAriaLabel": "Original criterion weight",
            "alternativeSelector": {"recommendedCount": 1, "selectionMode": "single"},
            "expertSelector": {"selectionMode": "single"},
        },
    }


def _collective_category_sensitivity_visualization(
    facts: dict[str, Any], item: dict[str, Any], points: list[dict[str, Any]]
) -> dict[str, Any] | None:
    if len(facts["experts"]) < 2:
        return None
    categories = sorted(facts["categories"], key=lambda category: category["order"])
    category_order = {category["categoryId"]: index for index, category in enumerate(categories)}
    category_labels = {category["categoryId"]: category["label"] for category in categories}
    series = []
    for alternative in facts["alternatives"]:
        alternative_id = alternative["alternativeId"]
        values = []
        for point in points:
            collective = point.get("collectiveClassification") or {}
            category_id = (
                (collective.get("assignmentsByAlternativeId") or {}).get(alternative_id)
                if point.get("available") is True else None
            )
            available = category_id in category_order
            aggregate = (collective.get("resultsByAlternativeId") or {}).get(alternative_id, {})
            details = _weight_details(
                facts,
                point,
                category=category_labels.get(category_id) if available else None,
                changed=(
                    category_id != facts["executedAssignments"].get(alternative_id)
                    if available else None
                ),
                unavailable_reason=(
                    None if available else point.get("reason") or "collective_classification_unavailable"
                ),
            )
            if available:
                details.update(
                    {
                        "Result type": "Collective plurality vote",
                        "Vote outcome": aggregate.get("aggregationStatus"),
                        "Tie detected": aggregate.get("tieDetected"),
                        "Tie policy": aggregate.get("tiePolicy"),
                    }
                )
                for category_id_for_votes, count in (aggregate.get("votesByCategoryId") or {}).items():
                    if category_id_for_votes in category_labels:
                        details[f"Votes · {category_labels[category_id_for_votes]}"] = count
                expert_names = {
                    expert["expertId"]: _name(expert, "name", expert["expertId"])
                    for expert in facts["experts"]
                }
                for expert_id, expert_category_id in (aggregate.get("classificationsByExpertId") or {}).items():
                    details[f"Individual vote · {expert_names.get(expert_id, expert_id)}"] = category_labels.get(
                        expert_category_id, expert_category_id
                    )
                configured = point.get("baselineComparison")
                if configured is not None:
                    details["Original-weight result matches validated baseline"] = _baseline_match(
                        point, collective=True
                    )
            values.append(
                {
                    "x": point["variedWeight"],
                    "y": category_order[category_id] if available else None,
                    "label": f"Collective · {alternative['name']}",
                    "category": category_labels.get(category_id) if available else None,
                    "alternativeId": alternative_id,
                    "details": details,
                    "isConfiguredWeight": point["variedWeight"] == item.get("configuredWeight"),
                }
            )
        series.append(
            {
                "key": f"collective:{alternative_id}",
                "label": f"Collective · {alternative['name']}",
                "role": "collective",
                "resultType": "collective",
                "alternativeId": alternative_id,
                "alternativeName": alternative["name"],
                "values": values,
                "style": {"stepped": "after", "borderDash": [7, 4], "highlightConfiguredWeight": True},
            }
        )
    configured_point = next(
        (point for point in points if point.get("variedWeight") == item.get("configuredWeight")),
        None,
    )
    return {
        "key": f"ahp-sort-i-criterion-collective-sensitivity-{item['criterionId']}",
        "type": "line",
        "title": f"Collective category changes · {item['criterionName']}",
        "description": (
            "The collective result is a categorical plurality vote. Step segments connect sampled "
            "categories only; they do not estimate an exact switching threshold. Invalid samples are gaps."
        ),
        "insight": "No collective numeric priority is calculated by AHPSort I.",
        "scope": {
            "dimension": "criterion",
            "id": item["criterionId"],
            "label": item["criterionName"],
            "order": item.get("criterionIndex", 0),
        },
        "xAxis": {"label": "Varied criterion weight", "min": 0, "max": 1, "scaleType": "linear"},
        "yAxis": {
            "label": "Collective category · plurality vote",
            "min": -0.5,
            "max": max(0.5, len(categories) - 0.5),
            "scaleType": "linear",
            "categories": [
                {"value": index, "label": category["label"]}
                for index, category in enumerate(categories)
            ],
        },
        "data": {
            "xScaleType": "linear",
            "x": [point["variedWeight"] for point in points],
            "configuredWeight": item.get("configuredWeight"),
            "originalWeightBaselineComparison": (
                configured_point.get("baselineComparison") if configured_point else None
            ),
            "unavailableSamples": [
                {"weight": point.get("variedWeight"), "reason": point.get("reason")}
                for point in points if point.get("available") is not True
            ],
            "series": series,
        },
        "presentation": {
            "chartHeight": {"xs": 360, "sm": 420, "md": 480},
            "stableSeriesColors": True,
            "compactLegend": True,
            "originalWeightMarker": True,
            "originalWeightLabel": "Original criterion weight",
            "originalWeightAriaLabel": "Original criterion weight",
            "alternativeSelector": {"recommendedCount": 1, "selectionMode": "single"},
        },
    }


def _sensitivity_lines(
    facts: dict[str, Any],
    sensitivity_facts: dict[str, Any],
) -> list[dict[str, Any]]:
    visualizations = []

    for item in sensitivity_facts.get("items", []):
        points = item.get("points") or []
        if not points:
            continue
        priority_graph = _priority_sensitivity_visualization(facts, item, points)
        if priority_graph:
            visualizations.append(priority_graph)
        collective_graph = _collective_category_sensitivity_visualization(facts, item, points)
        if collective_graph:
            visualizations.append(collective_graph)
    return visualizations


def build_visualizations(
    facts: dict[str, Any],
) -> list[dict[str, Any]]:
    """Build original-result and weight-sensitivity graph descriptors."""
    original = _original_classifications(facts)
    return ([original] if original else []) + _sensitivity_lines(
        facts, facts.get("sensitivity") or {}
    )


def build_visualization_sections(
    facts: dict[str, Any],
) -> list[dict[str, Any]]:
    """Group AHPSort I visualizations under the existing alternative section."""
    descriptors = build_visualizations(facts)
    original = [
        item
        for item in descriptors
        if item["key"] == "ahp-sort-i-original-classifications"
    ]
    sensitivity = [item for item in descriptors if item["type"] == "line"]
    sections = []
    if original:
        sections.append(
            {
                "id": "ahp-sort-i-original-classifications",
                "title": "AHPSort I classifications",
                "description": "Categories assigned in the validated original execution.",
                "order": 0,
                "presentation": {
                    "layout": "stacked",
                    "comparisonKey": facts["comparisonKey"],
                },
                "visualizations": original,
            }
        )
    sensitivity_facts = facts.get("sensitivity") or {}
    if sensitivity or sensitivity_facts.get("items"):
        presentation: dict[str, Any] = {
            "layout": "stacked",
            "scopeSelector": "criterion",
            "comparisonKey": facts["comparisonKey"],
        }
        if not sensitivity:
            reason = next(
                (
                    item.get("reason")
                    for item in sensitivity_facts.get("items", [])
                    if item.get("reason")
                ),
                "no_valid_weight_samples",
            )
            presentation["summaryMessage"] = (
                "Criterion weight sensitivity is unavailable because "
                + reason.replace("_", " ")
                + "."
            )
        sections.append(
            {
                "id": "ahp-sort-i-criterion-weight-sensitivity",
                "title": "Criterion weight sensitivity",
                "description": (
                    "Sampled AHPSort I reclassifications using the validated "
                    "frozen execution and its original comparison judgments."
                ),
                "order": 1,
                "presentation": presentation,
                "visualizations": sensitivity,
            }
        )
    return sections


__all__ = ["build_visualization_sections", "build_visualizations"]
