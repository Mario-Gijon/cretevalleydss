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


def _collective_criterion_importance(
    facts: dict[str, Any],
) -> dict[str, Any] | None:
    criteria = sorted(
        facts["criteria"]["items"],
        key=lambda item: (
            -float(item["collectiveWeight"]),
            str(item["name"]).casefold(),
            str(item["criterionId"]),
        ),
    )
    if not criteria:
        return None

    return {
        "key": "collective-criterion-importance",
        "type": "bar",
        "title": "Collective criterion importance",
        "description": (
            "Final collective weight assigned to each criterion after the experts' "
            "preferences were combined."
        ),
        "orientation": "horizontal",
        "xAxis": {"label": "Final collective weight (%)"},
        "yAxis": {"label": "Criterion"},
        "data": {
            "categories": [item["name"] for item in criteria],
            "series": [
                {
                    "key": "collective-criterion-importance",
                    "label": "Final collective weight (%)",
                    "values": [
                        _display(float(item["collectiveWeight"]) * 100, digits=2)
                        for item in criteria
                    ],
                }
            ],
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
        "The calculation left the "
        "original expert weights unchanged."
        if abs(float(total)) <= 1e-6
        else (
            "The calculation adjusted "
            "the expert weight profiles to "
            "meet the configured maximum gap."
        )
    )

    return {
        "key": (
            "mcc-adjustment-map"
        ),
        "type": "heatmap",
        "title": (
            "Weight changes by expert and criterion"
        ),
        "description": (
            "How much the calculation "
            "raised or lowered each expert's "
            "original weight for each criterion."
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
        <= 1e-6
    ):
        insight = (
            "The calculation left all expert "
            "weight profiles unchanged."
        )

    elif len(largest) == 1:
        insight = (
            "The calculation applied the most "
            f"total weight change to {largest[0]['name']}'s profile."
        )

    else:
        insight = (
            "The calculation applied the greatest total change to the profiles of "
            f"{_names(largest)}."
        )

    return {
        "key": (
            "mcc-adjustment-effort-by-expert"
        ),
        "type": "bar",
        "title": (
            "Weight adjustment by expert"
        ),
        "description": (
            "Total amount of model-applied "
            "weight changes across each expert's "
            "criteria. Increases and decreases "
            "both add to this total."
        ),
        "insight": insight,
        "orientation": "horizontal",
        "xAxis": {
            "label": "Total weight moved"
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
                        "Total weight moved"
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
        <= 1e-6
    ):
        insight = (
            "The calculation left all criterion "
            "weights unchanged."
        )

    elif len(largest) == 1:
        insight = (
            "The most total weight change "
            f"accumulated on {largest[0]['name']}."
        )

    else:
        insight = (
            "The most total weight change "
            f"accumulated on {_names(largest)}."
        )

    return {
        "key": (
            "mcc-adjustment-effort-by-criterion"
        ),
        "type": "bar",
        "title": (
            "Weight adjustment by criterion"
        ),
        "description": (
            "Total amount of model-applied "
            "weight changes across experts for "
            "each criterion. Increases and "
            "decreases both add to this total."
        ),
        "insight": insight,
        "orientation": "horizontal",
        "xAxis": {
            "label": "Total weight moved"
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
                        "Total weight moved"
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
    """Build model-owned preference and MCC visualizations."""

    visualizations = [
        _individual_preference_distribution(
            facts
        ),
    ]

    if facts[
        "mcc"
    ].get("available"):
        visualizations.extend(
            [
                _collective_criterion_importance(
                    facts
                ),
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
        "individual-preference-distribution",
        "collective-criterion-importance",
    )

    sections = [
        {
            "id": (
                "criterion-preferences-importance"
            ),
            "title": (
                "Criterion preferences and collective weights"
            ),
            "description": (
                "Individual ordinal priorities and the final collective importance "
                "assigned to each criterion."
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
                    "Consensus adjustments"
                ),
                "description": (
                    "Where the calculation changed original expert weights and how "
                    "much movement was needed."
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
