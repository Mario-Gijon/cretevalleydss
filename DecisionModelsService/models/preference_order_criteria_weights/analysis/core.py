from __future__ import annotations

import math
from statistics import mean, median
from typing import Any

from services.results_analysis.mcc_weight_analysis import build_mcc_weight_adjustment_facts

from .evidence import (
    FLOAT_TOLERANCE,
    PreferenceOrderEvidence,
)


def _close(
    left: float,
    right: float,
) -> bool:
    return math.isclose(
        float(left),
        float(right),
        rel_tol=FLOAT_TOLERANCE,
        abs_tol=FLOAT_TOLERANCE,
    )


def _competition_ranks(
    values_by_id: dict[str, float],
) -> tuple[
    dict[str, int],
    dict[str, bool],
]:
    ordered = sorted(
        values_by_id,
        key=lambda item_id: (
            -values_by_id[item_id],
            item_id,
        ),
    )

    ranks: dict[
        str,
        int,
    ] = {}

    tied: dict[
        str,
        bool,
    ] = {}

    previous_value: float | None = None
    previous_rank = 0

    for index, item_id in enumerate(
        ordered,
        start=1,
    ):
        value = values_by_id[
            item_id
        ]

        if (
            previous_value is None
            or not _close(
                value,
                previous_value,
            )
        ):
            previous_rank = index
            previous_value = value

        ranks[
            item_id
        ] = previous_rank

    for item_id in ordered:
        tied[item_id] = (
            sum(
                1
                for other_id in ordered
                if _close(
                    values_by_id[item_id],
                    values_by_id[other_id],
                )
            )
            > 1
        )

    return ranks, tied


def _max_group(
    items: list[dict[str, Any]],
    value_key: str,
) -> list[dict[str, Any]]:
    if not items:
        return []

    maximum = max(
        float(item[value_key])
        for item in items
    )

    return [
        item
        for item in items
        if _close(
            float(item[value_key]),
            maximum,
        )
    ]


def _min_group(
    items: list[dict[str, Any]],
    value_key: str,
) -> list[dict[str, Any]]:
    if not items:
        return []

    minimum = min(
        float(item[value_key])
        for item in items
    )

    return [
        item
        for item in items
        if _close(
            float(item[value_key]),
            minimum,
        )
    ]


def _identity(
    item: dict[str, Any],
    *,
    expert: bool = False,
) -> dict[str, Any]:
    if expert:
        return {
            "expertKey": item[
                "expertKey"
            ],
            "name": item["name"],
        }

    return {
        "criterionId": item[
            "criterionId"
        ],
        "name": item["name"],
    }


def _criteria_facts(
    evidence: PreferenceOrderEvidence,
) -> dict[str, Any]:
    (
        collective_ranks,
        collective_ties,
    ) = _competition_ranks(
        evidence.collective_weights
    )

    items: list[
        dict[str, Any]
    ] = []

    for criterion in evidence.criteria:
        criterion_id = (
            criterion.criterion_id
        )

        individual = [
            {
                "expertKey": (
                    expert.expert_key
                ),
                "expertName": (
                    expert.name
                ),
                "rank": (
                    expert
                    .rank_by_criterion[
                        criterion_id
                    ]
                ),
                "utility": (
                    expert
                    .utility_by_criterion[
                        criterion_id
                    ]
                ),
            }
            for expert
            in evidence.experts
        ]

        ranks = [
            entry["rank"]
            for entry in individual
        ]

        items.append(
            {
                "criterionId": (
                    criterion_id
                ),
                "name": criterion.name,
                "collectiveWeight": (
                    evidence
                    .collective_weights[
                        criterion_id
                    ]
                ),
                "collectiveRank": (
                    collective_ranks[
                        criterion_id
                    ]
                ),
                "collectiveRankTied": (
                    collective_ties[
                        criterion_id
                    ]
                ),
                "individualPreferences": (
                    individual
                ),
                "minimumRank": min(
                    ranks
                ),
                "maximumRank": max(
                    ranks
                ),
                "rankRange": (
                    max(ranks)
                    - min(ranks)
                ),
                "meanRank": mean(
                    ranks
                ),
                "medianRank": median(
                    ranks
                ),
                "firstPlaceCount": sum(
                    rank == 1
                    for rank in ranks
                ),
                "topThreeCount": sum(
                    rank <= 3
                    for rank in ranks
                ),
            }
        )

    leaders = _max_group(
        items,
        "collectiveWeight",
    )

    widest = _max_group(
        items,
        "rankRange",
    )

    stable = _min_group(
        items,
        "rankRange",
    )

    top_three_all = [
        item
        for item in items
        if item["topThreeCount"]
        == len(evidence.experts)
    ]

    return {
        "items": items,
        "collectiveLeaders": [
            _identity(item)
            for item in leaders
        ],
        "widestPreferenceSpread": [
            _identity(item)
            for item in widest
        ],
        "mostStablePreference": [
            _identity(item)
            for item in stable
        ],
        "topThreeForEveryExpert": [
            _identity(item)
            for item in top_three_all
        ],
    }


def _expert_facts(
    evidence: PreferenceOrderEvidence,
) -> dict[str, Any]:
    criterion_names = {
        criterion.criterion_id: (
            criterion.name
        )
        for criterion
        in evidence.criteria
    }

    return {
        "items": [
            {
                "expertKey": (
                    expert.expert_key
                ),
                "name": expert.name,
                "criterionOrder": [
                    {
                        "criterionId": (
                            criterion_id
                        ),
                        "name": (
                            criterion_names[
                                criterion_id
                            ]
                        ),
                        "rank": position,
                        "utility": (
                            expert
                            .utility_by_criterion[
                                criterion_id
                            ]
                        ),
                    }
                    for (
                        position,
                        criterion_id,
                    )
                    in enumerate(
                        expert.criterion_order,
                        start=1,
                    )
                ],
                "weightsByCriterion": dict(
                    expert
                    .utility_by_criterion
                ),
            }
            for expert
            in evidence.experts
        ]
    }


def _mcc_facts(
    evidence: PreferenceOrderEvidence,
) -> dict[str, Any]:
    if evidence.mcc is None:
        return {
            "available": False,
            "reason": "single_expert",
        }

    mcc = evidence.mcc
    return build_mcc_weight_adjustment_facts(
        criteria=[
            {"criterionId": item.criterion_id, "name": item.name}
            for item in evidence.criteria
        ],
        experts=[
            {"expertKey": item.expert_key, "name": item.name}
            for item in evidence.experts
        ],
        original_weights_by_expert=mcc.original_weights_by_expert,
        adjusted_weights_by_expert=mcc.adjusted_weights_by_expert,
        collective_weights_by_criterion=mcc.weights_by_criterion,
        epsilon=mcc.eps,
        objective=mcc.objective,
        status=mcc.status,
    )


def build_core_facts_from_evidence(
    evidence: PreferenceOrderEvidence,
) -> dict[str, Any]:
    """
    Derive deterministic analytical
    facts from validated model evidence.
    """

    criteria = _criteria_facts(
        evidence
    )

    return {
        "source": {
            "phase": (
                evidence.source_phase
            ),
            "nExperts": len(
                evidence.experts
            ),
            "nCriteria": len(
                evidence.criteria
            ),
            "useMcc": (
                evidence.use_mcc
            ),
        },
        "criteria": criteria,
        "experts": _expert_facts(
            evidence
        ),
        "mcc": _mcc_facts(
            evidence
        ),
    }


__all__ = [
    "build_core_facts_from_evidence"
]