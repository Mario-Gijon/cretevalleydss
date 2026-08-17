from __future__ import annotations

from typing import Any


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


def _percent(
    value: float,
) -> str:
    return (
        f"{float(value) * 100:.2f}%"
    )


def _number(
    value: float,
) -> str:
    return (
        f"{float(value):.6f}"
        .rstrip("0")
        .rstrip(".")
    )


def _preference_interpretation(
    facts: dict[str, Any],
) -> list[str]:
    criteria = facts[
        "criteria"
    ]["items"]

    leaders = facts[
        "criteria"
    ][
        "collectiveLeaders"
    ]

    n_experts = facts[
        "source"
    ]["nExperts"]

    paragraphs: list[str] = [
        (
            "### Criterion preferences "
            "& importance"
        )
    ]

    if len(leaders) == 1:
        leader = next(
            item
            for item in criteria
            if (
                item["criterionId"]
                == leaders[
                    0
                ]["criterionId"]
            )
        )

        paragraphs.append(
            f"**{leader['name']}** has "
            "the highest final criterion "
            f"weight ({_percent(leader['collectiveWeight'])}). "
            "It was ranked first by "
            f"{leader['firstPlaceCount']} "
            f"of {n_experts} evaluator"
            f"{'' if n_experts == 1 else 's'} "
            "and appeared in the top three "
            f"for {leader['topThreeCount']} "
            f"of {n_experts}."
        )

    else:
        leader_items = [
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
                in leaders
            )
        ]

        weight = leader_items[
            0
        ]["collectiveWeight"]

        paragraphs.append(
            f"**{_names(leaders)}** "
            "share the highest final "
            "criterion weight "
            f"({_percent(weight)} each), "
            "so the executed result does "
            "not identify a unique most "
            "important criterion."
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
            item[
                "rankRange"
            ]
            for item
            in widest_items
        ),
        default=0,
    )

    if maximum_range == 0:
        paragraphs.append(
            "The evaluators used the "
            "same ordinal position for "
            "every criterion, so there "
            "is no observed dispersion "
            "in their preference orders."
        )

    elif len(widest) == 1:
        item = widest_items[0]

        paragraphs.append(
            f"**{item['name']}** shows "
            "the widest individual "
            "priority spread, ranging "
            f"from rank {item['minimumRank']} "
            f"to {item['maximumRank']}."
        )

    else:
        paragraphs.append(
            f"**{_names(widest)}** "
            "share the widest individual "
            "priority spread, with a "
            f"rank range of {maximum_range} "
            "positions."
        )

    unanimous_top_three = facts[
        "criteria"
    ][
        "topThreeForEveryExpert"
    ]

    if unanimous_top_three:
        if (
            len(
                unanimous_top_three
            )
            == 1
        ):
            paragraphs.append(
                "All evaluators placed "
                f"**{unanimous_top_three[0]['name']}** "
                "within their top three "
                "criteria."
            )

        else:
            paragraphs.append(
                "All evaluators placed "
                f"**{_names(unanimous_top_three)}** "
                "within their top three "
                "criteria."
            )

    return paragraphs


def _mcc_interpretation(
    facts: dict[str, Any],
) -> list[str]:
    mcc = facts["mcc"]

    if not mcc.get(
        "available"
    ):
        return []

    paragraphs: list[str] = [
        (
            "### MCC consensus "
            "adjustment"
        )
    ]

    total = float(
        mcc[
            "totalAbsoluteAdjustment"
        ]
    )

    if abs(total) <= 1e-12:
        paragraphs.append(
            "MCC found the original "
            "individual utility vectors "
            "already compatible with the "
            "executed consensus constraints, "
            "so no weights needed to "
            "be changed."
        )

    else:
        paragraphs.append(
            "MCC applied a total absolute "
            "adjustment of "
            f"**{_number(total)}** "
            "across all evaluator–criterion "
            "cells. This is adjustment "
            "effort, not a consensus score."
        )

        largest_experts = mcc[
            "largestEffortExperts"
        ]

        expert_effort_by_key = {
            item["expertKey"]: (
                item["effort"]
            )
            for item
            in mcc[
                "effortByExpert"
            ]
        }

        if largest_experts:
            largest_value = (
                expert_effort_by_key[
                    largest_experts[
                        0
                    ]["expertKey"]
                ]
            )

            if (
                len(
                    largest_experts
                )
                == 1
            ):
                paragraphs.append(
                    f"**{largest_experts[0]['name']}** "
                    "required the largest "
                    "overall modification "
                    "(Σ|Δ| = "
                    f"{_number(largest_value)})."
                )

            else:
                paragraphs.append(
                    f"**{_names(largest_experts)}** "
                    "share the largest "
                    "overall modification "
                    "(Σ|Δ| = "
                    f"{_number(largest_value)} "
                    "each)."
                )

        largest_criteria = mcc[
            "largestEffortCriteria"
        ]

        criterion_effort_by_id = {
            item["criterionId"]: (
                item["effort"]
            )
            for item
            in mcc[
                "effortByCriterion"
            ]
        }

        if largest_criteria:
            largest_value = (
                criterion_effort_by_id[
                    largest_criteria[
                        0
                    ]["criterionId"]
                ]
            )

            if (
                len(
                    largest_criteria
                )
                == 1
            ):
                paragraphs.append(
                    "The adjustments are "
                    "most concentrated on "
                    f"**{largest_criteria[0]['name']}** "
                    "(Σ|Δ| = "
                    f"{_number(largest_value)})."
                )

            else:
                paragraphs.append(
                    "The largest "
                    "criterion-level "
                    "adjustment is shared by "
                    f"**{_names(largest_criteria)}** "
                    "(Σ|Δ| = "
                    f"{_number(largest_value)} "
                    "each)."
                )

    paragraphs.append(
        "After adjustment, the largest "
        "absolute distance between an "
        "evaluator weight and the collective "
        "weight is "
        f"**{_number(mcc['maxConsensusDeviation'])}**, "
        "within the executed MCC bound "
        f"ε = **{_number(mcc['epsilon'])}**."
    )

    return paragraphs


def build_interpretation(
    facts: dict[str, Any],
) -> str:
    """
    Build compact Markdown from the
    same validated analytical facts.
    """

    paragraphs = (
        _preference_interpretation(
            facts
        )
    )

    paragraphs.extend(
        _mcc_interpretation(
            facts
        )
    )

    return "\n\n".join(
        paragraphs
    )


__all__ = [
    "build_interpretation"
]