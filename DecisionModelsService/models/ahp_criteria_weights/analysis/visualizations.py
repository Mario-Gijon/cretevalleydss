"""Generic chart descriptors for validated AHP criteria-weight facts."""

from __future__ import annotations

import math
from typing import Any

from services.results_analysis.mcc_weight_analysis import build_mcc_adjustment_heatmap


CRITERION_IMPORTANCE_GUIDE = (
    "Each bar represents the final importance assigned to a criterion. Longer bars indicate greater importance in the weighting system. All criterion weights sum to 100%."
)
INDIVIDUAL_COLLECTIVE_GUIDE = (
    "Each row shows how an expert distributes importance across criteria. The collective row contains the final group weights. Compare values within each column to understand differences between individual and collective priorities."
)
MCC_ADJUSTMENT_GUIDE = (
    "Positive values indicate that MCC increased an expert's original criterion weight; negative values indicate a reduction. Values near zero represent little or no adjustment."
)


def _display(value: float, digits: int = 6) -> float:
    number = float(value)
    if not math.isfinite(number):
        raise ValueError("Visualization values must be finite")
    rounded = round(number, digits)
    return 0.0 if rounded == -0.0 else rounded


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

    rows = [
        {"key": expert["expertKey"], "label": expert["name"], "source": "individual AHP"}
        for expert in experts
    ]
    rows.append({"key": "collective", "label": "Collective", "source": "MCC"})
    values = [
        [_display(float(expert["weightsByCriterion"][criterion["criterionId"]]) * 100, digits=2) for criterion in criteria]
        for expert in experts
    ]
    values.append([_display(float(collective[criterion["criterionId"]]) * 100, digits=2) for criterion in criteria])
    return {
        "key": "ahp-individual-collective-weights",
        "type": "heatmap",
        "title": "Individual vs collective weights",
        "description": INDIVIDUAL_COLLECTIVE_GUIDE,
        "scale": {"min": 0, "max": 100, "valuePrecision": 4, "valueSuffix": "%"},
        "data": {
            "rows": rows,
            "columns": [{"key": item["criterionId"], "label": item["name"]} for item in criteria],
            "values": values,
            "details": [
                [{"source": expert["name"], "valuePrecision": 4} for _ in criteria]
                for expert in experts
            ] + [[{"source": "Final MCC collective weights", "valuePrecision": 4} for _ in criteria]],
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
