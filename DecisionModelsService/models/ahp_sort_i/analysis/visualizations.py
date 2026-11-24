"""Visualization descriptors for validated AHPSort I analysis facts."""

from __future__ import annotations

from typing import Any


def _name(item: dict[str, Any], key: str, fallback: str) -> str:
    value = item.get(key)
    return value.strip() if isinstance(value, str) and value.strip() else fallback


def _weight_details(
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


def _category_sensitivity_visualization(
    facts: dict[str, Any], item: dict[str, Any], points: list[dict[str, Any]]
) -> dict[str, Any]:
    experts = facts["experts"]
    alternatives = facts["alternatives"]
    categories = sorted(facts["categories"], key=lambda category: category["order"])
    category_order = {category["categoryId"]: index for index, category in enumerate(categories)}
    category_labels = {category["categoryId"]: category["label"] for category in categories}
    series = []

    for expert in experts:
        expert_id = expert["expertId"]
        expert_name = _name(expert, "name", expert_id)
        for alternative in alternatives:
            alternative_id = alternative["alternativeId"]
            values = []
            for point in points:
                result, unavailable_reason = _available_sensitivity_result(
                    point, expert_id, alternative_id
                )
                category_id = (result or {}).get("categoryId")
                available = category_id in category_order
                details = _weight_details(
                    point,
                    category=category_labels.get(category_id) if available else None,
                    changed=(result.get("changedFromBaseline") if available else None),
                    unavailable_reason=(
                        unavailable_reason
                        or (None if available else "individual_classification_unavailable")
                    ),
                )
                if available:
                    details["Result type"] = "Individual classification"
                    details["Expert"] = expert_name
                    if point.get("baselineComparison") is not None:
                        details["Original-weight result matches validated baseline"] = _baseline_match(
                            point, collective=False
                        )
                values.append(
                    {
                        "x": point["variedWeight"],
                        "y": (
                            category_order[category_id]
                            if available
                            else None
                        ),
                        "details": details,
                        "isConfiguredWeight": point["variedWeight"]
                        == item.get("configuredWeight"),
                    }
                )
            series.append(
                {
                    "key": f"individual:{expert_id}:{alternative_id}",
                    "label": alternative["name"],
                    "role": "alternative",
                    "resultType": "individual",
                    "alternativeId": alternative_id,
                    "alternativeName": alternative["name"],
                    "expertId": expert_id,
                    "expertName": expert_name,
                    "values": values,
                }
            )

    multi_expert = len(experts) > 1
    if multi_expert:
        for alternative in alternatives:
            alternative_id = alternative["alternativeId"]
            values = []
            for point in points:
                collective = point.get("collectiveClassification") or {}
                category_id = (
                    (collective.get("assignmentsByAlternativeId") or {}).get(alternative_id)
                    if point.get("available") is True
                    else None
                )
                available = category_id in category_order
                aggregate = (collective.get("resultsByAlternativeId") or {}).get(
                    alternative_id, {}
                )
                details = _weight_details(
                    point,
                    category=category_labels.get(category_id) if available else None,
                    changed=(
                        category_id != facts["executedAssignments"].get(alternative_id)
                        if available
                        else None
                    ),
                    unavailable_reason=(
                        None
                        if available
                        else point.get("reason") or "collective_classification_unavailable"
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
                    for vote_category_id, count in (
                        aggregate.get("votesByCategoryId") or {}
                    ).items():
                        if vote_category_id in category_labels:
                            details[f"Votes · {category_labels[vote_category_id]}"] = count
                    for expert_id, expert_category_id in (
                        aggregate.get("classificationsByExpertId") or {}
                    ).items():
                        expert_name = next(
                            (
                                _name(expert, "name", expert_id)
                                for expert in experts
                                if expert["expertId"] == expert_id
                            ),
                            expert_id,
                        )
                        details[f"Individual vote · {expert_name}"] = category_labels.get(
                            expert_category_id, expert_category_id
                        )
                    if point.get("baselineComparison") is not None:
                        details["Original-weight result matches validated baseline"] = (
                            _baseline_match(point, collective=True)
                        )
                values.append(
                    {
                        "x": point["variedWeight"],
                        "y": (
                            category_order[category_id]
                            if available
                            else None
                        ),
                        "details": details,
                        "isConfiguredWeight": point["variedWeight"]
                        == item.get("configuredWeight"),
                    }
                )
            series.append(
                {
                    "key": f"collective:{alternative_id}",
                    "label": alternative["name"],
                    "role": "collective",
                    "resultType": "collective",
                    "alternativeId": alternative_id,
                    "alternativeName": alternative["name"],
                    "values": values,
                }
            )

    if not series:
        return {}
    configured_point = next(
        (point for point in points if point.get("variedWeight") == item.get("configuredWeight")),
        None,
    )
    presentation: dict[str, Any] = {
        "alternativeSelector": {"recommendedCount": 3},
        "stableSeriesColors": True,
        "compactLegend": True,
        "colorByAlternativeId": True,
        "categoryLineSegments": True,
        "categoryOffsetRange": 0.12,
        "hideVerticalGridLines": True,
        "originalWeightMarker": True,
        "originalWeightMarkerMode": "axis-tick",
        "originalWeightLabel": "Original criterion weight",
        "originalWeightAriaLabel": "Original criterion weight",
        "chartHeight": {"xs": 420, "sm": 500, "md": 580},
    }
    if multi_expert:
        presentation["resultSelector"] = {
            "defaultValue": "individual",
            "options": [
                {"value": "individual", "label": "Individual"},
                {"value": "collective", "label": "Collective"},
            ],
        }
        presentation["expertSelector"] = {"selectionMode": "single"}
    return {
        "key": f"ahp-sort-i-criterion-weight-sensitivity-{item['criterionId']}",
        "type": "line",
        "title": f"Criterion weight sensitivity · {item['criterionName']}",
        "description": (
            "Each alternative is shown as horizontal segments at its assigned ordered category. "
            "Stable colors identify alternatives."
        ),
        "insight": (
            "Each valid sample interval carries the category at its left sample and ends at "
            "the next sampled weight. Category changes are left unconnected and begin at "
            "that weight; missing samples leave gaps, and no exact switching thresholds "
            "are inferred. "
            "Individual and collective results are selected separately; collective assignments use plurality votes."
        ),
        "scope": {
            "dimension": "criterion",
            "id": item["criterionId"],
            "label": item["criterionName"],
            "order": item.get("criterionIndex", 0),
        },
        "xAxis": {"label": "Varied criterion weight", "min": 0, "max": 1, "scaleType": "linear"},
        "yAxis": {
            "label": "Assigned category · configured order",
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
            "alternativeOrder": [alternative["alternativeId"] for alternative in alternatives],
            "series": series,
        },
        "presentation": presentation,
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
        sensitivity_graph = _category_sensitivity_visualization(facts, item, points)
        if sensitivity_graph:
            visualizations.append(sensitivity_graph)
    return visualizations


def build_visualizations(
    facts: dict[str, Any],
) -> list[dict[str, Any]]:
    """Build weight-sensitivity graph descriptors for the validated result."""
    return _sensitivity_lines(facts, facts.get("sensitivity") or {})


def build_visualization_sections(
    facts: dict[str, Any],
) -> list[dict[str, Any]]:
    """Group AHPSort I sensitivity under the existing alternative section."""
    descriptors = build_visualizations(facts)
    sensitivity = [
        item
        for item in descriptors
        if item["type"] == "line"
        and item["key"].startswith("ahp-sort-i-criterion-weight-sensitivity-")
    ]
    sections = []
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
                "order": 0,
                "presentation": presentation,
                "visualizations": sensitivity,
            }
        )
    return sections


__all__ = ["build_visualization_sections", "build_visualizations"]
