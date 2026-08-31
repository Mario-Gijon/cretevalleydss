from __future__ import annotations

import math
from typing import Any


def _finite(value: Any) -> bool:
    return (
        not isinstance(value, bool)
        and isinstance(value, (int, float))
        and math.isfinite(float(value))
    )


def _display(
    value: float | int | None,
    digits: int = 6,
) -> float | None:
    if value is None:
        return None
    number = float(value)
    if not math.isfinite(number):
        return None
    rounded = round(number, digits)
    return 0.0 if rounded == -0.0 else rounded


def _tuple_text(tuple_value: dict[str, Any]) -> str:
    label = str(tuple_value.get("label") or tuple_value.get("labelKey") or "")
    alpha = _display(tuple_value.get("alpha"), 4)
    return f"{label} (α={alpha})"


def _final_ranking(
    facts: dict[str, Any],
) -> dict[str, Any] | None:
    ranking = facts["result"]["technicalRanking"]
    if not ranking:
        return None

    sorted_items = sorted(
        ranking,
        key=lambda item: item["technicalRank"],
    )
    winner = facts["result"]["winner"]

    if len(sorted_items) == 1:
        insight = (
            "Only one alternative was evaluated, so the bar shows its final "
            "linguistic position without implying a comparative winner."
        )
    elif winner.get("available"):
        item = winner["alternative"]
        insight = (
            f"{item['name']} is the unique semantic leader at "
            f"β={_display(item['beta'], 4)}."
        )
    else:
        leaders = facts["result"]["leadingGroup"]
        leader_names = ", ".join(item["name"] for item in leaders)
        insight = (
            f"The effective leading group is {leader_names}; technical order "
            "inside an effective tie is retained only for traceability."
        )

    return {
        "key": "two-tuple-final-ranking",
        "type": "bar",
        "title": "Final linguistic ranking",
        "description": (
            "Final 2-tuple assessments represented by their linguistic position β "
            "and ordered exactly as in the executed model."
        ),
        "insight": insight,
        "orientation": "horizontal",
        "xAxis": {"label": "Linguistic position β"},
        "yAxis": {"label": "Alternative"},
        "data": {
            "categories": [item["name"] for item in sorted_items],
            "series": [
                {
                    "key": "final-beta",
                    "label": "Final linguistic position β",
                    "values": [
                        _display(item["beta"])
                        for item in sorted_items
                    ],
                }
            ],
        },
    }


def _collective_profile(
    facts: dict[str, Any],
) -> dict[str, Any] | None:
    alternatives = facts["alternatives"]["items"]
    criteria = facts["criteria"]["items"]

    if not alternatives or not criteria:
        return None

    values: list[list[float | None]] = []
    details: list[list[dict[str, Any]]] = []

    for alternative in alternatives:
        by_criterion = {
            item["criterionId"]: item
            for item in alternative["collectiveCriteria"]
        }

        value_row: list[float | None] = []
        detail_row: list[dict[str, Any]] = []

        for criterion in criteria:
            cell = by_criterion.get(criterion["criterionId"])
            if cell is None:
                value_row.append(None)
                detail_row.append({})
                continue

            tuple_value = cell["tuple"]
            value_row.append(_display(cell["beta"]))
            detail_row.append(
                {
                    "linguisticTerm": tuple_value["label"],
                    "alpha": _display(tuple_value["alpha"], 4),
                    "beta": _display(cell["beta"], 4),
                }
            )

        values.append(value_row)
        details.append(detail_row)

    constant = [
        item["name"]
        for item in criteria
        if not item["hasObservedSeparation"]
    ]
    insight = (
        "No collective alternative separation is observed for "
        + ", ".join(constant)
        + "."
        if constant
        else "Every criterion shows some observed collective β separation."
    )

    return {
        "key": "two-tuple-collective-profile",
        "type": "heatmap",
        "title": "Collective 2-tuple profile",
        "description": (
            "The collective alternative × criterion matrix on the common β scale. "
            "Tooltips preserve the linguistic term and symbolic translation α."
        ),
        "insight": insight,
        "data": {
            "rows": [
                {
                    "key": item["alternativeId"],
                    "label": item["name"],
                }
                for item in alternatives
            ],
            "columns": [
                {
                    "key": item["criterionId"],
                    "label": item["name"],
                }
                for item in criteria
            ],
            "values": values,
            "details": details,
        },
    }


def _criterion_separation(
    facts: dict[str, Any],
) -> dict[str, Any] | None:
    capability = facts["capabilities"][
        "analyzeObservedCriterionSeparation"
    ]
    if not capability.get("available"):
        return None

    criteria = facts["criteria"]["items"]
    if not criteria:
        return None

    ranges = [
        _display(item["betaRange"])
        for item in criteria
    ]
    if not any(_finite(value) for value in ranges):
        return None

    most = facts["criteria"]["mostObservedSeparation"]
    if most.get("available"):
        names = ", ".join(
            item["name"]
            for item in most["criteria"]
        )
        insight = (
            f"Largest observed collective separation: {names} "
            f"(β range {_display(most['betaRange'], 4)})."
        )
    else:
        insight = (
            "Observed β separation is effectively equal across criteria."
        )

    return {
        "key": "two-tuple-criterion-separation",
        "type": "bar",
        "title": "Observed separation by criterion",
        "description": (
            "For each criterion, the bar is max collective β minus min collective β "
            "across alternatives. This is observed separation, not criterion importance "
            "or causal influence."
        ),
        "insight": insight,
        "orientation": "horizontal",
        "xAxis": {"label": "Observed β range"},
        "yAxis": {"label": "Criterion"},
        "data": {
            "categories": [
                item["name"]
                for item in criteria
            ],
            "series": [
                {
                    "key": "beta-range",
                    "label": "Observed β range",
                    "values": ranges,
                }
            ],
        },
    }


def _alpha_heatmap(
    facts: dict[str, Any],
) -> dict[str, Any] | None:
    linguistic = facts["linguistic2Tuple"]
    collective = linguistic["collective"]
    summary = collective["summary"]

    if summary["translatedValueCount"] == 0:
        return None

    alternatives = facts["alternatives"]["items"]
    criteria = facts["criteria"]["items"]
    cells = {
        (item["alternativeId"], item["criterionId"]): item
        for item in collective["items"]
    }

    values: list[list[float | None]] = []
    details: list[list[dict[str, Any]]] = []

    for alternative in alternatives:
        value_row: list[float | None] = []
        detail_row: list[dict[str, Any]] = []

        for criterion in criteria:
            item = cells.get(
                (
                    alternative["alternativeId"],
                    criterion["criterionId"],
                )
            )
            if item is None:
                value_row.append(None)
                detail_row.append({})
                continue

            tuple_value = item["tuple"]
            adjacent = item.get("adjacentLabel")
            value_row.append(
                _display(tuple_value["alpha"], 6)
            )
            detail_row.append(
                {
                    "linguisticTerm": tuple_value["label"],
                    "beta": _display(item["beta"], 4),
                    "direction": item["translationDirection"],
                    "adjacentLabel": (
                        adjacent["label"]
                        if adjacent is not None
                        else "exact label"
                    ),
                }
            )

        values.append(value_row)
        details.append(detail_row)

    strongest = collective["strongestTranslations"]
    if strongest.get("available"):
        strongest_names = ", ".join(
            (
                f"{item['alternativeName']} × "
                f"{item['criterionName']}"
            )
            for item in strongest["items"]
        )
        insight = (
            f"Strongest observed |α| occurs at {strongest_names} "
            f"(|α|={_display(strongest['maxAbsoluteAlpha'], 4)})."
        )
    else:
        insight = (
            "No material symbolic translation is present."
        )

    return {
        "key": "two-tuple-alpha-heatmap",
        "type": "heatmap",
        "title": "Symbolic translation α",
        "description": (
            "α locates the numerical result around its selected linguistic label. "
            "It is symbolic translation, not uncertainty, confidence, or disagreement."
        ),
        "insight": insight,
        "scale": {
            "kind": "diverging",
            "center": 0,
        },
        "data": {
            "rows": [
                {
                    "key": item["alternativeId"],
                    "label": item["name"],
                }
                for item in alternatives
            ],
            "columns": [
                {
                    "key": item["criterionId"],
                    "label": item["name"],
                }
                for item in criteria
            ],
            "values": values,
            "details": details,
        },
    }


def _criteria_aggregation_traces(
    facts: dict[str, Any],
) -> list[dict[str, Any]]:
    aggregation = facts["aggregation"]["criteriaAggregation"]
    summary = aggregation["summary"]
    traces = aggregation["trace"]["alternatives"]
    descriptors: list[dict[str, Any]] = []

    for order, trace in enumerate(
        sorted(
            traces,
            key=lambda item: item["technicalRank"],
        )
    ):
        sources = trace["sources"]
        if not sources:
            continue

        method = summary["method"]
        if method == "l2towa":
            categories = [
                (
                    f"#{source['position']} · "
                    f"{source['criterionName']}"
                )
                for source in sources
            ]
            description = (
                "Contribution to the final β after descending β ordering. "
                "The displayed L2TOWA weight belongs to the ordered position, "
                "not permanently to the criterion."
            )
        else:
            categories = [
                source["criterionName"]
                for source in sources
            ]
            description = (
                "Contribution of each collective criterion β to the final β "
                f"under {summary['methodLabel']}."
            )

        values = [
            _display(source["aggregationContribution"])
            for source in sources
        ]

        weight_text = (
            "Positional OWA weights"
            if method == "l2towa"
            else (
                "Criterion importance weights"
                if summary["usesArgumentImportanceWeights"]
                else "Equal criterion coefficients"
            )
        )

        descriptors.append(
            {
                "key": (
                    "two-tuple-criteria-aggregation-"
                    + trace["alternativeId"]
                ),
                "type": "bar",
                "title": (
                    "Criteria aggregation · "
                    + trace["alternativeName"]
                ),
                "description": description,
                "insight": (
                    f"{weight_text}; contributions sum to final "
                    f"β={_display(trace['aggregatedBeta'], 4)} "
                    f"({_tuple_text(trace['finalTuple'])})."
                ),
                "scope": {
                    "dimension": "alternative",
                    "id": trace["alternativeId"],
                    "label": trace["alternativeName"],
                    "order": order,
                },
                "orientation": "horizontal",
                "xAxis": {"label": "Aggregation contribution to β"},
                "yAxis": {
                    "label": (
                        "Ordered position"
                        if method == "l2towa"
                        else "Criterion"
                    )
                },
                "data": {
                    "categories": categories,
                    "series": [
                        {
                            "key": "aggregation-contribution",
                            "label": "Contribution to final β",
                            "values": values,
                        }
                    ],
                },
            }
        )

    return descriptors


def _evaluator_distance(
    facts: dict[str, Any],
) -> dict[str, Any] | None:
    evaluators = facts["evaluators"]
    if not evaluators["capabilities"]["compareEvaluators"].get(
        "available"
    ):
        return None

    items = evaluators["items"]
    values = [
        _display(
            item["distanceToCollective"][
                "meanAbsoluteBetaDistance"
            ]
        )
        for item in items
    ]

    if not any(
        _finite(value)
        and abs(float(value)) > 1e-12
        for value in values
    ):
        return None

    closest = evaluators["closestToCollective"]
    farthest = evaluators["farthestFromCollective"]

    if closest.get("available") and farthest.get("available"):
        closest_names = ", ".join(
            item["expertLabel"]
            for item in closest["evaluators"]
        )
        farthest_names = ", ".join(
            item["expertLabel"]
            for item in farthest["evaluators"]
        )
        insight = (
            f"Closest profile: {closest_names}. "
            f"Farthest profile: {farthest_names}."
        )
    else:
        insight = (
            "Evaluator distances to the collective profile are effectively tied."
        )

    return {
        "key": "two-tuple-evaluator-distance",
        "type": "bar",
        "title": "Evaluator distance to collective profile",
        "description": (
            "Mean absolute β distance between each evaluator's full "
            "alternative × criterion profile and the executed collective profile. "
            "This is a descriptive alignment diagnostic."
        ),
        "insight": insight,
        "orientation": "horizontal",
        "xAxis": {"label": "Mean absolute β distance"},
        "yAxis": {"label": "Evaluator"},
        "data": {
            "categories": [
                item["expertLabel"]
                for item in items
            ],
            "series": [
                {
                    "key": "profile-distance",
                    "label": "Distance to collective",
                    "values": values,
                }
            ],
        },
    }


def _evaluator_disagreement(
    facts: dict[str, Any],
) -> dict[str, Any] | None:
    disagreement = facts["evaluators"]["cellDisagreement"]
    if not disagreement["availability"].get("available"):
        return None

    items = disagreement["items"]
    if not items:
        return None

    if not any(
        abs(
            float(
                item["meanAbsoluteBetaDistanceToCollective"]
            )
        ) > 1e-12
        for item in items
    ):
        return None

    alternatives = facts["alternatives"]["items"]
    criteria = facts["criteria"]["items"]
    by_cell = {
        (item["alternativeId"], item["criterionId"]): item
        for item in items
    }

    values: list[list[float | None]] = []
    details: list[list[dict[str, Any]]] = []

    for alternative in alternatives:
        value_row: list[float | None] = []
        detail_row: list[dict[str, Any]] = []

        for criterion in criteria:
            item = by_cell.get(
                (
                    alternative["alternativeId"],
                    criterion["criterionId"],
                )
            )
            if item is None:
                value_row.append(None)
                detail_row.append({})
                continue

            value = item[
                "meanAbsoluteBetaDistanceToCollective"
            ]
            value_row.append(_display(value))
            detail_row.append(
                {
                    "collectiveBeta": _display(
                        item["collectiveBeta"],
                        4,
                    ),
                    "weighting": disagreement["weighting"],
                }
            )

        values.append(value_row)
        details.append(detail_row)

    strongest = disagreement["strongestDisagreement"]
    strongest_names = ", ".join(
        (
            f"{item['alternativeName']} × "
            f"{item['criterionName']}"
        )
        for item in strongest["items"]
    )

    return {
        "key": "two-tuple-evaluator-disagreement",
        "type": "heatmap",
        "title": "Evaluator disagreement by cell",
        "description": (
            "Mean absolute evaluator distance around the executed collective β "
            "for each alternative × criterion cell. This measures disagreement, "
            "not counterfactual influence."
        ),
        "insight": (
            f"Strongest observed disagreement: {strongest_names} "
            f"({_display(strongest['value'], 4)} β units)."
        ),
        "data": {
            "rows": [
                {
                    "key": item["alternativeId"],
                    "label": item["name"],
                }
                for item in alternatives
            ],
            "columns": [
                {
                    "key": item["criterionId"],
                    "label": item["name"],
                }
                for item in criteria
            ],
            "values": values,
            "details": details,
        },
    }


def _personal_vs_collective_ranking(
    facts: dict[str, Any],
) -> dict[str, Any] | None:
    evaluators = facts["evaluators"]
    if not evaluators["capabilities"][
        "comparePersonalAndCollectiveRanking"
    ].get("available"):
        return None
    if not evaluators["capabilities"]["compareEvaluators"].get(
        "available"
    ):
        return None

    items = evaluators["items"]
    alternatives = sorted(
        facts["result"]["technicalRanking"],
        key=lambda item: item["technicalRank"],
    )

    by_expert_and_alt: dict[
        tuple[str, str],
        dict[str, Any],
    ] = {}

    for evaluator in items:
        for item in evaluator[
            "alignmentWithCollective"
        ]["alternatives"]:
            by_expert_and_alt[
                (
                    evaluator["expertKey"],
                    item["alternativeId"],
                )
            ] = item

    values: list[list[float | None]] = []
    details: list[list[dict[str, Any]]] = []
    has_difference = False

    for evaluator in items:
        value_row: list[float | None] = []
        detail_row: list[dict[str, Any]] = []

        for alternative in alternatives:
            item = by_expert_and_alt.get(
                (
                    evaluator["expertKey"],
                    alternative["alternativeId"],
                )
            )
            if item is None:
                value_row.append(None)
                detail_row.append({})
                continue

            delta = item[
                "personalRankMinusCollectiveRank"
            ]
            if delta != 0:
                has_difference = True

            value_row.append(float(delta))
            detail_row.append(
                {
                    "personalRank": item[
                        "personalTechnicalRank"
                    ],
                    "collectiveRank": item[
                        "collectiveTechnicalRank"
                    ],
                    "personalBeta": _display(
                        item["personalBeta"],
                        4,
                    ),
                    "collectiveBeta": _display(
                        item["collectiveBeta"],
                        4,
                    ),
                }
            )

        values.append(value_row)
        details.append(detail_row)

    if not has_difference:
        return None

    return {
        "key": "two-tuple-personal-vs-collective-ranking",
        "type": "heatmap",
        "title": "Personal vs collective ranking",
        "description": (
            "Personal technical rank minus collective technical rank. "
            "Positive values mean the evaluator placed the alternative lower "
            "than the collective result; negative values mean higher."
        ),
        "insight": (
            "Zero indicates exact technical-rank alignment with the collective "
            "result for that alternative."
        ),
        "scale": {
            "kind": "diverging",
            "center": 0,
        },
        "data": {
            "rows": [
                {
                    "key": item["expertKey"],
                    "label": item["expertLabel"],
                }
                for item in items
            ],
            "columns": [
                {
                    "key": item["alternativeId"],
                    "label": item["name"],
                }
                for item in alternatives
            ],
            "values": values,
            "details": details,
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

    items = [
        item
        for item in group["items"]
        if item["available"]
    ]
    if not items:
        return None

    values = [
        _display(
            item["impact"]["totalAbsoluteRankChange"]
        )
        for item in items
    ]
    if not any(
        _finite(value)
        and abs(float(value)) > 1e-12
        for value in values
    ):
        return None

    names = (
        [item["expertLabel"] for item in items]
        if evaluator
        else [item["name"] for item in items]
    )
    changing = (
        group["winnerStateChangingEvaluators"]
        if evaluator
        else group["winnerStateChangingCriteria"]
    )

    if changing:
        changing_names = ", ".join(
            (
                item["expertLabel"]
                if evaluator
                else item["name"]
            )
            for item in changing
        )
        insight = (
            f"Removing {changing_names} changes the semantic winner state."
        )
    else:
        insight = (
            "No available removal changes the semantic winner state."
        )

    return {
        "key": (
            "two-tuple-loeo-rank-impact"
            if evaluator
            else "two-tuple-loco-rank-impact"
        ),
        "type": "bar",
        "title": (
            "LOEO evaluator impact"
            if evaluator
            else "LOCO criterion impact"
        ),
        "description": (
            "Total absolute technical-rank displacement after removing one "
            f"{'evaluator' if evaluator else 'criterion'} and rerunning the "
            "configured 2-tuple aggregation pipeline. This is a counterfactual "
            "diagnostic, not part of the normative 2-tuple method."
        ),
        "insight": insight,
        "orientation": "horizontal",
        "xAxis": {"label": "Total absolute rank displacement"},
        "yAxis": {
            "label": (
                "Evaluator"
                if evaluator
                else "Criterion"
            )
        },
        "data": {
            "categories": names,
            "series": [
                {
                    "key": "rank-impact",
                    "label": "Rank displacement",
                    "values": values,
                }
            ],
        },
    }


def _sensitivity_lines(
    facts: dict[str, Any],
    *,
    evaluator: bool,
) -> list[dict[str, Any]]:
    sensitivity = facts["sensitivity"]
    group = (
        sensitivity["expertWeights"]
        if evaluator
        else sensitivity["criterionWeights"]
    )

    if not group["availability"].get("available"):
        return []

    descriptors: list[dict[str, Any]] = []

    for order, item in enumerate(group["items"]):
        if not item.get("available"):
            continue

        points = item.get("points") or []
        if not points:
            continue

        alternatives = facts["alternatives"]["items"]
        x = [
            _display(point["variedWeight"])
            for point in points
        ]
        series = []

        for alternative in alternatives:
            values = []
            for point in points:
                match = next(
                    (
                        entry
                        for entry in point["result"]["finalBetas"]
                        if entry["alternativeId"]
                        == alternative["alternativeId"]
                    ),
                    None,
                )
                values.append(
                    _display(match["value"])
                    if match is not None
                    else None
                )

            series.append(
                {
                    "key": alternative["alternativeId"],
                    "label": alternative["name"],
                    "values": values,
                }
            )

        flattened = [
            float(value)
            for serie in series
            for value in serie["values"]
            if _finite(value)
        ]
        if not flattened:
            continue
        if max(flattened) - min(flattened) <= 1e-12:
            continue

        nearest = item["summary"][
            "nearestObservedWinnerStateChange"
        ]
        if nearest.get("available"):
            insight = (
                "Nearest sampled winner-state change occurs "
                f"{_display(nearest['absoluteWeightChange'], 4)} "
                "weight units from the configured baseline."
            )
        else:
            insight = (
                "No sampled weight in [0, 1] changes the semantic winner state."
            )

        identity = (
            item["expertLabel"]
            if evaluator
            else item["name"]
        )
        identity_key = (
            item["expertKey"]
            if evaluator
            else item["criterionId"]
        )

        descriptors.append(
            {
                "key": (
                    (
                        "two-tuple-expert-weight-sensitivity-"
                        if evaluator
                        else "two-tuple-criterion-weight-sensitivity-"
                    )
                    + identity_key
                ),
                "type": "line",
                "title": (
                    (
                        "Evaluator weight sensitivity · "
                        if evaluator
                        else "Criterion weight sensitivity · "
                    )
                    + identity
                ),
                "description": (
                    "Final linguistic position β while varying this "
                    f"{'evaluator' if evaluator else 'criterion'} importance "
                    "weight from 0 to 1. Other importance weights are "
                    "redistributed proportionally. The grid is sampled, so "
                    "changes identify observed intervals rather than exact "
                    "breakpoints."
                ),
                "insight": insight,
                "scope": {
                    "dimension": (
                        "expert"
                        if evaluator
                        else "criterion"
                    ),
                    "id": identity_key,
                    "label": identity,
                    "order": order,
                },
                "xAxis": {"label": "Varied importance weight"},
                "yAxis": {"label": "Final linguistic position β"},
                "data": {
                    "x": x,
                    "series": series,
                },
            }
        )

    return descriptors


def build_visualizations(
    facts: dict[str, Any],
) -> list[dict[str, Any]]:
    """Build model-owned visualization descriptors from validated facts."""

    visualizations: list[dict[str, Any]] = []

    for descriptor in (
        _final_ranking(facts),
        _collective_profile(facts),
        _criterion_separation(facts),
        _alpha_heatmap(facts),
        _evaluator_distance(facts),
        _evaluator_disagreement(facts),
        _personal_vs_collective_ranking(facts),
        _counterfactual_rank_impact(
            facts,
            evaluator=False,
        ),
        _counterfactual_rank_impact(
            facts,
            evaluator=True,
        ),
    ):
        if descriptor is not None:
            visualizations.append(descriptor)

    visualizations.extend(
        _criteria_aggregation_traces(facts)
    )
    visualizations.extend(
        _sensitivity_lines(
            facts,
            evaluator=False,
        )
    )
    visualizations.extend(
        _sensitivity_lines(
            facts,
            evaluator=True,
        )
    )

    return visualizations


def build_visualization_sections(
    facts: dict[str, Any],
) -> list[dict[str, Any]]:
    """Group descriptors by model-owned analytical meaning."""

    descriptors = {
        item["key"]: item
        for item in build_visualizations(facts)
    }

    criteria_aggregation_keys = tuple(
        key
        for key in descriptors
        if key.startswith(
            "two-tuple-criteria-aggregation-"
        )
    )
    criterion_sensitivity_keys = tuple(
        key
        for key in descriptors
        if key.startswith(
            "two-tuple-criterion-weight-sensitivity-"
        )
    )
    expert_sensitivity_keys = tuple(
        key
        for key in descriptors
        if key.startswith(
            "two-tuple-expert-weight-sensitivity-"
        )
    )

    sections = (
        (
            "two-tuple-final-result",
            "Final 2-tuple result",
            (
                "Final linguistic positions and observed ordering "
                "of the alternatives."
            ),
            (
                "two-tuple-final-ranking",
            ),
            {},
        ),
        (
            "two-tuple-collective-structure",
            "Collective evaluation structure",
            (
                "Observed collective 2-tuple positions and criterion "
                "separation before final criteria aggregation."
            ),
            (
                "two-tuple-collective-profile",
                "two-tuple-criterion-separation",
            ),
            {},
        ),
        (
            "two-tuple-symbolic-translation",
            "Symbolic translation diagnostics",
            (
                "Symbolic translation α around the selected "
                "linguistic labels."
            ),
            (
                "two-tuple-alpha-heatmap",
            ),
            {},
        ),
        (
            "two-tuple-aggregation",
            "Criteria aggregation",
            (
                "How the configured criteria aggregation produced "
                "the final linguistic position of each alternative."
            ),
            criteria_aggregation_keys,
            {
                "layout": "stacked",
            },
        ),
        (
            "two-tuple-evaluators",
            "Evaluator alignment and disagreement",
            (
                "Evaluator profile distance, cell-level disagreement, "
                "and personal versus collective ordering."
            ),
            (
                "two-tuple-evaluator-distance",
                "two-tuple-evaluator-disagreement",
                "two-tuple-personal-vs-collective-ranking",
            ),
            {},
        ),
        (
            "two-tuple-robustness",
            "Counterfactual robustness",
            (
                "Observed technical-rank impact when removing one "
                "criterion or evaluator and rerunning the configured "
                "aggregation pipeline."
            ),
            (
                "two-tuple-loco-rank-impact",
                "two-tuple-loeo-rank-impact",
            ),
            {},
        ),
        (
            "two-tuple-criterion-sensitivity",
            "Criterion weight sensitivity",
            (
                "Final β trajectories under sampled changes to "
                "criterion importance weights."
            ),
            criterion_sensitivity_keys,
            {
                "layout": "stacked",
            },
        ),
        (
            "two-tuple-expert-sensitivity",
            "Evaluator weight sensitivity",
            (
                "Final β trajectories under sampled changes to "
                "evaluator importance weights."
            ),
            expert_sensitivity_keys,
            {
                "layout": "stacked",
            },
        ),
    )

    result: list[dict[str, Any]] = []

    for order, (
        section_id,
        title,
        description,
        keys,
        presentation,
    ) in enumerate(sections):
        section_visualizations = [
            descriptors[key]
            for key in keys
            if key in descriptors
        ]
        if not section_visualizations:
            continue

        section = {
            "id": section_id,
            "title": title,
            "description": description,
            "order": order,
            "visualizations": section_visualizations,
        }
        if presentation:
            section["presentation"] = presentation

        result.append(section)

    return result
