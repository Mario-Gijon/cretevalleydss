from __future__ import annotations

from typing import Any

from .common import EVIDENCE_TOLERANCE


def _text(value: Any) -> str:
    return (
        str(value or "")
        .replace("\\", "\\\\")
        .replace("*", "\\*")
        .replace("_", "\\_")
        .replace("[", "\\[")
        .replace("]", "\\]")
        .replace("|", r"\|")
        .replace("\n", " ")
        .strip()
    )


def _bold(value: Any) -> str:
    name = _text(value)
    return f"**{name}**" if name else ""


def _names(
    items: list[dict[str, Any]] | list[str],
    *,
    key: str = "name",
    noun: str = "alternatives",
    limit: int = 4,
) -> str:
    values: list[str] = []
    for item in items:
        value = item.get(key) if isinstance(item, dict) else item
        name = _text(value)
        if name and name not in values:
            values.append(name)

    if not values:
        return ""
    if len(values) > limit:
        return f"{len(values)} {noun}"

    bolded = [_bold(value) for value in values]
    if len(bolded) == 1:
        return bolded[0]
    if len(bolded) == 2:
        return f"{bolded[0]} and {bolded[1]}"
    return ", ".join(bolded[:-1]) + f", and {bolded[-1]}"


def _available(value: Any) -> bool:
    return isinstance(value, dict) and value.get("available") is True


def _leaders(facts: dict[str, Any]) -> list[dict[str, Any]]:
    result = facts.get("result") or {}
    leaders = result.get("leadingGroup") or []
    if leaders:
        return leaders

    winner = result.get("winner") or {}
    alternative = winner.get("alternative")
    return [alternative] if isinstance(alternative, dict) else []


def _leader_description(leaders: list[dict[str, Any]]) -> str:
    if len(leaders) == 1:
        return _bold(leaders[0].get("name"))
    names = _names(leaders)
    if names:
        return f"a tie between {names}"
    return "the leading group"


def _overall_result(facts: dict[str, Any]) -> str:
    result = facts.get("result") or {}
    counts = facts.get("counts") or {}
    ranking = result.get("technicalRanking") or []
    winner = result.get("winner") or {}
    leaders = _leaders(facts)

    if counts.get("alternatives") == 1 or len(ranking) == 1:
        only = ranking[0] if ranking else (leaders[0] if leaders else {})
        name = _bold(only.get("name"))
        if name:
            paragraph = (
                f"Only {name} was evaluated. This describes its assessment "
                "against the criteria and preferences used; it does not "
                "compare it with competing alternatives."
            )
        else:
            paragraph = (
                "Only one alternative was evaluated, so this execution does "
                "not establish a comparative winner."
            )
        return f"### Overall result\n\n{paragraph}"

    if _available(winner) and isinstance(winner.get("alternative"), dict):
        name = _bold(winner["alternative"].get("name"))
        paragraph = (
            f"{name} is the preferred alternative in this evaluation. It "
            "received the strongest overall assessment under the criteria "
            "and preferences used. This describes the model result, not a "
            "guarantee of real-world performance."
        )
    elif leaders and (
        winner.get("reason") in {"tied_leading_group", "no_discrimination"}
        or len(leaders) > 1
    ):
        names = _names(leaders)
        if names:
            paragraph = (
                f"The evaluation leaves {names} tied for the strongest "
                "overall assessment; it does not establish one as the "
                "preferred choice."
            )
        else:
            paragraph = (
                "The evaluation does not establish one preferred choice; "
                f"{len(leaders)} alternatives share the strongest overall assessment."
            )
    else:
        paragraph = (
            "The available result does not establish a unique preferred "
            "alternative."
        )

    return f"### Overall result\n\n{paragraph}"


def _extreme_names(
    extreme: dict[str, Any],
) -> str:
    return _names(
        extreme.get("evaluators") or [],
        key="expertLabel",
        noun="experts",
    )


def _personal_leading_group(
    evaluator: dict[str, Any],
) -> list[dict[str, Any]]:
    personal = evaluator.get("personalResult") or {}
    return personal.get("leadingGroup") or []


def _personal_ranking_observation(
    facts: dict[str, Any],
    evaluators: list[dict[str, Any]],
) -> str | None:
    if (facts.get("counts") or {}).get("alternatives") == 1:
        return None

    capabilities = (facts.get("evaluators") or {}).get("capabilities") or {}
    if not _available(capabilities.get("comparePersonalAndCollectiveRanking")):
        return None

    complete = [
        item
        for item in evaluators
        if isinstance(item.get("alignmentWithCollective"), dict)
        and isinstance(
            item["alignmentWithCollective"].get(
                "semanticLeadingGroupMatchesCollective"
            ),
            bool,
        )
    ]
    if not complete:
        return None

    leaders = _leaders(facts)
    unique_collective_leader = len(leaders) == 1
    different_leaders = [
        item
        for item in complete
        if not item["alignmentWithCollective"][
            "semanticLeadingGroupMatchesCollective"
        ]
    ]
    different_order = [
        item
        for item in complete
        if not item["alignmentWithCollective"].get(
            "technicalRankingMatchesCollective"
        )
    ]

    if different_leaders:
        observations: list[str] = []
        for evaluator in different_leaders[:2]:
            expert_name = _bold(evaluator.get("expertLabel"))
            personal_leaders = _personal_leading_group(evaluator)
            personal_names = _names(personal_leaders)
            if not expert_name or not personal_names:
                continue

            if unique_collective_leader:
                collective_clause = (
                    f"the collective result favored {_bold(leaders[0].get('name'))}"
                )
            else:
                collective_clause = (
                    "the collective evaluation left "
                    f"{_names(leaders)} tied for the lead"
                )

            if len(personal_leaders) == 1:
                personal_clause = f"favored {personal_names}"
            else:
                personal_clause = f"shared the lead between {personal_names}"
            observations.append(
                f"{expert_name}'s personal assessment {personal_clause}, "
                f"while {collective_clause}"
            )

        if observations:
            if len(different_leaders) > len(observations):
                observations.append(
                    f"the leading result also differed for "
                    f"{len(different_leaders) - len(observations)} other experts"
                )
            return ". ".join(observations) + "."
        return None

    if different_order:
        different_order_names = _names(
            different_order,
            key="expertLabel",
            noun="experts",
        )
        if unique_collective_leader:
            return (
                f"The personal ordering from {different_order_names} differed "
                "below the preferred option, but those assessments still "
                f"favored {_bold(leaders[0].get('name'))}."
            )
        return (
            f"The personal ordering from {different_order_names} differed, "
            "but their assessments retained the collective leading group."
        )

    if unique_collective_leader:
        return (
            "Each expert's personal assessment also favored "
            f"{_bold(leaders[0].get('name'))}, matching the collective result."
        )
    if leaders:
        return "The experts' personal assessments retained the collective leading group."
    return None


def _cell_observation(
    evaluators: dict[str, Any],
) -> str | None:
    disagreement = evaluators.get("cellDisagreement") or {}
    strongest = disagreement.get("strongestDisagreement") or {}
    if not _available(disagreement.get("availability")):
        return None
    if float(strongest.get("value") or 0.0) <= EVIDENCE_TOLERANCE:
        return None

    items = strongest.get("items") or []
    descriptions: list[str] = []
    for item in items:
        alternative = _text(item.get("alternativeName"))
        criterion = _text(item.get("criterionName"))
        description = (alternative, criterion)
        if alternative and criterion and description not in descriptions:
            descriptions.append(description)

    if not descriptions:
        return None

    selected = descriptions[:2]
    cells = [
        f"{_bold(alternative)}'s {_bold(criterion)} assessment"
        for alternative, criterion in selected
    ]
    if len(cells) == 1:
        cell_text = cells[0]
    else:
        cell_text = f"{cells[0]} and {cells[1]}"
    if len(descriptions) > len(selected):
        cell_text += " and other assessment cells"

    return (
        "The clearest differences from the collective assessment appeared "
        f"in {cell_text}."
    )


def _expert_interpretation(
    facts: dict[str, Any],
) -> str | None:
    evaluator_data = facts.get("evaluators") or {}
    items = evaluator_data.get("items") or []
    evaluator_count = (facts.get("counts") or {}).get(
        "evaluators",
        len(items),
    )

    if evaluator_count == 1 or len(items) == 1:
        expert_name = _bold(items[0].get("expertLabel")) if items else ""
        who = f"{expert_name}'s alternative evaluations" if expert_name else "One expert's alternative evaluations"
        return (
            "### Expert perspectives\n\n"
            f"Only {who} are represented, so this result cannot show "
            "agreement or disagreement between different experts."
        )

    if not items:
        return None

    observations: list[str] = []
    closest = evaluator_data.get("closestToCollective") or {}
    farthest = evaluator_data.get("farthestFromCollective") or {}
    closest_names = _extreme_names(closest) if _available(closest) else ""
    farthest_names = _extreme_names(farthest) if _available(farthest) else ""

    if closest_names and farthest_names:
        observations.append(
            f"The evaluations from {closest_names} were closest to the "
            f"collective assessment; those from {farthest_names} differed "
            "most across the assessed cells."
        )
    elif closest_names:
        observations.append(
            f"The evaluations from {closest_names} were closest to the collective "
            "assessment across the assessed cells."
        )
    elif farthest_names:
        observations.append(
            f"The evaluations from {farthest_names} differed most from the "
            "collective assessment across the assessed cells."
        )
    elif (
        closest.get("reason") == "no_variation"
        and farthest.get("reason") == "no_variation"
    ):
        observations.append(
            "The experts' overall distances from the collective assessment "
            "were equivalent, so the evidence does not identify one as "
            "closer or farther."
        )

    if closest_names or farthest_names:
        observations.append(
            "These profile comparisons cover the alternative-and-criterion "
            "assessments; distance alone does not show a different personal ranking."
        )

    ranking_observation = _personal_ranking_observation(facts, items)
    if ranking_observation:
        observations.append(ranking_observation)

    cell_observation = _cell_observation(evaluator_data)
    if cell_observation:
        observations.append(cell_observation)

    if not observations:
        return None
    return "### Expert perspectives\n\n" + " ".join(observations)


def _item_label(item: dict[str, Any], kind: str) -> str:
    key = "expertLabel" if kind == "evaluator" else "name"
    name = item.get(key)
    if not name:
        name = item.get("expertKey" if kind == "evaluator" else "criterionId")
    return _bold(name)


def _counterfactual_lead(
    item: dict[str, Any],
    *,
    kind: str,
) -> str:
    result = item.get("counterfactualResult") or {}
    winner = result.get("winner") or {}
    leaders = result.get("leadingGroup") or []
    removed = _item_label(item, kind)

    if _available(winner) and isinstance(winner.get("alternative"), dict):
        target = _bold(winner["alternative"].get("name"))
        return (
            f"Removing {removed} changed the preferred alternative to "
            f"{target} in this check."
        )
    if len(leaders) > 1:
        target = _names(leaders)
        return (
            f"Removing {removed} left {target} tied for the lead in this check."
        )
    return (
        f"Removing {removed} changed the leading result in this check, "
        "so the analysis no longer identifies the same preferred alternative."
    )


def _robustness_group_observation(
    group: dict[str, Any] | None,
    *,
    kind: str,
    facts: dict[str, Any],
) -> tuple[str | None, bool, bool, bool]:
    if not isinstance(group, dict) or not _available(group.get("availability")):
        return None, False, False, False

    items = [
        item
        for item in group.get("items") or []
        if item.get("available") is not False
    ]
    if not items:
        return None, False, False, False

    changed = [
        item
        for item in items
        if (item.get("impact") or {}).get("winnerStateChanged")
        or (item.get("impact") or {}).get("semanticLeadingGroupChanged")
    ]
    label = "expert" if kind == "evaluator" else "criterion"
    noun = "expert-removal" if kind == "evaluator" else "criterion-removal"

    if changed:
        details = [
            _counterfactual_lead(item, kind=kind)
            for item in changed[:2]
        ]
        if len(changed) > len(details):
            details.append(
                f"The leading result also changed in {len(changed) - len(details)} other checks."
            )
        paragraph = " ".join(details)
        if kind == "criterion":
            paragraph += (
                " This flags sensitivity to the criterion's inclusion; it "
                "does not establish that the criterion caused the result."
            )
        else:
            paragraph += (
                " This makes that expert's contribution relevant when "
                "assessing how stable the recommendation is."
            )
        return paragraph, True, False, False

    rank_changed = any(
        (item.get("impact") or {}).get("technicalRankingChanged")
        for item in items
    )
    leaders = _leaders(facts)
    if len(leaders) == 1:
        paragraph = (
            f"{_bold(leaders[0].get('name'))} remained the preferred "
            f"alternative across the available {noun} checks."
        )
        if rank_changed:
            paragraph += " Some other alternatives changed position."
    elif leaders:
        paragraph = (
            f"The same leading group, {_names(leaders)}, remained in place "
            f"across the available {noun} checks."
        )
        if rank_changed:
            paragraph += " The stored ordering changed in some checks."
    else:
        paragraph = (
            f"The leading result remained unchanged across the available "
            f"{label}-removal checks."
        )
    return paragraph, True, True, rank_changed


def _changed_points(item: dict[str, Any]) -> list[dict[str, Any]]:
    return [
        point
        for point in item.get("points") or []
        if (point.get("changesFromBaseline") or {}).get(
            "winnerStateChanged"
        )
        or (point.get("changesFromBaseline") or {}).get(
            "semanticLeadingGroupChanged"
        )
    ]


def _sensitivity_leading_result_change(
    facts: dict[str, Any],
    items: list[dict[str, Any]],
) -> str | None:
    baseline = _leaders(facts)
    baseline_ids = tuple(
        sorted(
            _text(item.get("alternativeId") or item.get("name"))
            for item in baseline
        )
    )
    changed_groups: dict[tuple[str, ...], list[dict[str, Any]]] = {}

    for item in items:
        for point in _changed_points(item):
            result = point.get("result") or {}
            leaders = result.get("leadingGroup") or []
            if not leaders:
                continue
            group_ids = tuple(
                sorted(
                    _text(leader.get("alternativeId") or leader.get("name"))
                    for leader in leaders
                )
            )
            changed_groups[group_ids] = leaders

    if len(changed_groups) != 1:
        return None

    changed_ids, changed_leaders = next(iter(changed_groups.items()))
    if changed_ids == baseline_ids:
        return None

    changed_description = _leader_description(changed_leaders)
    if len(baseline) == 1 and len(changed_leaders) == 1:
        return (
            f"The preferred alternative shifted from {_bold(baseline[0].get('name'))} "
            f"to {_bold(changed_leaders[0].get('name'))}."
        )
    return (
        f"The leading result shifted from {_leader_description(baseline)} "
        f"to {changed_description}."
    )


def _sensitivity_group_observation(
    group: dict[str, Any] | None,
    *,
    kind: str,
    facts: dict[str, Any],
) -> tuple[str | None, bool]:
    if not isinstance(group, dict) or not _available(group.get("availability")):
        return None, False

    items = [
        item
        for item in group.get("items") or []
        if item.get("available") is not False and isinstance(item.get("summary"), dict)
    ]
    if not items:
        return None, False

    weight_phrase = (
        "how much importance each expert received"
        if kind == "evaluator"
        else "how much importance each criterion received"
    )
    noun = "evaluator-importance" if kind == "evaluator" else "criterion-importance"
    changed_items: list[dict[str, Any]] = []
    interior_items: list[dict[str, Any]] = []
    endpoint_details: list[tuple[dict[str, Any], str]] = []
    rank_only_items: list[dict[str, Any]] = []

    for item in items:
        summary = item["summary"]
        points = _changed_points(item)
        winner_count = summary.get("winnerStateChangedSampleCount", 0)
        leader_count = summary.get("semanticLeadingGroupChangedSampleCount", 0)
        has_change = bool(points) or winner_count > 0 or leader_count > 0
        if has_change:
            changed_items.append(item)

        interior = any(
            0 < float(point.get("variedWeight", 0)) < 1
            for point in points
        ) or summary.get("interiorWinnerStateChangedSampleCount", 0) > 0
        if interior:
            interior_items.append(item)

        endpoints = {
            "one" if abs(float(point.get("variedWeight", -1)) - 1) <= 1e-9 else "zero"
            for point in points
            if abs(float(point.get("variedWeight", -1))) <= 1e-9
            or abs(float(point.get("variedWeight", -1)) - 1) <= 1e-9
        }
        endpoints.update(
            change.get("endpoint")
            for change in summary.get("endpointWinnerStateChanges") or []
            if change.get("endpoint") in {"zero", "one"}
        )
        if not interior:
            endpoint_details.extend((item, endpoint) for endpoint in sorted(endpoints))

        if not has_change and summary.get("technicalRankingChangedSampleCount", 0) > 0:
            rank_only_items.append(item)

    changed_names = _names(
        changed_items,
        key="expertLabel" if kind == "evaluator" else "name",
        noun="experts" if kind == "evaluator" else "criteria",
    )
    interior_names = _names(
        interior_items,
        key="expertLabel" if kind == "evaluator" else "name",
        noun="experts" if kind == "evaluator" else "criteria",
    )

    if interior_items:
        paragraph = (
            f"In some interior tested scenarios, changing the importance "
            f"assigned to {interior_names} changed the leading result. "
            "This makes the assigned importance worth reviewing."
        )
        target_change = _sensitivity_leading_result_change(
            facts,
            interior_items,
        )
        if target_change:
            paragraph = paragraph.replace(
                "This makes the assigned importance worth reviewing.",
                f"{target_change} This makes the assigned importance worth reviewing.",
            )
    elif changed_items and endpoint_details:
        all_weight = [item for item, endpoint in endpoint_details if endpoint == "one"]
        zero_weight = [item for item, endpoint in endpoint_details if endpoint == "zero"]
        clauses: list[str] = []
        name_key = "expertLabel" if kind == "evaluator" else "name"
        group_noun = "experts" if kind == "evaluator" else "criteria"
        if all_weight:
            clauses.append(
                f"giving all importance to {_names(all_weight, key=name_key, noun=group_noun)}"
            )
        if zero_weight:
            clauses.append(
                f"giving no importance to {_names(zero_weight, key=name_key, noun=group_noun)}"
            )
        paragraph = (
            "Only extreme tested settings changed the leading result: "
            + " and ".join(clauses)
            + "."
        )
        if zero_weight:
            paragraph += " In those checks, the remaining importance was redistributed."
        target_change = _sensitivity_leading_result_change(
            facts,
            changed_items,
        )
        if target_change:
            paragraph += f" {target_change}"
    elif changed_items:
        paragraph = (
            f"The tested {noun} scenarios changed the leading result for "
            f"{changed_names}."
        )
        target_change = _sensitivity_leading_result_change(
            facts,
            changed_items,
        )
        if target_change:
            paragraph += f" {target_change}"
    else:
        paragraph = (
            "The leading result remained unchanged across the tested "
            f"changes to {weight_phrase}."
        )
        if rank_only_items:
            if len(leaders) == 1:
                paragraph += " Some other alternatives changed position."
            else:
                paragraph += " The stored ordering changed, but the leading group did not."

    return paragraph, True


def _positional_weight_notes(
    facts: dict[str, Any],
    sensitivity: dict[str, Any],
) -> list[str]:
    aggregation = facts.get("aggregation") or {}
    notes: list[str] = []
    for kind, stage, group_key in (
        ("criterion", "criteriaAggregation", "criterionWeights"),
        ("expert", "expertAggregation", "expertWeights"),
    ):
        summary = (
            (aggregation.get(stage) or {}).get("summary") or {}
        )
        group = sensitivity.get(group_key) or {}
        if (
            summary.get("method") == "l2towa"
            and group.get("availability", {}).get("reason")
            in {
                "criteria_aggregation_not_weighted_average",
                "expert_aggregation_not_weighted_average",
            }
        ):
            subject = "criteria" if kind == "criterion" else "experts"
            singular = "criterion" if kind == "criterion" else "expert"
            notes.append(
                f"For {subject} aggregation, weights follow assessment values "
                f"from highest to lowest, rather than specific {subject}. "
                f"There is no fixed importance assigned to a named {singular} "
                "to vary."
            )
    return notes


def _stability_interpretation(
    facts: dict[str, Any],
) -> str | None:
    observations: list[str] = []
    robustness = facts.get("robustness") or {}
    robustness_findings: dict[str, tuple[str, bool, bool]] = {}
    for group_key, kind in (
        ("leaveOneEvaluatorOut", "evaluator"),
        ("leaveOneCriterionOut", "criterion"),
    ):
        observation, available, stable, rank_changed = _robustness_group_observation(
            robustness.get(group_key),
            kind=kind,
            facts=facts,
        )
        if observation and available:
            robustness_findings[kind] = (observation, stable, rank_changed)

    stable_kinds = {
        kind
        for kind, (_, stable, _) in robustness_findings.items()
        if stable
    }
    if stable_kinds == {"evaluator", "criterion"}:
        leaders = _leaders(facts)
        if len(leaders) == 1:
            result_text = f"{_bold(leaders[0].get('name'))} remained the preferred alternative"
        elif leaders:
            result_text = (
                f"The leading group, {_names(leaders)}, remained the same"
            )
        else:
            result_text = "The leading result remained the same"
        observations.append(
            f"{result_text} after each available single-expert and "
            "single-criterion removal."
        )
        if any(
            rank_changed
            for _, _, rank_changed in robustness_findings.values()
        ):
            if len(leaders) == 1:
                observations.append(
                    "Other alternatives changed position in some checks."
                )
            else:
                observations.append(
                    "The stored ordering changed in some checks, but the "
                    "leading group did not."
                )
    else:
        observations.extend(
            observation
            for observation, _, _ in robustness_findings.values()
        )

    sensitivity = facts.get("sensitivity") or {}
    has_sensitivity = False
    for group_key, kind in (
        ("criterionWeights", "criterion"),
        ("expertWeights", "evaluator"),
    ):
        observation, available = _sensitivity_group_observation(
            sensitivity.get(group_key),
            kind=kind,
            facts=facts,
        )
        if observation and available:
            observations.append(observation)
            has_sensitivity = True

    observations.extend(_positional_weight_notes(facts, sensitivity))
    if has_sensitivity:
        observations.append(
            "The weight checks are sampled and do not guarantee stability at every possible weighting."
        )

    if not observations:
        return None
    return "### Stability and points to review\n\n" + " ".join(observations)


def build_interpretation(
    facts: dict[str, Any],
) -> str:
    """Render a concise, deterministic narrative from validated analysis facts."""

    sections = [
        _overall_result(facts),
        _expert_interpretation(facts),
        _stability_interpretation(facts),
    ]
    return "\n\n".join(section for section in sections if section)


__all__ = ["build_interpretation"]
