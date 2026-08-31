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


def _named_group(
    items: list[dict[str, Any]],
    *,
    key: str,
    noun: str,
    list_limit: int = 5,
) -> str:
    if not items:
        return "none"
    if len(items) <= list_limit:
        return _bold_names(items, key=key)
    return f"**{len(items)} {noun}**"


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
                    "so this execution does not support a comparative winner."
                ),
                (
                    f"- Its final assessment is {_tuple_text(item['tuple'])}, "
                    f"corresponding to **β = {_number(item['beta'])}** on "
                    "the common linguistic scale."
                ),
            ]
        )
        return "\n".join(lines)

    winner = result["winner"]

    if winner.get("available"):
        selected = winner["alternative"]
        lines.append(
            (
                f"- **{_escape(selected['name'])} is the unique leading "
                f"alternative**. Its final assessment is "
                f"{_tuple_text(selected['tuple'])}, corresponding to "
                f"**β = {_number(selected['beta'])}** on the common "
                "linguistic scale."
            )
        )
    else:
        leaders = result["leadingGroup"]
        if winner.get("reason") in {
            "tied_leading_group",
            "no_discrimination",
        }:
            lines.append(
                "- The execution does **not** support a unique preferred alternative."
            )
            lines.append(
                f"- The effective leading group is {_bold_names(leaders)}."
            )
            lines.append(
                (
                    "- The stored technical order is retained for traceability "
                    "and must not be interpreted as substantive superiority "
                    "inside an effective tie."
                )
            )
        else:
            lines.append(
                "- No unique leading alternative is available for this execution."
            )

    lines.append(
        f"- Final technical ordering: **{_ranking_text(ranking)}**."
    )

    closest = result.get("closestAdjacentAlternatives")
    if closest:
        gap = closest["betaGap"]
        pairs = closest["pairs"]

        if pairs:
            if len(pairs) == 1:
                pair = pairs[0]
                lines.append(
                    (
                        f"- **{_escape(pair['higherAlternativeName'])}** and "
                        f"**{_escape(pair['lowerAlternativeName'])}** are the "
                        "closest adjacent alternatives in the final ordering, "
                        f"separated by only **{_number(gap)} β units**."
                    )
                )
            else:
                pair_text = ", ".join(
                    (
                        f"{_escape(item['higherAlternativeName'])} / "
                        f"{_escape(item['lowerAlternativeName'])}"
                    )
                    for item in pairs
                )
                lines.append(
                    (
                        f"- The smallest adjacent separation is "
                        f"**{_number(gap)} β units**, shared by {pair_text}."
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
            "- **β** represents position on the common linguistic scale. "
            "**α** is the symbolic translation around the selected linguistic "
            "label; it is not uncertainty, confidence, or evaluator disagreement."
        ),
    ]

    if summary["translatedValueCount"] == 0:
        lines.append(
            (
                f"- All **{summary['valueCount']}** collective alternative × "
                "criterion assessments fall exactly on linguistic labels "
                "(α = 0)."
            )
        )
    else:
        lines.append(
            (
                f"- Across the collective alternative × criterion matrix, "
                f"**{summary['translatedValueCount']} of "
                f"{summary['valueCount']}** values require non-zero symbolic "
                f"translation ({_percent(summary['translatedShare'])})."
            )
        )
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

    if (
        summary["translatedValueCount"] == 0
        and final_summary["translatedValueCount"] > 0
    ):
        lines.append(
            (
                f"- After criteria aggregation, however, "
                f"**{final_summary['translatedValueCount']} of "
                f"{final_summary['valueCount']}** final alternative results "
                "fall between linguistic labels and therefore require "
                "symbolic translation α. This is a direct consequence of "
                "aggregating the exact-label criterion positions on the β scale."
            )
        )
    elif final_summary["translatedValueCount"] == 0:
        lines.append(
            "- All final alternative results also fall exactly on linguistic labels."
        )
    else:
        lines.append(
            (
                f"- At the final-alternative level, "
                f"**{final_summary['translatedValueCount']} of "
                f"{final_summary['valueCount']}** results require non-zero "
                "symbolic translation."
            )
        )

    return "\n".join(lines)


def _aggregation_interpretation(
    facts: dict[str, Any],
) -> str:
    aggregation = facts["aggregation"]
    expert = aggregation["expertAggregation"]["summary"]
    criteria = aggregation["criteriaAggregation"]["summary"]
    evaluators = facts["evaluators"]["items"]

    lines = [
        "### Aggregation interpretation",
        "",
    ]

    if len(evaluators) == 1:
        only = evaluators[0]
        lines.append(
            (
                f"- Only **{_escape(only['expertLabel'])}** contributed to "
                "alternative evaluation, so the expert-aggregation stage is "
                "mathematically trivial: the collective alternative × criterion "
                "matrix is identical to that evaluator's submitted matrix."
            )
        )
    else:
        lines.append(
            (
                f"- Evaluator assessments were combined using "
                f"**{_method_text(expert)}**."
            )
        )

    lines.append(
        (
            f"- Collective criterion assessments were then combined using "
            f"**{_method_text(criteria)}**."
        )
    )

    if expert["method"] == "l2towa" and len(evaluators) > 1:
        lines.append(
            (
                "- In evaluator L2TOWA, an OWA coefficient belongs to the "
                "assessment's **ordered β position in that specific cell**, "
                "not to a permanent evaluator identity."
            )
        )

    if criteria["method"] == "l2towa":
        lines.append(
            (
                "- In criteria L2TOWA, an OWA coefficient belongs to the "
                "**ordered β position for that alternative**. A criterion can "
                "therefore occupy different positions for different alternatives."
            )
        )

    if criteria["method"] == "weighted_average":
        traces = aggregation["criteriaAggregation"]["trace"]["alternatives"]
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
                    "- At the **leaf-criterion level used by this 2-tuple "
                    "aggregation**, the largest effective criterion importance "
                    "weight belongs to "
                    + _bold_names(top)
                    + f" at **{_percent(top_weight)}**."
                )
            )

    lines.append(
        (
            "- The aggregation traces in the visual analysis show how each "
            "executed β input and effective coefficient contributes to the "
            "corresponding final β."
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
        lines.append(
            (
                "- With only one evaluator, cross-evaluator alignment, "
                "disagreement, LOEO, and evaluator-weight comparison are not "
                "meaningful for this execution."
            )
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
                f"- Closest evaluator profile to the collective matrix: "
                f"{names}, at mean absolute β distance "
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
                f"- Farthest evaluator profile from the collective matrix: "
                f"{names}, at mean absolute β distance "
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
                f"- **{len(differing)} of {len(items)}** evaluators produce "
                "a personal technical ranking different from the collective "
                "ordering when the same configured criteria aggregation is "
                "applied to their own matrix."
            )
        )
    else:
        lines.append(
            "- Every evaluator's personal technical ranking matches the collective ordering."
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
    unchanged_count = len(items) - len(ranking_changes)
    winner_changes = (
        group["winnerStateChangingEvaluators"]
        if identity == "evaluator"
        else group["winnerStateChangingCriteria"]
    )

    if identity == "criterion":
        noun_singular = "criterion"
        noun_plural = "criteria"
        winner_key = "name"
    else:
        noun_singular = "evaluator"
        noun_plural = "evaluators"
        winner_key = "expertLabel"

    lines = []

    if ranking_changes:
        lines.append(
            (
                f"- The technical ordering remains unchanged after removing "
                f"**{unchanged_count} of {len(items)} {noun_plural}**; "
                f"removing the other **{len(ranking_changes)}** produces some "
                "technical rank displacement."
            )
        )
    else:
        lines.append(
            (
                f"- The technical ordering is stable across all "
                f"**{len(items)}** available single-{noun_singular} removals."
            )
        )

    if winner_changes:
        lines.append(
            (
                "- More importantly, the semantic winner state changes only "
                f"when removing {_bold_names(winner_changes, key=winner_key)}."
            )
        )
    else:
        lines.append(
            (
                f"- None of the available single-{noun_singular} removals "
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
            "- These are **counterfactual diagnostics**, not additional rules "
            "of the 2-tuple linguistic model."
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
            "nearestObservedInteriorWinnerStateChange"
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
    evaluator_count: int,
) -> list[str]:
    if not group["availability"].get("available"):
        reason = group["availability"].get("reason")

        if kind == "evaluator" and evaluator_count == 1:
            return [
                (
                    "- Evaluator-weight sensitivity is not meaningful here: "
                    "only one evaluator contributed to alternative evaluation."
                )
            ]
        if reason == "criteria_aggregation_not_weighted_average":
            return [
                (
                    "- Criterion-weight sensitivity is not applicable because "
                    "the selected criteria aggregation does not use "
                    "criterion-importance weights."
                )
            ]
        if reason == "expert_aggregation_not_weighted_average":
            return [
                (
                    "- Evaluator-weight sensitivity is not applicable because "
                    "the selected expert aggregation does not use "
                    "evaluator-importance weights."
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

    items = [
        item
        for item in group.get("items") or []
        if item.get("available")
    ]
    if not items:
        return [
            f"- No valid {kind}-weight sensitivity items are available."
        ]

    name_key = "expertLabel" if kind == "evaluator" else "name"
    noun = "evaluators" if kind == "evaluator" else "criteria"

    interior_items = [
        item
        for item in items
        if item["summary"][
            "interiorWinnerStateChangedSampleCount"
        ] > 0
    ]
    endpoint_only_items = [
        item
        for item in items
        if item["summary"][
            "winnerStateChangesOnlyAtEndpoints"
        ]
    ]
    no_change_items = [
        item
        for item in items
        if item["summary"]["winnerStateChangedSampleCount"] == 0
    ]

    endpoint_one_only: list[dict[str, Any]] = []
    endpoint_zero_only: list[dict[str, Any]] = []
    endpoint_both: list[dict[str, Any]] = []

    for item in endpoint_only_items:
        endpoints = {
            change["endpoint"]
            for change in item["summary"][
                "endpointWinnerStateChanges"
            ]
        }
        if endpoints == {"one"}:
            endpoint_one_only.append(item)
        elif endpoints == {"zero"}:
            endpoint_zero_only.append(item)
        elif endpoints == {"zero", "one"}:
            endpoint_both.append(item)

    lines: list[str] = []

    if interior_items:
        lines.append(
            (
                f"- **{len(interior_items)} {noun}** show an interior sampled "
                "sensitivity of the semantic winner: "
                f"{_bold_names(interior_items, key=name_key)}."
            )
        )
    else:
        lines.append(
            (
                f"- No interior sampled {kind}-weight change alters the "
                "semantic winner state."
            )
        )

    identity_key = "expertKey" if kind == "evaluator" else "criterionId"
    nearest = _nearest_weight_change(
        group,
        identity_key=identity_key,
        label_key=name_key,
    )
    if nearest is not None:
        labels, distance = nearest
        formatted = [f"**{_escape(label)}**" for label in labels]
        lines.append(
            (
                "- The closest observed interior winner-state change to a "
                f"configured baseline occurs for {', '.join(formatted)}, "
                f"after an absolute weight move of **{_number(distance)}**."
            )
        )

    if endpoint_one_only:
        lines.append(
            (
                f"- **{len(endpoint_one_only)} {noun}** change the winner state "
                "only at the extreme endpoint **w = 1.0**, where the target "
                "receives all importance and every other importance weight "
                "becomes zero. These are extreme endpoint scenarios rather "
                "than ordinary local sensitivity."
            )
        )

    if endpoint_zero_only:
        lines.append(
            (
                f"- {_named_group(endpoint_zero_only, key=name_key, noun=noun)} "
                "change the winner state only at **w = 0.0**, where the target "
                "is assigned zero importance and the remaining importance "
                "weights are redistributed proportionally."
            )
        )

    if endpoint_both:
        lines.append(
            (
                f"- {_named_group(endpoint_both, key=name_key, noun=noun)} "
                "change the winner state at **both endpoints**: w = 0.0 "
                "removes the target from the weighted aggregation, whereas "
                "w = 1.0 makes it the only weighted argument."
            )
        )

    if no_change_items:
        lines.append(
            (
                f"- {_named_group(no_change_items, key=name_key, noun=noun)} "
                "show no sampled winner-state change across the tested "
                "weight range."
            )
        )

    return lines


def _sensitivity_interpretation(
    facts: dict[str, Any],
) -> str:
    sensitivity = facts["sensitivity"]
    evaluator_count = facts["counts"]["evaluators"]

    lines = [
        "### Weight sensitivity",
        "",
        (
            "- Sensitivity is evaluated on a sampled 0–1 grid in steps of "
            "0.05, plus each exact configured baseline weight. It identifies "
            "**observed sampled changes**, not exact mathematical breakpoints."
        ),
    ]
    lines.extend(
        _sensitivity_group_text(
            sensitivity["criterionWeights"],
            kind="criterion",
            evaluator_count=evaluator_count,
        )
    )
    lines.extend(
        _sensitivity_group_text(
            sensitivity["expertWeights"],
            kind="evaluator",
            evaluator_count=evaluator_count,
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
            "- Final **β** values are positions on the common linguistic "
            "scale. They are not probabilities, percentages, confidence "
            "values, or normalized performance scores."
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
