"""Plain-language interpretation of validated AHPSort I analysis facts."""

from __future__ import annotations

import math
from collections import Counter
from typing import Any


def _text(value: Any) -> str:
    text = " ".join(str(value or "").split())
    for character in "\\`*_{}[]<>()#+-.!|>":
        text = text.replace(character, f"\\{character}")
    return text


def _bold(value: Any, fallback: str = "") -> str:
    escaped = _text(value)
    return f"**{escaped}**" if escaped else fallback


def _number(value: Any) -> float | None:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return None
    number = float(value)
    return number if math.isfinite(number) else None


def _percent(value: Any) -> str | None:
    number = _number(value)
    if number is None:
        return None
    return f"{number * 100:.2f}".rstrip("0").rstrip(".") + "%"


def _number_text(value: Any) -> str | None:
    number = _number(value)
    return f"{number:.4f}" if number is not None else None


def _indexed(items: Any, id_key: str, label_key: str) -> dict[str, str]:
    if not isinstance(items, list):
        return {}
    return {
        str(item[id_key]): str(item.get(label_key) or item[id_key])
        for item in items
        if isinstance(item, dict) and item.get(id_key) is not None
    }


def _ordered_categories(facts: dict[str, Any]) -> list[dict[str, Any]]:
    return sorted(
        (item for item in facts.get("categories", []) if isinstance(item, dict)),
        key=lambda item: (item.get("order", 0), str(item.get("categoryId", ""))),
    )


def _expert_name(expert: dict[str, Any]) -> str:
    return str(expert.get("name") or expert.get("expertId") or "Expert")


def _alternative_names(facts: dict[str, Any]) -> dict[str, str]:
    counts = Counter(
        str(item.get("name") or "Alternative")
        for item in facts.get("alternatives", [])
        if isinstance(item, dict)
    )
    seen: Counter[str] = Counter()
    names = {}
    for item in facts.get("alternatives", []):
        if not isinstance(item, dict) or item.get("alternativeId") is None:
            continue
        name = str(item.get("name") or "Alternative")
        seen[name] += 1
        if counts[name] > 1:
            name = f"{name} (alternative {seen[name]})"
        names[str(item["alternativeId"])] = name
    return names


def _results_by_expert(facts: dict[str, Any]) -> dict[str, dict[str, Any]]:
    return facts.get("individualResultsByExpertId") or {}


def _assignments_for(results: Any) -> dict[str, str]:
    if not isinstance(results, dict):
        return {}
    return {
        str(alternative_id): str(result["categoryId"])
        for alternative_id, result in results.items()
        if isinstance(result, dict) and result.get("categoryId") is not None
    }


def _distribution(
    assignments: dict[str, str],
    categories: list[dict[str, Any]],
    alternative_names: dict[str, str],
) -> str:
    if not assignments:
        return "No validated category assignments are available."
    parts = []
    for category in categories:
        category_id = str(category.get("categoryId"))
        members = [
            alternative_names.get(alternative_id, alternative_id)
            for alternative_id, assigned_category in assignments.items()
            if assigned_category == category_id
        ]
        label = _bold(category.get("label") or category_id, "an unnamed category")
        detail = f"{len(members)}"
        if members:
            shown = ", ".join(_bold(member) for member in members[:3])
            if len(members) > 3:
                shown += f", and {len(members) - 3} more"
            detail += ": " + shown
        parts.append(f"{label} ({detail})")
    return "; ".join(parts)


def _profile_labels(facts: dict[str, Any]) -> dict[str, str]:
    category_labels = _indexed(facts.get("categories"), "categoryId", "label")
    labels = {}
    for index, profile in enumerate(facts.get("profiles", []), start=1):
        if not isinstance(profile, dict):
            continue
        profile_id = str(profile.get("profileId", f"profile-{index}"))
        if facts.get("profileMode") == "limiting":
            lower = category_labels.get(str(profile.get("lowerCategoryId")))
            upper = category_labels.get(str(profile.get("upperCategoryId")))
            label = f"{lower or 'lower'} / {upper or 'upper'} boundary"
        else:
            category = category_labels.get(str(profile.get("categoryId")))
            label = f"{category or 'category'} central profile"
        labels[profile_id] = label
    return labels


def _classification_interpretation(facts: dict[str, Any]) -> list[str]:
    categories = _ordered_categories(facts)
    category_labels = _indexed(categories, "categoryId", "label")
    alternatives = _alternative_names(facts)
    experts = [item for item in facts.get("experts", []) if isinstance(item, dict)]
    individual = _results_by_expert(facts)
    mode = facts.get("profileMode")
    if mode == "limiting":
        mode_text = (
            "With limiting profiles, each alternative is placed between the ordered "
            "category boundaries using its own alternative and profile priorities."
        )
    else:
        mode_text = (
            "With central profiles, each alternative is assigned to the category of "
            "its nearest central profile, using that alternative's own profile comparisons."
        )

    paragraphs = [mode_text]
    individual_assignments: dict[str, dict[str, str]] = {}
    for expert in experts:
        expert_id = str(expert.get("expertId"))
        by_alternative = (
            (individual.get(expert_id) or {}).get("resultsByAlternativeId") or {}
        )
        assignments = _assignments_for(by_alternative)
        individual_assignments[expert_id] = assignments
        description = (
            f"Individual classifications for {_bold(_expert_name(expert))}: "
            if len(experts) > 1
            else f"The classifications for {_bold(_expert_name(expert))}: "
        )
        paragraphs.append(
            description + _distribution(assignments, categories, alternatives) + "."
        )

    if len(experts) > 1:
        alternative_ids = [
            str(item["alternativeId"])
            for item in facts.get("alternatives", [])
            if isinstance(item, dict) and item.get("alternativeId") is not None
        ]
        consensus = []
        disagreements = []
        for alternative_id in alternative_ids:
            votes = [
                assignments[alternative_id]
                for assignments in individual_assignments.values()
                if alternative_id in assignments
            ]
            if len(votes) == len(experts) and len(set(votes)) == 1:
                consensus.append(alternative_id)
            elif len(votes) > 1 and len(set(votes)) > 1:
                disagreements.append(alternative_id)
        if disagreements:
            names = ", ".join(
                _bold(alternatives.get(item, item)) for item in disagreements[:4]
            )
            paragraphs.append(
                f"Experts agreed on {len(consensus)} of {len(alternative_ids)} "
                f"alternatives and disagreed on {len(disagreements)} ({names})."
            )
        elif consensus:
            paragraphs.append(
                f"All experts assigned the same category to {len(consensus)} of "
                f"{len(alternative_ids)} alternatives."
            )

        collective = facts.get("collectiveResultsByAlternativeId") or {}
        collective_assignments = {
            str(alternative_id): str(
                result.get("categoryId") or result.get("selectedCategoryId")
            )
            for alternative_id, result in collective.items()
            if isinstance(result, dict)
            and (result.get("categoryId") or result.get("selectedCategoryId"))
            is not None
        }
        if collective_assignments:
            paragraphs.append(
                "The collective classifications are: "
                + _distribution(collective_assignments, categories, alternatives)
                + ". Each expert contributes one unweighted category vote per alternative; "
                "the category with the most votes is selected by plurality. No collective numeric "
                "priority is calculated."
            )
            vote_ties = []
            unanimous = 0
            for alternative_id, result in collective.items():
                if not isinstance(result, dict):
                    continue
                if result.get("isUnanimous") is True or result.get("aggregationStatus") == "unanimous":
                    unanimous += 1
                if result.get("tieDetected") is True:
                    tie_ids = result.get("tiedCategoryIds") or []
                    if not tie_ids:
                        votes = result.get("votesByCategoryId") or {}
                        maximum = max(votes.values(), default=None)
                        tie_ids = [
                            category.get("categoryId")
                            for category in categories
                            if maximum is not None
                            and votes.get(category.get("categoryId")) == maximum
                        ]
                    tie_labels = [
                        category_labels.get(str(category_id), str(category_id))
                        for category_id in tie_ids
                    ]
                    votes = result.get("votesByCategoryId") or {}
                    vote_detail = ", ".join(
                        f"{_bold(label)} ({votes.get(category_id, votes.get(str(category_id), 0))} votes)"
                        for category_id, label in zip(tie_ids, tie_labels)
                    )
                    tie_policy = result.get("tiePolicy") or facts.get("groupTiePolicy")
                    policy_text = _tie_policy_text(tie_policy)
                    vote_ties.append(
                        f"{_bold(alternatives.get(str(alternative_id), alternative_id))} "
                        f"({vote_detail}; {policy_text})"
                    )
            if unanimous:
                paragraphs.append(
                    f"The expert votes were unanimous for {unanimous} alternatives."
                )
            if vote_ties:
                paragraphs.append(
                    "Plurality ties were resolved by the configured policy for: "
                    + "; ".join(vote_ties[:4])
                    + "."
                )

    tie_details = _central_tie_details(facts, individual, experts, alternatives)
    if tie_details:
        paragraphs.append(tie_details)

    priority_context = _priority_context(facts, individual, experts)
    if priority_context:
        paragraphs.append(priority_context)
    return paragraphs


def _tie_policy_text(policy: Any) -> str:
    if policy == "optimistic":
        return "optimistic policy selected the highest ordered category"
    if policy == "pessimistic":
        return "pessimistic policy selected the lowest ordered category"
    return "the configured tie policy was applied"


def _central_tie_details(
    facts: dict[str, Any],
    individual: dict[str, dict[str, Any]],
    experts: list[dict[str, Any]],
    alternatives: dict[str, str],
) -> str | None:
    if facts.get("profileMode") != "central":
        return None
    profiles = _profile_labels(facts)
    ties = []
    for expert in experts:
        expert_id = str(expert.get("expertId"))
        results = (individual.get(expert_id) or {}).get("resultsByAlternativeId") or {}
        for alternative_id, result in results.items():
            classification = result.get("classification") or {}
            if classification.get("tieDetected") is not True:
                continue
            tied = [
                profiles.get(str(profile_id), str(profile_id))
                for profile_id in classification.get("tiedCenterProfileIds") or []
            ]
            selected = profiles.get(
                str(classification.get("selectedCenterProfileId")),
                str(classification.get("selectedCenterProfileId") or "selected profile"),
            )
            policy = _tie_policy_text(classification.get("tiePolicy"))
            ties.append(
                f"{_bold(alternatives.get(str(alternative_id), alternative_id))} "
                f"({_bold(_expert_name(expert))}: {', '.join(_bold(item) for item in tied)}; "
                f"selected {_bold(selected)}; {policy})"
            )
    if not ties:
        return None
    return "Central-profile ties were resolved within the relevant alternative and expert matrices: " + "; ".join(ties[:4]) + "."


def _priority_context(
    facts: dict[str, Any],
    individual: dict[str, dict[str, Any]],
    experts: list[dict[str, Any]],
) -> str | None:
    labels = _profile_labels(facts)
    examples = []
    for expert in experts:
        expert_id = str(expert.get("expertId"))
        results = (individual.get(expert_id) or {}).get("resultsByAlternativeId") or {}
        for alternative in facts.get("alternatives", []):
            if not isinstance(alternative, dict):
                continue
            alternative_id = str(alternative.get("alternativeId"))
            result = results.get(alternative_id)
            if not isinstance(result, dict):
                continue
            priority = _number_text(result.get("globalPriority"))
            profile_priorities = result.get("profileGlobalPrioritiesById") or {}
            profile_values = [
                f"{_bold(labels.get(str(profile_id), profile_id))} {_number_text(value)}"
                for profile_id, value in profile_priorities.items()
                if _number_text(value) is not None
            ]
            description = (
                f"{_bold(alternative.get('name') or alternative_id)} / "
                f"{_bold(_expert_name(expert))}"
            )
            if priority is not None:
                description += f": alternative priority {priority}"
            classification = result.get("classification") or {}
            if facts.get("profileMode") == "central":
                distance = _number_text(classification.get("distanceToSelectedCenter"))
                selected = labels.get(
                    str(classification.get("selectedCenterProfileId")),
                    classification.get("selectedCenterProfileId"),
                )
                if selected:
                    description += f", selected {_bold(selected)} central profile"
                if distance is not None:
                    description += f" at distance {distance}"
            if profile_values:
                description += "; profile priorities in the same matrix: " + ", ".join(profile_values)
            if priority is not None or profile_values or classification.get("selectedCenterProfileId"):
                examples.append(description)
                break
        if len(examples) >= 3:
            break
    if not examples:
        return None
    mode_note = (
        " Each pair of alternative and expert has its own AHP matrix."
        " Priorities from different alternatives or experts are not directly comparable."
    )
    return "Priority and profile context: " + "; ".join(examples) + "." + mode_note


def _reason_text(reason: Any) -> str:
    known = {
        "single_criterion": "only one criterion is available, so independent redistribution is impossible",
        "proportional_redistribution_impossible_zero_complement": "the other criteria have no weight to redistribute",
        "profile_order_invalid": "the sampled weights produced an invalid ordering of limiting profiles",
        "invalid_scenario": "the sampled scenario could not be evaluated consistently",
        "no_valid_weight_samples": "no valid weight samples were available",
    }
    if reason in known:
        return known[reason]
    return str(reason or "the reason was not recorded").replace("_", " ")


def _change_description(
    change: dict[str, Any],
    category_labels: dict[str, str],
    alternatives: dict[str, str],
    expert_names: dict[str, str],
) -> str:
    name = alternatives.get(
        str(change.get("alternativeId")),
        str(change.get("alternativeName") or "an alternative"),
    )
    source = category_labels.get(
        str(change.get("fromCategoryId")), str(change.get("fromCategory") or "another category")
    )
    target = category_labels.get(
        str(change.get("toCategoryId")), str(change.get("toCategory") or "another category")
    )
    detail = f"{_bold(name)}: {_bold(source)} → {_bold(target)}"
    expert_id = change.get("expertId")
    if expert_id is not None:
        detail += f" for {_bold(expert_names.get(str(expert_id), expert_id))}"
    return detail


def _point_change_details(
    points: Any,
    category_labels: dict[str, str],
    alternatives: dict[str, str],
    expert_names: dict[str, str],
) -> str:
    details = []
    if not isinstance(points, list):
        return ""
    for point in points:
        if not isinstance(point, dict):
            continue
        weight = _percent(point.get("variedWeight"))
        for key in ("individualChanges", "collectiveChanges"):
            for change in point.get(key) or []:
                if isinstance(change, dict):
                    scope = "collective" if key == "collectiveChanges" else "individual"
                    details.append(
                        f"{scope} at {weight or 'an unreported weight'}: "
                        + _change_description(change, category_labels, alternatives, expert_names)
                    )
    return "; ".join(details[:4])


def _baseline_sample(item: dict[str, Any]) -> dict[str, Any] | None:
    configured = _number(item.get("configuredWeight"))
    if configured is None:
        return None
    for point in item.get("points") or []:
        if (
            isinstance(point, dict)
            and _number(point.get("variedWeight")) == configured
            and point.get("available") is True
        ):
            return point
    return None


def _criterion_sensitivity(facts: dict[str, Any]) -> list[str]:
    sensitivity = facts.get("sensitivity") or {}
    criteria = [item for item in facts.get("criteria", []) if isinstance(item, dict)]
    items = [item for item in sensitivity.get("items", []) if isinstance(item, dict)]
    if len(criteria) == 1 or any(item.get("reason") == "single_criterion" for item in items):
        return [
            "Criterion weight sensitivity is unavailable because there is only one criterion; "
            "its weight cannot be redistributed independently."
        ]
    if not items or not sensitivity.get("availability", {}).get("available", False):
        reason = sensitivity.get("availability", {}).get("reason")
        if reason:
            return ["Criterion weight sensitivity is unavailable because " + _reason_text(reason) + "."]
        return ["There is not enough validated evidence to assess criterion weight sensitivity."]

    method = sensitivity.get("method") or {}
    step = _percent(method.get("step"))
    lines = []
    if step:
        lines.append(
            f"Each scenario varies one criterion from {_percent(method.get('minimumWeight')) or '0%'} "
            f"to {_percent(method.get('maximumWeight')) or '100%'} in {step} steps, "
            "redistributing the remaining weight proportionally so the other criteria keep "
            "their original ratios. The exact configured weight is included."
        )
    categories = _indexed(facts.get("categories"), "categoryId", "label")
    alternatives = _alternative_names(facts)
    experts = [item for item in facts.get("experts", []) if isinstance(item, dict)]
    expert_names = {str(item.get("expertId")): _expert_name(item) for item in experts}
    collective_analyzed = len(experts) > 1
    observed_alternatives: Counter[str] = Counter()
    any_changes = False
    valid_samples = 0
    globally_no_changes = bool(items) and all(
        (item.get("summary") or {}).get("noChangesObserved") is True
        for item in items
    )
    baseline_matches = []
    baseline_unconfirmed = []

    for item in items:
        name = _bold(item.get("criterionName") or item.get("criterionId"), "a criterion")
        summary = item.get("summary") or {}
        valid = int(summary.get("validSampleCount") or 0)
        invalid = int(summary.get("invalidSampleCount") or 0)
        valid_samples += valid
        individual_changes = summary.get("alternativesWithObservedIndividualChanges") or []
        collective_changes = summary.get("alternativesWithObservedCollectiveChanges") or []
        if individual_changes or collective_changes:
            any_changes = True
            for change in individual_changes:
                if isinstance(change, dict):
                    key = str(change.get("alternativeId") or change.get("alternativeName"))
                    observed_alternatives[key] += int(change.get("observedSampleCount") or 0)
            effects = []
            if individual_changes:
                examples = "; ".join(
                    _change_description(change, categories, alternatives, expert_names)
                    for change in individual_changes[:3]
                    if isinstance(change, dict)
                )
                effects.append(f"individual classifications changed ({examples})")
            if collective_changes:
                examples = "; ".join(
                    _change_description(change, categories, alternatives, expert_names)
                    for change in collective_changes[:3]
                    if isinstance(change, dict)
                )
                effects.append(f"collective classifications changed ({examples})")
            elif individual_changes and collective_analyzed:
                effects.append("no collective category change was observed")
            lines.append(
                f"Of {valid} valid samples for {name}, category changes were observed: "
                + "; ".join(effects)
                + "."
            )
            nearest = summary.get("nearestObservedChange")
            if isinstance(nearest, dict):
                nearest_details = _point_change_details(
                    nearest.get("points"), categories, alternatives, expert_names
                )
                points = nearest.get("points") or []
                weights = sorted(
                    {
                        _percent(point.get("variedWeight"))
                        for point in points
                        if isinstance(point, dict) and _percent(point.get("variedWeight"))
                    }
                )
                delta = _percent(nearest.get("absoluteWeightDifference"))
                if weights:
                    lines.append(
                        f"The nearest observed change to the original {name} weight "
                        f"occurred at {', '.join(weights)}"
                        + (f" ({delta} percentage points away)" if delta else "")
                        + (f": {nearest_details}." if nearest_details else ".")
                        + " This is a sampled observation, not an exact switching threshold."
                    )
        elif summary.get("noChangesObserved") is True and not globally_no_changes:
            lines.append(
                f"No category changes were observed for {name} in its valid tested samples; "
                "this does not guarantee stability outside the sampled weights."
            )
        elif valid:
            lines.append(
                f"No category change conclusion is available for {name} from the valid samples."
            )

        baseline = _baseline_sample(item)
        comparison = baseline.get("baselineComparison") if baseline else None
        if isinstance(comparison, dict):
            checked = [value for value in comparison.values() if isinstance(value, bool)]
            if checked and all(checked):
                baseline_matches.append(str(item.get("criterionName") or item.get("criterionId")))
            else:
                baseline_unconfirmed.append(str(item.get("criterionName") or item.get("criterionId")))
        else:
            baseline_unconfirmed.append(str(item.get("criterionName") or item.get("criterionId")))

        if invalid:
            reasons = summary.get("unavailableReasons") or {}
            reason_text = ", ".join(
                f"{count} ({_reason_text(reason)})" for reason, count in sorted(reasons.items())
            )
            lines.append(
                f"{invalid} of {int(summary.get('sampleCount') or valid + invalid)} "
                f"samples for {name} were unavailable"
                + (f": {reason_text}." if reason_text else ".")
            )

    if observed_alternatives:
        most_observed = max(observed_alternatives.values())
        names = [
            alternatives.get(key, key)
            for key, count in observed_alternatives.items()
            if count == most_observed
        ]
        if names:
            lines.append(
                "The alternatives with the most repeated individual category changes "
                f"were {', '.join(_bold(name) for name in names[:3])} "
                f"({most_observed} observed samples each)."
            )
    if not any_changes and valid_samples and all(
        (item.get("summary") or {}).get("noChangesObserved") is True for item in items
    ):
        lines.append(
            "No changes were observed in the valid tested samples. This describes only "
            "the sampled grid and is not a guarantee of absolute stability."
        )
    if baseline_matches and len(baseline_matches) == len(items) and not baseline_unconfirmed:
        lines.append(
            "For each criterion, the recomputed sample at its exact configured weight "
            "matches the validated original execution, including applicable "
            "individual priorities, "
            "profile evidence, and collective votes."
        )
    elif baseline_matches:
        lines.append(
            "The exact configured-weight sample reproduced the validated original for: "
            + ", ".join(_bold(name) for name in baseline_matches)
            + "."
        )
    if baseline_unconfirmed:
        lines.append(
            "The exact configured-weight comparison could not be confirmed for: "
            + ", ".join(_bold(name) for name in baseline_unconfirmed)
            + "."
        )
    return lines


def build_interpretation(facts: dict[str, Any]) -> str:
    """Return concise audience-facing interpretation of validated model facts."""
    status = facts.get("status")
    if status == "unavailable":
        return (
            "### Model Analysis unavailable\n\n"
            f"{facts.get('unavailableReason', 'The frozen execution evidence is incomplete.')}"
        )
    if status == "invalid_execution":
        return (
            "### Model Analysis unavailable\n\n"
            "The stored AHPSort I result does not reproduce from its frozen input. "
            "No model-specific conclusions were generated. "
            f"{facts.get('invalidReason', '')}"
        )

    sections = ["### Result interpretation", "\n\n".join(_classification_interpretation(facts))]
    sensitivity = _criterion_sensitivity(facts)
    if sensitivity:
        sections.extend(["### Criterion weight sensitivity", "\n\n".join(sensitivity)])
    return "\n\n".join(sections)


__all__ = ["build_interpretation"]
