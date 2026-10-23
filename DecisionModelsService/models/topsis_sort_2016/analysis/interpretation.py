"""Plain-language interpretation of validated TOPSIS-Sort analysis facts."""

from __future__ import annotations

from collections import Counter
from typing import Any


MAX_SENSITIVITY_OBSERVATIONS = 3
MAX_TRANSITIONS_PER_OBSERVATION = 2
MIN_WITHIN_CATEGORY_CLOSENESS_SPREAD = 0.05


def _percent(value: float) -> str:
    formatted = f"{value * 100:.2f}".rstrip("0").rstrip(".")
    return f"{formatted}%"


def _text(value: Any) -> str:
    """Escape dynamic labels for the Markdown renderer used by Model Analysis."""
    text = " ".join(str(value or "").split())
    for character in "\\`*_{}[]<>()#+-.!|>":
        text = text.replace(character, f"\\{character}")
    return text


def _bold(value: Any) -> str:
    escaped = _text(value)
    return f"**{escaped}**" if escaped else "an alternative"


def _count_word(value: int) -> str:
    return {
        2: "two",
        3: "three",
        4: "four",
        5: "five",
        6: "six",
        7: "seven",
        8: "eight",
        9: "nine",
        10: "ten",
    }.get(value, str(value))


def _alternative_display_names(facts: dict[str, Any]) -> dict[str, str]:
    alternatives = facts.get("alternatives", [])
    counts = Counter(
        str(item.get("name") or "")
        for item in alternatives
        if isinstance(item, dict)
    )
    seen: Counter[str] = Counter()
    display_names: dict[str, str] = {}
    for item in alternatives:
        if not isinstance(item, dict):
            continue
        name = str(item.get("name") or "Alternative")
        seen[name] += 1
        display_name = name
        if counts[name] > 1:
            display_name = f"{name} (alternative {seen[name]})"
        alternative_id = item.get("alternativeId")
        if alternative_id is not None:
            display_names[str(alternative_id)] = display_name
    return display_names


def _category_interpretation(facts: dict[str, Any]) -> list[str]:
    alternatives = facts.get("alternatives", [])
    categories = facts.get("categories", [])
    alternatives_by_category: dict[str, list[dict[str, Any]]] = {}
    labels_by_id: dict[str, str] = {}
    for category in categories:
        if isinstance(category, dict):
            labels_by_id[str(category.get("categoryId"))] = str(
                category.get("label") or ""
            )
    for alternative in alternatives:
        if not isinstance(alternative, dict):
            continue
        category_id = alternative.get("categoryId")
        if category_id is None:
            continue
        alternatives_by_category.setdefault(str(category_id), []).append(
            alternative
        )

    comparisons = []
    for category in categories:
        if not isinstance(category, dict):
            continue
        members = alternatives_by_category.get(str(category.get("categoryId")), [])
        if len(members) < 2:
            continue
        lowest = min(members, key=lambda item: float(item["closeness"]))
        highest = max(members, key=lambda item: float(item["closeness"]))
        spread = float(highest["closeness"]) - float(lowest["closeness"])
        if spread < MIN_WITHIN_CATEGORY_CLOSENESS_SPREAD:
            continue
        comparisons.append(
            (
                spread,
                int(category.get("order", 0)),
                lowest,
                highest,
                labels_by_id.get(str(category.get("categoryId")), ""),
            )
        )

    if not comparisons:
        return []

    spread, _, lowest, highest, label = max(
        comparisons,
        key=lambda item: (item[0], -item[1]),
    )
    display_names = _alternative_display_names(facts)
    lowest_name = display_names.get(
        str(lowest.get("alternativeId")), str(lowest.get("name") or "Alternative")
    )
    highest_name = display_names.get(
        str(highest.get("alternativeId")),
        str(highest.get("name") or "Alternative"),
    )
    return [
        (
            f"Although {_bold(lowest_name)} and {_bold(highest_name)} both fall "
            f"in {_bold(label)}, their relative closeness values differ by "
            f"{spread:.2f}."
        )
    ]


def _candidate_observations(facts: dict[str, Any]) -> list[dict[str, Any]]:
    sensitivity = facts.get("sensitivity", {})
    candidates = []
    seen: set[tuple[Any, ...]] = set()
    for item_index, item in enumerate(sensitivity.get("items", [])):
        if not isinstance(item, dict):
            continue
        summary = item.get("summary") or {}
        observations = summary.get("observedChanges") or []
        nearest = summary.get("nearestObservedChange")
        if nearest:
            observations = [nearest]
        elif observations:
            observations = [
                min(
                    observations,
                    key=lambda observation: abs(
                        float(observation["variedWeight"])
                        - float(item["configuredWeight"])
                    ),
                )
            ]
        for observation in observations:
            changes = observation.get("changedAssignments") or []
            if not changes:
                continue
            varied_weight = float(observation["variedWeight"])
            configured_weight = float(item["configuredWeight"])
            identity = (
                str(item.get("criterionId", item_index)),
                varied_weight,
                tuple(
                    sorted(
                        (
                            str(change.get("alternativeId", change.get("alternativeName", ""))),
                            str(change.get("fromCategoryId", change.get("fromCategory", ""))),
                            str(change.get("toCategoryId", change.get("toCategory", ""))),
                        )
                        for change in changes
                    )
                ),
            )
            if identity in seen:
                continue
            seen.add(identity)
            candidates.append(
                {
                    "item": item,
                    "observation": observation,
                    "changes": changes,
                    "configuredWeight": configured_weight,
                    "variedWeight": varied_weight,
                    "weightDistance": abs(varied_weight - configured_weight),
                    "criterionIndex": item.get("criterionIndex", item_index),
                    "identity": identity,
                }
            )

    selected = sorted(
        candidates,
        key=lambda candidate: (
            -len(candidate["changes"]),
            candidate["weightDistance"],
            candidate["criterionIndex"],
            str(candidate["item"].get("criterionId", "")),
            candidate["variedWeight"],
            candidate["identity"],
        ),
    )[:MAX_SENSITIVITY_OBSERVATIONS]
    return sorted(
        selected,
        key=lambda candidate: (
            candidate["weightDistance"],
            -len(candidate["changes"]),
            candidate["criterionIndex"],
            candidate["variedWeight"],
        ),
    )


def _change_groups(
    candidate: dict[str, Any],
    facts: dict[str, Any],
) -> list[dict[str, Any]]:
    groups: dict[tuple[str, str], dict[str, Any]] = {}
    category_order = {
        str(item.get("categoryId")): int(item.get("order", 0))
        for item in facts.get("categories", [])
        if isinstance(item, dict)
    }
    for change in candidate["changes"]:
        source_id = str(change.get("fromCategoryId", change.get("fromCategory", "")))
        target_id = str(change.get("toCategoryId", change.get("toCategory", "")))
        key = (source_id, target_id)
        group = groups.setdefault(
            key,
            {
                "from": str(change.get("fromCategory") or "another category"),
                "to": str(change.get("toCategory") or "another category"),
                "fromOrder": category_order.get(source_id, 0),
                "changes": [],
            },
        )
        group["changes"].append(change)
    return sorted(
        groups.values(),
        key=lambda group: (
            -len(group["changes"]),
            group["fromOrder"],
            group["from"],
            group["to"],
        ),
    )


def _group_description(
    group: dict[str, Any],
    display_names: dict[str, str],
) -> str:
    changes = group["changes"]
    names = [
        display_names.get(
            str(change.get("alternativeId")),
            str(change.get("alternativeName") or "Alternative"),
        )
        for change in changes
    ]
    qualifier = ""
    if len(names) == 1:
        subject = _bold(names[0])
    elif len(names) == 2:
        subject = f"{_bold(names[0])} and {_bold(names[1])}"
    else:
        subject = f"{_count_word(len(names))} alternatives"
        qualifier = (
            f", including {_bold(names[0])} and {_bold(names[1])}"
        )
    verb = "moves" if len(names) == 1 else "move"
    return (
        f"{subject} {verb} from {_bold(group['from'])} to "
        f"{_bold(group['to'])}{qualifier}"
    )


def _observation_interpretation(
    candidate: dict[str, Any],
    facts: dict[str, Any],
) -> str:
    criterion_name = _bold(candidate["item"].get("criterionName") or "this criterion")
    before = candidate["configuredWeight"]
    after = candidate["variedWeight"]
    if after > before:
        verb = "rises"
    elif after < before:
        verb = "falls"
    else:
        verb = "is varied"
    opening = (
        f"When the weight for {criterion_name} {verb} from {_percent(before)} "
        f"to {_percent(after)}, "
    )
    groups = _change_groups(candidate, facts)
    selected_groups = groups[:MAX_TRANSITIONS_PER_OBSERVATION]
    descriptions = [
        _group_description(group, _alternative_display_names(facts))
        for group in selected_groups
    ]
    if len(descriptions) == 1:
        changes_text = descriptions[0]
    elif len(descriptions) == 2:
        changes_text = f"{descriptions[0]}, while {descriptions[1]}"
    else:
        changes_text = "category assignments change"
    remaining = sum(len(group["changes"]) for group in groups[len(selected_groups):])
    if remaining:
        changes_text += f", plus {_count_word(remaining)} other category changes"
    return opening + changes_text + " in the tested scenario."


def _repeated_alternative_interpretation(
    candidates: list[dict[str, Any]],
    facts: dict[str, Any],
) -> str | None:
    counts: Counter[str] = Counter()
    names_by_key: dict[str, str] = {}
    for candidate in candidates:
        changed_in_scenario = set()
        for change in candidate["changes"]:
            key = str(
                change.get("alternativeId")
                or change.get("alternativeName")
                or "unknown-alternative"
            )
            changed_in_scenario.add(key)
            if change.get("alternativeName"):
                names_by_key[key] = str(change["alternativeName"])
        counts.update(changed_in_scenario)
    repeated = [key for key, count in counts.items() if count > 1]
    if not repeated:
        return None

    most_frequent_count = max(counts[key] for key in repeated)
    display_names = _alternative_display_names(facts)
    first = next(
        (
            str(item.get("alternativeId"))
            for item in facts.get("alternatives", [])
            if isinstance(item, dict)
            and str(item.get("alternativeId")) in repeated
            and counts[str(item.get("alternativeId"))] == most_frequent_count
        ),
        next(
            key for key in repeated if counts[key] == most_frequent_count
        ),
    )
    count = counts[first]
    name = display_names.get(first) or names_by_key.get(first) or "An alternative"
    return (
        f"{_bold(name)} changed category in {_count_word(count)} of these tested "
        "weight scenarios."
    )


def _criterion_sensitivity_interpretation(facts: dict[str, Any]) -> list[str]:
    sensitivity = facts.get("sensitivity", {})
    items = [
        item for item in sensitivity.get("items", []) if isinstance(item, dict)
    ]
    if not sensitivity.get("availability", {}).get("available"):
        reason = sensitivity.get("availability", {}).get("reason")
        if reason == "single_criterion":
            return [
                "There is only one criterion, so its weight cannot be varied independently."
            ]
        if reason == "proportional_redistribution_impossible_zero_complement":
            return [
                "The other criteria have no weight available for proportional redistribution."
            ]
        return ["There is not enough valid evidence to assess weight changes."]

    candidates = _candidate_observations(facts)
    if not candidates:
        fully_assessed = all(
            item.get("available") is True and (item.get("summary") or {}).get("validSampleCount", 0) > 0
            for item in items
        )
        if fully_assessed:
            return [
                "Assignments stayed the same across the valid weight variations examined. "
                "This conclusion applies only to the tested scenarios."
            ]
        if any((item.get("summary") or {}).get("validSampleCount", 0) for item in items):
            return [
                "No category changes appeared in the valid scenarios, but some criteria "
                "could not be assessed with enough valid variations."
            ]
        return ["There is not enough valid evidence to assess weight changes."]

    paragraphs = [
        "Each scenario varies one criterion's weight while proportionally adjusting "
        "the others."
    ]
    paragraphs.extend(
        _observation_interpretation(candidate, facts) for candidate in candidates
    )
    repeated_alternative = _repeated_alternative_interpretation(candidates, facts)
    if repeated_alternative:
        paragraphs.append(repeated_alternative)
    if any(item.get("available") is False for item in items):
        paragraphs.append(
            "Some criteria could not be assessed across enough valid scenarios."
        )
    paragraphs.append(
        "These changes were observed at the tested weights; the exact switching "
        "points were not calculated."
    )
    return paragraphs


def build_interpretation(facts: dict[str, Any]) -> str:
    """Return concise audience-facing interpretation without ranking language."""
    status = facts.get("status")
    if status == "unavailable":
        return (
            "### Model Analysis unavailable\n\n"
            f"{facts.get('unavailableReason', 'The frozen execution evidence is incomplete.')}"
        )
    if status == "invalid_execution":
        return (
            "### Model Analysis unavailable\n\n"
            "The stored TOPSIS-Sort result does not reproduce from its frozen input. "
            f"No model-specific conclusions were generated. {facts.get('invalidReason', '')}"
        )

    result_lines = _category_interpretation(facts)
    sensitivity_lines = _criterion_sensitivity_interpretation(facts)
    sections = ["### Result interpretation"]
    if result_lines:
        sections.append("\n\n".join(result_lines))
    sections.extend(
        [
            "### Criterion weight sensitivity",
            "\n\n".join(sensitivity_lines),
        ]
    )
    return "\n\n".join(sections)


__all__ = ["build_interpretation"]
