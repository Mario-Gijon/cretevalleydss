from __future__ import annotations

from typing import Any


def _number(
    value: float | int | None,
    digits: int = 4,
) -> str:
    if value is None:
        return "—"
    number = float(value)
    if abs(number) < 10 ** (-(digits + 1)):
        number = 0.0
    text = f"{number:.{digits}f}".rstrip("0").rstrip(".")
    return text or "0"


def _percent(
    value: float | int | None,
    digits: int = 1,
) -> str:
    if value is None:
        return "—"
    return f"{float(value) * 100:.{digits}f}%"


def _escape(value: Any) -> str:
    return (
        str(value)
        .replace("|", r"\|")
        .replace("\n", " ")
        .strip()
    )


def _bold_names(
    items: list[dict[str, Any]],
    *,
    key: str = "name",
) -> str:
    names = [
        f"**{_escape(item.get(key, ''))}**"
        for item in items
        if str(item.get(key, "")).strip()
    ]
    if not names:
        return "none"
    if len(names) == 1:
        return names[0]
    if len(names) == 2:
        return f"{names[0]} and {names[1]}"
    return ", ".join(names[:-1]) + f", and {names[-1]}"


def _tuple_text(
    tuple_value: dict[str, Any] | None,
) -> str:
    if not tuple_value:
        return "—"
    label = _escape(
        tuple_value.get("label")
        or tuple_value.get("labelKey")
        or "label"
    )
    alpha = _number(tuple_value.get("alpha"))
    return f"**{label} (α = {alpha})**"


def _ranking_text(
    ranking: list[dict[str, Any]],
) -> str:
    return " > ".join(
        _escape(item["name"])
        for item in ranking
    )


def _method_text(summary: dict[str, Any]) -> str:
    method = summary["method"]

    if method == "arithmetic_mean":
        return (
            "2-tuple arithmetic mean, so every argument enters "
            "with the same effective coefficient"
        )

    if method == "weighted_average":
        return (
            "2-tuple weighted average using the configured "
            "argument-importance weights"
        )

    l2towa = summary.get("l2towa") or {}
    quantifier = _escape(
        l2towa.get("quantifier") or "configured quantifier"
    )
    return (
        f"L2TOWA with the **{quantifier}** quantifier, where "
        "weights belong to descending ordered β positions rather "
        "than permanently to criteria or evaluators"
    )


def _result_interpretation(
    facts: dict[str, Any],
) -> str:
    counts = facts["counts"]
    result = facts["result"]
    ranking = sorted(
        result["technicalRanking"],
        key=lambda item: item["technicalRank"],
    )

    lines = [
        "### Result interpretation",
        "",
        "#### Key takeaways",
        "",
    ]

    if counts["alternatives"] == 1:
        item = ranking[0]
        lines.extend(
            [
                (
                    f"- Only **{_escape(item['name'])}** was evaluated, "
                    "so this execution does not support a comparative "
                    "winner."
                ),
                (
                    f"- Its final assessment is {_tuple_text(item['tuple'])}, "
                    f"corresponding to linguistic position "
                    f"**β = {_number(item['beta'])}**."
                ),
            ]
        )
        return "\n".join(lines)

    winner = result["winner"]

    if winner.get("available"):
        selected = winner["alternative"]
        lines.append(
            (
                f"- **{_escape(selected['name'])} is the unique semantic "
                f"leader**, with final assessment "
                f"{_tuple_text(selected['tuple'])} and "
                f"**β = {_number(selected['beta'])}**."
            )
        )
    else:
        leaders = result["leadingGroup"]
        if winner.get("reason") in {
            "tied_leading_group",
            "no_discrimination",
        }:
            lines.append(
                (
                    "- The execution does **not** support a unique "
                    "preferred alternative."
                )
            )
            lines.append(
                (
                    f"- The effective leading group is "
                    f"{_bold_names(leaders)}."
                )
            )
            lines.append(
                (
                    "- The stored technical order is retained for "
                    "traceability and must not be interpreted as "
                    "substantive superiority inside an effective tie."
                )
            )
        else:
            lines.append(
                "- No unique semantic winner is available for this execution."
            )

    lines.append(
        f"- Stored technical ordering: **{_ranking_text(ranking)}**."
    )

    if result.get("closestAdjacentAlternatives"):
        closest = result["closestAdjacentAlternatives"]
        gap = closest["betaGap"]
        pairs = closest["pairs"]

        if pairs:
            pair_text = ", ".join(
                (
                    f"{_escape(item['higherAlternativeName'])} / "
                    f"{_escape(item['lowerAlternativeName'])}"
                )
                for item in pairs
            )
            lines.append(
                (
                    f"- Smallest adjacent final-β gap: "
                    f"**{_number(gap)}**, observed for {pair_text}."
                )
            )

    return "\n".join(lines)


def _linguistic_interpretation(
    facts: dict[str, Any],
) -> str:
    linguistic = facts["linguistic2Tuple"]
    collective = linguistic["collective"]
    final = linguistic["final"]
    summary = collective["summary"]
    final_summary = final["summary"]

    lines = [
        "### Linguistic 2-tuple interpretation",
        "",
        (
            "- **β** is the numerical position on the common linguistic "
            "term set. **α** is the symbolic translation around the "
            "selected label; it is not uncertainty, confidence, or "
            "evaluator disagreement."
        ),
        (
            f"- Across the collective alternative × criterion matrix, "
            f"**{summary['translatedValueCount']} of "
            f"{summary['valueCount']}** values use a non-zero α "
            f"({_percent(summary['translatedShare'])})."
        ),
    ]

    if summary["translatedValueCount"] == 0:
        lines.append(
            (
                "- Every collective evaluation lies exactly on a "
                "linguistic label, so no symbolic translation is "
                "needed in the collective matrix."
            )
        )
    else:
        strongest = collective["strongestTranslations"]
        if strongest.get("available"):
            descriptions = [
                (
                    f"**{_escape(item['alternativeName'])} × "
                    f"{_escape(item['criterionName'])}** "
                    f"({_tuple_text(item['tuple'])}, "
                    f"β = {_number(item['beta'])})"
                )
                for item in strongest["items"]
            ]
            lines.append(
                (
                    "- Strongest collective symbolic translation: "
                    + ", ".join(descriptions)
                    + f", with **|α| = "
                    f"{_number(strongest['maxAbsoluteAlpha'])}**."
                )
            )

    if final_summary["translatedValueCount"] == 0:
        lines.append(
            (
                "- All final alternative results also fall exactly "
                "on linguistic labels."
            )
        )
    else:
        lines.append(
            (
                f"- **{final_summary['translatedValueCount']} of "
                f"{final_summary['valueCount']}** final alternative "
                "results require non-zero symbolic translation."
            )
        )

    return "\n".join(lines)


def _aggregation_interpretation(
    facts: dict[str, Any],
) -> str:
    aggregation = facts["aggregation"]
    expert = aggregation["expertAggregation"]["summary"]
    criteria = aggregation["criteriaAggregation"]["summary"]

    lines = [
        "### Aggregation interpretation",
        "",
        (
            f"- Evaluator assessments were combined using "
            f"**{_method_text(expert)}**."
        ),
        (
            f"- Collective criterion assessments were then combined "
            f"using **{_method_text(criteria)}**."
        ),
    ]

    if expert["method"] == "l2towa":
        lines.append(
            (
                "- In evaluator L2TOWA, an OWA coefficient belongs to "
                "the evaluator assessment's **ordered β position in "
                "that specific cell**, not to a permanent evaluator "
                "identity."
            )
        )

    if criteria["method"] == "l2towa":
        lines.append(
            (
                "- In criteria L2TOWA, an OWA coefficient belongs to "
                "the **ordered β position for that alternative**. A "
                "criterion can therefore occupy different positions "
                "for different alternatives."
            )
        )

    if criteria["method"] == "weighted_average":
        weights = criteria["effectiveWeights"]
        traces = aggregation["criteriaAggregation"]["trace"][
            "alternatives"
        ]
        if traces:
            first_sources = traces[0]["sources"]
            weighted = [
                {
                    "name": source["criterionName"],
                    "weight": source["effectiveWeight"],
                }
                for source in first_sources
            ]
            weighted.sort(
                key=lambda item: -float(item["weight"])
            )
            top_weight = weighted[0]["weight"]
            top = [
                item
                for item in weighted
                if abs(
                    float(item["weight"])
                    - float(top_weight)
                ) <= 1e-12
            ]
            lines.append(
                (
                    "- Highest configured criterion importance weight: "
                    + _bold_names(top)
                    + f" at **{_percent(top_weight)}**."
                )
            )

    lines.append(
        (
            "- The aggregation traces in the visual analysis show "
            "how the executed β inputs and effective coefficients "
            "combine into each final β."
        )
    )

    return "\n".join(lines)


def _evaluator_interpretation(
    facts: dict[str, Any],
) -> str:
    evaluators = facts["evaluators"]
    items = evaluators["items"]

    lines = [
        "### Evaluator interpretation",
        "",
    ]

    if len(items) == 1:
        only = items[0]
        lines.extend(
            [
                (
                    f"- Only **{_escape(only['expertLabel'])}** "
                    "contributed to alternative evaluation."
                ),
                (
                    "- Evaluator-comparison, disagreement, LOEO, and "
                    "expert-weight comparison are therefore not "
                    "meaningful for this execution."
                ),
            ]
        )
        return "\n".join(lines)

    closest = evaluators["closestToCollective"]
    farthest = evaluators["farthestFromCollective"]

    if closest.get("available"):
        names = _bold_names(
            closest["evaluators"],
            key="expertLabel",
        )
        lines.append(
            (
                f"- Closest evaluator profile to the collective "
                f"matrix: {names}, at mean absolute β distance "
                f"**{_number(closest['value'])}**."
            )
        )

    if farthest.get("available"):
        names = _bold_names(
            farthest["evaluators"],
            key="expertLabel",
        )
        lines.append(
            (
                f"- Farthest evaluator profile from the collective "
                f"matrix: {names}, at mean absolute β distance "
                f"**{_number(farthest['value'])}**."
            )
        )

    disagreement = evaluators["cellDisagreement"]
    if disagreement["availability"].get("available"):
        strongest = disagreement["strongestDisagreement"]
        if strongest["items"]:
            descriptions = [
                (
                    f"**{_escape(item['alternativeName'])} × "
                    f"{_escape(item['criterionName'])}**"
                )
                for item in strongest["items"]
            ]
            lines.append(
                (
                    "- Strongest observed evaluator disagreement: "
                    + ", ".join(descriptions)
                    + f", with mean absolute distance "
                    f"**{_number(strongest['value'])} β units**."
                )
            )

    differing = [
        item
        for item in items
        if not item["alignmentWithCollective"][
            "technicalRankingMatchesCollective"
        ]
    ]
    if differing:
        lines.append(
            (
                f"- **{len(differing)} of {len(items)}** evaluators "
                "produce a personal technical ranking different from "
                "the collective ordering when the same configured "
                "criteria aggregation is applied to their own matrix."
            )
        )
    else:
        lines.append(
            (
                "- Every evaluator's personal technical ranking "
                "matches the collective technical ordering."
            )
        )

    return "\n".join(lines)


def _robustness_group_text(
    group: dict[str, Any],
    *,
    identity: str,
) -> list[str]:
    if not group["availability"].get("available"):
        reason = group["availability"].get("reason")
        if reason == "single_criterion":
            return [
                "- LOCO is unavailable because the execution has only one criterion."
            ]
        if reason == "single_evaluator":
            return [
                "- LOEO is unavailable because the execution has only one evaluator."
            ]
        if reason == "single_alternative":
            return [
                (
                    f"- Leave-one-{identity}-out ranking diagnostics are "
                    "not meaningful with only one alternative."
                )
            ]
        return [
            f"- Leave-one-{identity}-out analysis is unavailable."
        ]

    items = [
        item
        for item in group["items"]
        if item.get("available")
    ]
    if not items:
        return [
            f"- No valid leave-one-{identity}-out counterfactual could be computed."
        ]

    ranking_changes = [
        item
        for item in items
        if item["impact"]["technicalRankingChanged"]
    ]
    winner_changes = (
        group["winnerStateChangingEvaluators"]
        if identity == "evaluator"
        else group["winnerStateChangingCriteria"]
    )

    lines = []

    if ranking_changes:
        lines.append(
            (
                f"- Removing **{len(ranking_changes)} of {len(items)}** "
                f"available {identity}s changes the stored technical "
                "ranking."
            )
        )
    else:
        lines.append(
            (
                f"- The technical ranking is stable across every "
                f"available leave-one-{identity}-out removal."
            )
        )

    if winner_changes:
        lines.append(
            (
                f"- Semantic winner state changes when removing "
                f"{_bold_names(winner_changes, key=('expertLabel' if identity == 'evaluator' else 'name'))}."
            )
        )
    else:
        lines.append(
            (
                f"- No available leave-one-{identity}-out removal "
                "changes the semantic winner state."
            )
        )

    return lines


def _robustness_interpretation(
    facts: dict[str, Any],
) -> str:
    robustness = facts["robustness"]

    lines = [
        "### Robustness diagnostics",
        "",
        (
            "- These are **counterfactual diagnostics**, not an "
            "additional rule of the 2-tuple linguistic model."
        ),
    ]
    lines.extend(
        _robustness_group_text(
            robustness["leaveOneCriterionOut"],
            identity="criterion",
        )
    )
    lines.extend(
        _robustness_group_text(
            robustness["leaveOneEvaluatorOut"],
            identity="evaluator",
        )
    )

    return "\n".join(lines)


def _nearest_weight_change(
    group: dict[str, Any],
    *,
    identity_key: str,
    label_key: str,
) -> tuple[list[str], float] | None:
    candidates: list[tuple[str, float]] = []

    for item in group.get("items") or []:
        if not item.get("available"):
            continue
        nearest = item["summary"][
            "nearestObservedWinnerStateChange"
        ]
        if not nearest.get("available"):
            continue
        distance = nearest.get("absoluteWeightChange")
        if not isinstance(distance, (int, float)):
            continue
        label = str(item.get(label_key) or item.get(identity_key) or "")
        candidates.append((label, float(distance)))

    if not candidates:
        return None

    minimum = min(distance for _, distance in candidates)
    labels = [
        label
        for label, distance in candidates
        if abs(distance - minimum) <= 1e-12
    ]
    return labels, minimum


def _sensitivity_group_text(
    group: dict[str, Any],
    *,
    kind: str,
) -> list[str]:
    if not group["availability"].get("available"):
        reason = group["availability"].get("reason")

        if reason == "criteria_aggregation_not_weighted_average":
            return [
                (
                    "- Criterion-weight sensitivity is not applicable "
                    "because the selected criteria aggregation does not "
                    "use criterion-importance weights."
                )
            ]
        if reason == "expert_aggregation_not_weighted_average":
            return [
                (
                    "- Evaluator-weight sensitivity is not applicable "
                    "because the selected expert aggregation does not "
                    "use evaluator-importance weights."
                )
            ]
        if reason == "single_criterion":
            return [
                "- Criterion-weight sensitivity is unavailable with one criterion."
            ]
        if reason == "single_evaluator":
            return [
                "- Evaluator-weight sensitivity is unavailable with one evaluator."
            ]
        if reason == "single_alternative":
            return [
                "- Weight sensitivity is not interpreted competitively with one alternative."
            ]
        return [
            f"- {kind.capitalize()} weight sensitivity is unavailable."
        ]

    changing = (
        group["winnerStateChangingEvaluators"]
        if kind == "evaluator"
        else group["winnerStateChangingCriteria"]
    )

    if kind == "evaluator":
        nearest = _nearest_weight_change(
            group,
            identity_key="expertKey",
            label_key="expertLabel",
        )
        name_key = "expertLabel"
    else:
        nearest = _nearest_weight_change(
            group,
            identity_key="criterionId",
            label_key="name",
        )
        name_key = "name"

    lines = []

    if changing:
        lines.append(
            (
                f"- Sampled {kind}-weight changes can alter the "
                f"semantic winner state for "
                f"{_bold_names(changing, key=name_key)}."
            )
        )
    else:
        lines.append(
            (
                f"- No sampled {kind}-weight change in [0, 1] alters "
                "the semantic winner state."
            )
        )

    if nearest is not None:
        labels, distance = nearest
        formatted = [f"**{_escape(label)}**" for label in labels]
        lines.append(
            (
                "- Nearest sampled winner-state change to a configured "
                f"baseline occurs for {', '.join(formatted)}, "
                f"after an absolute weight move of "
                f"**{_number(distance)}**."
            )
        )

    return lines


def _sensitivity_interpretation(
    facts: dict[str, Any],
) -> str:
    sensitivity = facts["sensitivity"]

    lines = [
        "### Weight sensitivity",
        "",
        (
            "- Sensitivity is sampled in 0.05 steps plus each exact "
            "configured baseline. It identifies **observed sampled "
            "changes**, not exact mathematical breakpoints."
        ),
    ]
    lines.extend(
        _sensitivity_group_text(
            sensitivity["criterionWeights"],
            kind="criterion",
        )
    )
    lines.extend(
        _sensitivity_group_text(
            sensitivity["expertWeights"],
            kind="evaluator",
        )
    )

    return "\n".join(lines)


def _limits_interpretation(
    facts: dict[str, Any],
) -> str:
    aggregation = facts["aggregation"]
    expert_method = aggregation["expertAggregation"][
        "summary"
    ]["method"]
    criteria_method = aggregation["criteriaAggregation"][
        "summary"
    ]["method"]

    lines = [
        "### Interpretation limits",
        "",
        (
            "- Final **β** values are positions on the common "
            "linguistic scale. They are not probabilities, "
            "percentages, or confidence scores."
        ),
        (
            "- **α** is symbolic translation around the selected "
            "linguistic label, not uncertainty."
        ),
        (
            "- Observed criterion β range describes separation among "
            "the evaluated alternatives. It is not a causal or "
            "counterfactual importance measure."
        ),
        (
            "- LOCO, LOEO, evaluator-distance, disagreement, and "
            "weight-sensitivity outputs are application-level "
            "diagnostics derived from the executed evidence; they "
            "are not additional normative operators from the "
            "2-tuple linguistic model."
        ),
    ]

    if expert_method == "l2towa" or criteria_method == "l2towa":
        lines.append(
            (
                "- L2TOWA weights are **positional OWA weights after "
                "descending β ordering**. They must not be interpreted "
                "as permanent importance weights of the expert or "
                "criterion occupying that position."
            )
        )

    return "\n".join(lines)


def build_interpretation(
    facts: dict[str, Any],
) -> str:
    """Render validated analysis facts as user-facing Markdown."""

    sections = [
        _result_interpretation(facts),
        _linguistic_interpretation(facts),
        _aggregation_interpretation(facts),
        _evaluator_interpretation(facts),
        _robustness_interpretation(facts),
        _sensitivity_interpretation(facts),
        _limits_interpretation(facts),
    ]

    return "\n\n".join(
        section
        for section in sections
        if section.strip()
    )
