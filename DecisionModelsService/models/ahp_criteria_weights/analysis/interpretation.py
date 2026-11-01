"""Natural-language interpretation of validated AHP weighting facts."""

from __future__ import annotations

import math
from typing import Any

from .evidence import CONSISTENCY_REVIEW_THRESHOLD, WEIGHT_TOLERANCE


def _percent(value: float) -> str:
    return f"{value * 100:.2f}%"


def _percentage_points(value: float) -> str:
    return f"{value * 100:.2f} percentage points"


def _names(items: list[dict[str, Any]], field: str = "name") -> str:
    names = [str(item.get(field) or "").strip() for item in items]
    names = [name for name in names if name]
    if len(names) < 2:
        return names[0] if names else ""
    if len(names) == 2:
        return f"{names[0]} and {names[1]}"
    return ", ".join(names[:-1]) + f", and {names[-1]}"


def _criteria_by_ids(facts: dict[str, Any], ids: list[str]) -> list[dict[str, Any]]:
    by_id = {item["criterionId"]: item for item in facts["criteria"]["items"]}
    return [by_id[item_id] for item_id in ids if item_id in by_id]


def _criterion_importance(facts: dict[str, Any]) -> str | None:
    ordered = [
        item for item in facts["criteria"]["items"]
        if isinstance(item.get("collectiveWeight"), (int, float))
        and math.isfinite(float(item["collectiveWeight"]))
    ]
    ordered.sort(key=lambda item: (-item["collectiveWeight"], item["name"].casefold(), item["criterionId"]))
    if not ordered:
        return None
    top = _criteria_by_ids(facts, facts["criteria"].get("collectiveLeaders", []))
    least = _criteria_by_ids(facts, facts["criteria"].get("leastImportant", []))
    if len(top) > 1:
        opening = f"**{_names(top)}** shared the greatest final importance at **{_percent(top[0]['collectiveWeight'])}** each."
    else:
        opening = f"**{top[0]['name']}** received the greatest final importance at **{_percent(top[0]['collectiveWeight'])}**."
    if len(least) > 1:
        opening += f" **{_names(least)}** shared the least importance at **{_percent(least[0]['collectiveWeight'])}** each."
    elif least and least[0]["criterionId"] != top[0]["criterionId"]:
        opening += f" **{least[0]['name']}** received the least importance at **{_percent(least[0]['collectiveWeight'])}**."
    share = facts["criteria"].get("topThreeShare")
    if share is not None:
        opening += f" The three largest weights together account for **{_percent(share)}** of the total."
    return "### Criterion importance\n\n" + opening


def _expert_perspectives(facts: dict[str, Any]) -> str | None:
    experts = facts["experts"]["items"]
    if len(experts) < 2:
        return None
    available = [expert for expert in experts if isinstance(expert.get("weightsByCriterion"), dict)]
    if len(available) != len(experts):
        return "### Expert perspectives\n\nThe saved execution does not contain a complete, validated set of individual AHP weight vectors, so expert differences cannot be compared reliably."

    criteria = facts["criteria"]["items"]
    spreads = [
        (
            max(expert["weightsByCriterion"][criterion["criterionId"]] for expert in available)
            - min(expert["weightsByCriterion"][criterion["criterionId"]] for expert in available),
            criterion,
        )
        for criterion in criteria
    ]
    largest_spread = max((spread for spread, _ in spreads), default=0.0)
    if largest_spread <= WEIGHT_TOLERANCE:
        paragraphs = ["Experts assigned the same AHP weights to each criterion within numerical precision."]
    else:
        widest = [criterion for spread, criterion in spreads if math.isclose(spread, largest_spread, rel_tol=WEIGHT_TOLERANCE, abs_tol=WEIGHT_TOLERANCE)]
        paragraphs = [
            f"The largest difference in individual priorities concerned **{_names(widest)}**, with a spread of {_percentage_points(largest_spread)}."
        ]

    furthest_keys = set(facts["experts"].get("furthestFromCollectiveExpertKeys", []))
    furthest = [expert for expert in experts if expert["expertKey"] in furthest_keys]
    if furthest:
        distance = max(float(expert["absoluteDifferenceFromCollective"]) for expert in furthest)
        paragraphs.append(
            f"{_names(furthest)} had the largest overall absolute difference from the final collective weights ({_percentage_points(distance)} summed across criteria)."
        )
    return "### Expert perspectives\n\n" + " ".join(paragraphs)


def _mcc_adjustments(facts: dict[str, Any]) -> str | None:
    mcc = facts.get("mcc") or {}
    if not mcc.get("available"):
        return None
    total = float(mcc["totalAbsoluteAdjustment"])
    if not mcc.get("materialAdjustments"):
        return (
            "### MCC adjustments\n\n"
            "MCC made no material numerical adjustments to the original AHP weights; the stored expert vectors already met the calculation's agreement constraint within the analysis tolerance."
        )
    paragraphs = [
        f"MCC made {_percentage_points(total)} of total absolute weight adjustments across expert-criterion cells."
    ]
    largest_experts = mcc.get("largestEffortExperts") or []
    largest_criteria = mcc.get("largestEffortCriteria") or []
    if largest_experts:
        if len(largest_experts) == 1:
            paragraphs.append(f"**{_names(largest_experts)}** had the largest total adjustment across their criteria.")
        else:
            paragraphs.append(f"Experts **{_names(largest_experts)}** accounted for the largest total adjustment effort.")
    if largest_criteria:
        paragraphs.append(f"The largest accumulated changes concerned **{_names(largest_criteria)}**.")
    paragraphs.append("These are changes in the stored optimization result, not new judgments made by the experts.")
    return "### MCC adjustments\n\n" + " ".join(paragraphs)


def _consistency(facts: dict[str, Any]) -> str | None:
    entries = facts.get("consistency", {}).get("experts", [])
    if not entries:
        return None
    lines = []
    for entry in entries:
        name = entry["name"]
        if not entry.get("available"):
            lines.append(f"**{name}:** a valid stored consistency diagnostic is unavailable.")
            continue
        status = entry.get("consistencyStatus")
        ratio = entry.get("consistencyRatio")
        if status == "not_applicable" or ratio is None:
            lines.append(f"**{name}:** CR is not applicable for a matrix with fewer than three criteria.")
        elif status == "review" and ratio > CONSISTENCY_REVIEW_THRESHOLD:
            lines.append(f"**{name}:** CR was **{ratio:.3f}**, above the **{CONSISTENCY_REVIEW_THRESHOLD:.2f}** review threshold; these pairwise judgments may benefit from review.")
        else:
            lines.append(f"**{name}:** CR was **{ratio:.3f}**, within the **{CONSISTENCY_REVIEW_THRESHOLD:.2f}** consistency threshold.")
    lines.append("AHP consistency describes the internal coherence of one expert's comparisons; it does not measure agreement between experts.")
    return "### AHP consistency\n\n" + " ".join(lines)


def build_interpretation(facts: dict[str, Any]) -> str:
    sections = [
        _criterion_importance(facts),
        _expert_perspectives(facts),
        _mcc_adjustments(facts),
        _consistency(facts),
    ]
    return "\n\n".join(section for section in sections if section)


__all__ = ["build_interpretation"]
