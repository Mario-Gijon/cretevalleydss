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
            "The stored result does not contain finite TOPSIS scores, so no score-based "
            "leader can be identified. The available collective evaluations are described below."
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
        return (
            f"{tied_names} share the highest executed TOPSIS score. Their exact tie does "
            "not distinguish a preferred alternative."
        )
    return f"**{_escape(top['name'])}** has the highest executed TOPSIS relative-closeness score."


def _criterion_comparison(facts: dict[str, Any]) -> dict[str, Any] | None:
    result = facts["result"]
    criteria = facts["criteria"]
    alternatives = result["items"]
    if not result["available"] or not criteria["available"] or len(alternatives) < 2:
        return None

    top = alternatives[0]
    top_score_tie = any(group["score"] == top["score"] for group in result["exactScoreTies"])
    if top_score_tie:
        return None
    comparison_alternative = next(
        (item for item in alternatives[1:] if item["score"] != top["score"]),
        None,
    )
    if comparison_alternative is None:
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
            f"{_number(other_value)}; {direction_note}; configured weight "
            f"{_number(criterion.get('configuredWeight'))})"
        )

    lead_in = f"Compared with **{_escape(other['name'])}**, "
    return (
        lead_in + "; ".join(descriptions) + ". The values are compared within each named "
        "criterion, not across criteria with potentially different units. These input patterns "
        "are not evidence that any one criterion caused the final score.",
        comparison,
    )


def _distance_interpretation(facts: dict[str, Any]) -> str | None:
    distances = facts["idealDistances"]
    result = facts["result"]
    alternatives = result["items"]
    if not result["available"] or not distances["available"] or len(alternatives) < 2:
        return None

    leader = alternatives[0]
    if any(group["score"] == leader["score"] for group in result["exactScoreTies"]):
        return None
    comparator = next(
        (item for item in alternatives[1:] if item["score"] != leader["score"]),
        None,
    )
    if comparator is None:
        return None

    distance_by_id = {item["alternativeId"]: item for item in distances["items"]}
    leader_distance = distance_by_id.get(leader["alternativeId"])
    comparator_distance = distance_by_id.get(comparator["alternativeId"])
    if not leader_distance or not comparator_distance:
        return None

    positive_difference = leader_distance["positiveDistance"] - comparator_distance["positiveDistance"]
    negative_difference = leader_distance["negativeDistance"] - comparator_distance["negativeDistance"]
    positive_note = (
        "closer to the most desirable reference"
        if positive_difference < 0
        else "farther from the most desirable reference"
        if positive_difference > 0
        else "at the same distance from the most desirable reference"
    )
    negative_note = (
        "farther from the least desirable reference"
        if negative_difference > 0
        else "closer to the least desirable reference"
        if negative_difference < 0
        else "at the same distance from the least desirable reference"
    )
    direction_matches = positive_difference < 0 and negative_difference > 0
    qualifier = (
        "Both distance directions favor the higher-scoring alternative."
        if direction_matches and positive_difference != 0 and negative_difference != 0
        else "The two distance directions point different ways in this comparison; the executed score combines both positions."
        if positive_difference != 0 and negative_difference != 0
        else "Only one of the two distances differs in this comparison."
    )
    return (
        f"Compared with **{_escape(comparator['name'])}**, **{_escape(leader['name'])}** is "
        f"{positive_note} (D+ {_number(leader_distance['positiveDistance'])} versus "
        f"{_number(comparator_distance['positiveDistance'])}) and {negative_note} "
        f"(D− {_number(leader_distance['negativeDistance'])} versus "
        f"{_number(comparator_distance['negativeDistance'])}). {qualifier}"
    )


def _leading_distance_contributions(facts: dict[str, Any]) -> str | None:
    result = facts["result"]
    distances = facts["idealDistances"]
    if not result["available"] or not distances["available"]:
        return None
    leader = result["items"][0]
    if any(group["score"] == leader["score"] for group in result["exactScoreTies"]):
        return None
    distance = next(
        (item for item in distances["items"] if item["alternativeId"] == leader["alternativeId"]),
        None,
    )
    if distance is None:
        return None

    def largest(field: str) -> list[dict[str, Any]]:
        return sorted(
            (item for item in distance.get(field, []) if item["squaredDistanceContribution"] > 0),
            key=lambda item: (-item["squaredDistanceContribution"], item["criterionId"]),
        )[:2]

    positive = largest("positiveSquaredContributions")
    negative = largest("negativeSquaredContributions")
    if not positive and not negative:
        return None
    positive_text = (
        "the largest gaps from the most desirable reference were on "
        + _name_list([{"name": item["criterionName"]} for item in positive])
        if positive else "there was no gap from the most desirable reference"
    )
    negative_text = (
        "the largest separations from the least desirable reference were on "
        + _name_list([{"name": item["criterionName"]} for item in negative])
        if negative else "there was no separation from the least desirable reference"
    )
    return (
        f"For **{_escape(leader['name'])}**, {positive_text}; {negative_text}. "
        "These squared components describe how the validated distances are made up. They do not add directly to relative closeness or show that a criterion caused the result."
    )


def build_interpretation(facts: dict[str, Any]) -> str:
    """Write a deterministic interpretation from validated TOPSIS facts."""
    sections: list[str] = []
    overall = _overall(facts)
    if overall:
        sections.append(f"### Overall result\n\n{overall}")

    performance, _comparison = _performance(facts)
    if performance:
        title = "Observed criterion trade-offs" if _comparison and {item["relation"] for item in _comparison["comparisons"]} >= {"more_favorable", "less_favorable"} else "Collective performance differences"
        sections.append(f"### {title}\n\n{performance}")

    distance_reading = _distance_interpretation(facts)
    if distance_reading:
        sections.append(f"### Position against the reference profiles\n\n{distance_reading}")

    contribution_reading = _leading_distance_contributions(facts)
    if contribution_reading:
        sections.append(f"### Criteria behind the reference gaps\n\n{contribution_reading}")

    return "\n\n".join(sections)


__all__ = ["build_interpretation"]
