from __future__ import annotations

import math
from typing import Any


def _finite(value: Any) -> bool:
    return (
        not isinstance(value, bool)
        and isinstance(value, (int, float))
        and math.isfinite(float(value))
    )


def _display(value: float | int | None, digits: int = 6) -> float | None:
    if value is None:
        return None
    number = float(value)
    if not math.isfinite(number):
        return None
    rounded = round(number, digits)
    return 0.0 if rounded == -0.0 else rounded


def _names(items: list[dict[str, Any]]) -> str:
    names = [str(item.get("name") or "").strip() for item in items]
    names = [name for name in names if name]
    if not names:
        return ""
    if len(names) == 1:
        return names[0]
    if len(names) == 2:
        return f"{names[0]} and {names[1]}"
    return ", ".join(names[:-1]) + f", and {names[-1]}"


def _distance_scatter(facts: dict[str, Any]) -> dict[str, Any] | None:
    alternatives = facts["alternatives"]["items"]
    if len(alternatives) < 2:
        return None

    points = [
        {
            "id": item["alternativeId"],
            "label": item["name"],
            "x": _display(item["positiveDistance"]),
            "y": _display(item["negativeDistance"]),
            "details": {
                "rank": item["technicalRank"],
                "closeness": _display(item["closeness"]),
            },
        }
        for item in alternatives
    ]
    points = [
        point
        for point in points
        if _finite(point["x"]) and _finite(point["y"])
    ]
    if not points:
        return None

    winner = facts["result"]["winner"]
    insight = (
        f"{winner['alternative']['name']} is the unique semantic leader and lies "
        "closest to the positive ideal in the executed weighted distance space."
        if winner.get("available")
        else "Lower D+ and higher D− are decision-favourable; technical ordering "
        "should still be interpreted together with semantic tie information."
    )
    return {
        "key": "topsis-ideal-distances",
        "type": "scatter",
        "title": "Distance to TOPSIS ideals",
        "description": (
            "Each alternative is positioned by weighted L1 distance to the positive "
            "ideal (D+) and negative ideal (D−). Better positions move left and up."
        ),
        "insight": insight,
        "xAxis": {"label": "D+ · distance to positive ideal"},
        "yAxis": {"label": "D− · distance to negative ideal"},
        "data": {
            "series": [
                {
                    "key": "alternatives",
                    "label": "Alternatives",
                    "points": points,
                }
            ]
        },
    }


def _criterion_discrimination(facts: dict[str, Any]) -> dict[str, Any] | None:
    if not facts["capabilities"]["analyzeCriterionDiscrimination"].get("available"):
        return None

    criteria = facts["criteria"]["items"]
    if not criteria:
        return None

    constant = [
        item
        for item in criteria
        if not item["hasObservedDiscrimination"] and item["hasEffectiveWeight"]
    ]
    if constant:
        insight = (
            f"{_names(constant)} "
            + ("has" if len(constant) == 1 else "have")
            + " positive configured weight but zero observed discrimination."
        )
    else:
        most = facts["criteria"]["mostDiscriminating"]
        insight = (
            f"Largest weighted observed discrimination: {_names(most['criteria'])}."
            if most.get("available")
            else "Weighted observed discrimination is effectively equal across criteria."
        )

    return {
        "key": "criterion-weighted-discrimination",
        "type": "bar",
        "title": "Observed discriminating power by criterion",
        "description": (
            "Weighted discrimination is configured criterion weight multiplied by "
            "the observed collective β range. It is not a counterfactual influence measure."
        ),
        "insight": insight,
        "xAxis": {"label": "Criterion"},
        "yAxis": {"label": "Weight × observed β range"},
        "data": {
            "categories": [item["name"] for item in criteria],
            "series": [
                {
                    "key": "weighted-discrimination",
                    "label": "Weighted discrimination",
                    "values": [
                        _display(item["weightedDiscrimination"])
                        for item in criteria
                    ],
                }
            ],
        },
    }


def _distance_contributions(
    facts: dict[str, Any],
    *,
    positive: bool,
) -> dict[str, Any] | None:
    alternatives = sorted(
        facts["alternatives"]["items"],
        key=lambda item: item["technicalRank"],
    )
    criteria = facts["criteria"]["items"]
    if not alternatives or not criteria:
        return None

    contribution_key = (
        "positiveDistanceContribution"
        if positive
        else "negativeDistanceContribution"
    )
    series = []
    for criterion in criteria:
        criterion_id = criterion["criterionId"]
        values = []
        for alternative in alternatives:
            match = next(
                (
                    item
                    for item in alternative["criteria"]
                    if item["criterionId"] == criterion_id
                ),
                None,
            )
            values.append(
                _display(match[contribution_key]) if match is not None else None
            )
        series.append(
            {
                "key": criterion_id,
                "label": criterion["name"],
                "values": values,
            }
        )

    return {
        "key": (
            "positive-distance-contributions"
            if positive
            else "negative-distance-contributions"
        ),
        "type": "bar",
        "title": (
            "Criterion contributions to D+"
            if positive
            else "Criterion contributions to D−"
        ),
        "description": (
            "Stacked weighted absolute contributions by criterion. D+ measures "
            "distance from the positive ideal."
            if positive
            else "Stacked weighted absolute contributions by criterion. D− measures "
            "separation from the negative ideal."
        ),
        "insight": (
            "A larger D+ contribution is a larger source of distance from the "
            "positive ideal."
            if positive
            else "A larger D− contribution is a larger source of separation from "
            "the negative ideal."
        ),
        "stacked": True,
        "xAxis": {"label": "Alternative"},
        "yAxis": {"label": "Weighted distance contribution"},
        "data": {
            "categories": [item["name"] for item in alternatives],
            "series": series,
        },
    }


def _collective_beta_heatmap(facts: dict[str, Any]) -> dict[str, Any] | None:
    alternatives = facts["alternatives"]["items"]
    criteria = facts["criteria"]["items"]
    if not alternatives or not criteria:
        return None

    values = []
    for alternative in alternatives:
        row = []
        for criterion in criteria:
            cell = next(
                (
                    item
                    for item in alternative["criteria"]
                    if item["criterionId"] == criterion["criterionId"]
                ),
                None,
            )
            row.append(_display(cell["beta"]) if cell is not None else None)
        values.append(row)

    constant = [
        item["name"]
        for item in criteria
        if not item["hasObservedDiscrimination"]
    ]
    insight = (
        f"Constant collective β across alternatives: {', '.join(constant)}."
        if constant
        else "All criteria show observed collective β variation."
    )
    return {
        "key": "collective-beta-heatmap",
        "type": "heatmap",
        "title": "Collective 2-tuple positions",
        "description": (
            "Collective evaluations represented on the numeric β scale. Raw β is "
            "not directly decision-favourable for cost/min criteria."
        ),
        "insight": insight,
        "data": {
            "rows": [
                {"key": item["alternativeId"], "label": item["name"]}
                for item in alternatives
            ],
            "columns": [
                {"key": item["criterionId"], "label": item["name"]}
                for item in criteria
            ],
            "values": values,
        },
    }


def _alpha_heatmap(facts: dict[str, Any]) -> dict[str, Any] | None:
    linguistic = facts["linguistic2Tuple"]
    collective = linguistic["collective"]
    items = collective["items"]
    alternatives = facts["alternatives"]["items"]
    criteria = facts["criteria"]["items"]
    if not items or not alternatives or not criteria:
        return None

    by_cell = {
        (item["alternativeId"], item["criterionId"]): item
        for item in items
    }
    values = [
        [
            _display(
                by_cell[(alternative["alternativeId"], criterion["criterionId"])]
                ["tuple"]["alpha"]
            )
            for criterion in criteria
        ]
        for alternative in alternatives
    ]
    summary = collective["summary"]
    insight = (
        f"{summary['translatedValueCount']} of {summary['valueCount']} collective "
        "values use a non-zero symbolic translation α."
        if summary["translatedValueCount"]
        else "All collective values lie exactly on linguistic labels (α = 0)."
    )
    return {
        "key": "alpha-heatmap",
        "type": "heatmap",
        "title": "Symbolic translation α",
        "description": (
            "α shows the symbolic translation around the selected linguistic label. "
            "It is not uncertainty, confidence, or evaluator disagreement."
        ),
        "insight": insight,
        "data": {
            "rows": [
                {"key": item["alternativeId"], "label": item["name"]}
                for item in alternatives
            ],
            "columns": [
                {"key": item["criterionId"], "label": item["name"]}
                for item in criteria
            ],
            "values": values,
        },
    }


def _evaluator_alignment(facts: dict[str, Any]) -> dict[str, Any] | None:
    evaluators = facts["evaluators"]
    items = evaluators["items"]
    if len(items) < 2:
        return None

    values = [
        _display(item["scaleNormalizedDistanceToCollective"])
        for item in items
    ]
    if not any(_finite(value) and abs(float(value)) > 1e-12 for value in values):
        return None

    return {
        "key": "evaluator-alignment",
        "type": "bar",
        "title": "Evaluator distance to collective profile",
        "description": (
            "Scale-normalized criterion-weighted distance from each evaluator β "
            "matrix to the collective matrix. Evaluator weight is not multiplied "
            "into this alignment metric."
        ),
        "insight": (
            "Equal distances are preserved as ties; the analysis does not select "
            "an arbitrary closest evaluator."
        ),
        "xAxis": {"label": "Evaluator"},
        "yAxis": {"label": "Normalized distance"},
        "data": {
            "categories": [item["name"] for item in items],
            "series": [
                {
                    "key": "alignment-distance",
                    "label": "Distance to collective",
                    "values": values,
                }
            ],
        },
    }


def _disagreement_heatmap(facts: dict[str, Any]) -> dict[str, Any] | None:
    evaluators = facts["evaluators"]
    if not evaluators["capabilities"]["analyzeEvaluatorDisagreement"].get("available"):
        return None

    disagreement = evaluators["disagreement"]
    cells = disagreement["cells"]
    if not cells:
        return None

    alternatives = facts["alternatives"]["items"]
    criteria = facts["criteria"]["items"]
    by_cell = {
        (item["alternativeId"], item["criterionId"]): item
        for item in cells
    }
    values = [
        [
            _display(
                by_cell[(alternative["alternativeId"], criterion["criterionId"])]
                ["scaleNormalizedWeightedMeanAbsoluteDeviation"]
            )
            for criterion in criteria
        ]
        for alternative in alternatives
    ]
    if not any(
        _finite(value) and abs(float(value)) > 1e-12
        for row in values
        for value in row
    ):
        return None

    most = disagreement["byCriterion"]["mostDisagreement"]
    insight = (
        f"Highest mean normalized disagreement: {_names(most['items'])}."
        if most.get("available")
        else "Evaluator disagreement is effectively equal across criteria."
    )
    return {
        "key": "evaluator-disagreement-heatmap",
        "type": "heatmap",
        "title": "Evaluator disagreement by cell",
        "description": (
            "Scale-normalized weighted mean absolute deviation around the collective "
            "β value for each alternative × criterion cell."
        ),
        "insight": insight + " Disagreement is not counterfactual influence.",
        "data": {
            "rows": [
                {"key": item["alternativeId"], "label": item["name"]}
                for item in alternatives
            ],
            "columns": [
                {"key": item["criterionId"], "label": item["name"]}
                for item in criteria
            ],
            "values": values,
        },
    }


def _counterfactual_rank_impact(
    facts: dict[str, Any],
    *,
    evaluator: bool,
) -> dict[str, Any] | None:
    robustness = facts["robustness"]
    group = (
        robustness["leaveOneEvaluatorOut"]
        if evaluator
        else robustness["leaveOneCriterionOut"]
    )
    if not group["availability"].get("available"):
        return None

    items = [item for item in group["items"] if item["available"]]
    if not items:
        return None

    values = [
        _display(item["impact"]["totalAbsoluteRankChange"])
        for item in items
    ]
    winner_changing = (
        group["winnerStateChangingEvaluators"]
        if evaluator
        else group["winnerStateChangingCriteria"]
    )
    identity = "evaluator" if evaluator else "criterion"
    insight = (
        f"Removing {_names(winner_changing)} changes the semantic winner state."
        if winner_changing
        else f"No available leave-one-{identity}-out removal changes the semantic winner state."
    )
    return {
        "key": "loeo-rank-impact" if evaluator else "loco-rank-impact",
        "type": "bar",
        "title": (
            "LOEO technical-rank impact"
            if evaluator
            else "LOCO technical-rank impact"
        ),
        "description": (
            "Total absolute technical-rank displacement after removing one "
            f"{identity}, renormalizing the remaining weights, and recomputing TOPSIS."
        ),
        "insight": insight,
        "xAxis": {"label": "Removed evaluator" if evaluator else "Removed criterion"},
        "yAxis": {"label": "Total absolute rank change"},
        "data": {
            "categories": [item["name"] for item in items],
            "series": [
                {
                    "key": "rank-impact",
                    "label": "Rank displacement",
                    "values": values,
                }
            ],
        },
    }


def _select_sensitivity_items(
    group: dict[str, Any],
    *,
    maximum: int,
) -> list[dict[str, Any]]:
    items = [item for item in group.get("items", []) if item.get("available")]
    if not items:
        return []

    changing = [
        item
        for item in items
        if item["summary"]["winnerStateChangedSampleCount"] > 0
        or item["summary"]["semanticLeadingGroupChangedSampleCount"] > 0
    ]
    ordered = sorted(
        items,
        key=lambda item: (
            -float(item["summary"]["maximumObservedMeanAbsoluteClosenessChange"]),
            str(item.get("name") or ""),
        ),
    )
    selected: list[dict[str, Any]] = []
    for item in [*changing, *ordered]:
        if item in selected:
            continue
        selected.append(item)
        if len(selected) >= maximum:
            break
    return selected


def _sensitivity_lines(
    facts: dict[str, Any],
    *,
    evaluator: bool,
) -> list[dict[str, Any]]:
    sensitivity = facts["sensitivity"]
    group = (
        sensitivity["evaluatorWeights"]
        if evaluator
        else sensitivity["criterionWeights"]
    )
    if not group["availability"].get("available"):
        return []

    selected = _select_sensitivity_items(
        group,
        maximum=3 if evaluator else 4,
    )
    descriptors: list[dict[str, Any]] = []

    for item in selected:
        points = item["points"]
        if not points:
            continue

        alternative_ids = [
            entry["alternativeId"]
            for entry in facts["result"]["technicalRanking"]
        ]
        alternative_names = {
            entry["alternativeId"]: entry["name"]
            for entry in facts["result"]["technicalRanking"]
        }
        series = []
        for alternative_id in alternative_ids:
            values = []
            for point in points:
                closeness_by_id = {
                    value["alternativeId"]: value["value"]
                    for value in point["result"]["closeness"]
                }
                values.append(_display(closeness_by_id[alternative_id]))
            series.append(
                {
                    "key": alternative_id,
                    "label": alternative_names[alternative_id],
                    "values": values,
                }
            )

        summary = item["summary"]
        nearest = summary["nearestObservedWinnerStateChange"]
        if nearest.get("available"):
            nearest_text = (
                f"Nearest sampled winner-state change is "
                f"{round(float(nearest['absoluteWeightChange']) * 100, 2)} percentage "
                "points from the configured weight."
            )
        else:
            nearest_text = "No semantic winner-state change is observed on the sampled grid."

        descriptors.append(
            {
                "key": (
                    f"evaluator-weight-sensitivity-{item['expertKey']}"
                    if evaluator
                    else f"criterion-weight-sensitivity-{item['criterionId']}"
                ),
                "type": "line",
                "title": (
                    f"Weight sensitivity · {item['name']}"
                ),
                "description": (
                    f"TOPSIS closeness while varying the {'evaluator' if evaluator else 'criterion'} "
                    "weight from 0 to 1. Other weights are redistributed proportionally. "
                    "The grid is sampled; changes identify observed intervals, not exact breakpoints."
                ),
                "insight": nearest_text,
                "scope": {
                    "dimension": "expert" if evaluator else "criterion",
                    "id": item["expertKey"] if evaluator else item["criterionId"],
                    "label": item["name"],
                    "order": len(descriptors),
                },
                "xAxis": {"label": "Varied weight"},
                "yAxis": {"label": "TOPSIS closeness", "min": 0, "max": 1},
                "data": {
                    "x": [_display(point["variedWeight"]) for point in points],
                    "series": series,
                },
            }
        )

    return descriptors


def build_visualizations(facts: dict[str, Any]) -> list[dict[str, Any]]:
    """Build model-owned visualization descriptors from the same validated facts."""
    visualizations: list[dict[str, Any]] = []

    for descriptor in (
        _distance_scatter(facts),
        _criterion_discrimination(facts),
        _distance_contributions(facts, positive=True),
        _distance_contributions(facts, positive=False),
        _collective_beta_heatmap(facts),
        _alpha_heatmap(facts),
        _evaluator_alignment(facts),
        _disagreement_heatmap(facts),
        _counterfactual_rank_impact(facts, evaluator=False),
        _counterfactual_rank_impact(facts, evaluator=True),
    ):
        if descriptor is not None:
            visualizations.append(descriptor)

    visualizations.extend(_sensitivity_lines(facts, evaluator=False))
    visualizations.extend(_sensitivity_lines(facts, evaluator=True))
    return visualizations


def build_visualization_sections(facts: dict[str, Any]) -> list[dict[str, Any]]:
    """Group existing descriptors by model-owned analytical meaning."""
    descriptors = {item["key"]: item for item in build_visualizations(facts)}
    sections = (
        (
            "ideal-distances",
            "TOPSIS geometry and ideal distances",
            "Alternative positions and criterion contributions in the executed TOPSIS distance space.",
            ("topsis-ideal-distances", "positive-distance-contributions", "negative-distance-contributions"),
        ),
        (
            "collective-evaluation-structure",
            "Collective evaluation structure",
            "Observed collective 2-tuple positions in the executed collective matrix.",
            ("collective-beta-heatmap",),
        ),
        (
            "symbolic-translation",
            "Symbolic translation diagnostics",
            "Symbolic translation around the selected linguistic labels.",
            ("alpha-heatmap",),
        ),
        (
            "criterion-discrimination",
            "Observed criterion discriminating power",
            "Configured criterion weight multiplied by observed collective β range.",
            ("criterion-weighted-discrimination",),
        ),
        (
            "evaluator-disagreement",
            "Evaluator alignment and disagreement",
            "Aggregate evaluator distance to the collective profile and cell-level disagreement.",
            ("evaluator-alignment", "evaluator-disagreement-heatmap"),
        ),
        (
            "evaluator-influence",
            "LOEO evaluator influence",
            "Technical-rank impact of removing one evaluator and recomputing TOPSIS.",
            ("loeo-rank-impact",),
        ),
        (
            "criterion-influence",
            "Criterion influence",
            "Leave-one-criterion-out technical-rank impact under the existing TOPSIS recomputation evidence.",
            ("loco-rank-impact",),
        ),
        (
            "criterion-weight-sensitivity",
            "Criterion weight sensitivity",
            "TOPSIS closeness under sampled criterion-weight changes.",
            tuple(key for key in descriptors if key.startswith("criterion-weight-sensitivity-")),
            {"layout": "stacked"},
        ),
        (
            "evaluator-weight-sensitivity",
            "Evaluator weight sensitivity",
            "TOPSIS closeness under sampled evaluator-weight changes.",
            tuple(key for key in descriptors if key.startswith("evaluator-weight-sensitivity-")),
            {},
        ),
    )
    return [
        {
            "id": section_id,
            "title": title,
            "description": description,
            "order": order,
            **({"presentation": presentation} if presentation else {}),
            "visualizations": [descriptors[key] for key in keys if key in descriptors],
        }
        for order, section in enumerate(sections)
        for section_id, title, description, keys, presentation in [section if len(section) == 5 else (*section, {})]
        if any(key in descriptors for key in keys)
    ]
