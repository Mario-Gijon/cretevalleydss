from __future__ import annotations

from typing import Any


def _names(items: list[dict[str, Any]]) -> str:
    names = [
        str(item.get("name") or "").strip()
        for item in items
    ]
    names = [name for name in names if name]

    if not names:
        return ""
    if len(names) == 1:
        return names[0]
    if len(names) == 2:
        return f"{names[0]} and {names[1]}"
    return ", ".join(names[:-1]) + f", and {names[-1]}"


def _bold_names(items: list[dict[str, Any]]) -> str:
    names = [
        f"**{str(item.get('name') or '').strip()}**"
        for item in items
        if str(item.get("name") or "").strip()
    ]
    if not names:
        return ""
    if len(names) == 1:
        return names[0]
    if len(names) == 2:
        return f"{names[0]} and {names[1]}"
    return ", ".join(names[:-1]) + f", and {names[-1]}"


def _percent(value: float) -> str:
    return f"{float(value) * 100:.2f}%"


def _number(value: float) -> str:
    return f"{float(value):.6f}".rstrip("0").rstrip(".")


def _plural(
    count: int | float,
    singular: str,
    plural: str | None = None,
) -> str:
    return singular if count == 1 else (plural or f"{singular}s")


def _criterion_by_id(
    facts: dict[str, Any],
    criterion_id: str,
) -> dict[str, Any] | None:
    return next(
        (
            item
            for item in facts["criteria"]["items"]
            if item["criterionId"] == criterion_id
        ),
        None,
    )


def _effort_for_expert(
    mcc: dict[str, Any],
    expert_key: str,
) -> float | None:
    item = next(
        (
            entry
            for entry in mcc["effortByExpert"]
            if entry["expertKey"] == expert_key
        ),
        None,
    )
    return None if item is None else float(item["effort"])


def _effort_for_criterion(
    mcc: dict[str, Any],
    criterion_id: str,
) -> float | None:
    item = next(
        (
            entry
            for entry in mcc["effortByCriterion"]
            if entry["criterionId"] == criterion_id
        ),
        None,
    )
    return None if item is None else float(item["effort"])



def _weighting_result_interpretation(
    facts: dict[str, Any],
) -> list[str]:
    """Summarize the weighting-stage result without duplicating the evidence sections."""
    source = facts["source"]
    criteria = facts["criteria"]["items"]
    leaders = facts["criteria"]["collectiveLeaders"]
    n_experts = int(source["nExperts"])
    n_criteria = int(source["nCriteria"])
    mcc = facts["mcc"]

    paragraphs: list[str] = [
        "### Weighting result interpretation",
        "#### Key takeaways",
    ]

    takeaways: list[str] = []

    # Main collective priority.
    if len(leaders) == 1:
        leader = _criterion_by_id(facts, leaders[0]["criterionId"])
        if leader is not None:
            sentence = (
                f"- **{leader['name']}** receives the highest final collective "
                f"weight (**{_percent(leader['collectiveWeight'])}**)."
            )
            if n_experts > 1:
                support = [
                    f"ranked first by **{leader['firstPlaceCount']} of {n_experts}** "
                    "evaluators",
                ]
                if n_criteria >= 3:
                    support.append(
                        f"placed in the top three by **{leader['topThreeCount']} of "
                        f"{n_experts}**"
                    )
                sentence += " It was " + " and ".join(support) + "."
            takeaways.append(sentence)
    else:
        leader_items = [
            item
            for item in criteria
            if any(
                candidate["criterionId"] == item["criterionId"]
                for candidate in leaders
            )
        ]
        weight = leader_items[0]["collectiveWeight"] if leader_items else 0.0
        takeaways.append(
            f"- {_bold_names(leaders)} share the highest final collective weight "
            f"(**{_percent(weight)} each**), so the weighting result has no unique "
            "top criterion."
        )

    # Agreement/disagreement signal.
    if n_experts > 1:
        unanimous_top_three = facts["criteria"]["topThreeForEveryExpert"]
        if unanimous_top_three and n_criteria >= 3:
            verb = "appears" if len(unanimous_top_three) == 1 else "appear"
            takeaways.append(
                f"- Strongest shared-priority signal: {_bold_names(unanimous_top_three)} "
                f"{verb} in every evaluator's top three."
            )

        widest = facts["criteria"]["widestPreferenceSpread"]
        widest_items = [
            item
            for item in criteria
            if any(
                candidate["criterionId"] == item["criterionId"]
                for candidate in widest
            )
        ]
        maximum_range = max(
            (int(item["rankRange"]) for item in widest_items),
            default=0,
        )
        if maximum_range > 0:
            takeaways.append(
                f"- Greatest disagreement in priority position: "
                f"{_bold_names(widest)} (rank range **{maximum_range}**)."
            )

    # MCC reconciliation signal. Keep this intentionally compact; the detailed MCC
    # section below carries the full evidence.
    if mcc.get("available"):
        total = float(mcc["totalAbsoluteAdjustment"])
        if abs(total) <= 1e-12:
            takeaways.append(
                "- The original evaluator utility vectors already satisfied the "
                "executed MCC bound, so **no consensus adjustment was required**."
            )
        else:
            largest_criteria = mcc.get("largestEffortCriteria") or []
            largest_experts = mcc.get("largestEffortExperts") or []
            detail_parts = [
                f"total absolute adjustment **{_number(total)}**",
            ]
            if largest_experts:
                effort = _effort_for_expert(mcc, largest_experts[0]["expertKey"])
                if effort is not None:
                    detail_parts.append(
                        f"largest evaluator movement {_bold_names(largest_experts)} "
                        f"(**Σ|Δ| = {_number(effort)}**)"
                    )
            if largest_criteria:
                effort = _effort_for_criterion(
                    mcc,
                    largest_criteria[0]["criterionId"],
                )
                if effort is not None:
                    detail_parts.append(
                        f"largest criterion-level movement "
                        f"{_bold_names(largest_criteria)} "
                        f"(**Σ|Δ| = {_number(effort)}**)"
                    )
            takeaways.append(
                "- MCC reconciliation was required: " + "; ".join(detail_parts) + "."
            )

        takeaways.append(
            f"- The adjusted profiles satisfy the executed bound "
            f"(**max deviation {_number(mcc['maxConsensusDeviation'])}; "
            f"ε = {_number(mcc['epsilon'])}**)."
        )
    else:
        takeaways.append(
            "- This weighting execution contains one evaluator, so MCC reconciliation "
            "is not applicable."
        )

    paragraphs.append("\n".join(takeaways))

    paragraphs.extend(
        [
            "#### How to read the summary",
            "\n".join(
                [
                    "- Collective importance, agreement in ordinal positions, and MCC "
                    "adjustment effort are **different signals**.",
                    "- A criterion can be collectively important even when evaluators "
                    "disagree about its exact rank.",
                    "- A large MCC adjustment means more reconciliation was needed; it "
                    "does not mean an evaluator was wrong or a criterion was poorly "
                    "chosen.",
                ]
            ),
        ]
    )

    return paragraphs


def _preference_interpretation(
    facts: dict[str, Any],
) -> list[str]:
    criteria = facts["criteria"]["items"]
    leaders = facts["criteria"]["collectiveLeaders"]
    n_experts = facts["source"]["nExperts"]
    n_criteria = facts["source"]["nCriteria"]

    paragraphs: list[str] = [
        "### Criterion preferences & importance",
        "#### Collective result",
    ]

    if len(leaders) == 1:
        leader = next(
            item
            for item in criteria
            if item["criterionId"] == leaders[0]["criterionId"]
        )
        collective_lines = [
            f"- Highest final criterion weight: **{leader['name']}** "
            f"(**{_percent(leader['collectiveWeight'])}**).",
            f"- First-place rankings: **{leader['firstPlaceCount']} of "
            f"{n_experts}** evaluator{'' if n_experts == 1 else 's'}.",
        ]
        if n_criteria >= 3:
            collective_lines.append(
                f"- Top-three appearances: **{leader['topThreeCount']} of "
                f"{n_experts}**."
            )
        paragraphs.append("\n".join(collective_lines))
    else:
        leader_items = [
            item
            for item in criteria
            if any(
                candidate["criterionId"] == item["criterionId"]
                for candidate in leaders
            )
        ]
        weight = leader_items[0]["collectiveWeight"]
        paragraphs.append(
            "\n".join(
                [
                    f"- {_bold_names(leaders)} share the highest final weight "
                    f"(**{_percent(weight)} each**).",
                    "- No unique most important criterion is identified in the "
                    "collective result.",
                ]
            )
        )

    paragraphs.append("#### Agreement and dispersion")

    evidence_lines: list[str] = []

    widest = facts["criteria"]["widestPreferenceSpread"]
    widest_items = [
        item
        for item in criteria
        if any(
            candidate["criterionId"] == item["criterionId"]
            for candidate in widest
        )
    ]
    maximum_range = max(
        (item["rankRange"] for item in widest_items),
        default=0,
    )

    if n_experts > 1:
        if maximum_range == 0:
            evidence_lines.append(
                "- The evaluators used the same ordinal positions, so there is no "
                "observed dispersion in their preference orders."
            )
        else:
            evidence_lines.append(
                f"- Widest priority spread: {_bold_names(widest)} "
                f"(rank range **{maximum_range}**)."
            )

        unanimous_top_three = facts["criteria"]["topThreeForEveryExpert"]
        if unanimous_top_three and n_criteria >= 3:
            evidence_lines.append(
                f"- Unanimous top-three priority: "
                f"{_bold_names(unanimous_top_three)}."
            )

        stable = facts["criteria"].get("mostStablePreference") or []
        stable_items = [
            item
            for item in criteria
            if any(
                candidate["criterionId"] == item["criterionId"]
                for candidate in stable
            )
        ]
        if stable_items:
            stable_range = min(item["rankRange"] for item in stable_items)
            if stable_range < maximum_range:
                evidence_lines.append(
                    f"- Most stable placement: {_bold_names(stable)} "
                    f"(rank range **{stable_range}**)."
                )
    else:
        evidence_lines.append(
            "- Agreement and dispersion across evaluators are not applicable with a "
            "single evaluator."
        )

    paragraphs.append("\n".join(evidence_lines))

    paragraphs.append("#### Interpretation")
    interpretation_lines = [
        "- The collective weight reflects the full set of executed priority "
        "positions, not only the number of first-place rankings.",
    ]
    if n_experts > 1 and maximum_range > 0:
        interpretation_lines.append(
            "- A wider rank range indicates more disagreement about where a criterion "
            "belongs in the priority order."
        )
    if n_experts > 1 and facts["criteria"]["topThreeForEveryExpert"]:
        interpretation_lines.append(
            "- A criterion appearing in every evaluator's top three provides evidence "
            "of a shared high-priority judgement even when exact positions differ."
        )
    paragraphs.append("\n".join(interpretation_lines))

    return paragraphs



def _mcc_interpretation(
    facts: dict[str, Any],
) -> list[str]:
    mcc = facts["mcc"]

    if not mcc.get("available"):
        return []

    paragraphs: list[str] = [
        "### MCC consensus adjustment",
        "#### Adjustment required",
    ]

    total = float(mcc["totalAbsoluteAdjustment"])
    adjustment_lines: list[str] = []

    if abs(total) <= 1e-12:
        adjustment_lines.extend(
            [
                "- No evaluator-derived criterion weight needed to be changed.",
                "- The original utility vectors already satisfied the executed MCC "
                "consensus constraints.",
            ]
        )
    else:
        adjustment_lines.extend(
            [
                f"- Total absolute adjustment: **{_number(total)}**.",
                "- The value aggregates absolute movement across all "
                "evaluator–criterion cells.",
                "- It measures reconciliation effort, not a consensus score.",
            ]
        )

    paragraphs.append("\n".join(adjustment_lines))
    paragraphs.append("#### Where the adjustment was concentrated")

    concentration_lines: list[str] = []

    if abs(total) <= 1e-12:
        concentration_lines.append(
            "- No adjustment concentration exists because no movement was required."
        )
    else:
        largest_experts = mcc["largestEffortExperts"]
        if largest_experts:
            largest_value = _effort_for_expert(
                mcc,
                largest_experts[0]["expertKey"],
            )
            if largest_value is not None:
                concentration_lines.append(
                    f"- Largest evaluator-level movement: "
                    f"{_bold_names(largest_experts)} "
                    f"(**Σ|Δ| = {_number(largest_value)}**)."
                )

        largest_criteria = mcc["largestEffortCriteria"]
        if largest_criteria:
            largest_value = _effort_for_criterion(
                mcc,
                largest_criteria[0]["criterionId"],
            )
            if largest_value is not None:
                concentration_lines.append(
                    f"- Largest accumulated criterion-level adjustment: "
                    f"{_bold_names(largest_criteria)} "
                    f"(**Σ|Δ| = {_number(largest_value)}**)."
                )

        concentration_lines.extend(
            [
                "- Larger movement means more adjustment was required to satisfy the "
                "executed consensus constraints.",
                "- It does not mean an evaluator was wrong or a criterion was "
                "incorrectly selected.",
            ]
        )

    paragraphs.append("\n".join(concentration_lines))
    paragraphs.append("#### Constraint check")
    paragraphs.append(
        "\n".join(
            [
                f"- Maximum evaluator-to-collective deviation after adjustment: "
                f"**{_number(mcc['maxConsensusDeviation'])}**.",
                f"- Executed MCC bound: **ε = {_number(mcc['epsilon'])}**.",
                "- The adjusted profiles satisfy the stored bound.",
                "- ε is the permitted deviation bound; it is not a substantive "
                "agreement score.",
            ]
        )
    )

    return paragraphs


def build_interpretation(
    facts: dict[str, Any],
) -> str:
    """Build deterministic, result-focused Markdown from validated facts."""
    paragraphs = _weighting_result_interpretation(facts)
    paragraphs.extend(_preference_interpretation(facts))
    paragraphs.extend(_mcc_interpretation(facts))
    return "\n\n".join(paragraphs)


__all__ = ["build_interpretation"]
