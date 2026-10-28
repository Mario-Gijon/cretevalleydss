"""Group assignment aggregation for the AHPSort I adapter.

This module combines already-computed individual categories. It does not
aggregate AHP judgments, priorities, or weights and does not run AHPSort I.
"""

from collections import Counter
from collections.abc import Mapping
from typing import Any


def aggregate_category_votes(
    *,
    categories: list[dict[str, Any]],
    alternatives: list[dict[str, str]],
    category_by_expert_and_alternative: Mapping[str, Mapping[str, str]],
    tie_policy: str,
) -> tuple[list[dict[str, str]], dict[str, dict[str, Any]]]:
    """Aggregate one validated category per expert and alternative.

    A unique modal category wins, including a plurality that is not an
    absolute majority. If the maximum vote count is tied, the configured
    ordered-category preference resolves it.
    """

    if tie_policy not in {"optimistic", "pessimistic"}:
        raise ValueError("group tie policy must be 'optimistic' or 'pessimistic'")
    if len(category_by_expert_and_alternative) < 2:
        raise ValueError("group voting requires at least two expert classifications")

    ordered_category_ids = [category["categoryId"] for category in categories]
    category_order = {
        category_id: index
        for index, category_id in enumerate(ordered_category_ids)
    }
    expert_ids = sorted(category_by_expert_and_alternative)
    if len(category_order) != len(ordered_category_ids):
        raise ValueError("category IDs must be unique for group voting")

    assignments: list[dict[str, str]] = []
    diagnostics_by_alternative: dict[str, dict[str, Any]] = {}
    for alternative in alternatives:
        alternative_id = alternative["id"]
        classifications = {
            expert_id: category_by_expert_and_alternative[expert_id][alternative_id]
            for expert_id in expert_ids
        }
        unknown_categories = set(classifications.values()) - set(category_order)
        if unknown_categories:
            raise ValueError(
                "group votes contain unknown category IDs: "
                f"{sorted(unknown_categories)}"
            )

        votes = Counter(classifications.values())
        votes_by_category = {
            category_id: votes[category_id]
            for category_id in ordered_category_ids
        }
        maximum_votes = max(votes_by_category.values())
        tied_category_ids = [
            category_id
            for category_id in ordered_category_ids
            if votes_by_category[category_id] == maximum_votes
        ]
        is_tied = len(tied_category_ids) > 1
        selected_category_id = (
            tied_category_ids[-1 if tie_policy == "optimistic" else 0]
            if is_tied
            else tied_category_ids[0]
        )
        is_unanimous = maximum_votes == len(expert_ids)
        aggregation_status = (
            "unanimous"
            if is_unanimous
            else "tied_plurality"
            if is_tied
            else "unique_plurality"
        )

        assignments.append(
            {"alternativeId": alternative_id, "categoryId": selected_category_id}
        )
        diagnostics_by_alternative[alternative_id] = {
            "categoryId": selected_category_id,
            "selectedCategoryId": selected_category_id,
            "votesByCategoryId": votes_by_category,
            "classificationsByExpertId": classifications,
            "aggregationStatus": aggregation_status,
            "isUnanimous": is_unanimous,
            "isUniquePlurality": not is_tied,
            "tieDetected": is_tied,
            "tiedCategoryIds": tied_category_ids if is_tied else [],
            "tiePolicy": tie_policy if is_tied else None,
        }

    return assignments, diagnostics_by_alternative


__all__ = ["aggregate_category_votes"]
