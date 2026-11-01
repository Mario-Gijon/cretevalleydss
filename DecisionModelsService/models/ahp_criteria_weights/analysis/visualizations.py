"""Generic chart descriptors for validated AHP criteria-weight facts."""

from __future__ import annotations

import math
from typing import Any

from services.results_analysis.mcc_weight_analysis import build_mcc_adjustment_heatmap


CRITERION_IMPORTANCE_GUIDE = (
    "Each bar represents the final importance assigned to a criterion. Longer bars indicate greater importance in the weighting system. All criterion weights sum to 100%."
)
INDIVIDUAL_COLLECTIVE_GUIDE = (
    "Each row represents a criterion. Colored points show the importance assigned by individual experts, while the diamond marks the final MCC weight. Horizontal distance indicates differences in criterion importance."
)
MCC_ADJUSTMENT_GUIDE = (
    "Each cell shows the change from an expert's original weight in percentage points. Positive values indicate increases, negative values indicate reductions, zero means no adjustment, and color intensity shows the magnitude."
)


def _display(value: float, digits: int = 6) -> float:
    number = float(value)
    if not math.isfinite(number):
        raise ValueError("Visualization values must be finite")
    rounded = round(number, digits)
    return 0.0 if rounded == -0.0 else rounded


def _same_weight_position(left: float, right: float) -> bool:
    """Treat floating-point round-off as a shared plotted position only."""

    return math.isclose(float(left), float(right), rel_tol=1e-12, abs_tol=1e-12)


def _criterion_importance(facts: dict[str, Any]) -> dict[str, Any] | None:
    criteria = [
        item for item in facts["criteria"]["items"]
        if isinstance(item.get("collectiveWeight"), (int, float))
        and math.isfinite(float(item["collectiveWeight"]))
    ]
    criteria.sort(key=lambda item: (-float(item["collectiveWeight"]), item["name"].casefold(), item["criterionId"]))
    if not criteria:
        return None
    return {
        "key": "ahp-criterion-importance",
        "type": "bar",
        "title": "Criterion importance",
        "description": CRITERION_IMPORTANCE_GUIDE,
        "orientation": "horizontal",
        "xAxis": {"label": "Final importance (%)"},
        "yAxis": {"label": "Criterion"},
        "data": {
            "categories": [item["name"] for item in criteria],
            "series": [
                {
                    "key": "ahp-criterion-importance",
                    "label": "Final importance (%)",
                    "values": [_display(float(item["collectiveWeight"]) * 100, digits=2) for item in criteria],
                }
            ],
        },
    }


def _individual_collective_weights(facts: dict[str, Any]) -> dict[str, Any] | None:
    experts = facts["experts"]["items"]
    criteria = facts["criteria"]["items"]
    collective = facts.get("finalWeightsByCriterion")
    if len(experts) < 2 or not collective or facts["mcc"].get("available") is not True:
        return None
    if any(not isinstance(expert.get("weightsByCriterion"), dict) for expert in experts):
        return None

    ordered_experts = sorted(experts, key=lambda item: (item["expertKey"].casefold(), item["expertKey"]))
    points_by_criterion: dict[str, list[tuple[str, str, float]]] = {
        item["criterionId"]: [] for item in criteria
    }
    series = []
    name_counts: dict[str, int] = {}
    for expert in ordered_experts:
        name_counts[expert["name"]] = name_counts.get(expert["name"], 0) + 1
    for expert in ordered_experts:
        expert_label = expert["name"]
        if name_counts[expert_label] > 1:
            expert_label = f"{expert_label} ({expert['expertKey']})"
        points = []
        for index, criterion in enumerate(criteria, start=1):
            weight_percent = float(expert["weightsByCriterion"][criterion["criterionId"]]) * 100
            points_by_criterion[criterion["criterionId"]].append((expert["expertKey"], expert_label, weight_percent))
            points.append({
                "id": f"{expert['expertKey']}:{criterion['criterionId']}",
                "label": criterion["name"],
                "x": weight_percent,
                "y": index,
                "details": {
                    "Expert": expert_label,
                    "Weight (%)": weight_percent,
                    "Source": "Individual AHP",
                },
            })
        series.append({
            "key": expert["expertKey"],
            "label": expert_label,
            "pointStyle": "circle",
            "pointRadius": 5.5,
            "points": points,
        })

    collective_points = []
    for index, criterion in enumerate(criteria, start=1):
        weight_percent = float(collective[criterion["criterionId"]]) * 100
        point_details: dict[str, Any] = {
            "Expert": "Collective",
            "Weight (%)": weight_percent,
            "Source": "MCC collective result",
        }
        point_label = criterion["name"]
        matching_names = [
            name for _key, name, value in points_by_criterion[criterion["criterionId"]]
            if _same_weight_position(value, weight_percent)
        ]
        if matching_names:
            point_details["Coincident with"] = ", ".join(matching_names)
        collective_points.append({
            "id": f"mcc-collective:{criterion['criterionId']}",
            "label": point_label,
            "x": weight_percent,
            "y": index,
            "details": point_details,
        })

    # Add exact-coincidence context to individual tooltips without moving any
    # plotted point or introducing visual jitter.
    for expert, expert_series in zip(ordered_experts, series):
        for point, criterion in zip(expert_series["points"], criteria):
            coincident = [
                name for key, name, value in points_by_criterion[criterion["criterionId"]]
                if _same_weight_position(value, point["x"]) and key != expert["expertKey"]
            ]
            if _same_weight_position(point["x"], float(collective[criterion["criterionId"]]) * 100):
                coincident.append("Collective")
            if coincident:
                point["details"]["Coincident with"] = ", ".join(dict.fromkeys(coincident))

    series.append({
        "key": "mcc-collective",
        "label": "Collective MCC",
        "pointStyle": "rectRot",
        "pointRadius": 7,
        "points": collective_points,
    })
    return {
        "key": "ahp-individual-collective-weights",
        "type": "scatter",
        "title": "Individual vs collective weights",
        "description": INDIVIDUAL_COLLECTIVE_GUIDE,
        "presentation": {
            "stableSeriesColors": True,
            "pointStyleLegend": True,
            "tooltip": {"variant": "point-details"},
        },
        "xAxis": {"label": "Importance (%)", "min": 0, "max": 100, "tickSuffix": "%"},
        "yAxis": {
            "label": "Criterion",
            "min": 0.5,
            "max": len(criteria) + 0.5,
            "reverse": True,
            "categories": [
                {"value": index, "label": criterion["name"]}
                for index, criterion in enumerate(criteria, start=1)
            ],
        },
        "data": {
            "series": series,
        },
    }


def build_visualizations(facts: dict[str, Any]) -> list[dict[str, Any]]:
    """Build applicable model charts without embedding result conclusions."""

    visualizations = []
    importance = _criterion_importance(facts)
    if importance is not None:
        visualizations.append(importance)

    comparison = _individual_collective_weights(facts)
    if comparison is not None:
        visualizations.append(comparison)

    mcc = facts.get("mcc") or {}
    if mcc.get("available") and mcc.get("materialAdjustments"):
        mcc_cells = {
            (cell["expertKey"], cell["criterionId"]): cell
            for cell in mcc["cells"]
        }
        adjustment = build_mcc_adjustment_heatmap(
            criteria=facts["criteria"]["items"],
            experts=facts["experts"]["items"],
            mcc=mcc,
        )
        if adjustment is not None:
            adjustment["key"] = "ahp-mcc-adjustment-map"
            adjustment["description"] = MCC_ADJUSTMENT_GUIDE
            # Keep result-specific conclusions in Interpretation, while the
            # visualization explains only how to read the adjustment values.
            adjustment.pop("insight", None)
            adjustment["scale"].update({
                "valuePrecision": 4,
                "valueSuffix": " pp",
                "label": "Change (percentage points)",
                "legend": {"negative": "Decrease", "center": "0", "positive": "Increase"},
            })
            adjustment["presentation"] = {"heatmapStyle": "adjustment"}
            values = []
            details = []
            for expert in facts["experts"]["items"]:
                value_row = []
                detail_row = []
                for criterion in facts["criteria"]["items"]:
                    cell = mcc_cells[(expert["expertKey"], criterion["criterionId"])]
                    value_row.append(_display(float(cell["delta"]) * 100, digits=4))
                    detail_row.append({
                        "Original weight": f"{cell['originalWeight'] * 100}%",
                        "Adjusted weight": f"{cell['adjustedWeight'] * 100}%",
                        "Collective weight": f"{cell['collectiveWeight'] * 100}%",
                        "Change": f"{cell['delta'] * 100} pp",
                    })
                values.append(value_row)
                details.append(detail_row)
            adjustment["data"]["values"] = values
            adjustment["data"]["details"] = details
            visualizations.append(adjustment)
    return visualizations


def build_visualization_sections(facts: dict[str, Any]) -> list[dict[str, Any]]:
    descriptors = {item["key"]: item for item in build_visualizations(facts)}
    definitions = [
        ("ahp-criterion-importance", "Criterion importance", "How the final AHP or collective weights are distributed across criteria."),
        ("ahp-individual-collective-weights", "Individual vs collective weights", "Individual AHP priorities alongside the persisted MCC group weights."),
        ("ahp-mcc-adjustment-map", "MCC weight adjustments", "Changes between each expert's original AHP weights and their persisted MCC-adjusted weights."),
    ]
    return [
        {
            "id": key,
            "title": title,
            "description": description,
            "order": order,
            "presentation": {"layout": "stacked"},
            "visualizations": [descriptors[key]],
        }
        for order, (key, title, description) in enumerate(definitions)
        if key in descriptors
    ]


__all__ = ["build_visualization_sections", "build_visualizations"]
