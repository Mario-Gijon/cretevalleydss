from __future__ import annotations

import math
from typing import Any


def _display(
    value: float | int,
    digits: int = 6,
) -> float:
    number = float(value)

    if not math.isfinite(number):
        raise ValueError(
            "Visualization values "
            "must be finite"
        )

    rounded = round(
        number,
        digits,
    )

    return (
        0.0
        if rounded == -0.0
        else rounded
    )


def _names(
    items: list[dict[str, Any]],
) -> str:
    names = [
        str(
            item.get("name")
            or ""
        ).strip()
        for item in items
    ]

    names = [
        name
        for name in names
        if name
    ]

    if not names:
        return ""

    if len(names) == 1:
        return names[0]

    if len(names) == 2:
        return (
            f"{names[0]} "
            f"and {names[1]}"
        )

    return (
        ", ".join(names[:-1])
        + f", and {names[-1]}"
    )


def _collective_importance(
    facts: dict[str, Any],
) -> dict[str, Any] | None:
    criteria = facts[
        "criteria"
    ]["items"]

    if not criteria:
        return None

    ordered = sorted(
        criteria,
        key=lambda item: (
            -float(
                item[
                    "collectiveWeight"
                ]
            ),
            int(
                item[
                    "collectiveRank"
                ]
            ),
            item["name"],
        ),
    )

    leaders = facts[
        "criteria"
    ]["collectiveLeaders"]

    if len(leaders) == 1:
        insight = (
            f"{leaders[0]['name']} "
            "receives the highest "
            "collective weight."
        )
    else:
        insight = (
            f"{_names(leaders)} "
            "share the highest "
            "collective weight."
        )

    return {
        "key": (
            "collective-criterion-importance"
        ),
        "type": "bar",
        "title": (
            "Collective criterion importance"
        ),
        "description": (
            "Final collective importance "
            "assigned to each criterion after "
            "the executed preference-order "
            "weighting workflow."
        ),
        "insight": insight,
        "orientation": "horizontal",
        "xAxis": {
            "label": (
                "Collective criterion weight"
            )
        },
        "yAxis": {
            "label": "Criterion"
        },
        "data": {
            "categories": [
                item["name"]
                for item in ordered
            ],
            "series": [
                {
                    "key": (
                        "collective-weight"
                    ),
                    "label": (
                        "Collective weight"
                    ),
                    "values": [
                        _display(
                            item[
                                "collectiveWeight"
                            ]
                        )
                        for item
                        in ordered
                    ],
                }
            ],
        },
    }


def _individual_preference_distribution(
    facts: dict[str, Any],
) -> dict[str, Any] | None:
    criteria = facts[
        "criteria"
    ]["items"]

    experts = facts[
        "experts"
    ]["items"]

    if (
        not criteria
        or not experts
    ):
        return None

    criterion_position = {
        item["criterionId"]: index
        for index, item
        in enumerate(
            criteria,
            start=1,
        )
    }

    criterion_name = {
        item["criterionId"]: (
            item["name"]
        )
        for item in criteria
    }

    series = []

    for expert in experts:
        points = []

        for item in expert[
            "criterionOrder"
        ]:
            criterion_id = (
                item[
                    "criterionId"
                ]
            )

            points.append(
                {
                    "id": (
                        f"{expert['expertKey']}:"
                        f"{criterion_id}"
                    ),
                    "label": (
                        f"{expert['name']} · "
                        f"{criterion_name[criterion_id]}"
                    ),
                    "x": item["rank"],
                    "y": (
                        criterion_position[
                            criterion_id
                        ]
                    ),
                    "details": {
                        "expert": (
                            expert[
                                "name"
                            ]
                        ),
                        "criterion": (
                            criterion_name[
                                criterion_id
                            ]
                        ),
                        "rank": (
                            item[
                                "rank"
                            ]
                        ),
                        "utility": _display(
                            item[
                                "utility"
                            ]
                        ),
                    },
                }
            )

        series.append(
            {
                "key": (
                    expert[
                        "expertKey"
                    ]
                ),
                "label": (
                    expert[
                        "name"
                    ]
                ),
                "points": points,
            }
        )

    widest = facts[
        "criteria"
    ][
        "widestPreferenceSpread"
    ]

    widest_items = [
        item
        for item in criteria
        if any(
            candidate[
                "criterionId"
            ]
            == item[
                "criterionId"
            ]
            for candidate
            in widest
        )
    ]

    maximum_range = max(
        (
            item["rankRange"]
            for item
            in widest_items
        ),
        default=0,
    )

    if maximum_range == 0:
        insight = (
            "All evaluators assigned "
            "the same ordinal position "
            "to every criterion."
        )

    elif len(widest) == 1:
        insight = (
            f"{widest[0]['name']} "
            "shows the widest spread "
            "of individual priorities."
        )

    else:
        insight = (
            f"{_names(widest)} "
            "share the widest spread "
            "of individual priorities."
        )

    return {
        "key": (
            "individual-preference-distribution"
        ),
        "type": "scatter",
        "title": (
            "Individual preference distribution"
        ),
        "description": (
            "How each evaluator ranked "
            "every criterion before "
            "collective aggregation. "
            "Rank 1 means most important."
        ),
        "insight": insight,
        "xAxis": {
            "label": (
                "Preference rank · "
                "1 = most important"
            ),
            "min": 1,
            "max": len(criteria),
        },
        "yAxis": {
            "label": "Criterion",
            "min": 0.5,
            "max": (
                len(criteria)
                + 0.5
            ),
            "categories": [
                {
                    "value": index,
                    "key": (
                        item[
                            "criterionId"
                        ]
                    ),
                    "label": (
                        item["name"]
                    ),
                }
                for index, item
                in enumerate(
                    criteria,
                    start=1,
                )
            ],
        },
        "data": {
            "series": series
        },
    }


def _mcc_adjustment_map(
    facts: dict[str, Any],
) -> dict[str, Any] | None:
    mcc = facts["mcc"]

    if not mcc.get(
        "available"
    ):
        return None

    experts = facts[
        "experts"
    ]["items"]

    criteria = facts[
        "criteria"
    ]["items"]

    by_cell = {
        (
            cell["expertKey"],
            cell["criterionId"],
        ): cell
        for cell
        in mcc["cells"]
    }

    values = []
    details = []

    for expert in experts:
        value_row = []
        detail_row = []

        for criterion in criteria:
            cell = by_cell[
                (
                    expert[
                        "expertKey"
                    ],
                    criterion[
                        "criterionId"
                    ],
                )
            ]

            value_row.append(
                _display(
                    cell["delta"]
                )
            )

            detail_row.append(
                {
                    "originalWeight": (
                        _display(
                            cell[
                                "originalWeight"
                            ]
                        )
                    ),
                    "adjustedWeight": (
                        _display(
                            cell[
                                "adjustedWeight"
                            ]
                        )
                    ),
                    "collectiveWeight": (
                        _display(
                            cell[
                                "collectiveWeight"
                            ]
                        )
                    ),
                    "delta": _display(
                        cell[
                            "delta"
                        ]
                    ),
                }
            )

        values.append(
            value_row
        )

        details.append(
            detail_row
        )

    total = mcc[
        "totalAbsoluteAdjustment"
    ]

    insight = (
        "MCC did not need to modify "
        "the individual utility vectors."
        if abs(float(total)) <= 1e-12
        else (
            "Total absolute MCC adjustment "
            "across all evaluator–criterion "
            f"cells is {_display(total)}."
        )
    )

    return {
        "key": (
            "mcc-adjustment-map"
        ),
        "type": "heatmap",
        "title": (
            "MCC adjustment map"
        ),
        "description": (
            "Signed change Δ = adjusted "
            "weight − original weight "
            "applied by MCC to reconcile "
            "individual criterion-weight "
            "vectors."
        ),
        "insight": insight,
        "scale": {
            "kind": "diverging",
            "center": 0,
        },
        "data": {
            "rows": [
                {
                    "key": (
                        expert[
                            "expertKey"
                        ]
                    ),
                    "label": (
                        expert[
                            "name"
                        ]
                    ),
                }
                for expert
                in experts
            ],
            "columns": [
                {
                    "key": (
                        criterion[
                            "criterionId"
                        ]
                    ),
                    "label": (
                        criterion[
                            "name"
                        ]
                    ),
                }
                for criterion
                in criteria
            ],
            "values": values,
            "details": details,
        },
    }


def _mcc_effort_by_expert(
    facts: dict[str, Any],
) -> dict[str, Any] | None:
    mcc = facts["mcc"]

    if not mcc.get(
        "available"
    ):
        return None

    items = sorted(
        mcc[
            "effortByExpert"
        ],
        key=lambda item: (
            -float(
                item["effort"]
            ),
            item["name"],
        ),
    )

    largest = mcc[
        "largestEffortExperts"
    ]

    if not items:
        return None

    if (
        abs(
            float(
                items[
                    0
                ]["effort"]
            )
        )
        <= 1e-12
    ):
        insight = (
            "No evaluator required "
            "any MCC adjustment."
        )

    elif len(largest) == 1:
        insight = (
            f"{largest[0]['name']} "
            "required the largest "
            "overall adjustment."
        )

    else:
        insight = (
            f"{_names(largest)} "
            "share the largest "
            "overall adjustment."
        )

    return {
        "key": (
            "mcc-adjustment-effort-by-expert"
        ),
        "type": "bar",
        "title": (
            "Adjustment effort by expert"
        ),
        "description": (
            "Total absolute modification "
            "required for each evaluator "
            "to satisfy the executed MCC "
            "consensus constraints."
        ),
        "insight": insight,
        "orientation": "horizontal",
        "xAxis": {
            "label": "Σ |Δ|"
        },
        "yAxis": {
            "label": "Evaluator"
        },
        "data": {
            "categories": [
                item["name"]
                for item in items
            ],
            "series": [
                {
                    "key": (
                        "mcc-effort-by-expert"
                    ),
                    "label": (
                        "Adjustment effort"
                    ),
                    "values": [
                        _display(
                            item[
                                "effort"
                            ]
                        )
                        for item
                        in items
                    ],
                }
            ],
        },
    }


def _mcc_effort_by_criterion(
    facts: dict[str, Any],
) -> dict[str, Any] | None:
    mcc = facts["mcc"]

    if not mcc.get(
        "available"
    ):
        return None

    items = sorted(
        mcc[
            "effortByCriterion"
        ],
        key=lambda item: (
            -float(
                item["effort"]
            ),
            item["name"],
        ),
    )

    largest = mcc[
        "largestEffortCriteria"
    ]

    if not items:
        return None

    if (
        abs(
            float(
                items[
                    0
                ]["effort"]
            )
        )
        <= 1e-12
    ):
        insight = (
            "No criterion required "
            "any MCC adjustment."
        )

    elif len(largest) == 1:
        insight = (
            f"{largest[0]['name']} "
            "concentrates the largest "
            "MCC adjustment."
        )

    else:
        insight = (
            f"{_names(largest)} "
            "share the largest "
            "MCC adjustment."
        )

    return {
        "key": (
            "mcc-adjustment-effort-by-criterion"
        ),
        "type": "bar",
        "title": (
            "Adjustment effort by criterion"
        ),
        "description": (
            "Total absolute MCC adjustment "
            "concentrated on each criterion."
        ),
        "insight": insight,
        "orientation": "horizontal",
        "xAxis": {
            "label": "Σ |Δ|"
        },
        "yAxis": {
            "label": "Criterion"
        },
        "data": {
            "categories": [
                item["name"]
                for item in items
            ],
            "series": [
                {
                    "key": (
                        "mcc-effort-by-criterion"
                    ),
                    "label": (
                        "Adjustment effort"
                    ),
                    "values": [
                        _display(
                            item[
                                "effort"
                            ]
                        )
                        for item
                        in items
                    ],
                }
            ],
        },
    }


def build_visualizations(
    facts: dict[str, Any],
) -> list[dict[str, Any]]:
    """
    Build the five agreed
    model-owned visualizations.
    """

    visualizations = [
        _collective_importance(
            facts
        ),
        _individual_preference_distribution(
            facts
        ),
    ]

    if facts[
        "mcc"
    ].get("available"):
        visualizations.extend(
            [
                _mcc_adjustment_map(
                    facts
                ),
                _mcc_effort_by_expert(
                    facts
                ),
                _mcc_effort_by_criterion(
                    facts
                ),
            ]
        )

    return [
        visualization
        for visualization
        in visualizations
        if visualization is not None
    ]


def build_visualization_sections(
    facts: dict[str, Any],
) -> list[dict[str, Any]]:
    """
    Compose visualization sections
    according to model semantics.
    """

    descriptors = {
        item["key"]: item
        for item
        in build_visualizations(
            facts
        )
    }

    preference_keys = (
        "collective-criterion-importance",
        "individual-preference-distribution",
    )

    sections = [
        {
            "id": (
                "criterion-preferences-importance"
            ),
            "title": (
                "Criterion preferences & importance"
            ),
            "description": (
                "Individual ordinal priorities "
                "and the final collective "
                "criterion importance."
            ),
            "order": 0,
            "presentation": {
                "layout": "stacked"
            },
            "visualizations": [
                descriptors[key]
                for key
                in preference_keys
                if key in descriptors
            ],
        }
    ]

    if facts[
        "mcc"
    ].get("available"):
        mcc_keys = (
            "mcc-adjustment-map",
            (
                "mcc-adjustment-"
                "effort-by-expert"
            ),
            (
                "mcc-adjustment-"
                "effort-by-criterion"
            ),
        )

        sections.append(
            {
                "id": (
                    "mcc-consensus-adjustment"
                ),
                "title": (
                    "MCC consensus adjustment"
                ),
                "description": (
                    "Where MCC changed the "
                    "individual utility vectors "
                    "and how much adjustment "
                    "was required."
                ),
                "order": 1,
                "presentation": {
                    "layout": (
                        "lead-full-width"
                    )
                },
                "visualizations": [
                    descriptors[key]
                    for key
                    in mcc_keys
                    if key in descriptors
                ],
            }
        )

    return [
        section
        for section in sections
        if section[
            "visualizations"
        ]
    ]


__all__ = [
    "build_visualization_sections",
    "build_visualizations",
]