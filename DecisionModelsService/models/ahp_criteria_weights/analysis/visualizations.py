"""Chart descriptors for validated AHP criteria-weight evidence."""

from __future__ import annotations

import math
from typing import Any

from services.results_analysis.mcc_weight_analysis import build_mcc_adjustment_heatmap


RANK_TOLERANCE = 1e-12
CRITERION_PRIORITIES_GUIDE = (
    "Each point shows an expert's ordinal position derived from their saved AHP weights; "
    "rank 1 means the greatest weight. Tied weights share a position. The bars below show "
    "the final importance weights as percentages."
)
MCC_ADJUSTMENT_GUIDE = (
    "Each cell shows the change from an expert's original weight in percentage points. "
    "Positive values are increases, negative values are reductions, and zero is no change. "
    "The two bar charts sum absolute changes; increases and reductions both contribute, "
    "so these are not net transfers."
)


def _display(value: float, digits: int = 6) -> float:
    number = float(value)
    if not math.isfinite(number):
        raise ValueError("Visualization values must be finite")
    rounded = round(number, digits)
    return 0.0 if rounded == -0.0 else rounded


def _close_weight(left: float, right: float) -> bool:
    return math.isclose(float(left), float(right), rel_tol=RANK_TOLERANCE, abs_tol=RANK_TOLERANCE)


def _competition_ranks(values_by_id: dict[str, float]) -> tuple[dict[str, int], dict[str, list[str]]]:
    ordered = sorted(values_by_id, key=lambda criterion_id: (-values_by_id[criterion_id], criterion_id))
    ranks: dict[str, int] = {}
    tied_with: dict[str, list[str]] = {}
    previous_value: float | None = None
    previous_rank = 0
    for index, criterion_id in enumerate(ordered, start=1):
        value = values_by_id[criterion_id]
        if previous_value is None or not _close_weight(value, previous_value):
            previous_value = value
            previous_rank = index
        ranks[criterion_id] = previous_rank
    for criterion_id in ordered:
        tied_with[criterion_id] = [
            other_id for other_id in ordered
            if other_id != criterion_id and _close_weight(values_by_id[criterion_id], values_by_id[other_id])
        ]
    return ranks, tied_with


def _individual_priority_distribution(facts: dict[str, Any]) -> dict[str, Any] | None:
    criteria = facts.get("criteria", {}).get("items") or []
    experts = facts.get("experts", {}).get("items") or []
    if not criteria or not experts or not isinstance(facts.get("finalWeightsByCriterion"), dict):
        return None

    criterion_ids = [criterion.get("criterionId") for criterion in criteria]
    if any(not isinstance(criterion_id, str) or not criterion_id for criterion_id in criterion_ids):
        return None
    if len(set(criterion_ids)) != len(criterion_ids):
        return None
    criterion_positions = {criterion_id: index for index, criterion_id in enumerate(criterion_ids, start=1)}
    series = []
    seen_experts: set[str] = set()

    for expert in sorted(experts, key=lambda item: (str(item.get("expertKey", "")).casefold(), str(item.get("expertKey", "")))):
        expert_key = expert.get("expertKey")
        name = expert.get("name")
        weights = expert.get("weightsByCriterion")
        if not isinstance(expert_key, str) or not expert_key or expert_key in seen_experts:
            return None
        if not isinstance(name, str) or not name.strip() or not isinstance(weights, dict) or set(weights) != set(criterion_ids):
            return None
        seen_experts.add(expert_key)
        try:
            numeric_weights = {criterion_id: float(weights[criterion_id]) for criterion_id in criterion_ids}
        except (TypeError, ValueError):
            return None
        if any(not math.isfinite(value) or value <= 0 or value > 1 for value in numeric_weights.values()):
            return None

        ranks, tied_with = _competition_ranks(numeric_weights)
        points = []
        for criterion in criteria:
            criterion_id = criterion["criterionId"]
            weight = numeric_weights[criterion_id]
            details: dict[str, Any] = {
                "expert": name.strip(),
                "criterion": criterion["name"],
                "rank": ranks[criterion_id],
                "weightPercent": weight * 100,
            }
            if tied_with[criterion_id]:
                by_id = {item["criterionId"]: item["name"] for item in criteria}
                details["sharedPositionWith"] = ", ".join(by_id[item_id] for item_id in tied_with[criterion_id])
            points.append({
                "id": f"{expert_key}:{criterion_id}",
                "label": criterion["name"],
                "x": ranks[criterion_id],
                "y": criterion_positions[criterion_id],
                "details": details,
            })
        series.append({"key": expert_key, "label": name.strip(), "points": points})

    return {
        "key": "ahp-derived-priority-distribution",
        "type": "scatter",
        "title": "Individual AHP priority distribution",
        "description": CRITERION_PRIORITIES_GUIDE,
        "presentation": {"preferenceDistribution": {"clusterAxis": "y"}},
        "xAxis": {"label": "Derived AHP position · 1 = greatest weight", "min": 1, "max": len(criteria)},
        "yAxis": {
            "label": "Criterion",
            "min": 0.5,
            "max": len(criteria) + 0.5,
            "categories": [
                {"value": criterion_positions[item["criterionId"]], "key": item["criterionId"], "label": item["name"]}
                for item in criteria
            ],
        },
        "data": {"series": series},
    }


def _collective_criterion_importance(facts: dict[str, Any]) -> dict[str, Any] | None:
    criteria = [
        item for item in facts.get("criteria", {}).get("items", [])
        if isinstance(item.get("collectiveWeight"), (int, float))
        and math.isfinite(float(item["collectiveWeight"]))
    ]
    criteria.sort(key=lambda item: (-float(item["collectiveWeight"]), item["name"].casefold(), item["criterionId"]))
    if not criteria:
        return None
    return {
        "key": "ahp-collective-criterion-importance",
        "type": "bar",
        "title": "Collective criterion importance",
        "description": "Final AHP or MCC weight assigned to each criterion, shown as a percentage.",
        "orientation": "horizontal",
        "xAxis": {"label": "Final importance (%)"},
        "yAxis": {"label": "Criterion"},
        "data": {
            "categories": [item["name"] for item in criteria],
            "series": [{
                "key": "ahp-collective-criterion-importance",
                "label": "Final importance (%)",
                "values": [_display(float(item["collectiveWeight"]) * 100, digits=2) for item in criteria],
            }],
        },
    }


def _mcc_adjustment_descriptors(facts: dict[str, Any]) -> list[dict[str, Any]]:
    mcc = facts.get("mcc") or {}
    if mcc.get("available") is not True:
        return []
    if not mcc.get("materialAdjustments"):
        return []

    criteria = facts["criteria"]["items"]
    experts = facts["experts"]["items"]
    cells = {
        (cell["expertKey"], cell["criterionId"]): cell
        for cell in mcc.get("cells", [])
    }
    if len(cells) != len(criteria) * len(experts):
        return []

    adjustment = build_mcc_adjustment_heatmap(criteria=criteria, experts=experts, mcc=mcc)
    if adjustment is None:
        return []
    adjustment["key"] = "ahp-mcc-adjustment-map"
    adjustment["description"] = MCC_ADJUSTMENT_GUIDE
    adjustment.pop("insight", None)
    adjustment["scale"].update({
        "valuePrecision": 4,
        "valueSuffix": " pp",
        "label": "Change (percentage points)",
        "legend": {"negative": "Decrease", "center": "0", "positive": "Increase"},
    })
    adjustment["presentation"] = {"heatmapStyle": "adjustment"}
    adjustment["data"]["values"] = [
        [_display(float(cells[(expert["expertKey"], criterion["criterionId"])]["delta"]) * 100, digits=4) for criterion in criteria]
        for expert in experts
    ]
    adjustment["data"]["details"] = [
        [
            {
                "Original weight": f"{cell['originalWeight'] * 100}%",
                "Adjusted weight": f"{cell['adjustedWeight'] * 100}%",
                "Collective weight": f"{cell['collectiveWeight'] * 100}%",
                "Change": f"{cell['delta'] * 100} pp",
            }
            for criterion in criteria
            for cell in [cells[(expert["expertKey"], criterion["criterionId"])]]
        ]
        for expert in experts
    ]

    effort_descriptors = []
    for key, title, label, field in (
        ("ahp-mcc-adjustment-effort-by-expert", "Weight adjustment by expert", "Total absolute adjustment (percentage points)", "effortByExpert"),
        ("ahp-mcc-adjustment-effort-by-criterion", "Weight adjustment by criterion", "Total absolute adjustment (percentage points)", "effortByCriterion"),
    ):
        items = sorted(mcc.get(field) or [], key=lambda item: (-float(item["effort"]), str(item["name"]).casefold(), str(item.get("expertKey", item.get("criterionId", "")))))
        if not items:
            continue
        effort_descriptors.append({
            "key": key,
            "type": "bar",
            "title": title,
            "description": "Sum of absolute weight changes; increases and reductions both contribute, so this is not a net transfer.",
            "orientation": "horizontal",
            "xAxis": {"label": label},
            "yAxis": {"label": "Expert" if field == "effortByExpert" else "Criterion"},
            "data": {
                "categories": [item["name"] for item in items],
                "series": [{
                    "key": key,
                    "label": "Total absolute adjustment (percentage points)",
                    "values": [_display(float(item["effort"]) * 100, digits=4) for item in items],
                }],
            },
        })
    return [adjustment, *effort_descriptors]


def build_visualizations(facts: dict[str, Any]) -> list[dict[str, Any]]:
    if facts.get("status") != "available":
        return []
    visualizations = []
    distribution = _individual_priority_distribution(facts)
    importance = _collective_criterion_importance(facts)
    if distribution is not None:
        visualizations.append(distribution)
    if importance is not None:
        visualizations.append(importance)
    visualizations.extend(_mcc_adjustment_descriptors(facts))
    return visualizations


def build_visualization_sections(facts: dict[str, Any]) -> list[dict[str, Any]]:
    descriptors = {item["key"]: item for item in build_visualizations(facts)}
    sections: list[dict[str, Any]] = []
    priority_keys = ("ahp-derived-priority-distribution", "ahp-collective-criterion-importance")
    priority_visualizations = [descriptors[key] for key in priority_keys if key in descriptors]
    if priority_visualizations:
        sections.append({
            "id": "ahp-criterion-priorities-collective-weights",
            "title": "AHP criterion priorities and collective weights",
            "description": "Individual ordinal positions derived from saved AHP weights and the final criterion importance.",
            "order": 0,
            "presentation": {"layout": "stacked"},
            "visualizations": priority_visualizations,
        })

    mcc = facts.get("mcc") or {}
    if mcc.get("available") is True:
        mcc_keys = (
            "ahp-mcc-adjustment-map",
            "ahp-mcc-adjustment-effort-by-expert",
            "ahp-mcc-adjustment-effort-by-criterion",
        )
        mcc_visualizations = [descriptors[key] for key in mcc_keys if key in descriptors]
        presentation = {"layout": "lead-full-width"}
        if not mcc.get("materialAdjustments"):
            presentation["summaryMessage"] = "No material MCC weight adjustments were needed."
        sections.append({
            "id": "ahp-consensus-adjustments",
            "title": "Consensus adjustments",
            "description": "Saved changes from individual AHP weights to their MCC-adjusted values.",
            "order": 1,
            "presentation": presentation,
            "visualizations": mcc_visualizations,
        })

    return sections


__all__ = ["build_visualization_sections", "build_visualizations"]
