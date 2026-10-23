"""Plain-language interpretation of validated TOPSIS-Sort analysis facts."""

from __future__ import annotations

from collections import Counter
import math
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
        str(item.get("name") or "") for item in alternatives if isinstance(item, dict)
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


def _finite_number(value: Any) -> float | None:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return None
    number = float(value)
    return number if math.isfinite(number) else None


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
    category_ids = set(labels_by_id)
    valid_alternatives = []
    for alternative in alternatives:
        if not isinstance(alternative, dict):
            continue
        category_id = alternative.get("categoryId")
        alternative_id = alternative.get("alternativeId")
        closeness = _finite_number(alternative.get("closeness"))
        if (
            category_id is None
            or str(category_id) not in category_ids
            or alternative_id is None
            or closeness is None
        ):
            continue
        normalized = {**alternative, "closeness": closeness}
        valid_alternatives.append(normalized)
        alternatives_by_category.setdefault(str(category_id), []).append(normalized)

    if not alternatives:
        return ["No validated alternatives are available for comparison."]
    if not categories:
        return ["No category information is available for within-category comparison."]
    if not valid_alternatives:
        return ["No validated category assignments are available for comparison."]
    if len(valid_alternatives) == 1:
        return [
            "Only one alternative was evaluated, so there are no other alternatives "
            "to compare within its category."
        ]

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
        return [
            "Each alternative is assigned to a different category, so there are "
            "no within-category positions to compare."
        ]

    spread, _, lowest, highest, label = max(
        comparisons, key=lambda item: (item[0], -item[1])
    )
    display_label = label or "the same category"
    if spread == 0:
        return [
            f"The alternatives in {_bold(display_label)} have the same relative "
            "closeness, so this measure does not distinguish their positions "
            "within the category."
        ]
    if spread < MIN_WITHIN_CATEGORY_CLOSENESS_SPREAD:
        return [
            f"The alternatives in {_bold(display_label)} have very similar "
            "relative closeness values."
        ]

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


def _category_labels(facts: dict[str, Any]) -> dict[str, str]:
    return {
        str(item["categoryId"]): str(item.get("label") or "")
        for item in facts.get("categories", [])
        if isinstance(item, dict) and item.get("categoryId") is not None
    }


def _baseline_assignments(
    facts: dict[str, Any], category_labels: dict[str, str]
) -> tuple[dict[str, str], dict[str, dict[str, Any]]]:
    assignments: dict[str, str] = {}
    alternatives_by_id: dict[str, dict[str, Any]] = {}
    for alternative in facts.get("alternatives", []):
        if not isinstance(alternative, dict):
            return {}, {}
        alternative_id = alternative.get("alternativeId")
        category_id = alternative.get("categoryId")
        if (
            alternative_id is None
            or category_id is None
            or str(category_id) not in category_labels
            or str(alternative_id) in assignments
        ):
            return {}, {}
        key = str(alternative_id)
        assignments[key] = str(category_id)
        alternatives_by_id[key] = alternative
    return assignments, alternatives_by_id


def _criterion_weight_vector(
    criteria: list[dict[str, Any]], criterion_index: int, varied_weight: float
) -> list[float] | None:
    original = [float(item["weight"]) for item in criteria]
    configured_weight = original[criterion_index]
    if varied_weight == configured_weight:
        return original
    complement = math.fsum(
        weight for index, weight in enumerate(original) if index != criterion_index
    )
    if complement == 0.0:
        return None
    result = [0.0] * len(original)
    result[criterion_index] = varied_weight
    for index, weight in enumerate(original):
        if index != criterion_index:
            result[index] = (1.0 - varied_weight) * weight / complement
    return result


def _validated_sensitivity_points(
    item: dict[str, Any],
    criterion_index: int,
    criteria: list[dict[str, Any]],
    baseline: dict[str, str],
    category_labels: dict[str, str],
) -> dict[float, dict[str, Any]]:
    """Validate and deduplicate point evidence, independently of its summary."""
    grouped: dict[float, list[dict[str, Any]]] = {}
    expected_alternative_ids = set(baseline)
    expected_criterion_ids = {str(criterion["criterionId"]) for criterion in criteria}
    for point in item.get("points") or []:
        if not isinstance(point, dict) or point.get("available") is not True:
            continue
        varied_weight = _finite_number(point.get("variedWeight"))
        if varied_weight is None or not 0.0 <= varied_weight <= 1.0:
            continue
        expected_weights = _criterion_weight_vector(
            criteria, criterion_index, varied_weight
        )
        if expected_weights is None:
            continue

        raw_weights = point.get("criterionWeights")
        if not isinstance(raw_weights, list):
            continue
        weights: dict[str, float] = {}
        for entry in raw_weights:
            if not isinstance(entry, dict) or entry.get("criterionId") is None:
                weights = {}
                break
            key = str(entry["criterionId"])
            value = _finite_number(entry.get("weight"))
            if key in weights or value is None:
                weights = {}
                break
            weights[key] = value
        if set(weights) != expected_criterion_ids:
            continue
        # These weights come from the same deterministic redistribution formula
        # as the sensitivity sampler; exact matching avoids an added tolerance.
        if any(
            weights[str(criterion["criterionId"])] != expected_weights[index]
            for index, criterion in enumerate(criteria)
        ):
            continue

        raw_assignments = point.get("assignments")
        if not isinstance(raw_assignments, list):
            continue
        assignments: dict[str, str] = {}
        valid_assignments = True
        for assignment in raw_assignments:
            if not isinstance(assignment, dict):
                valid_assignments = False
                break
            alternative_id = assignment.get("alternativeId")
            category_id = assignment.get("categoryId")
            if alternative_id is None or category_id is None:
                valid_assignments = False
                break
            alternative_key = str(alternative_id)
            category_key = str(category_id)
            if alternative_key in assignments or category_key not in category_labels:
                valid_assignments = False
                break
            assignments[alternative_key] = category_key
        if (
            not valid_assignments
            or set(assignments) != expected_alternative_ids
            or (
                varied_weight == float(criteria[criterion_index]["weight"])
                and assignments != baseline
            )
        ):
            continue
        grouped.setdefault(varied_weight, []).append(
            {"weights": weights, "assignments": assignments}
        )

    deduplicated: dict[float, dict[str, Any]] = {}
    for varied_weight, points in grouped.items():
        signatures = {
            (
                tuple(
                    (
                        str(criterion["criterionId"]),
                        point["weights"][str(criterion["criterionId"])],
                    )
                    for criterion in criteria
                ),
                tuple(sorted(point["assignments"].items())),
            )
            for point in points
        }
        if len(signatures) != 1:
            continue
        deduplicated[varied_weight] = points[0]
    return deduplicated


def _sensitivity_evidence(
    facts: dict[str, Any],
) -> tuple[list[dict[str, Any]], int, int, bool]:
    """Return one nearest observed change per criterion plus coverage counts."""
    criteria = [item for item in facts.get("criteria", []) if isinstance(item, dict)]
    if not criteria:
        return [], 0, 0, False
    criterion_ids = [item.get("criterionId") for item in criteria]
    if any(identifier is None for identifier in criterion_ids) or len(
        set(map(str, criterion_ids))
    ) != len(criteria):
        return [], 0, 0, False
    configured_weights = [_finite_number(item.get("weight")) for item in criteria]
    if any(weight is None or not 0.0 <= weight <= 1.0 for weight in configured_weights):
        return [], 0, 0, False
    normalized_criteria = [
        {**criterion, "weight": configured_weights[index]}
        for index, criterion in enumerate(criteria)
    ]
    category_labels = _category_labels(facts)
    baseline, alternatives_by_id = _baseline_assignments(facts, category_labels)
    if not baseline:
        return [], 0, 0, False

    items_by_id: dict[str, list[dict[str, Any]]] = {}
    for item in facts.get("sensitivity", {}).get("items", []):
        if isinstance(item, dict) and item.get("criterionId") is not None:
            items_by_id.setdefault(str(item["criterionId"]), []).append(item)

    candidates = []
    assessed_count = 0
    proportional_redistribution_impossible = False
    for criterion_index, criterion in enumerate(normalized_criteria):
        criterion_id = str(criterion["criterionId"])
        matching_items = items_by_id.get(criterion_id, [])
        if len(matching_items) != 1:
            continue
        item = matching_items[0]
        item_weight = _finite_number(item.get("configuredWeight"))
        if item_weight is None or item_weight != criterion["weight"]:
            continue
        points = _validated_sensitivity_points(
            item,
            criterion_index,
            normalized_criteria,
            baseline,
            category_labels,
        )
        configured_weight = float(criterion["weight"])
        if configured_weight not in points:
            continue
        variations = [
            (weight, point)
            for weight, point in points.items()
            if weight != configured_weight
        ]
        if not variations:
            if any(
                isinstance(point, dict)
                and point.get("available") is False
                and point.get("reason")
                == "proportional_redistribution_impossible_zero_complement"
                for point in (item.get("points") or [])
            ):
                proportional_redistribution_impossible = True
            continue

        assessed_count += 1
        changed_observations = []
        for varied_weight, point in variations:
            changes = []
            for alternative_id, target_category_id in point["assignments"].items():
                source_category_id = baseline[alternative_id]
                if source_category_id == target_category_id:
                    continue
                alternative = alternatives_by_id[alternative_id]
                changes.append(
                    {
                        "alternativeId": alternative_id,
                        "alternativeName": str(
                            alternative.get("name") or "Alternative"
                        ),
                        "fromCategoryId": source_category_id,
                        "fromCategory": category_labels[source_category_id],
                        "toCategoryId": target_category_id,
                        "toCategory": category_labels[target_category_id],
                    }
                )
            if changes:
                changed_observations.append((varied_weight, changes))
        if changed_observations:
            varied_weight, changes = min(
                changed_observations,
                key=lambda observation: (
                    abs(observation[0] - configured_weight),
                    -len(observation[1]),
                    observation[0],
                ),
            )
            item_for_narrative = {
                "criterionId": criterion_id,
                "criterionName": criterion.get("name"),
            }
            identity = (
                criterion_id,
                varied_weight,
                tuple(
                    sorted(
                        (
                            change["alternativeId"],
                            change["fromCategoryId"],
                            change["toCategoryId"],
                        )
                        for change in changes
                    )
                ),
            )
            candidates.append(
                {
                    "item": item_for_narrative,
                    "observation": {
                        "variedWeight": varied_weight,
                        "changedAssignments": changes,
                    },
                    "changes": changes,
                    "configuredWeight": configured_weight,
                    "variedWeight": varied_weight,
                    "weightDistance": abs(varied_weight - configured_weight),
                    "criterionIndex": criterion_index,
                    "criterionId": criterion_id,
                    "identity": identity,
                }
            )

    changed_criterion_count = len(candidates)
    selected = sorted(
        candidates,
        key=lambda candidate: (
            -len(candidate["changes"]),
            candidate["weightDistance"],
            candidate["criterionIndex"],
            candidate["criterionId"],
            candidate["variedWeight"],
            candidate["identity"],
        ),
    )[:MAX_SENSITIVITY_OBSERVATIONS]
    return (
        sorted(
            selected,
            key=lambda candidate: (
                candidate["weightDistance"],
                -len(candidate["changes"]),
                candidate["criterionIndex"],
                candidate["variedWeight"],
            ),
        ),
        assessed_count,
        assessed_count - changed_criterion_count,
        proportional_redistribution_impossible,
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
        qualifier = f", including {_bold(names[0])} and {_bold(names[1])}"
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
    remaining = sum(len(group["changes"]) for group in groups[len(selected_groups) :])
    if remaining:
        changes_text += f", plus {_count_word(remaining)} other category changes"
    return opening + changes_text + " in the tested scenario."


def _repeated_alternative_interpretation(
    candidates: list[dict[str, Any]],
    facts: dict[str, Any],
) -> str | None:
    if len({candidate.get("criterionId") for candidate in candidates}) < 2:
        return None
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
        next(key for key in repeated if counts[key] == most_frequent_count),
    )
    count = counts[first]
    name = display_names.get(first) or names_by_key.get(first) or "An alternative"
    return (
        f"{_bold(name)} changed category in {_count_word(count)} of these tested "
        "weight scenarios."
    )


def _criterion_sensitivity_interpretation(facts: dict[str, Any]) -> list[str]:
    criteria = [item for item in facts.get("criteria", []) if isinstance(item, dict)]
    if len(criteria) == 1:
        return [
            "There is only one criterion, so its weight cannot be varied independently."
        ]

    candidates, assessed_count, unchanged_count, redistribution_impossible = (
        _sensitivity_evidence(facts)
    )
    if not criteria:
        return [
            "There isn't enough information to assess how changing the criterion "
            "weights would affect the classifications."
        ]
    if not candidates:
        if assessed_count:
            text = (
                "No category changes were observed across the valid weight variations "
                "examined. This only describes the tested scenarios."
            )
            if assessed_count < len(criteria):
                text += " Some criteria could not be assessed with sufficient evidence."
            return [text]
        if redistribution_impossible:
            return [
                "There isn't enough information to assess how changing the criterion "
                "weights would affect the classifications because the remaining criteria "
                "have no weight available for redistribution."
            ]
        return [
            "There isn't enough information to assess how changing the criterion "
            "weights would affect the classifications."
        ]

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
    if unchanged_count:
        paragraphs.append(
            "Other criteria showed no category changes in their valid weight variations."
        )
    if assessed_count < len(criteria):
        paragraphs.append(
            "Some criteria could not be assessed with sufficient evidence."
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
    sections = []
    if result_lines:
        sections.extend(["### Result interpretation", "\n\n".join(result_lines)])
    if sensitivity_lines:
        sections.extend(
            ["### Criterion weight sensitivity", "\n\n".join(sensitivity_lines)]
        )
    return "\n\n".join(sections)


__all__ = ["build_interpretation"]
