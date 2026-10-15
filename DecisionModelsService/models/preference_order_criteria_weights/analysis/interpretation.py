from __future__ import annotations

import math
from typing import Any


_MCC_ZERO_TOLERANCE = 1e-6


def _name(item: dict[str, Any], key: str = "name") -> str:
    value = item.get(key)
    return value.strip() if isinstance(value, str) else ""


def _names(
    items: list[dict[str, Any]],
    *,
    key: str = "name",
    bold: bool = True,
) -> str:
    names = [_name(item, key) for item in items]
    names = [f"**{value}**" if bold else value for value in names if value]
    if len(names) < 2:
        return names[0] if names else ""
    if len(names) == 2:
        return f"{names[0]} and {names[1]}"
    return ", ".join(names[:-1]) + f", and {names[-1]}"


def _finite_number(value: Any) -> float | None:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return None
    number = float(value)
    return number if math.isfinite(number) else None


def _percent(value: float) -> str:
    return f"{value * 100:.2f}%"


def _ordinal(value: int) -> str:
    suffix = "th" if 10 <= value % 100 <= 20 else {1: "st", 2: "nd", 3: "rd"}.get(value % 10, "th")
    return f"{value}{suffix}"


def _criteria(facts: dict[str, Any]) -> list[dict[str, Any]]:
    return (facts.get("criteria") or {}).get("items") or []


def _experts(facts: dict[str, Any]) -> list[dict[str, Any]]:
    return (facts.get("experts") or {}).get("items") or []


def _criteria_by_id(facts: dict[str, Any]) -> dict[str, dict[str, Any]]:
    return {
        item["criterionId"]: item
        for item in _criteria(facts)
        if item.get("criterionId")
    }


def _ordered_criteria(facts: dict[str, Any]) -> list[dict[str, Any]]:
    return sorted(
        _criteria(facts),
        key=lambda item: (
            -float(item.get("collectiveWeight", 0.0)),
            _name(item).casefold(),
            str(item.get("criterionId") or ""),
        ),
    )


def _top_three_share(facts: dict[str, Any]) -> str | None:
    criteria = _ordered_criteria(facts)
    if len(criteria) <= 3:
        return None
    leading = criteria[:3]
    leading_share = sum(float(item["collectiveWeight"]) for item in leading)
    remaining_share = max(0.0, 1.0 - leading_share)
    remaining_count = len(criteria) - len(leading)
    leading_names = _names(leading)
    return (
        f"The three largest weights—{leading_names}—together account for "
        f"**{_percent(leading_share)}** of the total; the other "
        f"{remaining_count} {_plural(remaining_count, 'criterion', 'criteria')} share "
        f"**{_percent(remaining_share)}**."
    )


def _plural(count: int, singular: str, plural: str | None = None) -> str:
    return singular if count == 1 else (plural or f"{singular}s")


def _overall_priorities(facts: dict[str, Any]) -> str | None:
    criteria = _criteria(facts)
    if not criteria:
        return None

    source = facts.get("source") or {}
    n_experts = int(source.get("nExperts") or len(_experts(facts)))
    n_criteria = int(source.get("nCriteria") or len(criteria))
    ordered = _ordered_criteria(facts)
    leaders = (facts.get("criteria") or {}).get("collectiveLeaders") or []
    leader_ids = {item.get("criterionId") for item in leaders}
    leader_items = [item for item in ordered if item.get("criterionId") in leader_ids]
    if not leader_items:
        leader_items = ordered[:1]

    if len(leader_items) == 1:
        leader = leader_items[0]
        leader_name = f"**{_name(leader)}**"
        paragraphs = [
            f"{leader_name} received the greatest final collective importance, "
            f"at **{_percent(float(leader['collectiveWeight']))}**."
        ]
        if n_experts > 1:
            first_count = int(leader.get("firstPlaceCount", 0))
            top_three_count = int(leader.get("topThreeCount", 0))
            if n_criteria > 3 and top_three_count == n_experts and first_count < n_experts:
                paragraphs.append(
                    f"All {n_experts} experts placed it among their three highest "
                    f"priorities, although only {first_count} ranked it first."
                )
            elif first_count == n_experts:
                paragraphs.append(
                    f"All {n_experts} experts ranked it first in their original lists."
                )
            elif first_count > 0:
                paragraphs.append(
                    f"It was ranked first in {first_count} of the {n_experts} original "
                    "lists."
                )
            elif n_criteria > 3 and top_three_count > 0:
                paragraphs.append(
                    f"It appeared among the three highest priorities in "
                    f"{top_three_count} of the {n_experts} original lists."
                )
    else:
        leader_weight = float(leader_items[0]["collectiveWeight"])
        paragraphs = [
            f"{_names(leader_items)} shared the greatest final collective importance, "
            f"at **{_percent(leader_weight)}** each."
        ]

    concentration = _top_three_share(facts)
    if concentration:
        paragraphs.append(concentration)
    if n_experts > 1:
        paragraphs.append(
            "The percentages are final collective weights; ranking positions and "
            "counts refer to the experts' original preference lists."
        )
    return "### Overall priorities\n\n" + " ".join(paragraphs)


def _first_place_split(experts: list[dict[str, Any]], facts: dict[str, Any]) -> str | None:
    if len(experts) > 3:
        return None
    criteria_by_id = _criteria_by_id(facts)
    groups: dict[str, list[str]] = {}
    for expert in experts:
        order = expert.get("criterionOrder") or []
        if not order:
            continue
        criterion_id = order[0].get("criterionId")
        criterion = criteria_by_id.get(criterion_id)
        if criterion:
            groups.setdefault(criterion_id, []).append(_name(expert))
    if len(groups) < 2:
        return None

    clauses = []
    for criterion_id, expert_names in sorted(
        groups.items(),
        key=lambda item: (
            _name(criteria_by_id[item[0]]).casefold(),
            item[0],
        ),
    ):
        names = _names([{"name": value} for value in expert_names], bold=True)
        clauses.append(f"{names} ranked **{_name(criteria_by_id[criterion_id])}** first")
    return "First-place choices were split: " + " and ".join(clauses) + "."


def _most_variable_criterion(
    criteria: list[dict[str, Any]],
) -> dict[str, Any] | None:
    if not criteria:
        return None
    return sorted(
        criteria,
        key=lambda item: (
            -int(item.get("rankRange", 0)),
            _name(item).casefold(),
            str(item.get("criterionId") or ""),
        ),
    )[0]


def _perspectives(facts: dict[str, Any]) -> str | None:
    experts = _experts(facts)
    if not experts:
        return None
    if len(experts) == 1:
        return (
            "### Expert perspectives\n\n"
            f"Only **{_name(experts[0])}** supplied a ranking, so this execution "
            "cannot show whether other experts share these priorities."
        )

    criteria = _criteria(facts)
    preference_facts = facts.get("criteria") or {}
    widest = preference_facts.get("widestPreferenceSpread") or []
    widest_items = [
        item
        for item in criteria
        if any(entry.get("criterionId") == item.get("criterionId") for entry in widest)
    ]
    maximum_range = max((int(item.get("rankRange", 0)) for item in widest_items), default=0)
    paragraphs: list[str] = []

    if maximum_range == 0:
        paragraphs.append(
            "Experts used the same ordinal positions for every criterion."
        )
    elif maximum_range == 1:
        names = _names(widest_items)
        paragraphs.append(
            f"The largest ranking differences were small: the positions for {names} "
            "differed by one place."
        )
    else:
        names = _names(widest_items)
        minimum_rank = min(int(item.get("minimumRank", 1)) for item in widest_items)
        maximum_rank = max(int(item.get("maximumRank", 1)) for item in widest_items)
        if minimum_rank == 1 and maximum_rank == len(criteria):
            spread = "from first to last"
        else:
            spread = f"from {_ordinal(minimum_rank)} to {_ordinal(maximum_rank)}"
        paragraphs.append(
            f"The widest differences in ranking concerned {names}; across the panel, "
            f"their positions ranged {spread}."
        )

        example = _most_variable_criterion(widest_items)
        if example:
            preferences = example.get("individualPreferences") or []
            low_rank = min(int(item["rank"]) for item in preferences)
            high_rank = max(int(item["rank"]) for item in preferences)
            low_names = _names(
                [item for item in preferences if int(item["rank"]) == low_rank],
                key="expertName",
            )
            high_names = _names(
                [item for item in preferences if int(item["rank"]) == high_rank],
                key="expertName",
            )
            paragraphs.append(
                f"For example, {low_names} placed **{_name(example)}** "
                f"{_ordinal(low_rank)}, while {high_names} placed it "
                f"{_ordinal(high_rank)}."
            )

    stable = preference_facts.get("mostStablePreference") or []
    stable_items = [
        item
        for item in criteria
        if any(entry.get("criterionId") == item.get("criterionId") for entry in stable)
    ]
    stable_range = min((int(item.get("rankRange", 0)) for item in stable_items), default=0)
    if stable_items and maximum_range > stable_range:
        stable_names = _names(stable_items)
        if stable_range == 0:
            paragraphs.append(
                f"Everyone assigned {stable_names} the same position in their lists."
            )
        else:
            paragraphs.append(
                f"Positions for {stable_names} were more consistent, varying by "
                f"{stable_range} {_plural(stable_range, 'place')} across the panel."
            )

    split = _first_place_split(experts, facts)
    if split:
        paragraphs.append(split)

    return "### Expert perspectives\n\n" + " ".join(paragraphs)


def _largest_adjustment_sentence(
    mcc: dict[str, Any],
    *,
    list_key: str,
    scope: str,
) -> str | None:
    largest = mcc.get(list_key) or []
    if not largest:
        return None
    names = _names(largest)
    if scope == "expert":
        if len(largest) > 1:
            return (
                "The largest overall adjustments were made to the numerical "
                f"preference profiles of {names}."
            )
        return (
            "The largest overall adjustment was made to "
            f"{names}'s numerical preference profile."
        )
    if len(largest) > 1:
        return (
            "The greatest accumulated adjustment was tied across "
            f"{names}."
        )
    return (
        "Across the evaluated criteria, "
        f"{names} required the greatest accumulated adjustment."
    )


def _consensus_adjustments(facts: dict[str, Any]) -> str | None:
    mcc = facts.get("mcc") or {}
    if not mcc.get("available"):
        return None

    total = _finite_number(mcc.get("totalAbsoluteAdjustment"))
    paragraphs: list[str] = []
    if total is None:
        paragraphs.append(
            "The saved adjustment details do not report the amount of change, so this "
            "interpretation cannot determine whether an adjustment was needed."
        )
    elif total <= _MCC_ZERO_TOLERANCE:
        paragraphs.append(
            "No numerical adjustment was needed: the experts' original weights "
            "already met the agreement limits set for the calculation."
        )
    else:
        expert_change = _largest_adjustment_sentence(
            mcc,
            list_key="largestEffortExperts",
            scope="expert",
        )
        criterion_change = _largest_adjustment_sentence(
            mcc,
            list_key="largestEffortCriteria",
            scope="criterion",
        )
        if expert_change:
            paragraphs.append(expert_change)
        else:
            paragraphs.append(
                "The saved diagnostics do not identify which expert profile had the "
                "largest accumulated adjustment."
            )
        if criterion_change:
            paragraphs.append(criterion_change)
        else:
            paragraphs.append(
                "The saved diagnostics do not identify which criterion had the "
                "largest accumulated adjustment across experts."
            )
        paragraphs.append(
            "An adjustment describes a change made by the calculation; it does not "
            "show how far an expert's original preferences were from the collective "
            "result. The experts did not change their original preferences or "
            "independently accept the adjusted weights."
        )

    maximum_gap = _finite_number(mcc.get("maxConsensusDeviation"))
    configured_gap = _finite_number(mcc.get("epsilon"))
    if maximum_gap is None or configured_gap is None:
        paragraphs.append(
            "The saved details do not include both the largest adjusted-to-collective "
            "gap and its configured limit, so the constraint check cannot be confirmed "
            "from this record."
        )
    elif maximum_gap <= configured_gap + 1e-6:
        if total is None or total > _MCC_ZERO_TOLERANCE:
            paragraphs.append(
                "The resulting weights met the agreement limits established for the "
                "calculation."
            )
    else:
        paragraphs.append(
            "The saved result did not meet the agreement limit established for the "
            "calculation."
        )

    return "### Consensus adjustments\n\n" + " ".join(paragraphs)


def _points_worth_reviewing(facts: dict[str, Any]) -> str | None:
    experts = _experts(facts)
    criteria = _criteria(facts)
    if len(experts) < 2:
        return None

    paragraphs: list[str] = []

    preference_facts = facts.get("criteria") or {}
    widest = preference_facts.get("widestPreferenceSpread") or []
    widest_ids = {item.get("criterionId") for item in widest}
    widest_items = [item for item in criteria if item.get("criterionId") in widest_ids]
    example = _most_variable_criterion(widest_items)

    mcc = facts.get("mcc") or {}
    largest_adjusted_ids = {
        item.get("criterionId") for item in (mcc.get("largestEffortCriteria") or [])
    }
    overlapping = [
        item for item in widest_items if item.get("criterionId") in largest_adjusted_ids
    ]
    review_criterion = _most_variable_criterion(overlapping) or example
    if review_criterion:
        positions = review_criterion.get("individualPreferences") or []
        lowest = min((int(item["rank"]) for item in positions), default=0)
        highest = max((int(item["rank"]) for item in positions), default=0)
        if highest - lowest > 1:
            lowest_names = _names(
                [item for item in positions if int(item["rank"]) == lowest],
                key="expertName",
            )
            highest_names = _names(
                [item for item in positions if int(item["rank"]) == highest],
                key="expertName",
            )
            paragraphs.append(
                f"The group may find it useful to discuss the different priorities "
                f"assigned to **{_name(review_criterion)}**, particularly why "
                f"{lowest_names} ranked it {_ordinal(lowest)} while {highest_names} "
                f"ranked it {_ordinal(highest)}. Understanding the reasons behind "
                "these rankings could help the group decide whether the final weight "
                "gives suitable consideration to both perspectives."
            )

    ordered = _ordered_criteria(facts)
    if len(ordered) > 3:
        leading_share = sum(
            float(item.get("collectiveWeight", 0.0)) for item in ordered[:3]
        )
        if leading_share > 0.5 + 1e-9:
            paragraphs.append(
                "The group may also want to confirm that the concentration of "
                "importance among the leading criteria reflects the balance it wants "
                "to maintain."
            )

    if not paragraphs and mcc.get("available"):
        total = _finite_number(mcc.get("totalAbsoluteAdjustment"))
        adjustment_criteria = mcc.get("largestEffortCriteria") or []
        if (
            total is not None
            and total > _MCC_ZERO_TOLERANCE
            and adjustment_criteria
            and (
                review_criterion is None
                or all(
                    item.get("criterionId") != review_criterion.get("criterionId")
                    for item in adjustment_criteria
                )
            )
        ):
            paragraphs.append(
                f"It may be useful to review the original and adjusted weights for "
                f"**{_names(adjustment_criteria)}** to confirm the resulting balance "
                "matches the group's priorities."
            )

    if not paragraphs:
        return None
    return "### Points worth reviewing\n\n" + " ".join(paragraphs)


def build_interpretation(facts: dict[str, Any]) -> str:
    """Build a concise interpretation from validated preference-order facts."""
    sections = [
        _overall_priorities(facts),
        _perspectives(facts),
        _consensus_adjustments(facts),
        _points_worth_reviewing(facts),
    ]
    return "\n\n".join(section for section in sections if section)


__all__ = ["build_interpretation"]
