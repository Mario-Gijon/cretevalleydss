"""Plain-language interpretation of validated TOPSIS-Sort analysis facts."""

from __future__ import annotations

from typing import Any


def _percent(value: float) -> str:
    formatted = f"{value * 100:.2f}".rstrip("0").rstrip(".")
    return f"{formatted}%"


def _unavailable_reason(reason: str | None) -> str:
    return {
        "single_criterion": "a single criterion must retain all importance, so it cannot be varied independently",
        "proportional_redistribution_impossible_zero_complement": "the other configured criteria have zero total weight, so proportional redistribution is undefined",
        "normalization_undefined": "the original normalization is undefined at this weight",
        "closeness_undefined": "a TOPSIS closeness denominator is zero or non-finite at this weight",
        "alternative_equals_boundary": "an alternative equals a strict category boundary at this weight",
        "profile_closeness_order_not_strict": "consecutive boundary profiles no longer have strictly increasing closeness values",
        "assignment_interval_undefined": "the strict profile intervals do not define a category at this weight",
        "invalid_scenario": "the mathematical core rejected this weight scenario",
        "insufficient_valid_weight_samples": "fewer than two valid sampled weights are available",
        "no_valid_weight_samples": "no sampled weight produced a valid TOPSIS-Sort result",
    }.get(reason or "", "the required evidence is unavailable")


def _unavailable_samples_text(item: dict[str, Any]) -> str:
    unavailable_points = [
        point for point in item.get("points", [])
        if not point.get("available")
    ]
    if not unavailable_points:
        return ""
    reasons = sorted(
        {
            point["reason"]
            for point in unavailable_points
            if point.get("reason")
        }
    )
    reason_text = "; ".join(_unavailable_reason(reason) for reason in reasons)
    return (
        f" {len(unavailable_points)} sampled weight(s) are omitted because "
        f"{reason_text}. These gaps are not evidence of stability or change."
    )


def _boundary_interpretation(facts: dict[str, Any]) -> list[str]:
    alternatives = facts["alternatives"]
    categories = facts["categories"]
    if not alternatives:
        return ["No validated alternative closeness values are available."]

    nearest = min(
        alternatives,
        key=lambda item: item["nearestBoundary"]["distance"],
    )
    boundary = nearest["nearestBoundary"]
    paragraphs = [
        (
            f"{nearest['name']} is the closest alternative to one of its assigned "
            f"category boundaries: its relative closeness is "
            f"{nearest['nearestBoundary']['distance']:.4f} away from "
            f"{boundary['label']} ({nearest['closeness']:.4f} versus the boundary "
            f"at {next(item['closeness'] for item in facts['profiles'] if item['profileId'] == boundary['profileId']):.4f}). "
            "This describes its position in the executed classification; it is not a probability or prediction of reclassification."
        )
    ]

    for category in categories:
        members = [
            item for item in alternatives
            if item["categoryId"] == category["categoryId"]
        ]
        if len(members) < 2:
            continue
        low = min(members, key=lambda item: item["closeness"])
        high = max(members, key=lambda item: item["closeness"])
        spread = high["closeness"] - low["closeness"]
        if spread > 0:
            paragraphs.append(
                f"Within {category['label']}, {low['name']} and {high['name']} "
                f"span {spread:.4f} in relative closeness while retaining the same "
                "category assignment."
            )
    return paragraphs


def _criterion_sensitivity_interpretation(facts: dict[str, Any]) -> list[str]:
    sensitivity = facts["sensitivity"]
    if not sensitivity["availability"]["available"]:
        items = sensitivity["items"]
        if not items:
            reason = sensitivity["availability"].get("reason")
            return [
                "Criterion weight sensitivity is unavailable because "
                f"{_unavailable_reason(reason)}."
            ]

        paragraphs = []
        for item in items:
            reason = item.get("reason") or sensitivity["availability"].get("reason")
            paragraphs.append(
                f"Criterion weight sensitivity for {item['criterionName']} is "
                f"unavailable because {_unavailable_reason(reason)}."
                f"{_unavailable_samples_text(item)}"
            )
        return paragraphs

    paragraphs = []
    for item in sensitivity["items"]:
        if not item["available"]:
            paragraphs.append(
                f"Sensitivity for {item['criterionName']} is unavailable because "
                f"{_unavailable_reason(item.get('reason'))}."
                f"{_unavailable_samples_text(item)}"
            )
            continue

        summary = item["summary"]
        if summary["nearestObservedChange"]:
            observation = summary["nearestObservedChange"]
            changes = observation["changedAssignments"]
            change_text = "; ".join(
                f"{change['alternativeName']} from {change['fromCategory']} to {change['toCategory']}"
                for change in changes
            )
            paragraphs.append(
                f"For {item['criterionName']}, the nearest sampled category change to "
                f"its configured weight ({_percent(item['configuredWeight'])}) occurs "
                f"at {_percent(observation['variedWeight'])}: {change_text}. This is "
                "an observed sample, not an estimated exact threshold."
            )
            transitions = summary["observedAdjacentTransitions"]
            nearest_transition = min(
                transitions,
                key=lambda entry: min(
                    abs(entry["fromWeight"] - item["configuredWeight"]),
                    abs(entry["toWeight"] - item["configuredWeight"]),
                ),
                default=None,
            )
            if nearest_transition:
                paragraphs.append(
                    f"Consecutive valid samples show a transition between "
                    f"{_percent(nearest_transition['fromWeight'])} and "
                    f"{_percent(nearest_transition['toWeight'])}; the exact change "
                    "point was not estimated."
                )
        else:
            paragraphs.append(
                f"No category changes were observed for {item['criterionName']} "
                f"across {summary['validSampleCount']} valid sampled weights. "
                "This describes the evaluated grid only; it does not establish that "
                "categories remain unchanged between samples or under other perturbations."
            )

        if summary["unavailableSampleCount"]:
            paragraphs.append(
                f"Unavailable sampled weights for {item['criterionName']} are "
                "omitted from the plotted trajectory."
                f"{_unavailable_samples_text(item)}"
            )
    return paragraphs


def build_interpretation(facts: dict[str, Any]) -> str:
    """Return audience-facing interpretation without ranking language."""
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

    result_lines = _boundary_interpretation(facts)
    sensitivity_lines = _criterion_sensitivity_interpretation(facts)
    return (
        "### Result interpretation\n\n"
        + "\n\n".join(result_lines)
        + "\n\n### Criterion weight sensitivity\n\n"
        + "\n\n".join(sensitivity_lines)
    )


__all__ = ["build_interpretation"]
