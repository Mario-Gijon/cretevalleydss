"""Model-owned visualization descriptors for TOPSIS-Sort Model Analysis."""

from __future__ import annotations

from typing import Any


def _closeness_boundaries(facts: dict[str, Any]) -> dict[str, Any] | None:
    alternatives = facts["alternatives"]
    categories = facts["categories"]
    profiles = facts["profiles"]
    if not alternatives or not categories or not profiles:
        return None

    y_values = list(range(len(alternatives)))
    y_min = -0.5
    y_max = max(0.5, len(alternatives) - 0.5)
    alternative_points = [
        {
            "id": item["alternativeId"],
            "label": item["name"],
            "x": item["closeness"],
            "y": index,
            "details": {
                "Category": item["categoryLabel"],
                "Relative closeness coefficient": item["closeness"],
                "Nearest boundary": item["nearestBoundary"]["label"],
                "Distance from nearest boundary": item["nearestBoundary"]["distance"],
            },
        }
        for index, item in enumerate(alternatives)
    ]
    boundary_series = []
    for profile in profiles:
        boundary = {
            "profileId": profile["profileId"],
            "label": profile["label"],
            "closeness": profile["closeness"],
        }
        positions = sorted({y_min, y_max, *y_values})
        boundary_series.append(
            {
                "key": f"profile-{profile['profileId']}",
                "label": boundary["label"],
                "showLine": True,
                "pointRadius": 0,
                "pointHitRadius": 8,
                "borderDash": [6, 4],
                "points": [
                    {
                        "id": boundary["profileId"],
                        "label": boundary["label"],
                        "x": boundary["closeness"],
                        "y": y,
                        "details": {
                            "Profile ID": boundary["profileId"],
                            "Boundary": boundary["label"],
                            "Relative closeness coefficient": boundary["closeness"],
                        },
                    }
                    for y in positions
                ],
            }
        )

    return {
        "key": "topsis-sort-closeness-category-boundaries",
        "type": "scatter",
        "title": "Closeness and category boundaries",
        "description": (
            "Alternative coefficients and the executed TOPSIS-Sort profile limits "
            "on the same 0–1 relative-closeness scale."
        ),
        "insight": (
            "Dashed vertical lines are the executed profile coefficients. Each "
            "alternative is shown on its configured category row; hover for its "
            "coefficient, category, and boundary distance."
        ),
        "xAxis": {
            "label": "Relative closeness coefficient",
            "min": 0,
            "max": 1,
            "scaleType": "linear",
        },
        "yAxis": {
            "label": "Alternative",
            "min": y_min,
            "max": y_max,
            "scaleType": "linear",
            "categories": [
                {"value": index, "label": item["name"]}
                for index, item in enumerate(alternatives)
            ],
        },
        "data": {
            "series": [
                {
                    "key": "alternatives",
                    "label": "Alternatives",
                    "points": alternative_points,
                },
                *boundary_series,
            ]
        },
    }


def _sensitivity_line(
    facts: dict[str, Any],
    item: dict[str, Any],
) -> dict[str, Any] | None:
    if not item.get("available"):
        return None
    points = item.get("points") or []
    if len([point for point in points if point.get("available")]) < 2:
        return None

    alternative_series = []
    for alternative in facts["alternatives"]:
        values = []
        for point in points:
            closeness = point.get("closenessByAlternativeId") or {}
            assignment = next(
                (
                    entry
                    for entry in point.get("assignments") or []
                    if entry["alternativeId"] == alternative["alternativeId"]
                ),
                None,
            )
            available = point["available"] and alternative["alternativeId"] in closeness
            values.append(
                {
                    "x": point["variedWeight"],
                    "y": closeness.get(alternative["alternativeId"]) if available else None,
                    "label": alternative["name"],
                    "category": assignment["category"] if assignment else None,
                    "details": {
                        "Weight": point["variedWeight"],
                        "Relative closeness coefficient": (
                            closeness.get(alternative["alternativeId"])
                            if available
                            else None
                        ),
                        "Category": assignment["category"] if assignment else None,
                        "Unavailable reason": point.get("reason") if not available else None,
                    },
                    "isConfiguredWeight": point["variedWeight"] == item["configuredWeight"],
                }
            )
        alternative_series.append(
            {
                "key": alternative["alternativeId"],
                "label": alternative["name"],
                "role": "alternative",
                "style": {"highlightConfiguredWeight": True},
                "values": values,
            }
        )

    boundary_by_profile = {profile["profileId"]: profile for profile in facts["profiles"]}
    profile_series = []
    for profile in facts["profiles"]:
        values = []
        for point in points:
            closeness = point.get("closenessByProfileId") or {}
            coefficient = closeness.get(profile["profileId"])
            available = point["available"] and coefficient is not None
            values.append(
                {
                    "x": point["variedWeight"],
                    "y": coefficient if available else None,
                    "label": boundary_by_profile[profile["profileId"]]["label"],
                    "details": {
                        "Weight": point["variedWeight"],
                        "Relative closeness coefficient": coefficient if available else None,
                        "Boundary": boundary_by_profile[profile["profileId"]]["label"],
                        "Unavailable reason": point.get("reason") if not available else None,
                    },
                    "isConfiguredWeight": point["variedWeight"] == item["configuredWeight"],
                }
            )
        profile_series.append(
            {
                "key": f"profile-{profile['profileId']}",
                "label": profile["label"],
                "role": "boundary",
                "values": values,
                "style": {
                    "borderDash": [7, 5],
                    "borderWidth": 1.5,
                    "opacity": 0.68,
                    "pointRadius": 0,
                    "pointHoverRadius": 3,
                    "pointHitRadius": 7,
                },
            }
        )

    return {
        "key": f"topsis-sort-criterion-weight-sensitivity-{item['criterionId']}",
        "type": "line",
        "title": f"Criterion weight sensitivity · {item['criterionName']}",
        "description": (
            "The alternatives and category boundaries are recomputed with the "
            "original TOPSIS-Sort method at each sampled weight."
        ),
        "insight": (
            "Dashed lines show profile boundaries recalculated at every weight. "
            "Gaps mark mathematically unavailable samples; lines do not bridge a gap."
        ),
        "scope": {
            "dimension": "criterion",
            "id": item["criterionId"],
            "label": item["criterionName"],
            "order": item["criterionIndex"],
        },
        "xAxis": {
            "label": "Varied importance weight",
            "min": 0,
            "max": 1,
            "scaleType": "linear",
        },
        "yAxis": {
            "label": "Relative closeness coefficient",
            "min": 0,
            "max": 1,
            "scaleType": "linear",
        },
        "data": {
            "xScaleType": "linear",
            "x": [point["variedWeight"] for point in points],
            "configuredWeight": item["configuredWeight"],
            "unavailableSamples": [
                {
                    "weight": point["variedWeight"],
                    "reason": point.get("reason"),
                }
                for point in points
                if not point["available"]
            ],
            "series": [*alternative_series, *profile_series],
        },
        "presentation": {
            "chartHeight": {"xs": 420, "sm": 500, "md": 580},
            "stableSeriesColors": True,
            "compactLegend": True,
            "originalWeightMarker": True,
            "showUnavailableSamples": True,
            "alternativeSelector": {"recommendedCount": 3},
            "methodDetails": (
                "Other criterion weights are redistributed proportionally. "
                "TOPSIS-Sort is recomputed at each discrete sample; sampled "
                "changes identify an interval, not an exact threshold. "
                "Mathematically unavailable scenarios remain blank."
            ),
        },
    }


def build_visualizations(facts: dict[str, Any]) -> list[dict[str, Any]]:
    if facts.get("status") != "available":
        return []
    visualizations = []
    boundaries = _closeness_boundaries(facts)
    if boundaries is not None:
        visualizations.append(boundaries)
    for item in facts["sensitivity"]["items"]:
        descriptor = _sensitivity_line(facts, item)
        if descriptor is not None:
            visualizations.append(descriptor)
    return visualizations


def build_visualization_sections(facts: dict[str, Any]) -> list[dict[str, Any]]:
    descriptors = build_visualizations(facts)
    closeness = [
        item for item in descriptors
        if item["key"] == "topsis-sort-closeness-category-boundaries"
    ]
    sensitivity = [item for item in descriptors if item["type"] == "line"]
    sections = []
    if closeness:
        sections.append(
            {
                "id": "topsis-sort-closeness-category-boundaries",
                "title": "Closeness and category boundaries",
                "description": (
                    "Executed relative-closeness coefficients and category profile limits."
                ),
                "order": 0,
                "presentation": {
                    "layout": "stacked",
                    "comparisonKey": facts["comparisonKey"],
                },
                "visualizations": closeness,
            }
        )
    if sensitivity:
        sections.append(
            {
                "id": "topsis-sort-criterion-weight-sensitivity",
                "title": "Criterion weight sensitivity",
                "description": (
                    "Full TOPSIS-Sort recomputations on sampled criterion importance weights."
                ),
                "order": 1,
                "presentation": {
                    "layout": "stacked",
                    "scopeSelector": "criterion",
                    "comparisonKey": facts["comparisonKey"],
                },
                "visualizations": sensitivity,
            }
        )
    return sections


__all__ = ["build_visualization_sections", "build_visualizations"]
