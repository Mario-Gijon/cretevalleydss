"""Visualization descriptors for validated AHPSort I analysis facts."""

from __future__ import annotations

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


def _sensitivity_lines(
    facts: dict[str, Any],
    sensitivity_facts: dict[str, Any],
) -> list[dict[str, Any]]:
    categories = sorted(facts["categories"], key=lambda item: item["order"])
    category_order = {
        item["categoryId"]: index for index, item in enumerate(categories)
    }
    category_labels = {item["categoryId"]: item["label"] for item in categories}
    experts = {
        item["expertId"]: _name(item, "name", item["expertId"])
        for item in facts["experts"]
    }
    alternatives = {item["alternativeId"]: item for item in facts["alternatives"]}
    visualizations = []

    for item in sensitivity_facts.get("items", []):
        points = item.get("points") or []
        if not points:
            continue
        expert_ids = [expert["expertId"] for expert in facts["experts"]]
        series = []
        for expert_id in expert_ids:
            for alternative_id, alternative in alternatives.items():
                values = []
                for point in points:
                    expert_result = next(
                        (
                            candidate
                            for candidate in point.get("expertResults", [])
                            if candidate.get("expertId") == expert_id
                        ),
                        None,
                    )
                    result = (
                        (expert_result.get("alternativesById") or {}).get(alternative_id)
                        if point.get("available") is True
                        and expert_result is not None
                        and expert_result.get("available") is True
                        else None
                    )
                    category_id = result.get("categoryId") if result else None
                    available = category_id in category_order
                    unavailable_reason = None
                    if not available:
                        unavailable_reason = (
                            point.get("reason")
                            or (expert_result or {}).get("reason")
                            or "classification_unavailable"
                        )
                    details = _weight_details(
                        facts,
                        point,
                        category=category_labels.get(category_id) if available else None,
                        changed=(result.get("changedFromBaseline") if available else None),
                        unavailable_reason=unavailable_reason,
                    )
                    if available:
                        _sensitivity_series_details(facts, result, details=details)
                        if point.get("baselineComparison") is not None:
                            details[
                                "Original-weight result matches validated baseline"
                            ] = _baseline_match(point, collective=False)
                    values.append(
                        {
                            "x": point["variedWeight"],
                            "y": category_order[category_id] if available else None,
                            "label": f"{experts[expert_id]} · {alternative['name']}",
                            "category": category_labels.get(category_id) if available else None,
                            "alternativeId": alternative_id,
                            "expertId": expert_id,
                            "details": details,
                            "isConfiguredWeight": point["variedWeight"]
                            == item.get("configuredWeight"),
                        }
                    )
                series.append(
                    {
                        "key": f"individual:{expert_id}:{alternative_id}",
                        "label": f"Individual · {experts[expert_id]} · {alternative['name']}",
                        "role": "alternative",
                        "resultType": "individual",
                        "alternativeId": alternative_id,
                        "alternativeName": alternative["name"],
                        "expertId": expert_id,
                        "values": values,
                        "style": {"stepped": "after", "highlightConfiguredWeight": True},
                    }
                )

        if len(facts["experts"]) > 1:
            for alternative_id, alternative in alternatives.items():
                values = []
                for point in points:
                    collective = point.get("collectiveClassification") or {}
                    category_id = (
                        (collective.get("assignmentsByAlternativeId") or {}).get(
                            alternative_id
                        )
                        if point.get("available") is True
                        else None
                    )
                    available = category_id in category_order
                    unavailable_reason = None if available else (
                        point.get("reason") or "collective_classification_unavailable"
                    )
                    details = _weight_details(
                        facts,
                        point,
                        category=category_labels.get(category_id) if available else None,
                        changed=(
                            category_id != facts["executedAssignments"].get(alternative_id)
                            if available
                            else None
                        ),
                        unavailable_reason=unavailable_reason,
                    )
                    if available:
                        aggregate = (
                            collective.get("resultsByAlternativeId") or {}
                        ).get(alternative_id, {})
                        details.update(
                            {
                                "Result type": "Collective plurality vote",
                                "Vote outcome": aggregate.get("aggregationStatus"),
                                "Tie detected": aggregate.get("tieDetected"),
                                "Tie policy": aggregate.get("tiePolicy"),
                            }
                        )
                        if point.get("baselineComparison") is not None:
                            details[
                                "Original-weight result matches validated baseline"
                            ] = _baseline_match(point, collective=True)
                        for vote_category_id, count in (
                            aggregate.get("votesByCategoryId") or {}
                        ).items():
                            if vote_category_id in category_labels:
                                details[f"Votes · {category_labels[vote_category_id]}"] = count
                        for expert_id, individual_category in (
                            aggregate.get("classificationsByExpertId") or {}
                        ).items():
                            details[f"Individual · {experts.get(expert_id, expert_id)}"] = (
                                category_labels.get(individual_category, individual_category)
                            )
                    values.append(
                        {
                            "x": point["variedWeight"],
                            "y": category_order[category_id] if available else None,
                            "label": f"Collective · {alternative['name']}",
                            "category": category_labels.get(category_id) if available else None,
                            "alternativeId": alternative_id,
                            "details": details,
                            "isConfiguredWeight": point["variedWeight"]
                            == item.get("configuredWeight"),
                        }
                    )
                series.append(
                    {
                        "key": f"collective:{alternative_id}",
                        "label": f"Collective · {alternative['name']}",
                        "role": "alternative",
                        "resultType": "collective",
                        "alternativeId": alternative_id,
                        "alternativeName": alternative["name"],
                        "values": values,
                        "style": {
                            "stepped": "after",
                            "borderDash": [7, 4],
                            "highlightConfiguredWeight": True,
                        },
                    }
                )

        if not series:
            continue
        summary = item.get("summary") or {}
        changed_count = summary.get("individualChangedSampleCount", 0) + summary.get(
            "collectiveChangedSampleCount", 0
        )
        configured_point = next(
            (
                point
                for point in points
                if point.get("variedWeight") == item.get("configuredWeight")
            ),
            None,
        )
        visualizations.append(
            {
                "key": f"ahp-sort-i-criterion-weight-sensitivity-{item['criterionId']}",
                "type": "line",
                "title": f"Criterion weight sensitivity · {item['criterionName']}",
                "description": (
                    "Each sample shows an assigned category at the tested weight. "
                    "Step segments summarize adjacent available samples only; they do "
                    "not estimate an exact switching threshold. Gaps mark unavailable samples."
                ),
                "insight": (
                    f"{changed_count} sampled changes from the original classification "
                    "were observed. Hover a point for the category, full effective "
                    "weight vector, and matrix-specific details."
                ),
                "scope": {
                    "dimension": "criterion",
                    "id": item["criterionId"],
                    "label": item["criterionName"],
                    "order": item.get("criterionIndex", 0),
                },
                "xAxis": {
                    "label": "Varied criterion weight",
                    "min": 0,
                    "max": 1,
                    "scaleType": "linear",
                },
                "yAxis": {
                    "label": "Assigned category · lower to higher preference",
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
                        configured_point.get("baselineComparison")
                        if configured_point is not None
                        else None
                    ),
                    "unavailableSamples": [
                        {
                            "weight": point.get("variedWeight"),
                            "reason": point.get("reason"),
                            "failedExperts": [
                                candidate.get("expertId")
                                for candidate in point.get("expertResults", [])
                                if candidate.get("available") is False
                            ],
                        }
                        for point in points
                        if point.get("available") is not True
                    ],
                    "series": series,
                },
                "presentation": {
                    "chartHeight": {"xs": 440, "sm": 520, "md": 600},
                    "stableSeriesColors": True,
                    "compactLegend": True,
                    "originalWeightMarker": True,
                    "originalWeightLabel": "Original criterion weight",
                    "originalWeightAriaLabel": "Original criterion weight",
                    "alternativeSelector": {"recommendedCount": 3},
                },
            }
        )
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
