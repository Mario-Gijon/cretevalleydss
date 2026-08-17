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


def _decision_result(facts: dict[str, Any]) -> str:
    result = facts["result"]
    counts = facts["counts"]
    ranking = result["technicalRanking"]
    winner = result["winner"]
    alternatives = facts["alternatives"]["items"]

    lines = ["### Decision result", ""]

    if counts["alternatives"] == 1:
        only = alternatives[0]
        lines.append(
            f"Only **{_escape(only['name'])}** was evaluated, so there is no "
            "meaningful comparison or winner."
        )
        if (
            abs(float(only["positiveDistance"])) <= facts["method"]["evidenceTolerance"]
            and abs(float(only["negativeDistance"])) <= facts["method"]["evidenceTolerance"]
        ):
            lines.append(
                "Its positive and negative ideal distances are both zero. "
                "The resulting closeness coefficient of **0.5** is the model's "
                "neutral technical convention for coincident ideals; it is not "
                "a 50% performance score."
            )
        else:
            lines.append(
                f"The stored TOPSIS coefficient is **{_number(only['closeness'])}** "
                f"(D+ = {_number(only['positiveDistance'])}, "
                f"D− = {_number(only['negativeDistance'])})."
            )
    elif winner.get("available"):
        selected = winner["alternative"]
        lines.append(
            f"**{_escape(selected['name'])}** is the unique leading alternative "
            f"with a TOPSIS closeness coefficient of "
            f"**{_number(selected['closeness'])}**."
        )
    elif winner.get("reason") == "no_discrimination":
        lines.append(
            "The executed problem has **no effective weighted discrimination**. "
            "The technical ranking is preserved as execution evidence, but its "
            "stable order does not imply substantive preference between alternatives."
        )
    elif winner.get("reason") == "no_variation":
        lines.append(
            "There is **no unique semantic winner** because the leading alternatives "
            "are effectively tied under the analysis tolerance: "
            f"{_names(result['leadingGroup'])}."
        )
        lines.append(
            "The stored technical ranking is still shown below, but technical "
            "tie-breaking should not be read as meaningful separation."
        )

    rows = [
        [
            item["technicalRank"],
            item["name"],
            _number(item["closeness"]),
        ]
        for item in ranking
    ]
    lines.extend(
        [
            "",
            _table(["Rank", "Alternative", "Closeness"], rows),
        ]
    )
    return "\n".join(lines)


def _criteria_analysis(facts: dict[str, Any]) -> str:
    criteria = facts["criteria"]
    items = criteria["items"]
    lines = ["### Criteria and observed discrimination", ""]

    lines.append(
        "Configured criterion weight, observed discrimination, and counterfactual "
        "influence are different concepts. The table below reports the first two; "
        "counterfactual influence is analysed separately."
    )

    rows = []
    for item in items:
        rows.append(
            [
                item["name"],
                item["direction"],
                _percent(item["configuredWeight"]),
                _number(item["betaRange"]),
                _number(item["weightedDiscrimination"]),
                _percent(item["discriminationShare"]),
            ]
        )

    lines.extend(
        [
            "",
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
            ),
        ]
    )

    if not facts["variation"]["effectiveAlternativeDiscrimination"]:
        lines.extend(
            [
                "",
                "No criterion provides effective weighted discrimination in the "
                "executed collective matrix.",
            ]
        )
    else:
        most = criteria["mostDiscriminating"]
        least = criteria["leastDiscriminating"]
        if most.get("available"):
            lines.extend(
                [
                    "",
                    f"The largest weighted observed discrimination is "
                    f"**{_number(most['value'])}**, shared by "
                    f"{_names(most['criteria'])}.",
                ]
            )
        if least.get("available"):
            lines.append(
                f"The smallest weighted observed discrimination is "
                f"**{_number(least['value'])}**, shared by "
                f"{_names(least['criteria'])}."
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
        lines.extend(
            [
                "",
                f"{_names(zero_weight_varying)} show observed variation but have "
                "zero effective configured weight, so those differences did not "
                "enter the executed TOPSIS distances.",
            ]
        )
    if constant_positive_weight:
        verb = "has" if len(constant_positive_weight) == 1 else "have"
        pronoun = "it" if len(constant_positive_weight) == 1 else "they"
        lines.extend(
            [
                "",
                f"{_names(constant_positive_weight)} {verb} positive configured "
                "weight but no observed collective β variation, so "
                f"{pronoun} contributed zero discrimination in this execution.",
            ]
        )

    return "\n".join(lines)


def _alternative_profiles(facts: dict[str, Any]) -> str:
    lines = ["### Alternative profiles", ""]
    items = sorted(
        facts["alternatives"]["items"],
        key=lambda item: item["technicalRank"],
    )

    for item in items:
        lines.append(
            f"**{_escape(item['name'])}** — technical rank "
            f"**{item['technicalRank']}**, closeness **{_number(item['closeness'])}**, "
            f"D+ **{_number(item['positiveDistance'])}**, "
            f"D− **{_number(item['negativeDistance'])}**."
        )
        lines.append(
            f"It matches the positive ideal on "
            f"**{item['matchesPositiveIdealCriterionCount']}** criterion/criteria "
            f"and the negative ideal on "
            f"**{item['matchesNegativeIdealCriterionCount']}**."
        )

        weakness = item["principalWeakness"]
        if weakness.get("available"):
            lines.append(
                "Largest contribution to distance from the positive ideal: "
                f"{_names(weakness['criteria'])} "
                f"(**{_number(weakness['contribution'])}**)."
            )
        elif float(item["positiveDistance"]) <= facts["method"]["evidenceTolerance"]:
            lines.append(
                "It is at the positive ideal in the weighted TOPSIS distance space, "
                "so no principal weakness is identified."
            )

        strength = item["principalStrength"]
        if strength.get("available"):
            lines.append(
                "Largest contribution to separation from the negative ideal: "
                f"{_names(strength['criteria'])} "
                f"(**{_number(strength['contribution'])}**)."
            )
        elif float(item["negativeDistance"]) <= facts["method"]["evidenceTolerance"]:
            lines.append(
                "It is at the negative ideal in the weighted TOPSIS distance space, "
                "so no principal strength is identified."
            )
        lines.append("")

    return "\n".join(lines).rstrip()


def _linguistic_analysis(facts: dict[str, Any]) -> str:
    linguistic = facts["linguistic2Tuple"]
    summary = linguistic["collective"]["summary"]
    lines = ["### Linguistic 2-tuple representation", ""]

    if summary["translatedValueCount"] == 0:
        lines.append(
            "All collective evaluations fall exactly on linguistic labels "
            "(α = 0); no symbolic translation is required."
        )
    else:
        lines.append(
            f"**{summary['translatedValueCount']} of {summary['valueCount']}** "
            f"collective values ({_percent(summary['translatedShare'])}) require "
            "a non-zero symbolic translation α."
        )
        lines.append(
            f"The mean |α| is **{_number(summary['meanAbsoluteAlpha'])}** and "
            f"the maximum |α| is **{_number(summary['maxAbsoluteAlpha'])}**."
        )

    if summary["exactMidpointCount"] > 0:
        lines.append(
            f"**{summary['exactMidpointCount']}** value(s) use α = -0.5, the exact "
            "midpoint convention represented with the upper linguistic label. "
            "This is a symbolic translation, not uncertainty, confidence, or disagreement."
        )
    else:
        lines.append(
            "α is interpreted only as symbolic translation in the linguistic "
            "2-tuple model; it is not an uncertainty or confidence measure."
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
    lines.extend(
        [
            "",
            _table(
                [
                    "Criterion",
                    "Translated values",
                    "Translated share",
                    "Mean |α|",
                    "Max |α|",
                ],
                criterion_rows,
            ),
        ]
    )

    strongest = linguistic["collective"]["strongestTranslations"]
    if strongest.get("available"):
        items = strongest["items"]
        descriptions = [
            (
                f"**{_escape(item['alternativeName'])} / "
                f"{_escape(item['criterionName'])}** "
                f"(α = {_number(item['tuple']['alpha'])})"
            )
            for item in items
        ]
        lines.extend(
            [
                "",
                "The largest observed symbolic translation magnitude is "
                f"**{_number(strongest['maxAbsoluteAlpha'])}**: "
                + ", ".join(descriptions)
                + ".",
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
        lines.append(
            f"Only one evaluator participated: **{_escape(item['name'])}** "
            f"(configured weight {_percent(item['configuredWeight'])}). "
            "No between-evaluator agreement, closest/farthest evaluator, or "
            "comparative disagreement claim is applicable."
        )
        lines.append(
            "The evaluator's derived personal TOPSIS order is: "
            f"**{_rank_names(personal['technicalRanking'])}**."
        )
        return "\n".join(lines)

    if evaluators["variation"]["equivalentSubmissions"]:
        lines.append(
            "All evaluators submitted effectively equivalent β matrices. "
            "Therefore no evaluator is singled out as closest to or farthest from "
            "the collective result."
        )
    else:
        lines.append(
            "Alignment distance measures how far each evaluator's β matrix lies "
            "from the collective matrix using criterion weights; the evaluator's "
            "own configured weight is intentionally not multiplied into this distance."
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
        ]
    )

    closest = evaluators["closestToCollective"]
    farthest = evaluators["farthestFromCollective"]
    if closest.get("available"):
        lines.extend(
            [
                "",
                f"Closest to the collective β matrix: "
                f"{_names(closest['evaluators'])} "
                f"(alignment distance **{_number(closest['distance'])}**).",
            ]
        )
    if farthest.get("available"):
        lines.append(
            f"Farthest from the collective β matrix: "
            f"{_names(farthest['evaluators'])} "
            f"(alignment distance **{_number(farthest['distance'])}**)."
        )

    disagreement = evaluators["disagreement"]
    lines.extend(
        [
            "",
            "The overall scale-normalized weighted mean absolute disagreement is "
            f"**{_number(disagreement['overallMeanScaleNormalizedWeightedMeanAbsoluteDeviation'])}**.",
        ]
    )
    most_criterion = disagreement["byCriterion"]["mostDisagreement"]
    if most_criterion.get("available"):
        lines.append(
            "Greatest evaluator disagreement by criterion: "
            f"{_names(most_criterion['items'])} "
            f"(**{_number(most_criterion['value'])}**). "
            "This is disagreement, not criterion influence."
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
    lines = ["### Counterfactual robustness", ""]

    if loco["availability"].get("available"):
        lines.append(
            "**Leave-one-criterion-out (LOCO).** Each criterion is removed, the "
            "remaining criterion weights are renormalized, and TOPSIS is recomputed."
        )
        lines.extend(
            [
                "",
                _counterfactual_table(
                    loco["items"],
                    identity_label="Removed criterion",
                    identity_key="name",
                ),
            ]
        )
        changing = loco["winnerStateChangingCriteria"]
        if changing:
            lines.extend(
                [
                    "",
                    "Removing the following criterion/criteria changes the semantic "
                    f"winner state: {_names(changing)}.",
                ]
            )
        else:
            lines.extend(
                [
                    "",
                    "No available LOCO removal changes the semantic winner state.",
                ]
            )

        most_rank = loco["mostRankChanging"]
        if most_rank.get("available"):
            lines.append(
                "Largest observed technical-rank impact under LOCO: "
                f"{_names(most_rank['items'])} "
                f"(total absolute rank change **{_number(most_rank['value'])}**)."
            )
    else:
        lines.append(
            f"LOCO is not applicable ({_availability_text(loco['availability'])})."
        )

    lines.append("")
    if loeo["availability"].get("available"):
        lines.append(
            "**Leave-one-evaluator-out (LOEO).** Each evaluator is removed, the "
            "remaining evaluator weights are renormalized, the collective β matrix "
            "is rebuilt, and TOPSIS is recomputed."
        )
        lines.extend(
            [
                "",
                _counterfactual_table(
                    loeo["items"],
                    identity_label="Removed evaluator",
                    identity_key="name",
                ),
            ]
        )
        changing = loeo["winnerStateChangingEvaluators"]
        if changing:
            lines.extend(
                [
                    "",
                    "Removing the following evaluator(s) changes the semantic winner "
                    f"state: {_names(changing)}.",
                ]
            )
        else:
            lines.extend(
                [
                    "",
                    "No available LOEO removal changes the semantic winner state.",
                ]
            )

        most_rank = loeo["mostRankChanging"]
        if most_rank.get("available"):
            lines.append(
                "Largest observed technical-rank impact under LOEO: "
                f"{_names(most_rank['items'])} "
                f"(total absolute rank change **{_number(most_rank['value'])}**)."
            )
    else:
        reason = loeo["availability"].get("reason")
        if reason == "single_evaluator":
            lines.append(
                "LOEO is not applicable because there is only one evaluator."
            )
        else:
            lines.append(
                f"LOEO is not applicable ({_availability_text(loeo['availability'])})."
            )

    return "\n".join(lines).rstrip()


def _nearest_change_text(change: dict[str, Any]) -> str:
    if not change.get("available"):
        return "none observed"
    points = ", ".join(
        _percent(point["variedWeight"])
        for point in change["points"]
    )
    return (
        f"{_percent(change['absoluteWeightChange'])} away "
        f"(sampled weight(s): {points})"
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
    lines = ["### Weight sensitivity", ""]

    lines.append(
        "This is a **sampled counterfactual diagnostic**, not an exact breakpoint "
        f"solver. Weights are sampled from {_number(method['range']['minimum'])} "
        f"to {_number(method['range']['maximum'])} in steps of "
        f"**{_number(method['step'])}**, with the exact configured weight added "
        "to the grid. Reported transitions therefore identify sampled intervals, "
        "not exact mathematical thresholds. The grid includes the 0% and 100% "
        "endpoints; a winner-state change at an extreme endpoint can occur because "
        "all discriminating weight has been removed, so it must not automatically "
        "be read as evidence that the varied criterion itself is discriminating."
    )

    if criterion["availability"].get("available"):
        lines.extend(
            [
                "",
                "**Criterion-weight sensitivity.** When one criterion weight changes, "
                "the remaining weight mass is redistributed proportionally while "
                "preserving the other configured weight ratios.",
                "",
                _sensitivity_table(
                    criterion["items"],
                    identity_label="Criterion",
                    identity_key="name",
                ),
            ]
        )
        changing = criterion["winnerStateChangingCriteria"]
        if changing:
            lines.extend(
                [
                    "",
                    "A sampled change in the following criterion weight(s) changes the "
                    f"semantic winner state somewhere on the tested grid: {_names(changing)}.",
                ]
            )
        else:
            lines.extend(
                [
                    "",
                    "No criterion-weight trajectory changes the semantic winner state "
                    "on the sampled grid.",
                ]
            )
    else:
        lines.extend(
            [
                "",
                f"Criterion-weight sensitivity is not applicable "
                f"({_availability_text(criterion['availability'])}).",
            ]
        )

    if evaluator["availability"].get("available"):
        lines.extend(
            [
                "",
                "**Evaluator-weight sensitivity.** When one evaluator weight changes, "
                "the remaining weight mass is redistributed proportionally across "
                "the other evaluators.",
                "",
                _sensitivity_table(
                    evaluator["items"],
                    identity_label="Evaluator",
                    identity_key="name",
                ),
            ]
        )
        changing = evaluator["winnerStateChangingEvaluators"]
        if changing:
            lines.extend(
                [
                    "",
                    "A sampled change in the following evaluator weight(s) changes "
                    f"the semantic winner state: {_names(changing)}.",
                ]
            )
        else:
            lines.extend(
                [
                    "",
                    "No evaluator-weight trajectory changes the semantic winner state "
                    "on the sampled grid.",
                ]
            )
    else:
        reason = evaluator["availability"].get("reason")
        if reason == "single_evaluator":
            lines.extend(
                [
                    "",
                    "Evaluator-weight sensitivity is not applicable with a single evaluator.",
                ]
            )
        else:
            lines.extend(
                [
                    "",
                    f"Evaluator-weight sensitivity is not applicable "
                    f"({_availability_text(evaluator['availability'])}).",
                ]
            )

    return "\n".join(lines)


def _method_note(facts: dict[str, Any]) -> str:
    method = facts["method"]
    return "\n".join(
        [
            "### Method note",
            "",
            "This interpretation is generated deterministically from the stored "
            "2-Tuple TOPSIS execution evidence. The executed technical ranking is "
            "never rewritten by the analysis. Effective semantic ties use an "
            f"analysis tolerance of **{method['analyticalTieTolerance']:.0e}**, while "
            "stored mathematical evidence is checked with the stricter evidence "
            f"tolerance **{method['evidenceTolerance']:.0e}**.",
            "",
            "TOPSIS uses weighted L1 distance here. Counterfactual LOCO/LOEO and "
            "weight-sensitivity results are derived diagnostics; they do not alter "
            "the persisted execution.",
        ]
    )


def build_interpretation(facts: dict[str, Any]) -> str:
    """Render deterministic Markdown from validated TOPSIS analysis facts."""
    sections = [
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
