from __future__ import annotations

from typing import Any


def _number(value: float | int | None, digits: int = 4) -> str:
    if value is None:
        return "—"
    number = float(value)
    if abs(number) < 10 ** (-(digits + 1)):
        number = 0.0
    text = f"{number:.{digits}f}".rstrip("0").rstrip(".")
    return text or "0"


def _percent(value: float | int | None, digits: int = 2) -> str:
    if value is None:
        return "—"
    return f"{float(value) * 100:.{digits}f}%"


def _plural(
    count: int | float,
    singular: str,
    plural: str | None = None,
) -> str:
    return singular if count == 1 else (plural or f"{singular}s")


def _escape(value: Any) -> str:
    return str(value).replace("|", r"\|").replace("\n", " ").strip()


def _names(items: list[dict[str, Any]]) -> str:
    names = [f"**{_escape(item.get('name', ''))}**" for item in items]
    if not names:
        return "none"
    if len(names) == 1:
        return names[0]
    if len(names) == 2:
        return f"{names[0]} and {names[1]}"
    return ", ".join(names[:-1]) + f", and {names[-1]}"


def _table(headers: list[str], rows: list[list[Any]]) -> str:
    header = "| " + " | ".join(_escape(item) for item in headers) + " |"
    separator = "| " + " | ".join("---" for _ in headers) + " |"
    body = [
        "| " + " | ".join(_escape(item) for item in row) + " |"
        for row in rows
    ]
    return "\n".join([header, separator, *body])


def _availability_text(value: dict[str, Any]) -> str:
    if value.get("available"):
        return "available"
    return str(value.get("reason") or "unavailable")


def _rank_names(ranking: list[dict[str, Any]]) -> str:
    return " > ".join(_escape(item["name"]) for item in ranking)


def _criterion_item_by_id(facts: dict[str, Any], criterion_id: str) -> dict[str, Any] | None:
    return next(
        (
            item
            for item in facts["criteria"]["items"]
            if item["criterionId"] == criterion_id
        ),
        None,
    )


def _alternative_item_by_id(
    facts: dict[str, Any], alternative_id: str
) -> dict[str, Any] | None:
    return next(
        (
            item
            for item in facts["alternatives"]["items"]
            if item["alternativeId"] == alternative_id
        ),
        None,
    )


def _nearest_sensitivity_change(
    items: list[dict[str, Any]],
) -> tuple[list[dict[str, Any]], float] | None:
    candidates: list[tuple[dict[str, Any], float]] = []
    for item in items:
        if not item.get("available"):
            continue
        change = item.get("summary", {}).get("nearestObservedWinnerStateChange", {})
        if not change.get("available"):
            continue
        distance = change.get("absoluteWeightChange")
        if not isinstance(distance, (int, float)):
            continue
        candidates.append((item, float(distance)))

    if not candidates:
        return None

    minimum = min(distance for _, distance in candidates)
    selected = [
        item
        for item, distance in candidates
        if abs(distance - minimum) <= 1e-12
    ]
    return selected, minimum


def _percentage_points(value: float | int | None, digits: int = 2) -> str:
    if value is None:
        return "—"
    return f"{float(value) * 100:.{digits}f} percentage points"


def _is_endpoint_weight(value: Any, *, tolerance: float = 1e-12) -> bool:
    if not isinstance(value, (int, float)):
        return False
    number = float(value)
    return (
        abs(number) <= tolerance
        or abs(number - 1.0) <= tolerance
    )


def _nearest_sensitivity_signal(
    items: list[dict[str, Any]],
    *,
    endpoint: bool | None = None,
) -> dict[str, Any] | None:
    candidates: list[dict[str, Any]] = []

    for item in items:
        if not item.get("available"):
            continue

        configured_weight = item.get("configuredWeight")
        if not isinstance(configured_weight, (int, float)):
            continue

        for point in item.get("points") or []:
            changes = point.get("changesFromBaseline") or {}
            if not changes.get("winnerStateChanged"):
                continue

            varied_weight = point.get("variedWeight")
            if not isinstance(varied_weight, (int, float)):
                continue

            is_endpoint = _is_endpoint_weight(varied_weight)
            if endpoint is not None and is_endpoint != endpoint:
                continue

            candidates.append(
                {
                    "item": item,
                    "point": point,
                    "distance": abs(
                        float(varied_weight)
                        - float(configured_weight)
                    ),
                    "isEndpoint": is_endpoint,
                }
            )

    if not candidates:
        return None

    minimum = min(item["distance"] for item in candidates)
    selected = [
        item
        for item in candidates
        if abs(float(item["distance"]) - minimum) <= 1e-12
    ]

    return {
        "distance": minimum,
        "records": selected,
        "allEndpoints": all(item["isEndpoint"] for item in selected),
    }


def _criterion_sensitivity_categories(
    items: list[dict[str, Any]],
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    interior_change: list[dict[str, Any]] = []
    endpoint_only_change: list[dict[str, Any]] = []

    for item in items:
        if not item.get("available"):
            continue

        changed_points = [
            point
            for point in item.get("points") or []
            if (point.get("changesFromBaseline") or {}).get(
                "winnerStateChanged"
            )
        ]
        if not changed_points:
            continue

        has_interior_change = any(
            isinstance(point.get("variedWeight"), (int, float))
            and not _is_endpoint_weight(point["variedWeight"])
            for point in changed_points
        )

        if has_interior_change:
            interior_change.append(item)
        else:
            endpoint_only_change.append(item)

    return interior_change, endpoint_only_change


def _signal_weight_moves(signal: dict[str, Any]) -> str:
    descriptions: list[str] = []
    for record in signal.get("records") or []:
        item = record["item"]
        point = record["point"]
        descriptions.append(
            f"**{_escape(item['name'])}** "
            f"({_percent(item['configuredWeight'])} → "
            f"{_percent(point['variedWeight'])})"
        )
    if not descriptions:
        return "none"
    if len(descriptions) == 1:
        return descriptions[0]
    if len(descriptions) == 2:
        return f"{descriptions[0]} and {descriptions[1]}"
    return ", ".join(descriptions[:-1]) + f", and {descriptions[-1]}"


def _counterfactual_outcome_text(
    facts: dict[str, Any],
    result: dict[str, Any] | None,
) -> str:
    if not result:
        return "the counterfactual winner state changes"

    winner = result.get("winner") or {}
    baseline_winner = facts.get("result", {}).get("winner") or {}

    if winner.get("available"):
        alternative = winner.get("alternative") or {}
        new_name = _escape(alternative.get("name", "the new winner"))
        if baseline_winner.get("available"):
            baseline = baseline_winner.get("alternative") or {}
            baseline_id = baseline.get("alternativeId")
            if alternative.get("alternativeId") != baseline_id:
                return (
                    f"the preferred alternative changes from "
                    f"**{_escape(baseline.get('name', 'the baseline winner'))}** "
                    f"to **{new_name}**"
                )
        return f"the counterfactual result has **{new_name}** as unique winner"

    reason = winner.get("reason")
    leading_group = result.get("leadingGroup") or []

    if reason == "no_variation" and leading_group:
        return (
            "the unique-winner state is lost and the effective leading group "
            f"becomes {_names(leading_group)}"
        )
    if reason == "no_discrimination":
        return (
            "the unique-winner state is lost because the remaining weighted "
            "problem has no effective discrimination"
        )
    if reason == "single_alternative":
        return (
            "the counterfactual problem no longer supports a comparative winner"
        )

    return "the semantic winner state changes"


def _loco_change_lines(
    facts: dict[str, Any],
    loco: dict[str, Any],
) -> list[str]:
    lines: list[str] = []
    for item in loco.get("items") or []:
        if (
            not item.get("available")
            or not (item.get("impact") or {}).get("winnerStateChanged")
        ):
            continue

        outcome = _counterfactual_outcome_text(
            facts,
            item.get("counterfactualResult"),
        )
        sentence = (
            f"- Removing **{_escape(item['name'])}**: {outcome}."
        )

        impact = item.get("impact") or {}
        if (
            not impact.get("technicalRankingChanged")
            and impact.get("semanticLeadingGroupChanged")
        ):
            sentence += (
                " The technical order itself remains unchanged; the change comes "
                "from the semantic leading-group interpretation."
            )
        lines.append(sentence)
    return lines


def _equal_beta_range(
    facts: dict[str, Any],
) -> tuple[bool, float | None]:
    items = facts.get("criteria", {}).get("items") or []
    values = [
        float(item["betaRange"])
        for item in items
        if isinstance(item.get("betaRange"), (int, float))
    ]
    if len(values) < 2:
        return False, values[0] if values else None

    tolerance = float(
        facts.get("method", {}).get("analyticalTieTolerance", 1e-6)
    )
    first = values[0]
    return (
        all(abs(value - first) <= tolerance for value in values[1:]),
        first,
    )



def _criterion_ids(items: list[dict[str, Any]]) -> set[str]:
    return {
        str(item.get("criterionId"))
        for item in items
        if item.get("criterionId") is not None
    }


def _max_items(
    items: list[dict[str, Any]],
    key: str,
    *,
    tolerance: float,
) -> list[dict[str, Any]]:
    finite = [
        item
        for item in items
        if isinstance(item.get(key), (int, float))
    ]
    if not finite:
        return []
    maximum = max(float(item[key]) for item in finite)
    return [
        item
        for item in finite
        if abs(float(item[key]) - maximum) <= tolerance
    ]


def _criterion_sensitivity_item(
    facts: dict[str, Any],
    criterion_id: str,
) -> dict[str, Any] | None:
    sensitivity = facts.get("sensitivity", {}).get("criterionWeights", {})
    return next(
        (
            item
            for item in sensitivity.get("items") or []
            if item.get("criterionId") == criterion_id
        ),
        None,
    )


def _result_interpretation(facts: dict[str, Any]) -> str:
    """Explain the concrete issue result before exposing the technical evidence."""
    counts = facts["counts"]
    result = facts["result"]
    winner = result["winner"]
    ranking = result["technicalRanking"]

    lines = ["### Result interpretation", "", "#### Key takeaways", ""]

    if counts["alternatives"] == 1:
        only = facts["alternatives"]["items"][0]
        lines.extend(
            [
                f"- Only **{_escape(only['name'])}** was evaluated, so this execution "
                "does not support a comparative recommendation.",
                f"- Stored TOPSIS closeness: **{_number(only['closeness'])}**.",
                "",
                "#### Interpretation limits",
                "",
                "- The coefficient describes the alternative's position in the "
                "executed ideal-distance geometry; it is not a probability, confidence "
                "value, or percentage of quality.",
            ]
        )
        return "\n".join(lines)

    if winner.get("reason") == "no_discrimination":
        lines.extend(
            [
                "- The current weighted evaluations provide **no effective "
                "discrimination** between alternatives.",
                "- The stored technical order is retained for traceability, but this "
                "execution does not support reading it as a substantive preference.",
                "",
                "#### Interpretation limits",
                "",
                "- Without effective weighted separation, the model does not have "
                "enough evidence to justify a unique recommendation.",
            ]
        )
        return "\n".join(lines)

    if not winner.get("available"):
        if winner.get("reason") == "no_variation":
            lines.extend(
                [
                    "- The execution does **not** identify a unique preferred "
                    "alternative.",
                    f"- The effective leading group is {_names(result['leadingGroup'])}.",
                    "- The technical ranking remains visible for traceability, but its "
                    "tie-breaking should not be read as meaningful separation.",
                ]
            )
        else:
            lines.append(
                "- The execution does not provide enough validated evidence for a "
                "unique model-level recommendation."
            )
        return "\n".join(lines)

    selected = winner["alternative"]
    lines.append(
        f"- **{_escape(selected['name'])} is the preferred alternative**, with the "
        f"highest TOPSIS closeness coefficient (**{_number(selected['closeness'])}**)."
    )

    if len(ranking) >= 2:
        runner_up = ranking[1]
        gap = float(selected["closeness"]) - float(runner_up["closeness"])
        lines.append(
            f"- The runner-up is **{_escape(runner_up['name'])}** "
            f"(**{_number(runner_up['closeness'])}**), leaving an observed first–second "
            f"closeness gap of **{_number(gap)}**."
        )

    # Most prominent criterion signal in the executed distance calculation.
    criteria = facts["criteria"]["items"]
    tolerance = float(facts["method"]["analyticalTieTolerance"])
    highest_weight = _max_items(
        criteria,
        "configuredWeight",
        tolerance=tolerance,
    )
    most_discriminating = (
        facts["criteria"].get("mostDiscriminating", {}).get("criteria") or []
    )
    highest_weight_ids = _criterion_ids(highest_weight)
    most_discriminating_ids = _criterion_ids(most_discriminating)
    shared_ids = highest_weight_ids & most_discriminating_ids
    shared = [item for item in highest_weight if item["criterionId"] in shared_ids]

    if shared:
        equal_beta, common_beta = _equal_beta_range(facts)
        if (
            equal_beta
            and common_beta is not None
            and common_beta
            > float(facts["method"]["analyticalTieTolerance"])
        ):
            verb = "has" if len(shared) == 1 else "have"
            pronoun = "it also has" if len(shared) == 1 else "they also have"
            lines.append(
                f"- All criteria have the same observed β range "
                f"(**{_number(common_beta)}**). Consequently, {_names(shared)} "
                f"{verb} the largest weighted discrimination because "
                f"{pronoun} the highest configured weight; those two signals are "
                "not independent in this execution."
            )
        else:
            verb = "combines" if len(shared) == 1 else "combine"
            pronoun = "it" if len(shared) == 1 else "them"
            lines.append(
                f"- {_names(shared)} {verb} the **highest configured weight** with the "
                "**largest weighted observed discrimination**, making "
                f"{pronoun} especially prominent in the executed TOPSIS distance "
                "calculation."
            )
    else:
        if highest_weight:
            lines.append(
                f"- Highest configured criterion weight: {_names(highest_weight)} "
                f"(**{_percent(highest_weight[0]['configuredWeight'])}**)."
            )
        if most_discriminating:
            lines.append(
                f"- Largest weighted observed discrimination: "
                f"{_names(most_discriminating)}."
            )

    lines.extend(["", "#### Why this recommendation deserves attention", ""])
    lines.extend(
        [
            "- TOPSIS evaluates the **weighted overall profile**: first place does not "
            "require the winner to be best on every individual criterion.",
            "- The closeness coefficient summarizes the balance between distance to "
            "the desirable and undesirable reference profiles; the detailed D+ and "
            "D− evidence is reported below.",
        ]
    )

    selected_detail = _alternative_item_by_id(facts, selected["alternativeId"])
    if selected_detail:
        weakness = selected_detail["principalWeakness"]
        strength = selected_detail["principalStrength"]
        if weakness.get("available"):
            lines.append(
                "- For the winner, the largest contribution to distance from the "
                f"positive ideal comes from {_names(weakness['criteria'])} "
                f"(**{_number(weakness['contribution'])}**)."
            )
        if strength.get("available"):
            lines.append(
                "- Its largest contribution to separation from the negative ideal "
                f"comes from {_names(strength['criteria'])} "
                f"(**{_number(strength['contribution'])}**)."
            )

    lines.extend(["", "#### Robustness and sensitivity", ""])

    loco = facts["robustness"]["leaveOneCriterionOut"]
    if loco["availability"].get("available"):
        changing = loco["winnerStateChangingCriteria"]
        if changing:
            lines.append(
                "- The recommendation is **not equally robust to every criterion**."
            )
            lines.extend(_loco_change_lines(facts, loco))
        else:
            lines.append(
                "- The current winner survives every available leave-one-criterion-out "
                "test, supporting robustness to the individual removal of the tested "
                "criteria."
            )

    criterion_sensitivity = facts["sensitivity"]["criterionWeights"]
    if criterion_sensitivity["availability"].get("available"):
        nearest_signal = _nearest_sensitivity_signal(
            criterion_sensitivity["items"]
        )
        if nearest_signal:
            lines.append(
                "- Closest sampled criterion-weight winner-state change: "
                f"{_signal_weight_moves(nearest_signal)}, a movement of "
                f"**{_percentage_points(nearest_signal['distance'])}**."
            )
            if nearest_signal["allEndpoints"]:
                lines.append(
                    "- That closest signal occurs at a **0% or 100% endpoint**. It "
                    "therefore represents removal of a criterion's effective weight "
                    "or concentration of all weight on it, rather than evidence that "
                    "a small local perturbation around the configured value changes "
                    "the recommendation."
                )
                interior_signal = _nearest_sensitivity_signal(
                    criterion_sensitivity["items"],
                    endpoint=False,
                )
                if interior_signal:
                    lines.append(
                        "- Nearest **interior-grid** winner-state change: "
                        f"{_signal_weight_moves(interior_signal)}, "
                        f"**{_percentage_points(interior_signal['distance'])}** "
                        "from the configured weight."
                    )
                else:
                    lines.append(
                        "- No winner-state change is observed at any interior sampled "
                        "criterion weight; observed changes occur only at endpoints."
                    )
        elif not criterion_sensitivity.get("winnerStateChangingCriteria"):
            lines.append(
                "- No criterion-weight trajectory changes the semantic winner state "
                "on the sampled grid."
            )

    lines.extend(
        [
            "",
            "#### Interpretation limits",
            "",
            "- The closeness coefficient is **not** a probability, confidence value, "
            "or percentage by which one alternative is better than another.",
            "- Criterion weight, weighted discrimination, LOCO dependence, and weight "
            "sensitivity describe different aspects of the result and should not be "
            "treated as interchangeable measures of influence.",
            "- Robustness and sensitivity statements apply only to the controlled "
            "changes actually tested by this analysis.",
        ]
    )

    return "\n".join(lines)


def _decision_result(facts: dict[str, Any]) -> str:
    result = facts["result"]
    counts = facts["counts"]
    ranking = result["technicalRanking"]
    winner = result["winner"]
    alternatives = facts["alternatives"]["items"]

    lines = ["### Decision result", "", "#### Ranking evidence", ""]

    rows = [
        [
            item["technicalRank"],
            item["name"],
            _number(item["closeness"]),
        ]
        for item in ranking
    ]
    lines.append(_table(["Rank", "Alternative", "Closeness"], rows))

    lines.extend(["", "#### Result status", ""])
    if counts["alternatives"] == 1:
        only = alternatives[0]
        lines.append(
            f"- **{_escape(only['name'])}** is the only evaluated alternative; no "
            "comparative winner is defined."
        )
        if (
            abs(float(only["positiveDistance"]))
            <= facts["method"]["evidenceTolerance"]
            and abs(float(only["negativeDistance"]))
            <= facts["method"]["evidenceTolerance"]
        ):
            lines.append(
                "- D+ and D− are both zero, so the stored closeness **0.5** is the "
                "model's neutral convention for coincident ideals."
            )
    elif winner.get("available"):
        lines.append(
            f"- Unique semantic winner: **{_escape(winner['alternative']['name'])}**."
        )
    elif winner.get("reason") == "no_discrimination":
        lines.append(
            "- No semantic winner is asserted because the executed problem has no "
            "effective weighted discrimination."
        )
    elif winner.get("reason") == "no_variation":
        lines.append(
            f"- No unique semantic winner is asserted; effective leading group: "
            f"{_names(result['leadingGroup'])}."
        )

    return "\n".join(lines)


def _criteria_analysis(facts: dict[str, Any]) -> str:
    criteria = facts["criteria"]
    items = criteria["items"]
    lines = [
        "### Criteria and observed discrimination",
        "",
        "#### How to read these metrics",
        "",
        "- **Configured weight** expresses how important a criterion is in the "
        "executed decision configuration.",
        "- **Observed discrimination** describes how much the evaluated alternatives "
        "actually differ on that criterion.",
        "- **Weighted discrimination** combines configured importance with observed "
        "separation in the executed TOPSIS distance calculation.",
        "- **Counterfactual dependence** is different again and is assessed through "
        "criterion removal and weight-sensitivity diagnostics.",
        "",
        "#### Criterion evidence",
        "",
    ]

    rows = [
        [
            item["name"],
            item["direction"],
            _percent(item["configuredWeight"]),
            _number(item["betaRange"]),
            _number(item["weightedDiscrimination"]),
            _percent(item["discriminationShare"]),
        ]
        for item in items
    ]
    lines.append(
        _table(
            [
                "Criterion",
                "Direction",
                "Configured weight",
                "β range",
                "Weighted discrimination",
                "Share of weighted discrimination",
            ],
            rows,
        )
    )

    lines.extend(["", "#### Main observations", ""])

    if not facts["variation"]["effectiveAlternativeDiscrimination"]:
        lines.append(
            "- No criterion provides effective weighted discrimination in the "
            "executed collective matrix. The weighted data therefore do not provide "
            "substantive separation between alternatives."
        )
    else:
        most = criteria["mostDiscriminating"]
        least = criteria["leastDiscriminating"]
        if most.get("available"):
            most_criteria = most["criteria"]
            relation = "held by" if len(most_criteria) == 1 else "shared by"
            lines.append(
                f"- Largest weighted observed discrimination: "
                f"**{_number(most['value'])}**, {relation} "
                f"{_names(most_criteria)}."
            )
        if least.get("available"):
            least_criteria = least["criteria"]
            relation = "held by" if len(least_criteria) == 1 else "shared by"
            lines.append(
                f"- Smallest weighted observed discrimination: "
                f"**{_number(least['value'])}**, {relation} "
                f"{_names(least_criteria)}."
            )

    zero_weight_varying = [
        item
        for item in items
        if item["hasObservedDiscrimination"] and not item["hasEffectiveWeight"]
    ]
    constant_positive_weight = [
        item
        for item in items
        if item["hasEffectiveWeight"] and not item["hasObservedDiscrimination"]
    ]
    if zero_weight_varying:
        lines.append(
            f"- {_names(zero_weight_varying)} vary across alternatives but have zero "
            "effective configured weight, so those differences did not enter the "
            "executed TOPSIS distances."
        )
    if constant_positive_weight:
        lines.append(
            f"- {_names(constant_positive_weight)} have positive configured weight "
            "but no observed collective β variation, so they contributed zero "
            "discrimination in this execution."
        )

    equal_beta, common_beta = _equal_beta_range(facts)
    if (
        equal_beta
        and common_beta is not None
        and common_beta
        > float(facts["method"]["analyticalTieTolerance"])
    ):
        lines.append(
            f"- All criteria have the same observed β range "
            f"(**{_number(common_beta)}**). Therefore, differences in weighted "
            "discrimination, where present, are driven entirely by configured "
            "criterion-weight differences rather than by different observed β ranges."
        )

    # Cross-metric explanation: prominence in distances is not the same as
    # counterfactual dependence of the winner.
    lines.extend(["", "#### Cross-metric criterion signals", ""])
    tolerance = float(facts["method"]["analyticalTieTolerance"])
    highest_weight = _max_items(
        items,
        "configuredWeight",
        tolerance=tolerance,
    )
    highest_weight_ids = _criterion_ids(highest_weight)
    most = criteria.get("mostDiscriminating") or {}
    most_discriminating = most.get("criteria") or []
    most_ids = _criterion_ids(most_discriminating)

    loco = facts.get("robustness", {}).get("leaveOneCriterionOut", {})
    loco_changing = (
        loco.get("winnerStateChangingCriteria") or []
        if loco.get("availability", {}).get("available")
        else []
    )
    loco_ids = _criterion_ids(loco_changing)

    # Signal 1: criteria that are simultaneously highest-weight and most
    # discriminating in the executed distances.
    shared_ids = highest_weight_ids & most_ids
    shared_items = [item for item in items if item["criterionId"] in shared_ids]
    if shared_items:
        shared_loco = [item for item in shared_items if item["criterionId"] in loco_ids]
        shared_not_loco = [
            item for item in shared_items if item["criterionId"] not in loco_ids
        ]
        equal_beta, _common_beta = _equal_beta_range(facts)
        if shared_loco:
            pronoun = "it" if len(shared_loco) == 1 else "them"
            if equal_beta:
                verb = "has" if len(shared_loco) == 1 else "have"
                lines.append(
                    f"- {_names(shared_loco)} {verb} the highest configured weight "
                    "and, because the observed β range is common across criteria, "
                    "also the largest weighted discrimination. Removing "
                    f"{pronoun} changes the winner in LOCO, adding a separate "
                    "counterfactual dependence signal."
                )
            else:
                verb = "combines" if len(shared_loco) == 1 else "combine"
                lines.append(
                    f"- {_names(shared_loco)} {verb} the highest configured weight with "
                    "the largest weighted discrimination **and** change the winner when "
                    f"removed in LOCO. These diagnostics jointly mark {pronoun} as "
                    "especially consequential in the tested decision configuration."
                )
        if shared_not_loco:
            pronoun = "it" if len(shared_not_loco) == 1 else "them"
            possessive = "It is" if len(shared_not_loco) == 1 else "They are"
            if equal_beta:
                verb = "has" if len(shared_not_loco) == 1 else "have"
                lines.append(
                    f"- {_names(shared_not_loco)} {verb} the highest configured weight "
                    "and therefore also the largest weighted discrimination under the "
                    "common β range. Removing "
                    f"{pronoun} alone does **not** change the winner in LOCO. "
                    f"{possessive} prominent in the executed distances without being "
                    "individually indispensable under that removal test."
                )
            else:
                verb = "combines" if len(shared_not_loco) == 1 else "combine"
                lines.append(
                    f"- {_names(shared_not_loco)} {verb} the highest configured weight "
                    f"with the largest weighted discrimination, but removing {pronoun} "
                    f"alone does **not** change the winner in LOCO. {possessive} prominent "
                    "in the executed distances without being individually indispensable "
                    "under that removal test."
                )
    else:
        if highest_weight:
            lines.append(
                f"- Highest configured weight: {_names(highest_weight)} "
                f"(**{_percent(highest_weight[0]['configuredWeight'])}**)."
            )
        if most_discriminating:
            lines.append(
                f"- Largest weighted discrimination: {_names(most_discriminating)}. "
                "The most important configured criterion and the strongest observed "
                "distance discriminator are therefore not necessarily the same."
            )

    # Signal 2: LOCO-changing criteria that are not the most discriminating.
    loco_only = [
        item
        for item in items
        if item["criterionId"] in loco_ids and item["criterionId"] not in most_ids
    ]
    if loco_only:
        lines.append(
            f"- {_names(loco_only)} change the semantic winner when removed even "
            "though they do not have the largest weighted discrimination. This shows "
            "why criterion influence cannot be inferred from discrimination alone."
        )
    elif loco.get("availability", {}).get("available") and not loco_ids:
        lines.append(
            "- No individual criterion removal changes the semantic winner in LOCO; "
            "none of the tested criteria is individually indispensable to the winner "
            "under that diagnostic."
        )

    # Signal 3: nearest sampled weight sensitivity.
    criterion_sensitivity = facts.get("sensitivity", {}).get("criterionWeights", {})
    if criterion_sensitivity.get("availability", {}).get("available"):
        nearest_signal = _nearest_sensitivity_signal(
            criterion_sensitivity.get("items") or []
        )
        if nearest_signal:
            lines.append(
                "- Closest sampled criterion-weight winner-state change: "
                f"{_signal_weight_moves(nearest_signal)}, "
                f"**{_percentage_points(nearest_signal['distance'])}** from the "
                "configured weight."
            )
            if nearest_signal["allEndpoints"]:
                lines.append(
                    "- Because that closest change occurs at a 0%/100% endpoint, it "
                    "should be read as an extreme reweighting test rather than as "
                    "evidence of immediate local instability."
                )
        else:
            lines.append(
                "- No criterion-weight winner-state change is observed anywhere on "
                "the sampled grid."
            )

    return "\n".join(lines)


def _alternative_profiles(facts: dict[str, Any]) -> str:
    lines = [
        "### Alternative profiles",
        "",
        "#### How to read D+ and D−",
        "",
        "- **D+** is the weighted distance to the positive ideal. **Lower is "
        "preferable.**",
        "- **D−** is the weighted distance to the negative ideal. **Higher is "
        "preferable.**",
        "- The TOPSIS closeness coefficient combines those two distances.",
        "- Criterion contributions show where each alternative's distance profile is "
        "formed in this execution; they support interpretation but are not "
        "standalone causal claims.",
        "",
    ]

    items = sorted(
        facts["alternatives"]["items"],
        key=lambda item: item["technicalRank"],
    )

    winner = facts["result"]["winner"]
    winner_id = (
        winner["alternative"]["alternativeId"]
        if winner.get("available")
        else None
    )

    for item in items:
        lines.extend(
            [
                f"#### {_escape(item['name'])}",
                "",
                f"- **Technical rank:** {item['technicalRank']}.",
                f"- **Closeness:** {_number(item['closeness'])}.",
                f"- **Ideal distances:** D+ = {_number(item['positiveDistance'])}; "
                f"D− = {_number(item['negativeDistance'])}.",
                f"- **Positive-ideal matches:** "
                f"{item['matchesPositiveIdealCriterionCount']} "
                f"{_plural(item['matchesPositiveIdealCriterionCount'], 'criterion', 'criteria')}.",
                f"- **Negative-ideal matches:** "
                f"{item['matchesNegativeIdealCriterionCount']} "
                f"{_plural(item['matchesNegativeIdealCriterionCount'], 'criterion', 'criteria')}.",
            ]
        )

        weakness = item["principalWeakness"]
        if weakness.get("available"):
            lines.append(
                "- **Largest contribution to distance from the positive ideal:** "
                f"{_names(weakness['criteria'])} "
                f"({_number(weakness['contribution'])})."
            )
        elif float(item["positiveDistance"]) <= facts["method"]["evidenceTolerance"]:
            lines.append(
                "- The alternative is at the positive ideal in the weighted TOPSIS "
                "distance space, so no principal weakness is identified."
            )

        strength = item["principalStrength"]
        if strength.get("available"):
            lines.append(
                "- **Largest contribution to separation from the negative ideal:** "
                f"{_names(strength['criteria'])} "
                f"({_number(strength['contribution'])})."
            )
        elif float(item["negativeDistance"]) <= facts["method"]["evidenceTolerance"]:
            lines.append(
                "- The alternative is at the negative ideal in the weighted TOPSIS "
                "distance space, so no principal strength is identified."
            )

        if item["alternativeId"] == winner_id:
            lines.append(
                "- **Interpretation:** this balance of D+ and D− yields the strongest "
                "overall TOPSIS position in the current execution. First place should "
                "be read as the strongest weighted compromise, not as evidence that "
                "the alternative dominates every criterion individually."
            )

        lines.append("")

    return "\n".join(lines).rstrip()



def _linguistic_analysis(facts: dict[str, Any]) -> str:
    linguistic = facts["linguistic2Tuple"]
    summary = linguistic["collective"]["summary"]
    lines = [
        "### Linguistic 2-tuple representation",
        "",
        "#### What happened in this execution",
        "",
    ]

    if summary["translatedValueCount"] == 0:
        lines.extend(
            [
                "- All collective evaluations fall exactly on linguistic labels "
                "(**α = 0**).",
                "- No intermediate collective position between labels required "
                "symbolic translation.",
                "- In this execution, the final linguistic values can therefore be "
                "read directly as the available labels.",
            ]
        )
    else:
        lines.extend(
            [
                f"- **{summary['translatedValueCount']} of {summary['valueCount']}** "
                f"collective values ({_percent(summary['translatedShare'])}) require "
                "a non-zero symbolic translation α.",
                f"- Mean |α| = **{_number(summary['meanAbsoluteAlpha'])}**.",
                f"- Maximum |α| = **{_number(summary['maxAbsoluteAlpha'])}**.",
                "- Non-zero α values indicate collective evaluations that lie between "
                "the available linguistic labels.",
            ]
        )

    if summary["exactMidpointCount"] > 0:
        lines.append(
            f"- **{summary['exactMidpointCount']}** value(s) use α = -0.5, the exact "
            "midpoint convention represented with the upper linguistic label."
        )

    lines.extend(
        [
            "- α is a symbolic translation value; it is **not** uncertainty, "
            "confidence, or evaluator disagreement.",
            "",
            "#### Criterion-level evidence",
            "",
        ]
    )

    criterion_rows = [
        [
            item["name"],
            f"{item['translatedValueCount']}/{item['valueCount']}",
            _percent(item["translatedShare"]),
            _number(item["meanAbsoluteAlpha"]),
            _number(item["maxAbsoluteAlpha"]),
        ]
        for item in linguistic["collective"]["byCriterion"]["items"]
    ]
    lines.append(
        _table(
            [
                "Criterion",
                "Translated values",
                "Translated share",
                "Mean |α|",
                "Max |α|",
            ],
            criterion_rows,
        )
    )

    strongest = linguistic["collective"]["strongestTranslations"]
    if strongest.get("available"):
        descriptions = [
            (
                f"**{_escape(item['alternativeName'])} / "
                f"{_escape(item['criterionName'])}** "
                f"(α = {_number(item['tuple']['alpha'])})"
            )
            for item in strongest["items"]
        ]
        lines.extend(
            [
                "",
                "#### Largest observed translations",
                "",
                f"- Maximum |α| = **{_number(strongest['maxAbsoluteAlpha'])}**.",
                "- Observed at: " + ", ".join(descriptions) + ".",
            ]
        )

    return "\n".join(lines)



def _evaluator_analysis(facts: dict[str, Any]) -> str:
    evaluators = facts["evaluators"]
    items = evaluators["items"]
    lines = ["### Evaluator profiles", ""]

    if len(items) == 1:
        item = items[0]
        personal = item["personalResult"]
        lines.extend(
            [
                "#### Participation in this stage",
                "",
                f"- This TOPSIS alternative-evaluation evidence contains one "
                f"evaluator: **{_escape(item['name'])}**.",
                f"- Configured evaluator weight: "
                f"**{_percent(item['configuredWeight'])}**.",
                f"- Derived personal TOPSIS order: "
                f"**{_rank_names(personal['technicalRanking'])}**.",
                "",
                "#### Interpretation",
                "",
                "- Between-evaluator agreement, closest/farthest evaluator, and "
                "comparative disagreement are not applicable with a single evaluator.",
                "- This evaluator count belongs specifically to the "
                "alternative-evaluation stage analysed by TOPSIS. It should not be "
                "confused with the number of people who may have participated in a "
                "separate criterion-weighting stage.",
            ]
        )
        return "\n".join(lines)

    lines.extend(
        [
            "#### How to read evaluator comparison",
            "",
        ]
    )

    if evaluators["variation"]["equivalentSubmissions"]:
        lines.extend(
            [
                "- All evaluators submitted effectively equivalent β matrices.",
                "- No evaluator is singled out as closest to or farthest from the "
                "collective result because there is no meaningful between-evaluator "
                "variation at the analysed precision.",
            ]
        )
    else:
        lines.extend(
            [
                "- Alignment distance measures how far each evaluator's β matrix lies "
                "from the collective matrix using criterion weights.",
                "- The evaluator's own configured weight is intentionally not "
                "multiplied into this alignment distance.",
            ]
        )

    rows = [
        [
            item["name"],
            _percent(item["configuredWeight"]),
            _number(item["scaleNormalizedDistanceToCollective"]),
            "yes" if item["personalResult"]["sameTechnicalRankingAsCollective"] else "no",
            _number(item["personalResult"]["meanAbsoluteRankDifferenceFromCollective"]),
        ]
        for item in items
    ]

    lines.extend(
        [
            "",
            "#### Evaluator evidence",
            "",
            _table(
                [
                    "Evaluator",
                    "Configured weight",
                    "Normalized distance to collective",
                    "Same technical ranking",
                    "Mean absolute rank difference",
                ],
                rows,
            ),
            "",
            "#### Main observations",
            "",
        ]
    )

    closest = evaluators["closestToCollective"]
    farthest = evaluators["farthestFromCollective"]

    if closest.get("available"):
        lines.append(
            f"- Closest to the collective β matrix: "
            f"{_names(closest['evaluators'])} "
            f"(alignment distance **{_number(closest['distance'])}**)."
        )
    if farthest.get("available"):
        lines.append(
            f"- Farthest from the collective β matrix: "
            f"{_names(farthest['evaluators'])} "
            f"(alignment distance **{_number(farthest['distance'])}**)."
        )

    disagreement = evaluators["disagreement"]
    lines.append(
        "- Overall scale-normalized weighted mean absolute disagreement: "
        f"**{_number(disagreement['overallMeanScaleNormalizedWeightedMeanAbsoluteDeviation'])}**."
    )

    most_criterion = disagreement["byCriterion"]["mostDisagreement"]
    if most_criterion.get("available"):
        lines.extend(
            [
                f"- Greatest evaluator disagreement by criterion: "
                f"{_names(most_criterion['items'])} "
                f"(**{_number(most_criterion['value'])}**).",
                "- This identifies where evaluator assessments differ most in this "
                "execution; it is disagreement, not criterion influence.",
            ]
        )

    return "\n".join(lines)


def _counterfactual_table(
    items: list[dict[str, Any]],
    *,
    identity_label: str,
    identity_key: str,
) -> str:
    rows = []
    for item in items:
        if not item["available"]:
            rows.append(
                [
                    item[identity_key],
                    _percent(item["removedConfiguredWeight"]),
                    "unavailable",
                    item["reason"],
                    "—",
                    "—",
                ]
            )
            continue
        impact = item["impact"]
        rows.append(
            [
                item[identity_key],
                _percent(item["removedConfiguredWeight"]),
                "yes" if impact["technicalRankingChanged"] else "no",
                "yes" if impact["semanticLeadingGroupChanged"] else "no",
                "yes" if impact["winnerStateChanged"] else "no",
                _number(impact["meanAbsoluteClosenessChange"]),
            ]
        )
    return _table(
        [
            identity_label,
            "Removed weight",
            "Ranking changed",
            "Leading group changed",
            "Winner state changed",
            "Mean |Δ closeness|",
        ],
        rows,
    )



def _robustness_analysis(facts: dict[str, Any]) -> str:
    robustness = facts["robustness"]
    loco = robustness["leaveOneCriterionOut"]
    loeo = robustness["leaveOneEvaluatorOut"]

    lines = [
        "### Counterfactual robustness",
        "",
        "#### How to read this analysis",
        "",
        "- These diagnostics test whether the current recommendation survives "
        "controlled changes to the decision evidence.",
        "- A changed winner does not mean the original result is wrong; it identifies "
        "assumptions on which the recommendation materially depends.",
        "",
        "#### Criterion removal (LOCO)",
        "",
    ]

    if loco["availability"].get("available"):
        lines.extend(
            [
                "- Each criterion is removed in turn, the remaining criterion weights "
                "are renormalized, and TOPSIS is recomputed.",
                "- This tests whether the recommendation depends strongly on the "
                "presence of any single criterion.",
                "",
                _counterfactual_table(
                    loco["items"],
                    identity_label="Removed criterion",
                    identity_key="name",
                ),
                "",
                "#### LOCO interpretation",
                "",
            ]
        )

        changing = loco["winnerStateChangingCriteria"]
        if changing:
            lines.append(
                "- The recommendation is sensitive to the inclusion of the following "
                "criteria:"
            )
            lines.extend(_loco_change_lines(facts, loco))
            lines.append(
                "- These changes do not imply that the removed criteria are incorrect; "
                "they show exactly how the recommendation depends on them under the "
                "LOCO diagnostic."
            )
        else:
            lines.extend(
                [
                    "- No available single-criterion removal changes the semantic "
                    "winner state.",
                    "- The current winner therefore survives every tested LOCO removal.",
                    "- This is evidence of robustness to those specific removals, not a "
                    "guarantee under every possible model change.",
                ]
            )

        most_rank = loco["mostRankChanging"]
        if most_rank.get("available"):
            lines.append(
                "- Largest observed technical-rank impact under LOCO: "
                f"{_names(most_rank['items'])} "
                f"(total absolute rank change **{_number(most_rank['value'])}**)."
            )
    else:
        lines.append(
            f"- LOCO is not applicable "
            f"({_availability_text(loco['availability'])})."
        )

    lines.extend(["", "#### Evaluator removal (LOEO)", ""])

    if loeo["availability"].get("available"):
        lines.extend(
            [
                "- Each evaluator is removed in turn, the remaining evaluator weights "
                "are renormalized, the collective β matrix is rebuilt, and TOPSIS is "
                "recomputed.",
                "- This tests how dependent the recommendation is on any single "
                "evaluator represented in this stage.",
                "",
                _counterfactual_table(
                    loeo["items"],
                    identity_label="Removed evaluator",
                    identity_key="name",
                ),
                "",
                "#### LOEO interpretation",
                "",
            ]
        )

        changing = loeo["winnerStateChangingEvaluators"]
        if changing:
            lines.extend(
                [
                    f"- Removing {_names(changing)} changes the semantic winner state.",
                    "- The collective recommendation is therefore sensitive to the "
                    "presence of those evaluator profiles in this execution.",
                ]
            )
        else:
            lines.extend(
                [
                    "- No available evaluator removal changes the semantic winner "
                    "state.",
                    "- The current winner survives the tested removal of each "
                    "individual evaluator.",
                ]
            )

        most_rank = loeo["mostRankChanging"]
        if most_rank.get("available"):
            lines.append(
                "- Largest observed technical-rank impact under LOEO: "
                f"{_names(most_rank['items'])} "
                f"(total absolute rank change **{_number(most_rank['value'])}**)."
            )
    else:
        reason = loeo["availability"].get("reason")
        if reason == "single_evaluator":
            lines.extend(
                [
                    "- LOEO is not applicable because there is only one evaluator in "
                    "the alternative-evaluation evidence.",
                    "- Removing that evaluator would leave no collective evaluation to "
                    "recompute.",
                ]
            )
        else:
            lines.append(
                f"- LOEO is not applicable "
                f"({_availability_text(loeo['availability'])})."
            )

    return "\n".join(lines).rstrip()


def _nearest_change_text(change: dict[str, Any]) -> str:
    if not change.get("available"):
        return "none observed"

    point_values = [
        point["variedWeight"]
        for point in change.get("points") or []
        if isinstance(point.get("variedWeight"), (int, float))
    ]
    points = ", ".join(_percent(value) for value in point_values)
    endpoint_suffix = (
        "; endpoint"
        if point_values and all(_is_endpoint_weight(value) for value in point_values)
        else ""
    )
    return (
        f"{_percentage_points(change['absoluteWeightChange'])} away "
        f"(sampled weight(s): {points}{endpoint_suffix})"
    )


def _sensitivity_table(
    items: list[dict[str, Any]],
    *,
    identity_label: str,
    identity_key: str,
) -> str:
    rows = []
    for item in items:
        if not item["available"]:
            rows.append(
                [
                    item[identity_key],
                    _percent(item["configuredWeight"]),
                    "unavailable",
                    item["reason"],
                    "—",
                    "—",
                ]
            )
            continue

        summary = item["summary"]
        rows.append(
            [
                item[identity_key],
                _percent(item["configuredWeight"]),
                summary["technicalRankingChangedSampleCount"],
                summary["winnerStateChangedSampleCount"],
                _number(summary["maximumObservedMeanAbsoluteClosenessChange"]),
                _nearest_change_text(summary["nearestObservedWinnerStateChange"]),
            ]
        )
    return _table(
        [
            identity_label,
            "Configured weight",
            "Samples with rank change",
            "Samples with winner-state change",
            "Max mean |Δ closeness|",
            "Nearest observed winner-state change",
        ],
        rows,
    )



def _sensitivity_analysis(facts: dict[str, Any]) -> str:
    sensitivity = facts["sensitivity"]
    criterion = sensitivity["criterionWeights"]
    evaluator = sensitivity["evaluatorWeights"]
    method = sensitivity["method"]

    lines = [
        "### Weight sensitivity",
        "",
        "#### How to read this analysis",
        "",
        "- This diagnostic asks how much a configured criterion or evaluator weight "
        "can change before the observed decision changes.",
        "- A larger distance to the nearest winner-state change indicates more "
        "tolerance around the configured value on the tested grid.",
        "- No observed change means stability over the sampled values, not proof of "
        "absolute invariance.",
        f"- The grid samples weights from {_number(method['range']['minimum'])} to "
        f"{_number(method['range']['maximum'])} in steps of "
        f"**{_number(method['step'])}**, while also including the exact configured "
        "weight.",
        "- This is a **sampled counterfactual diagnostic**, not an exact breakpoint "
        "solver.",
        "",
        "#### Criterion-weight sensitivity",
        "",
    ]

    if criterion["availability"].get("available"):
        lines.extend(
            [
                "- One criterion weight is varied at a time; the remaining weight "
                "mass is redistributed proportionally while preserving the other "
                "configured weight ratios.",
                "",
                _sensitivity_table(
                    criterion["items"],
                    identity_label="Criterion",
                    identity_key="name",
                ),
                "",
                "#### Main criterion-sensitivity signals",
                "",
            ]
        )

        changing = criterion["winnerStateChangingCriteria"]
        if changing:
            lines.append(
                "- A sampled change in the following criterion weights changes the "
                f"semantic winner state somewhere on the tested grid: "
                f"{_names(changing)}."
            )

            interior_change, endpoint_only_change = (
                _criterion_sensitivity_categories(criterion["items"])
            )
            if interior_change:
                lines.append(
                    "- Winner-state changes are observed at **interior sampled "
                    f"weights** for {_names(interior_change)}."
                )
            if endpoint_only_change:
                lines.append(
                    f"- For {_names(endpoint_only_change)}, winner-state changes are "
                    "observed **only at 0%/100% endpoints** on the tested grid; no "
                    "interior sampled weight changes the winner state for "
                    f"{_plural(len(endpoint_only_change), 'this criterion', 'these criteria')}."
                )

            nearest_signal = _nearest_sensitivity_signal(criterion["items"])
            if nearest_signal:
                lines.append(
                    "- Closest observed winner-state change: "
                    f"{_signal_weight_moves(nearest_signal)}, "
                    f"**{_percentage_points(nearest_signal['distance'])}** from the "
                    "configured value."
                )

                if nearest_signal["allEndpoints"]:
                    lines.append(
                        "- The closest change occurs at a **0% or 100% endpoint**. "
                        "This is an extreme reweighting condition: 0% removes that "
                        "criterion's effective influence, while 100% assigns the full "
                        "criterion-weight mass to it."
                    )
                    interior_signal = _nearest_sensitivity_signal(
                        criterion["items"],
                        endpoint=False,
                    )
                    if interior_signal:
                        lines.append(
                            "- Closest **interior-grid** winner-state change: "
                            f"{_signal_weight_moves(interior_signal)}, "
                            f"**{_percentage_points(interior_signal['distance'])}** "
                            "from the configured value."
                        )
                    else:
                        lines.append(
                            "- No winner-state change is observed at any interior "
                            "sampled criterion weight."
                        )
                else:
                    lines.append(
                        "- Because the closest change occurs at an interior sampled "
                        "weight, it is evidence of sensitivity before either 0% or "
                        "100% is reached. The sampled point is still not an exact "
                        "mathematical breakpoint."
                    )
        else:
            lines.extend(
                [
                    "- No criterion-weight trajectory changes the semantic winner "
                    "state on the sampled grid.",
                    "- Within the tested weight values, the current recommendation "
                    "therefore remains stable to criterion-weight variation.",
                ]
            )
    else:
        lines.append(
            f"- Criterion-weight sensitivity is not applicable "
            f"({_availability_text(criterion['availability'])})."
        )

    lines.extend(["", "#### Evaluator-weight sensitivity", ""])

    if evaluator["availability"].get("available"):
        lines.extend(
            [
                "- One evaluator weight is varied at a time; the remaining weight "
                "mass is redistributed proportionally across the other evaluators.",
                "",
                _sensitivity_table(
                    evaluator["items"],
                    identity_label="Evaluator",
                    identity_key="name",
                ),
                "",
                "#### Main evaluator-sensitivity signals",
                "",
            ]
        )

        changing = evaluator["winnerStateChangingEvaluators"]
        if changing:
            lines.append(
                "- A sampled change in the following evaluator weights changes the "
                f"semantic winner state: {_names(changing)}."
            )

            nearest_signal = _nearest_sensitivity_signal(evaluator["items"])
            if nearest_signal:
                lines.append(
                    "- Closest observed evaluator-weight winner-state change: "
                    f"{_signal_weight_moves(nearest_signal)}, "
                    f"**{_percentage_points(nearest_signal['distance'])}** from the "
                    "configured value."
                )
                if nearest_signal["allEndpoints"]:
                    lines.append(
                        "- That closest evaluator-weight change occurs at a 0%/100% "
                        "endpoint, so it represents an extreme weighting condition "
                        "rather than a small local perturbation."
                    )
        else:
            lines.extend(
                [
                    "- No evaluator-weight trajectory changes the semantic winner "
                    "state on the sampled grid.",
                    "- Within the tested evaluator weights, the current winner remains "
                    "unchanged.",
                ]
            )
    else:
        reason = evaluator["availability"].get("reason")
        if reason == "single_evaluator":
            lines.append(
                "- Evaluator-weight sensitivity is not applicable with a single "
                "evaluator in this alternative-evaluation stage."
            )
        else:
            lines.append(
                f"- Evaluator-weight sensitivity is not applicable "
                f"({_availability_text(evaluator['availability'])})."
            )

    return "\n".join(lines)



def _method_note(facts: dict[str, Any]) -> str:
    method = facts["method"]
    return "\n".join(
        [
            "### Method note",
            "",
            "- **Evidence source:** this interpretation is generated deterministically "
            "from the stored 2-Tuple TOPSIS execution evidence.",
            "- **Executed ranking:** the technical ranking is never rewritten by the "
            "analysis.",
            f"- **Semantic tie tolerance:** "
            f"{method['analyticalTieTolerance']:.0e}.",
            f"- **Evidence validation tolerance:** "
            f"{method['evidenceTolerance']:.0e}.",
            "- **Distance metric:** weighted L1.",
            "- **Counterfactual diagnostics:** LOCO, LOEO, and weight sensitivity are "
            "derived analyses used to interpret robustness; they do not alter the "
            "persisted execution.",
        ]
    )


def build_interpretation(facts: dict[str, Any]) -> str:
    """Render deterministic result explanation from validated TOPSIS facts."""
    sections = [
        _result_interpretation(facts),
        _decision_result(facts),
        _criteria_analysis(facts),
        _alternative_profiles(facts),
        _linguistic_analysis(facts),
        _evaluator_analysis(facts),
        _robustness_analysis(facts),
        _sensitivity_analysis(facts),
        _method_note(facts),
    ]
    return "\n\n".join(section.strip() for section in sections if section.strip()) + "\n"