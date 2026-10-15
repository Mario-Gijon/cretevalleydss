from __future__ import annotations

from math import isfinite
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


def _count_word(value: int) -> str:
    words = {
        1: "one",
        2: "two",
        3: "three",
        4: "four",
        5: "five",
        6: "six",
        7: "seven",
        8: "eight",
        9: "nine",
        10: "ten",
    }
    return words.get(value, str(value))


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


def _join_phrases(items: list[str]) -> str:
    if len(items) == 1:
        return items[0]
    if len(items) == 2:
        return f"{items[0]} and {items[1]}"
    return ", ".join(items[:-1]) + f", and {items[-1]}"


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
        return paragraph

    if _available(winner) and isinstance(winner.get("alternative"), dict):
        name = _bold(winner["alternative"].get("name"))
        paragraph = (
            f"{name} is favored under the criteria and preferences used in "
            "this evaluation, receiving the strongest combined assessment."
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

    return paragraph


def _common_linguistic_labels(
    facts: dict[str, Any],
) -> dict[str, tuple[str, int]]:
    method = (
        (facts.get("linguistic2Tuple") or {}).get("method") or {}
    )
    labels = method.get("labels") or []
    expected_count = method.get("commonLabelCount")
    if (
        method.get("representation") != "linguistic_2tuple"
        or method.get("betaMeaning") != "linguistic_position"
        or not labels
        or isinstance(expected_count, bool)
        or not isinstance(expected_count, int)
        or expected_count != len(labels)
    ):
        return {}

    result: dict[str, tuple[str, int]] = {}
    for expected_index, item in enumerate(labels):
        if not isinstance(item, dict):
            return {}
        key = item.get("key")
        label = _text(item.get("label"))
        index = item.get("index")
        if (
            not isinstance(key, str)
            or not key
            or not label
            or key in result
            or isinstance(index, bool)
            or not isinstance(index, int)
            or index != expected_index
        ):
            return {}
        result[key] = (label, index)
    return result


def _validated_cell_assessment(
    cell: dict[str, Any],
    labels: dict[str, tuple[str, int]],
) -> tuple[float, str] | None:
    beta = cell.get("beta")
    tuple_value = cell.get("tuple") or {}
    label = labels.get(tuple_value.get("labelKey"))
    label_index = tuple_value.get("labelIndex")
    alpha = tuple_value.get("alpha")
    if (
        isinstance(beta, bool)
        or not isinstance(beta, (int, float))
        or not isfinite(float(beta))
        or label is None
        or isinstance(label_index, bool)
        or not isinstance(label_index, int)
        or label_index != label[1]
        or _text(tuple_value.get("label")) != label[0]
        or isinstance(alpha, bool)
        or not isinstance(alpha, (int, float))
        or not isfinite(float(alpha))
        or float(alpha) < -0.5 - EVIDENCE_TOLERANCE
        or float(alpha) >= 0.5
        or abs(float(beta) - (label_index + float(alpha)))
        > EVIDENCE_TOLERANCE
    ):
        return None
    return float(beta), label[0]


def _criterion_interpretation(facts: dict[str, Any]) -> str | None:
    if (facts.get("counts") or {}).get("alternatives", 0) < 2:
        return None

    capabilities = facts.get("capabilities") or {}
    if not _available(capabilities.get("compareAlternatives")):
        return None

    leaders = _leaders(facts)
    result = facts.get("result") or {}
    ranking = result.get("technicalRanking") or []
    if len(leaders) != 1 or not _available(result.get("winner")):
        return None
    leader = leaders[0]
    leader_id = leader.get("alternativeId")
    leader_rank = leader.get("technicalRank")
    comparator = None
    comparator_rank = None
    for item in ranking:
        rank = item.get("technicalRank")
        if (
            item.get("alternativeId") == leader_id
            or isinstance(rank, bool)
            or not isinstance(rank, int)
            or isinstance(leader_rank, bool)
            or not isinstance(leader_rank, int)
            or rank <= leader_rank
        ):
            continue
        if comparator_rank is None or rank < comparator_rank:
            comparator = item
            comparator_rank = rank
    if not comparator:
        return None

    alternatives = (facts.get("alternatives") or {}).get("items") or []
    by_id = {
        item.get("alternativeId"): item
        for item in alternatives
        if item.get("alternativeId")
    }
    labels = _common_linguistic_labels(facts)
    if not labels:
        return None

    leader_cells = {
        cell.get("criterionId"): cell
        for cell in (by_id.get(leader_id) or {}).get("collectiveCriteria") or []
        if cell.get("criterionId")
    }
    comparator_cells = {
        cell.get("criterionId"): cell
        for cell in (by_id.get(comparator.get("alternativeId")) or {}).get(
            "collectiveCriteria"
        )
        or []
        if cell.get("criterionId")
    }
    comparisons: list[
        tuple[float, dict[str, Any], tuple[float, str], tuple[float, str]]
    ] = []
    for criterion in (facts.get("criteria") or {}).get("items") or []:
        criterion_id = criterion.get("criterionId")
        first = leader_cells.get(criterion_id)
        second = comparator_cells.get(criterion_id)
        if not first or not second:
            continue
        first_assessment = _validated_cell_assessment(first, labels)
        second_assessment = _validated_cell_assessment(second, labels)
        if first_assessment is None or second_assessment is None:
            continue
        difference = first_assessment[0] - second_assessment[0]
        if abs(difference) <= EVIDENCE_TOLERANCE:
            continue
        comparisons.append(
            (difference, criterion, first_assessment, second_assessment)
        )

    if not comparisons:
        return None

    # Keep the clearest distinctions, with a stable name-based tie break.
    comparisons.sort(
        key=lambda item: (
            -abs(item[0]),
            _text(item[1].get("name")).casefold(),
            _text(item[1].get("criterionId")),
        )
    )
    selected = comparisons[:3]
    leader_name = _bold(leader.get("name"))
    comparator_name = _bold(comparator.get("name"))
    grouped: dict[tuple[str, str, int], list[str]] = {}
    for difference, criterion, first, second in selected:
        within_label_direction = (
            (1 if difference > 0 else -1)
            if first[1] == second[1]
            else 0
        )
        key = (first[1], second[1], within_label_direction)
        grouped.setdefault(key, []).append(_bold(criterion.get("name")))

    clauses: list[str] = []
    for (leader_label, comparator_label, within_direction), criteria_names in grouped.items():
        criteria_text = _join_phrases(criteria_names)
        if leader_label == comparator_label:
            higher_name = leader_name if within_direction > 0 else comparator_name
            lower_name = comparator_name if within_direction > 0 else leader_name
            clauses.append(
                f"For {criteria_text}, both alternatives were rated "
                f"{_bold(leader_label)}, though {higher_name}'s assessment "
                f"was higher within that category than {lower_name}'s"
            )
        else:
            multiple_criteria = len(criteria_names) > 1
            criteria_reference = (
                "those criteria" if multiple_criteria else "that criterion"
            )
            if not clauses:
                if multiple_criteria:
                    clauses.append(
                        f"Compared with {comparator_name}, {leader_name} received "
                        f"{_bold(leader_label)} assessments for {criteria_text}, "
                        f"while {comparator_name} was rated "
                        f"{_bold(comparator_label)} on {criteria_reference}"
                    )
                else:
                    clauses.append(
                        f"Compared with {comparator_name}, {leader_name} received "
                        f"a {_bold(leader_label)} assessment for {criteria_text}, "
                        f"while {comparator_name} was rated "
                        f"{_bold(comparator_label)} on {criteria_reference}"
                    )
            else:
                clauses.append(
                    f"For {criteria_text}, {leader_name} was rated "
                    f"{_bold(leader_label)}, while {comparator_name} was "
                    f"rated {_bold(comparator_label)}"
                )
    paragraph = ". ".join(clauses) + "."
    if len(comparisons) > len(selected):
        paragraph += " The remaining criteria showed smaller differences."
    paragraph += " The overall result reflects all criteria together."
    return paragraph


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
    matching_leaders = [
        item
        for item in complete
        if item["alignmentWithCollective"][
            "semanticLeadingGroupMatchesCollective"
        ]
    ]
    different_leaders.sort(key=lambda item: _text(item.get("expertLabel")).casefold())
    different_order.sort(key=lambda item: _text(item.get("expertLabel")).casefold())
    matching_leaders.sort(key=lambda item: _text(item.get("expertLabel")).casefold())

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
                    f"the personal leading result also differed for "
                    f"{_count_word(len(different_leaders) - len(observations))} "
                    "other experts"
                )
            if matching_leaders:
                if unique_collective_leader and len(matching_leaders) == 1:
                    matching_expert = _bold(
                        matching_leaders[0].get("expertLabel")
                    )
                    observations.append(
                        f"The personal assessment from {matching_expert} also "
                        f"favored {_bold(leaders[0].get('name'))}"
                    )
                elif unique_collective_leader:
                    observations.append(
                        f"The other {_count_word(len(matching_leaders))} experts also "
                        f"favored {_bold(leaders[0].get('name'))}"
                    )
                else:
                    observations.append(
                        "The personal assessments from the other "
                        f"{_count_word(len(matching_leaders))} experts retained "
                        "the collective leading group"
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
            if len(different_order) == len(complete):
                return (
                    f"The personal assessments from {different_order_names} "
                    f"all favored {_bold(leaders[0].get('name'))}, though "
                    "their ordering of the remaining alternatives differed."
                )
            matching_names = _names(
                [
                    item
                    for item in complete
                    if item["alignmentWithCollective"].get(
                        "technicalRankingMatchesCollective"
                    ) is True
                ],
                key="expertLabel",
                noun="experts",
            )
            detail = (
                f"The personal assessments from {matching_names} matched the "
                "collective ordering. "
                if matching_names
                else ""
            )
            return (
                f"The personal assessments from {different_order_names} "
                f"still favored {_bold(leaders[0].get('name'))}, though "
                "their ordering of the remaining alternatives differed. "
                + detail.rstrip()
            ).rstrip()
        return (
            f"The personal assessments from {different_order_names} ranked the "
            "remaining alternatives differently but retained the collective "
            "leading group."
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
        if not alternative or not criterion:
            continue
        distances = [
            distance
            for distance in item.get("evaluatorAbsoluteDistances") or []
            if isinstance(distance, dict)
            and not isinstance(distance.get("absoluteBetaDistance"), bool)
            and isinstance(distance.get("absoluteBetaDistance"), (int, float))
            and isfinite(float(distance["absoluteBetaDistance"]))
        ]
        furthest_names = ""
        if distances:
            maximum = max(float(item["absoluteBetaDistance"]) for item in distances)
            furthest = [
                distance
                for distance in distances
                if abs(float(distance["absoluteBetaDistance"]) - maximum)
                <= EVIDENCE_TOLERANCE
            ]
            furthest_names = _names(
                furthest,
                key="expertLabel",
                noun="experts",
            )
        description = (
            f"{_bold(alternative)} on {_bold(criterion)}"
            + (
                f" (with {furthest_names} furthest from the collective)"
                if furthest_names
                else ""
            )
        )
        if description not in descriptions:
            descriptions.append(description)

    if not descriptions:
        return None

    selected = sorted(descriptions)[:1]
    cell_text = selected[0]
    return (
        "Consider discussing the ratings for "
        f"{cell_text} to see whether they reflect different assumptions that "
        "should be resolved before choosing."
    )


def _intermediate_expert_observation(
    items: list[dict[str, Any]],
) -> str | None:
    distances: list[tuple[float, str]] = []
    for item in items:
        distance = (item.get("distanceToCollective") or {}).get(
            "meanAbsoluteBetaDistance"
        )
        label = _text(item.get("expertLabel"))
        if (
            label
            and not isinstance(distance, bool)
            and isinstance(distance, (int, float))
            and isfinite(float(distance))
        ):
            distances.append((float(distance), label))
    if len(distances) < 3:
        return None

    closest = min(distance for distance, _ in distances)
    furthest = max(distance for distance, _ in distances)
    if furthest - closest <= EVIDENCE_TOLERANCE:
        return None
    intermediate = [
        {"expertLabel": label}
        for distance, label in distances
        if distance > closest + EVIDENCE_TOLERANCE
        and distance < furthest - EVIDENCE_TOLERANCE
    ]
    names = _names(intermediate, key="expertLabel", noun="experts")
    if not names:
        return None
    return (
        f"The ratings from {names} fell between the closest and furthest "
        "profiles in distance from the collective."
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
            f"The result reflects only {who}, so it cannot establish whether "
            "other experts would reach the same conclusion."
        )

    if not items:
        return None

    observations: list[str] = []
    closest = evaluator_data.get("closestToCollective") or {}
    farthest = evaluator_data.get("farthestFromCollective") or {}
    closest_names = _extreme_names(closest) if _available(closest) else ""
    farthest_names = _extreme_names(farthest) if _available(farthest) else ""
    closest_items = closest.get("evaluators") or []
    farthest_items = farthest.get("evaluators") or []

    if closest_names and farthest_names:
        closest_clause = (
            f"{closest_names} tied for the closest overall match"
            if len(closest_items) > 1
            else f"ratings from {closest_names} were closest overall"
        )
        farthest_clause = (
            f"{farthest_names} tied for the greatest distance"
            if len(farthest_items) > 1
            else f"those from {farthest_names} were furthest"
        )
        observations.append(
            f"{'The ' if len(closest_items) == 1 else ''}{closest_clause} "
            f"to the collective; {farthest_clause} from it "
            "across the assessed cells."
        )
    elif closest_names:
        if len(closest_items) > 1:
            observation = f"{closest_names} tied for the closest overall match"
        else:
            observation = f"The ratings from {closest_names} were closest overall"
        observations.append(f"{observation} to the collective across the assessed cells.")
    elif farthest_names:
        if len(farthest_items) > 1:
            observation = f"{farthest_names} tied for the greatest distance"
        else:
            observation = f"The ratings from {farthest_names} were furthest"
        observations.append(f"{observation} from the collective across the assessed cells.")
    elif (
        closest.get("reason") == "no_variation"
        and farthest.get("reason") == "no_variation"
    ):
        names = _names(items, key="expertLabel", noun="experts")
        if len(items) == 2:
            observations.append(
                "Both experts' ratings were equally distant from the collective; "
                "neither was closer."
            )
        elif names:
            observations.append(
                f"The ratings from {names} were equally distant from the "
                "collective; none was closer."
            )

    intermediate_observation = _intermediate_expert_observation(items)
    if intermediate_observation:
        observations.append(intermediate_observation)

    ranking_observation = _personal_ranking_observation(facts, items)
    if ranking_observation:
        observations.append(ranking_observation)
    elif closest_names or farthest_names:
        observations.append(
            "These distances compare rating values, not personal rankings."
        )

    if not observations:
        return None
    return " ".join(observations)


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
        action = "was left out" if kind == "evaluator" else "was excluded"
        return (
            f"When {removed} {action}, the preferred alternative changed to "
            f"{target} in this check."
        )
    if len(leaders) > 1:
        target = _names(leaders)
        action = "left out" if kind == "evaluator" else "excluded"
        return (
            f"With {removed} {action}, {target} remained tied for the lead "
            "in this check."
        )
    action = "left out" if kind == "evaluator" else "excluded"
    return (
        f"With {removed} {action}, the leading result changed in this check, "
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

    if changed:
        # When several removals change the lead, show one stable alphabetical
        # example and disclose that other checks also changed it.
        changed.sort(
            key=lambda item: (
                _text(
                    item.get("expertLabel")
                    if kind == "evaluator"
                    else item.get("name")
                ).casefold(),
                _text(item.get("expertKey" if kind == "evaluator" else "criterionId")),
            )
        )
        details = [
            _counterfactual_lead(item, kind=kind)
            for item in changed[:1]
        ]
        if len(changed) > len(details):
            details.append(
                f"The leading result also changed in {len(changed) - len(details)} "
                f"other {label}-removal checks."
            )
        paragraph = " ".join(details)
        return paragraph, True, False, False

    rank_changed = any(
        (item.get("impact") or {}).get("technicalRankingChanged")
        for item in items
    )
    leaders = _leaders(facts)
    if len(leaders) == 1:
        paragraph = (
            f"{_bold(leaders[0].get('name'))} remained the preferred "
            f"alternative when each {label} was left out in turn."
        )
        if rank_changed:
            paragraph += (
                " The order of the remaining alternatives changed in some "
                "checks, but the leader stayed the same."
            )
    elif leaders:
        paragraph = (
            f"The leading group, {_names(leaders)}, remained the same when "
            f"each {label} was left out in turn."
        )
        if rank_changed:
            paragraph += " The stored ordering changed in some checks."
    else:
        paragraph = (
            f"The leading result remained unchanged when each {label} was "
            "left out in turn."
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


def _configured_weight(item: dict[str, Any]) -> float | None:
    value = item.get("configuredWeight")
    if (
        isinstance(value, bool)
        or not isinstance(value, (int, float))
        or not isfinite(float(value))
    ):
        return None
    return float(value)


def _directional_weight_items(
    items: list[dict[str, Any]],
    *,
    direction: str,
    interior_only: bool = False,
) -> list[dict[str, Any]]:
    selected: list[dict[str, Any]] = []
    for item in items:
        baseline = _configured_weight(item)
        if baseline is None:
            continue
        points: list[dict[str, Any]] = []
        for point in _changed_points(item):
            varied = point.get("variedWeight")
            if (
                isinstance(varied, bool)
                or not isinstance(varied, (int, float))
                or not isfinite(float(varied))
            ):
                continue
            varied = float(varied)
            if interior_only and not 0 < varied < 1:
                continue
            if direction == "higher" and varied > baseline + EVIDENCE_TOLERANCE:
                points.append(point)
            elif direction == "lower" and varied < baseline - EVIDENCE_TOLERANCE:
                points.append(point)
        if points:
            selected.append({**item, "points": points})
    return selected


def _nearest_changed_weight_point(
    item: dict[str, Any],
) -> dict[str, Any] | None:
    baseline = _configured_weight(item)
    if baseline is None:
        return None
    points = [
        point
        for point in _changed_points(item)
        if isinstance(point.get("variedWeight"), (int, float))
        and not isinstance(point.get("variedWeight"), bool)
        and isfinite(float(point["variedWeight"]))
        and 0 < float(point["variedWeight"]) < 1
    ]
    if not points:
        return None
    return min(
        points,
        key=lambda point: (
            abs(float(point["variedWeight"]) - baseline),
            float(point["variedWeight"]),
        ),
    )


def _nearest_changed_weight_distance(item: dict[str, Any]) -> float | None:
    baseline = _configured_weight(item)
    point = _nearest_changed_weight_point(item)
    if baseline is None or point is None:
        return None
    return abs(float(point["variedWeight"]) - baseline)


def _select_nearest_interior_items(
    items: list[dict[str, Any]],
    *,
    kind: str,
    limit: int = 2,
) -> list[dict[str, Any]]:
    name_key = "expertLabel" if kind == "evaluator" else "name"
    id_key = "expertKey" if kind == "evaluator" else "criterionId"

    def sort_key(item: dict[str, Any]) -> tuple[float, str, str]:
        distance = _nearest_changed_weight_distance(item)
        return (
            distance if distance is not None else float("inf"),
            _text(item.get(name_key)).casefold(),
            _text(item.get(id_key)),
        )

    return sorted(
        items,
        key=sort_key,
    )[:limit]


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


def _directional_sensitivity_observations(
    facts: dict[str, Any],
    items: list[dict[str, Any]],
    *,
    kind: str,
    interior_only: bool = False,
) -> list[str]:
    observations: list[str] = []
    name_key = "expertLabel" if kind == "evaluator" else "name"
    noun = "experts" if kind == "evaluator" else "criteria"

    for direction in ("higher", "lower"):
        directional_items = _directional_weight_items(
            items,
            direction=direction,
            interior_only=interior_only,
        )
        if not directional_items:
            continue
        names = _names(directional_items, key=name_key, noun=noun)
        if not names:
            continue
        baseline = _leaders(facts)
        baseline_ids = tuple(
            sorted(
                _text(leader.get("alternativeId") or leader.get("name"))
                for leader in baseline
            )
        )
        groups: dict[tuple[str, ...], dict[str, Any]] = {}
        for item in directional_items:
            for point in _changed_points(item):
                result = point.get("result") or {}
                leaders = result.get("leadingGroup") or []
                if not leaders:
                    continue
                ids = tuple(
                    sorted(
                        _text(leader.get("alternativeId") or leader.get("name"))
                        for leader in leaders
                    )
                )
                if ids == baseline_ids:
                    continue
                group = groups.setdefault(
                    ids,
                    {"leaders": leaders, "items": []},
                )
                if all(existing is not item for existing in group["items"]):
                    group["items"].append(item)

        details: list[str] = []
        for group in groups.values():
            names = _names(
                group["items"],
                key=name_key,
                noun=noun,
                limit=8,
            )
            if not names:
                continue
            choices = names
            if 1 < len(group["items"]) <= 8:
                listed_names = [
                    _bold(item.get(name_key))
                    for item in group["items"]
                    if _text(item.get(name_key))
                ]
                if len(listed_names) == 2:
                    choices = f"either {listed_names[0]} or {listed_names[1]}"
                elif len(listed_names) > 2:
                    choices = (
                        "any of "
                        + ", ".join(listed_names[:-1])
                        + f", or {listed_names[-1]}"
                    )

            if kind == "evaluator":
                action = (
                    f"increasing the influence of {choices} above its "
                    "starting level"
                    if direction == "higher"
                    else f"reducing the influence of {choices} below its "
                    "starting level"
                )
            else:
                action = (
                    f"raising the weight assigned to {choices} above its "
                    "starting value"
                    if direction == "higher"
                    else f"lowering the weight assigned to {choices} below its "
                    "starting value"
                )
            if len(baseline) == 1 and len(group["leaders"]) == 1:
                target = _bold(group["leaders"][0].get("name"))
                details.append(
                    f"{action} changed the preferred alternative from "
                    f"{_bold(baseline[0].get('name'))} to {target}"
                )
            else:
                details.append(
                    f"{action} changed the leading group from "
                    f"{_leader_description(baseline)} to "
                    f"{_leader_description(group['leaders'])}"
                )
        if details:
            observations.append(
                "In the sampled cases, " + "; ".join(details) + "."
            )

    return observations


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

    leaders = _leaders(facts)
    weight_phrase = (
        "how much importance each expert received"
        if kind == "evaluator"
        else "how much importance each criterion received"
    )
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
        # Comparisons use a common 0–1 weight scale within each sensitivity
        # group, so nearer-to-baseline changes provide a reproducible example.
        nearest_interior_items = _select_nearest_interior_items(
            interior_items,
            kind=kind,
        )
        selected_interior_items = [
            {**item, "points": [point]}
            for item in nearest_interior_items
            if (point := _nearest_changed_weight_point(item)) is not None
        ]
        directional = _directional_sensitivity_observations(
            facts,
            selected_interior_items,
            kind=kind,
            interior_only=True,
        )
        if directional:
            details = [
                observation.removeprefix("In the sampled cases, ").removesuffix(".")
                for observation in directional
            ]
            paragraph = (
                "Among the sampled interior changes closest to their starting "
                "weights, "
                + "; ".join(details)
                + "."
            )
            if (
                len(interior_items) > len(selected_interior_items)
                or any(
                    len(_changed_points(item)) > 1
                    for item in nearest_interior_items
                )
            ):
                paragraph += (
                    " Other tested weight settings remain available in Visualizations."
                )
        else:
            paragraph = (
                f"Some tested interior weight settings changed the leading "
                f"result when the importance assigned to {interior_names} changed."
            )
            target_change = _sensitivity_leading_result_change(
                facts,
                interior_items,
            )
            if target_change:
                paragraph += f" {target_change}"
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
            f"The tested changes to {weight_phrase} changed the leading "
            f"result for {changed_names}."
        )
        target_change = _sensitivity_leading_result_change(
            facts,
            changed_items,
        )
        if target_change:
            paragraph += f" {target_change}"
    else:
        paragraph = (
            "The leading result also held across the tested changes to "
            f"{weight_phrase}."
        )
        if rank_only_items:
            if len(leaders) == 1:
                paragraph += (
                    " The order of the remaining alternatives changed in "
                    "some checks, but the leader stayed the same."
                )
            else:
                paragraph += " The stored ordering changed, but the leading group did not."

    return paragraph, True


def _positional_weight_notes(
    facts: dict[str, Any],
    sensitivity: dict[str, Any],
) -> list[str]:
    aggregation = facts.get("aggregation") or {}
    summary = (
        (aggregation.get("expertAggregation") or {}).get("summary") or {}
    )
    group = sensitivity.get("expertWeights") or {}
    if (
        (facts.get("counts") or {}).get("evaluators", 0) > 1
        and summary.get("method") == "l2towa"
        and summary.get("sourceKind") == "evaluators"
        and summary.get("weightSemantics")
        == "ordered_positions_descending_beta"
        and summary.get("usesOrderedPositions") is True
        and group.get("availability", {}).get("reason")
        == "expert_aggregation_not_weighted_average"
    ):
        return [
            "Experts' influence followed the relative order of their ratings, "
            "rather than a fixed importance assigned to each person."
        ]
    return []


def _stability_interpretation(
    facts: dict[str, Any],
) -> str | None:
    observations: list[str] = []
    robustness = facts.get("robustness") or {}
    robustness_findings: dict[str, tuple[str, bool, bool]] = {}
    for group_key, kind in (
        ("leaveOneCriterionOut", "criterion"),
        ("leaveOneEvaluatorOut", "evaluator"),
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
            observation = (
                "One-at-a-time expert removals and criterion removals both "
                f"kept {_bold(leaders[0].get('name'))} in first place."
            )
        elif leaders:
            observation = (
                "One-at-a-time expert removals and criterion removals both "
                f"kept the same leading group, {_names(leaders)}."
            )
        else:
            observation = (
                "One-at-a-time expert removals and criterion removals both "
                "left the leading result unchanged."
            )
        observations.append(observation)
        if any(
            rank_changed
            for _, _, rank_changed in robustness_findings.values()
        ):
            if len(leaders) == 1:
                observations.append(
                    "The order of the remaining alternatives changed in some "
                    "checks, but the leader stayed the same."
                )
            else:
                observations.append(
                    "The order among the tied alternatives varied in some "
                    "checks, but the same options remained tied."
                )
    else:
        observations.extend(
            finding[0]
            for finding in sorted(
                robustness_findings.values(),
                key=lambda finding: not finding[1],
            )
        )

    sensitivity = facts.get("sensitivity") or {}
    sensitivity_candidates: list[tuple[tuple[int, int], str]] = []
    for order, (group_key, kind) in enumerate(
        (
            ("criterionWeights", "criterion"),
            ("expertWeights", "evaluator"),
        )
    ):
        group = sensitivity.get(group_key)
        observation, available = _sensitivity_group_observation(
            group,
            kind=kind,
            facts=facts,
        )
        if observation and available:
            items = (group or {}).get("items") or []
            has_change = any(
                _changed_points(item)
                or (item.get("summary") or {}).get(
                    "winnerStateChangedSampleCount", 0
                )
                or (item.get("summary") or {}).get(
                    "semanticLeadingGroupChangedSampleCount", 0
                )
                for item in items
            )
            has_interior_change = any(
                (item.get("summary") or {}).get(
                    "interiorWinnerStateChangedSampleCount", 0
                )
                or any(
                    0 < float(point.get("variedWeight", 0)) < 1
                    for point in _changed_points(item)
                    if isinstance(point.get("variedWeight"), (int, float))
                    and not isinstance(point.get("variedWeight"), bool)
                )
                for item in items
            )
            rank = 0 if has_change and has_interior_change else 1 if has_change else 2
            sensitivity_candidates.append(((rank, order), observation))

    if sensitivity_candidates:
        # Prefer changed interior checks; use criterion weights as a stable
        # tie-breaker because these describe alternative evaluation directly.
        observations.append(min(sensitivity_candidates, key=lambda item: item[0])[1])

    if sensitivity_candidates:
        observations.append(
            "These checks cover selected weight settings, not every possible "
            "combination of priorities."
        )

    if not observations:
        return None
    return " ".join(observations)


def _weight_review_point(
    group: dict[str, Any] | None,
    *,
    kind: str,
) -> str | None:
    if not isinstance(group, dict) or not _available(group.get("availability")):
        return None
    items = [
        item
        for item in group.get("items") or []
        if item.get("available") is not False
        and isinstance(item.get("summary"), dict)
    ]
    changed = [item for item in items if _changed_points(item)]
    if not changed:
        return None

    interior_changes = [
        *_directional_weight_items(
            changed,
            direction="higher",
            interior_only=True,
        ),
        *_directional_weight_items(
            changed,
            direction="lower",
            interior_only=True,
        ),
    ]
    changed_ids = {
        item.get("criterionId" if kind == "criterion" else "expertKey")
        for item in interior_changes
    }
    actionable = [
        item
        for item in changed
        if item.get("criterionId" if kind == "criterion" else "expertKey")
        in changed_ids
    ]
    if not actionable:
        return None
    actionable = _select_nearest_interior_items(actionable, kind=kind)
    name_key = "expertLabel" if kind == "evaluator" else "name"
    noun = "experts" if kind == "evaluator" else "criteria"
    names = _names(actionable, key=name_key, noun=noun)
    if not names:
        return None
    if kind == "criterion":
        if len(actionable) == 1:
            return (
                f"Check whether the current priority assigned to {names} "
                "reflects the project's intended trade-off."
            )
        return (
            f"Check whether the current priorities assigned to {names} "
            "reflect the project's intended trade-offs."
        )
    return (
        f"Check whether the intended influence of {names} "
        "reflects the intended balance of expert views."
    )


def _removal_review_points(facts: dict[str, Any]) -> list[str]:
    robustness = facts.get("robustness") or {}
    points: list[str] = []
    for group_key, kind in (
        ("leaveOneEvaluatorOut", "evaluator"),
        ("leaveOneCriterionOut", "criterion"),
    ):
        group = robustness.get(group_key) or {}
        if not _available(group.get("availability")):
            continue
        changed = [
            item
            for item in group.get("items") or []
            if item.get("available") is not False
            and (
                (item.get("impact") or {}).get("winnerStateChanged")
                or (item.get("impact") or {}).get("semanticLeadingGroupChanged")
            )
        ]
        if not changed:
            continue
        changed.sort(
            key=lambda item: (
                _text(
                    item.get("expertLabel")
                    if kind == "evaluator"
                    else item.get("name")
                ).casefold(),
                _text(item.get("expertKey" if kind == "evaluator" else "criterionId")),
            )
        )
        name = _names(
            changed[:1],
            key="expertLabel" if kind == "evaluator" else "name",
            noun="experts" if kind == "evaluator" else "criteria",
        )
        if not name:
            continue
        if kind == "evaluator":
            point = (
                f"Confirm that {name} belongs to the intended decision group; "
                "the leading alternative can change when that expert is omitted."
            )
        else:
            point = (
                f"Confirm that {name} belongs in the decision scope; the "
                "preferred location is responsive to whether it is included."
            )
        if len(changed) > 1:
            point += " Other tested exclusions also changed the lead."
        points.append(point)
    return points[:1]


def _points_to_review(facts: dict[str, Any]) -> str | None:
    points: list[str] = []
    sensitivity = facts.get("sensitivity") or {}
    evaluator_data = facts.get("evaluators") or {}
    evaluator_items = evaluator_data.get("items") or []
    evaluator_count = (facts.get("counts") or {}).get(
        "evaluators",
        len(evaluator_items),
    )
    if evaluator_count == 1 and len(_leaders(facts)) == 1:
        points.append(
            "If other experts are part of the intended decision group, invite "
            f"them to assess the alternatives and check whether "
            f"{_bold(_leaders(facts)[0].get('name'))} is a shared preference."
        )
    if _available(
        (evaluator_data.get("capabilities") or {}).get(
            "comparePersonalAndCollectiveRanking"
        )
    ):
        differing = sorted(
            evaluator_items,
            key=lambda item: _text(item.get("expertLabel")).casefold(),
        )
        for item in differing:
            alignment = item.get("alignmentWithCollective") or {}
            personal_leaders = _personal_leading_group(item)
            if (
                alignment.get("semanticLeadingGroupMatchesCollective") is False
                and personal_leaders
            ):
                expert_name = _bold(item.get("expertLabel"))
                if not expert_name:
                    continue
                personal_leaders = _personal_leading_group(item)
                personal_name = _names(personal_leaders)
                collective_leaders = _leaders(facts)
                collective_name = (
                    f"the collective lead of {_bold(collective_leaders[0].get('name'))}"
                    if len(collective_leaders) == 1
                    else f"the collective tie between {_names(collective_leaders)}"
                )
                points.append(
                    f"Discuss what informs {expert_name}'s preference for "
                    f"{personal_name} and whether it should affect "
                    f"{collective_name}."
                )
                break

    cell_disagreement = evaluator_data.get("cellDisagreement") or {}
    strongest = cell_disagreement.get("strongestDisagreement") or {}
    if (
        _available(cell_disagreement.get("availability"))
        and float(strongest.get("value") or 0.0) > EVIDENCE_TOLERANCE
    ):
        cell_note = _cell_observation(evaluator_data)
        if cell_note:
            points.append(cell_note)

    if len(points) < 3:
        points.extend(_removal_review_points(facts))

    if len(points) < 3:
        for group_key, kind in (
            ("criterionWeights", "criterion"),
            ("expertWeights", "evaluator"),
        ):
            point = _weight_review_point(
                sensitivity.get(group_key),
                kind=kind,
            )
            if point:
                points.append(point)
                break

    if not points:
        return None
    return " ".join(points[:3])


def build_interpretation(
    facts: dict[str, Any],
) -> str:
    """Render a concise, deterministic narrative from validated analysis facts."""
    sections: list[str] = []

    overall = [
        _overall_result(facts),
        _criterion_interpretation(facts),
    ]
    sections.append(
        "### Overall result\n\n" + "\n\n".join(item for item in overall if item)
    )

    expert = [
        _expert_interpretation(facts),
        *_positional_weight_notes(
            facts,
            facts.get("sensitivity") or {},
        ),
    ]
    expert_text = " ".join(item for item in expert if item)
    if expert_text:
        sections.append("### Expert perspectives\n\n" + expert_text)

    stability = _stability_interpretation(facts)
    if stability:
        sections.append("### Stability of the result\n\n" + stability)

    points = _points_to_review(facts)
    if points:
        sections.append("### Points worth reviewing\n\n" + points)

    return "\n\n".join(sections)


__all__ = ["build_interpretation"]
