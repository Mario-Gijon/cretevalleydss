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


def _ranking_chart(facts: dict[str, Any]) -> dict[str, Any] | None:
    result = facts["result"]
    alternatives = result["items"]
    if not alternatives or not result["available"]:
        return None
    return {
        "key": "topsis-numeric-ranking-scores",
        "type": "bar",
        "title": "TOPSIS relative closeness",
        "description": "Alternatives are ordered by the executed TOPSIS ranking. The score is relative closeness to the positive ideal, combining distance from both reference solutions.",
        "insight": (
            f"Exact score ties are retained for {', '.join(item['name'] for group in result['exactScoreTies'] for item in group['alternatives'])}."
            if result["exactScoreTies"]
            else "Higher scores indicate greater relative closeness to the positive ideal."
        ),
        "orientation": "horizontal",
        "xAxis": {"label": "TOPSIS relative closeness"},
        "yAxis": {"label": "Alternative"},
        "valueAxis": {"min": 0, "max": 1},
        "data": {
            "categories": [item["name"] for item in alternatives],
            "series": [{
                "key": "relative-closeness",
                "label": "Relative closeness",
                "values": [_display(item["score"]) for item in alternatives],
            }],
        },
    }


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
            "columns": [{"key": item["criterionId"], "label": item["name"]} for item in criteria],
            "values": values,
            "details": details,
        },
    }


def _ideal_distance_scatter(facts: dict[str, Any]) -> dict[str, Any] | None:
    distance_facts = facts["idealDistances"]
    if not distance_facts["available"] or len(distance_facts["items"]) < 2:
        return None
    points = [
        {
            "id": item["alternativeId"],
            "label": item["name"],
            "x": _display(item["positiveDistance"]),
            "y": _display(item["negativeDistance"]),
            "details": {
                "technical rank": item["technicalRank"],
                "relative closeness": _display(item["closeness"]),
            },
        }
        for item in distance_facts["items"]
    ]
    points = [item for item in points if item["x"] is not None and item["y"] is not None]
    if len(points) < 2:
        return None
    return {
        "key": "topsis-numeric-ideal-distances",
        "type": "scatter",
        "title": "Distance from TOPSIS reference solutions",
        "description": "Distances are reconstructed from the frozen execution input and matrix, then included only when the resulting closeness values match the executed scores.",
        "insight": "A position farther left and higher is nearer the positive ideal and farther from the negative ideal.",
        "xAxis": {"label": "D+ · distance to positive ideal"},
        "yAxis": {"label": "D− · distance to negative ideal"},
        "data": {"series": [{"key": "alternatives", "label": "Alternatives", "points": points}]},
    }


def build_visualizations(facts: dict[str, Any]) -> list[dict[str, Any]]:
    """Build model-owned views from the same validated facts as the narrative."""
    visualizations = [
        item for item in (
            _ranking_chart(facts),
            _collective_performance_heatmap(facts),
            _ideal_distance_scatter(facts),
        ) if item is not None
    ]
    return visualizations


def build_visualization_sections(facts: dict[str, Any]) -> list[dict[str, Any]]:
    descriptors = {item["key"]: item for item in build_visualizations(facts)}
    definitions = (
        (
            "topsis-relative-closeness",
            "TOPSIS result",
            "Executed relative-closeness scores and the technical ranking.",
            ("topsis-numeric-ranking-scores",),
        ),
        (
            "topsis-collective-performance",
            "Collective performance",
            "Direction-aware collective evaluations, scaled independently within each criterion.",
            ("topsis-collective-performance-profile",),
        ),
        (
            "topsis-ideal-distance-geometry",
            "TOPSIS reference distances",
            "Reconstructed ideal distances validated against the executed relative-closeness scores.",
            ("topsis-numeric-ideal-distances",),
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
