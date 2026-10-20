from __future__ import annotations

import math
from typing import Any


def _display(value: Any, digits: int = 8) -> float | None:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return None
    number = float(value)
    if not math.isfinite(number):
        return None
    rounded = round(number, digits)
    return 0.0 if rounded == -0.0 else rounded


def _collective_performance_heatmap(facts: dict[str, Any]) -> dict[str, Any] | None:
    if not facts["criteria"]["available"]:
        return None
    alternatives = facts["result"]["items"]
    criteria = facts["criteria"]["items"]
    if not alternatives or not criteria:
        return None
    values: list[list[float | None]] = []
    details: list[list[dict[str, Any]]] = []
    for alternative in alternatives:
        row_values: list[float | None] = []
        row_details: list[dict[str, Any]] = []
        for criterion in criteria:
            cell = next(
                (
                    item
                    for item in criterion["evaluationsByAlternative"]
                    if item["alternativeId"] == alternative["alternativeId"]
                ),
                None,
            )
            row_values.append(_display(cell["relativeFavorability"]) if cell else None)
            row_details.append({
                "inputEvaluation": cell["value"] if cell else None,
                "direction": criterion["direction"] or "unavailable",
                "configuredWeight": criterion["configuredWeight"],
                "note": (
                    "All alternatives have the same observed evaluation on this criterion."
                    if cell and not criterion["hasObservedVariation"]
                    else "Color is normalized within this criterion's observed range."
                ),
            })
        values.append(row_values)
        details.append(row_details)
    return {
        "key": "topsis-collective-performance-profile",
        "type": "heatmap",
        "title": "Collective performance by criterion",
        "description": "Cell numbers and colors show each alternative's direction-aware position within that criterion's observed range; hover for the raw collective evaluation and configured weight.",
        "insight": "Each criterion is scaled independently; colors do not compare raw units across criteria.",
        "truncateLabels": True,
        "scale": {"min": 0, "max": 1, "valuePrecision": 4},
        "data": {
            "rows": [{"key": item["alternativeId"], "label": item["name"]} for item in alternatives],
            "columns": [
                {
                    "key": item["criterionId"],
                    "label": item["name"],
                    "direction": item["direction"],
                }
                for item in criteria
            ],
            "values": values,
            "details": details,
        },
    }


def _format_point_detail(item: dict[str, Any]) -> str:
    return (
        f"{item['name']} (rank {item['technicalRank']}, relative closeness "
        f"{_display(item['closeness'])})"
    )


def _ideal_distance_scatter(facts: dict[str, Any]) -> dict[str, Any] | None:
    distance_facts = facts["idealDistances"]
    if not distance_facts["available"] or len(distance_facts["items"]) < 2:
        return None
    points = [
        {
            "id": item["alternativeId"],
            "label": item["name"],
            "x": _display(item["positiveDistance"], digits=12),
            "y": _display(item["negativeDistance"], digits=12),
            "details": {
                "technical rank": item["technicalRank"],
                "relative closeness": _display(item["closeness"], digits=12),
            },
            "source": item,
        }
        for item in distance_facts["items"]
    ]
    points = [item for item in points if item["x"] is not None and item["y"] is not None]
    if len(points) < 2:
        return None
    coincident: dict[tuple[float, float], list[dict[str, Any]]] = {}
    for point in points:
        coincident.setdefault((point["x"], point["y"]), []).append(point)

    x_values = [point["x"] for point in points]
    y_values = [point["y"] for point in points]
    x_tolerance = (max(x_values) - min(x_values)) * 0.02
    y_tolerance = (max(y_values) - min(y_values)) * 0.02
    plot_points = []
    for (x, y), group in coincident.items():
        members = [point["source"] for point in group]
        nearby = [
            point["source"]
            for point in points
            if (point["x"], point["y"]) != (x, y)
            and abs(point["x"] - x) <= x_tolerance
            and abs(point["y"] - y) <= y_tolerance
        ]
        if len(members) > 1:
            label = "Coincident alternatives: " + ", ".join(item["name"] for item in members)
            details = {
                "alternatives at this coordinate": "; ".join(_format_point_detail(item) for item in members),
            }
        else:
            label = members[0]["name"]
            details = {
                "technical rank": members[0]["technicalRank"],
                "relative closeness": _display(members[0]["closeness"]),
            }
        if nearby:
            details["nearby alternatives at their own coordinates"] = "; ".join(
                _format_point_detail(item) for item in nearby
            )
        plot_points.append({
            "id": ",".join(item["alternativeId"] for item in members),
            "label": label,
            "x": x,
            "y": y,
            "details": details,
        })
    return {
        "key": "topsis-numeric-ideal-distances",
        "type": "scatter",
        "title": "Position relative to TOPSIS reference solutions",
        "description": "Each point shows the alternative's validated distance from the most and least desirable reference profiles. Hover for precise distances and names when markers coincide or sit close together.",
        "insight": "Smaller D+ (closer to the most desirable reference) and larger D− (farther from the least desirable reference) are favorable in this execution.",
        "xAxis": {"label": "Distance to most desirable reference (D+)"},
        "yAxis": {"label": "Distance from least desirable reference (D−)"},
        "data": {"series": [{"key": "alternatives", "label": "Alternatives", "points": plot_points}]},
    }


def _distance_contribution_chart(facts: dict[str, Any], *, positive: bool) -> dict[str, Any] | None:
    distances = facts["idealDistances"]
    criteria = facts["criteria"]["items"]
    alternatives = facts["result"]["items"]
    if not distances["available"] or not criteria or not alternatives:
        return None

    field = "positiveSquaredContributions" if positive else "negativeSquaredContributions"
    contribution_by_alternative = {
        item["alternativeId"]: {
            contribution["criterionId"]: contribution["squaredDistanceContribution"]
            for contribution in item.get(field, [])
        }
        for item in distances["items"]
    }
    if any(item["alternativeId"] not in contribution_by_alternative for item in alternatives):
        return None
    return {
        "key": "topsis-positive-distance-contributions" if positive else "topsis-negative-distance-contributions",
        "type": "bar",
        "title": (
            "Criterion contributions to squared distance from the most desirable reference"
            if positive
            else "Criterion contributions to squared distance from the least desirable reference"
        ),
        "description": (
            "Each stacked segment is one criterion's squared contribution to an alternative's distance from the most desirable reference."
            if positive
            else "Each stacked segment is one criterion's squared contribution to an alternative's distance from the least desirable reference."
        ),
        "insight": (
            "Larger contributions mean a larger gap from the most desirable reference; the segments sum to D+ squared, not to relative closeness."
            if positive
            else "Larger contributions mean a larger separation from the least desirable reference; the segments sum to D− squared, not to relative closeness."
        ),
        "orientation": "horizontal",
        "stacked": True,
        "xAxis": {"label": "Squared distance contribution"},
        "yAxis": {"label": "Alternative"},
        "data": {
            "categories": [item["name"] for item in alternatives],
            "series": [
                {
                    "key": criterion["criterionId"],
                    "label": criterion["name"],
                    "values": [
                        _display(contribution_by_alternative[item["alternativeId"]].get(criterion["criterionId"], 0.0), digits=12)
                        for item in alternatives
                    ],
                }
                for criterion in criteria
            ],
        },
    }


def build_visualizations(facts: dict[str, Any]) -> list[dict[str, Any]]:
    """Build model-owned views from the same validated facts as the narrative."""
    visualizations = [
        item for item in (
            _collective_performance_heatmap(facts),
            _ideal_distance_scatter(facts),
            _distance_contribution_chart(facts, positive=True),
            _distance_contribution_chart(facts, positive=False),
        ) if item is not None
    ]
    return visualizations


def build_visualization_sections(facts: dict[str, Any]) -> list[dict[str, Any]]:
    descriptors = {item["key"]: item for item in build_visualizations(facts)}
    definitions = (
        (
            "topsis-collective-performance",
            "Collective performance",
            "Direction-aware collective evaluations, scaled independently within each criterion.",
            ("topsis-collective-performance-profile",),
        ),
        (
            "topsis-ideal-distance-geometry",
            "TOPSIS reference distances",
            "Validated distances to the most and least desirable reference profiles.",
            ("topsis-numeric-ideal-distances",),
        ),
        (
            "topsis-positive-distance-contributions",
            "Distance from the most desirable reference",
            "Squared Euclidean-distance contributions by criterion, validated against the executed result.",
            ("topsis-positive-distance-contributions",),
        ),
        (
            "topsis-negative-distance-contributions",
            "Distance from the least desirable reference",
            "Squared Euclidean-distance contributions by criterion, validated against the executed result.",
            ("topsis-negative-distance-contributions",),
        ),
    )
    return [
        {
            "id": section_id,
            "title": title,
            "description": description,
            "order": order,
            "visualizations": [descriptors[key] for key in keys if key in descriptors],
        }
        for order, (section_id, title, description, keys) in enumerate(definitions)
        if any(key in descriptors for key in keys)
    ]


__all__ = ["build_visualization_sections", "build_visualizations"]
