from __future__ import annotations

from typing import Any


def _escape(value: Any) -> str:
    return str(value).replace("|", r"\|").replace("\n", " ").strip()


def _number(value: Any, digits: int = 4) -> str:
    if not isinstance(value, (int, float)):
        return "unavailable"
    return f"{float(value):.{digits}f}".rstrip("0").rstrip(".") or "0"


def _bold_name(item: dict[str, Any]) -> str:
    return f"**{_escape(item['name'])}**"


def _name_list(items: list[dict[str, Any]]) -> str:
    names = [_bold_name(item) for item in items]
    if len(names) == 1:
        return names[0]
    if len(names) == 2:
        return f"{names[0]} and {names[1]}"
    return ", ".join(names[:-1]) + f", and {names[-1]}"


def _overall(facts: dict[str, Any]) -> str | None:
    result = facts["result"]
    alternatives = result["items"]
    if not alternatives:
        return None
    if not result["available"]:
        return (
            "The stored TOPSIS result does not contain finite relative-closeness scores, "
            "so a score-based leader or separation cannot be interpreted. The remaining "
            "sections describe only collective evaluations that are available."
        )

    top = alternatives[0]
    exact_tie = next(
        (
            group
            for group in result["exactScoreTies"]
            if group["score"] == top["score"]
        ),
        None,
    )
    if exact_tie:
        tied_names = _name_list(exact_tie["alternatives"])
        paragraphs = [
            f"{tied_names} share the highest executed TOPSIS score ({_number(top['score'])}). "
            "Their equal scores do not distinguish between them; the model's sequential "
            "technical ranks do not establish a preference within this exact tie."
        ]
        next_distinct = next((item for item in alternatives if item["score"] != top["score"]), None)
        if next_distinct:
            gap = top["score"] - next_distinct["score"]
            paragraphs.append(
                f"The next distinct score is **{_escape(next_distinct['name'])}** at "
                f"{_number(next_distinct['score'])}, a score difference of {_number(gap)}."
            )
    else:
        paragraphs = [
            f"**{_escape(top['name'])}** has the highest executed TOPSIS relative-closeness "
            f"score ({_number(top['score'])})."
        ]
        if len(alternatives) > 1:
            second = alternatives[1]
            paragraphs.append(
                f"**{_escape(second['name'])}** follows at {_number(second['score'])}; "
                f"the difference between these scores is {_number(top['score'] - second['score'])}."
            )

    paragraphs.append(
        "The score is the distance from the negative (least desirable) reference divided "
        "by the sum of distances from both references. A higher score therefore combines "
        "being farther from the negative reference and closer to the positive (most desirable) "
        "reference; it is relative to the alternatives and evaluations in this execution."
    )
    return "\n\n".join(paragraphs)


def _criterion_comparison(facts: dict[str, Any]) -> dict[str, Any] | None:
    result = facts["result"]
    criteria = facts["criteria"]
    alternatives = result["items"]
    if not criteria["available"] or len(alternatives) < 2:
        return None

    top = alternatives[0]
    next_distinct = next(
        (item for item in alternatives[1:] if item["score"] != top["score"]),
        None,
    ) if result["available"] else None
    comparison_alternative = next_distinct or alternatives[1]
    top_score_tie = any(
        group["score"] == top.get("score")
        for group in result["exactScoreTies"]
    ) if result["available"] else False
    if result["available"] and top["score"] == comparison_alternative["score"]:
        return None

    comparisons = []
    for criterion in criteria["items"]:
        by_id = {item["alternativeId"]: item for item in criterion["evaluationsByAlternative"]}
        top_cell = by_id.get(top["alternativeId"], {})
        other_cell = by_id.get(comparison_alternative["alternativeId"], {})
        left = top_cell.get("value")
        right = other_cell.get("value")
        if not isinstance(left, (int, float)) or not isinstance(right, (int, float)):
            continue
        if left == right:
            relation = "equal"
        elif criterion["direction"] == "max":
            relation = "more_favorable" if left > right else "less_favorable"
        elif criterion["direction"] == "min":
            relation = "more_favorable" if left < right else "less_favorable"
        else:
            continue
        left_position = top_cell.get("relativeFavorability")
        right_position = other_cell.get("relativeFavorability")
        comparisons.append({
            "criterion": criterion,
            "topValue": left,
            "otherValue": right,
            "relation": relation,
            "relativeSeparation": abs(left_position - right_position)
            if isinstance(left_position, (int, float)) and isinstance(right_position, (int, float))
            else 0,
        })

    differences = [item for item in comparisons if item["relation"] != "equal"]
    differences.sort(key=lambda item: (-item["relativeSeparation"], item["criterion"]["index"]))
    return {
        "topAlternative": top,
        "comparisonAlternative": comparison_alternative,
        "topScoreTie": top_score_tie,
        "comparisons": comparisons,
        "mostContrasting": differences[:2],
    }


def _performance(facts: dict[str, Any]) -> tuple[str | None, dict[str, Any] | None]:
    comparison = _criterion_comparison(facts)
    if comparison is None:
        return None, None
    top = comparison["topAlternative"]
    other = comparison["comparisonAlternative"]
    contrasting = comparison["mostContrasting"]
    if not contrasting:
        return (
            f"The available collective evaluations show the same values for **{_escape(top['name'])}** "
            f"and **{_escape(other['name'])}** across the displayed criteria. This describes their "
            "input profiles; it does not explain the TOPSIS result by itself.",
            comparison,
        )

    descriptions = []
    for item in contrasting:
        criterion = item["criterion"]
        direction_note = "higher values are preferable" if criterion["direction"] == "max" else "lower values are preferable"
        if item["relation"] == "more_favorable":
            leader = top["name"]
            value = item["topValue"]
            other_value = item["otherValue"]
        else:
            leader = other["name"]
            value = item["otherValue"]
            other_value = item["topValue"]
        descriptions.append(
            f"**{_escape(leader)}** has the more favorable collective value for "
            f"**{_escape(criterion['name'])}** ({_number(value)} versus "
            f"{_number(other_value)}; {direction_note})"
        )

    lead_in = f"Compared with **{_escape(other['name'])}**, " if facts["result"]["available"] else "Between these alternatives, "
    return (
        lead_in + "; ".join(descriptions) + ". The values are compared within each named "
        "criterion, not across criteria with potentially different units. These input patterns "
        "are not evidence that any one criterion caused the final score.",
        comparison,
    )


def _what_result_suggests(comparison: dict[str, Any] | None) -> str | None:
    if comparison is None:
        return None
    if comparison.get("topScoreTie"):
        return None
    relations = {item["relation"] for item in comparison["comparisons"]}
    if "more_favorable" not in relations or "less_favorable" not in relations:
        return None
    top = comparison["topAlternative"]["name"]
    other = comparison["comparisonAlternative"]["name"]
    return (
        f"The observed profiles show a trade-off between **{_escape(top)}** and "
        f"**{_escape(other)}**: each has a more favorable evaluation on at least one "
        "criterion. TOPSIS combines the weighted, normalized profile against both ideal "
        "references; this comparison is descriptive and does not identify a single decisive "
        "criterion or establish sensitivity to changing inputs."
    )


def build_interpretation(facts: dict[str, Any]) -> str:
    """Write a deterministic interpretation from validated TOPSIS facts."""
    sections: list[str] = []
    overall = _overall(facts)
    if overall:
        sections.append(f"### Overall result\n\n{overall}")

    performance, comparison = _performance(facts)
    if performance:
        sections.append(f"### Performance across criteria\n\n{performance}")

    suggestion = _what_result_suggests(comparison)
    if suggestion:
        sections.append(f"### What the result suggests\n\n{suggestion}")

    if facts["idealDistances"]["available"]:
        sections.append(
            "### Reading the reference distances\n\n"
            "The distance view uses the Euclidean distances reconstructed from the exact "
            "collective matrix, criterion weights, and benefit/cost directions in this "
            "execution. It is shown only because the reconstructed relative-closeness values "
            "match the stored TOPSIS scores."
        )

    return "\n\n".join(sections)


__all__ = ["build_interpretation"]
